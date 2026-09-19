import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SmtpRequestBody {
  action?: "get-settings" | "save-settings" | "send-test-email" | "get-templates" | "save-template" | "get-delivery-logs";
  settings?: {
    provider?: "supabase" | "custom_smtp";
    from_email?: string;
    from_name?: string;
    reply_to?: string;
    admin_notification_email?: string;
    admin_cc?: string;
    admin_bcc?: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_username?: string;
    ssl_mode?: "tls" | "ssl" | "none";
    new_password?: string;
    clear_password?: boolean;
  };
  notifications?: {
    staff_invitations?: boolean;
    customer_account_magic_links?: boolean;
    customer_quotation_confirmation?: boolean;
    admin_quotation_notifications?: boolean;
  };
  test_recipient?: string;
  template?: {
    template_key: string;
    subject: string;
    body_html: string;
    body_text?: string;
    is_active?: boolean;
  };
  page?: number;
  page_size?: number;
}

// AES-256-GCM Encryption / Decryption Utilities
async function getEncryptionKey(): Promise<CryptoKey> {
  const rawSecret = Deno.env.get("SMTP_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret-seed-key-32-chars-long";
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(rawSecret));
  return await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptSecret(plainText: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainText));
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptSecret(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();
  const raw = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const cipher = raw.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(decrypted);
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***.com";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local.charAt(0)}*@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

// Basic SMTP Sender using standard Deno TCP Sockets
async function sendRawSmtpEmail(config: {
  host: string;
  port: number;
  sslMode: "tls" | "ssl" | "none";
  username?: string;
  password?: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  htmlBody: string;
}): Promise<void> {
  const isDirectTls = config.sslMode === "ssl" || config.port === 465;
  const timeoutMs = 15000;

  const conn = isDirectTls
    ? await Deno.connectTls({ hostname: config.host, port: config.port })
    : await Deno.connect({ hostname: config.host, port: config.port });

  const reader = conn.readable.getReader();
  const writer = conn.writable.getWriter();
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function readResponse(): Promise<string> {
    const readPromise = (async () => {
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += dec.decode(value);
        if (buffer.endsWith("\r\n")) break;
      }
      return buffer;
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("SMTP socket read timeout")), timeoutMs)
    );

    return await Promise.race([readPromise, timeoutPromise]);
  }

  async function sendCommand(cmd: string): Promise<string> {
    await writer.write(enc.encode(cmd + "\r\n"));
    return await readResponse();
  }

  try {
    const greeting = await readResponse();
    if (!greeting.startsWith("220")) {
      throw new Error(`SMTP Greeting failed: ${greeting.trim()}`);
    }

    const ehloRes = await sendCommand(`EHLO shipping-calculator.app`);
    if (!ehloRes.startsWith("250")) {
      throw new Error(`SMTP EHLO failed: ${ehloRes.trim()}`);
    }

    // Authenticate if credentials supplied
    if (config.username && config.password) {
      const authRes = await sendCommand("AUTH LOGIN");
      if (!authRes.startsWith("334")) {
        throw new Error(`SMTP AUTH LOGIN rejected: ${authRes.trim()}`);
      }

      const userRes = await sendCommand(btoa(config.username));
      if (!userRes.startsWith("334")) {
        throw new Error(`SMTP Username rejected: ${userRes.trim()}`);
      }

      const passRes = await sendCommand(btoa(config.password));
      if (!passRes.startsWith("235")) {
        throw new Error(`SMTP Authentication failed. Check your username and password.`);
      }
    }

    const mailFromRes = await sendCommand(`MAIL FROM:<${config.from}>`);
    if (!mailFromRes.startsWith("250")) {
      throw new Error(`MAIL FROM failed: ${mailFromRes.trim()}`);
    }

    const rcptRes = await sendCommand(`RCPT TO:<${config.to}>`);
    if (!rcptRes.startsWith("250") && !rcptRes.startsWith("251")) {
      throw new Error(`RCPT TO failed for ${config.to}: ${rcptRes.trim()}`);
    }

    const dataPrompt = await sendCommand("DATA");
    if (!dataPrompt.startsWith("354")) {
      throw new Error(`DATA command failed: ${dataPrompt.trim()}`);
    }

    const senderHeader = config.fromName ? `"${config.fromName}" <${config.from}>` : config.from;
    const emailData = [
      `From: ${senderHeader}`,
      `To: ${config.to}`,
      `Subject: ${config.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Date: ${new Date().toUTCString()}`,
      ``,
      config.htmlBody,
      `.`,
    ].join("\r\n");

    const dataRes = await sendCommand(emailData);
    if (!dataRes.startsWith("250")) {
      throw new Error(`Message body rejected: ${dataRes.trim()}`);
    }

    await sendCommand("QUIT");
  } finally {
    try {
      reader.releaseLock();
      writer.releaseLock();
      conn.close();
    } catch {
      // ignore socket cleanup error
    }
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate user from JWT token
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user: callerUser },
      error: authError,
    } = await callerClient.auth.getUser();

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Authorize caller: Super Admin only
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: roleAssignment } = await adminClient
      .from("staff_role_assignments")
      .select("role_id")
      .eq("staff_id", callerUser.id)
      .eq("role_id", "super_admin")
      .maybeSingle();

    if (!roleAssignment) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super Admin privileges are strictly required to manage email infrastructure." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SmtpRequestBody = await req.json().catch(() => ({}));
    const action = body.action || "get-settings";

    // -------------------------------------------------------------------------
    // ACTION: get-settings
    // -------------------------------------------------------------------------
    if (action === "get-settings") {
      const [smtpRes, notifRes, secretRes] = await Promise.all([
        adminClient.from("system_settings").select("value").eq("key", "email_smtp_settings").maybeSingle(),
        adminClient.from("system_settings").select("value").eq("key", "email_notification_preferences").maybeSingle(),
        adminClient.from("smtp_secrets").select("key").eq("key", "smtp_password").maybeSingle(),
      ]);

      const rawSmtp = (smtpRes.data?.value as Record<string, unknown>) || {};
      const rawNotif = (notifRes.data?.value as Record<string, unknown>) || {};
      const hasPassword = Boolean(secretRes.data?.key);

      return new Response(
        JSON.stringify({
          success: true,
          settings: {
            provider: rawSmtp.provider || "supabase",
            from_email: rawSmtp.from_email || "noreply@fakheralamshipping.com",
            from_name: rawSmtp.from_name || "Fakher Alam Shipping",
            reply_to: rawSmtp.reply_to || "info@fakheralamshipping.com",
            admin_notification_email: rawSmtp.admin_notification_email || "info@fakheralamshipping.com",
            admin_cc: rawSmtp.admin_cc || "",
            admin_bcc: rawSmtp.admin_bcc || "",
            smtp_host: rawSmtp.smtp_host || "",
            smtp_port: rawSmtp.smtp_port || 587,
            smtp_username: rawSmtp.smtp_username || "",
            ssl_mode: rawSmtp.ssl_mode || "tls",
            has_password: hasPassword,
          },
          notifications: {
            staff_invitations: rawNotif.staff_invitations !== false,
            customer_account_magic_links: rawNotif.customer_account_magic_links !== false,
            customer_quotation_confirmation: rawNotif.customer_quotation_confirmation !== false,
            admin_quotation_notifications: rawNotif.admin_quotation_notifications !== false,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: save-settings
    // -------------------------------------------------------------------------
    if (action === "save-settings") {
      const s = body.settings || {};
      const n = body.notifications || {};

      const sanitizedSmtp = {
        provider: s.provider === "custom_smtp" ? "custom_smtp" : "supabase",
        from_email: (s.from_email || "noreply@fakheralamshipping.com").trim().toLowerCase(),
        from_name: (s.from_name || "Fakher Alam Shipping").trim(),
        reply_to: (s.reply_to || "info@fakheralamshipping.com").trim().toLowerCase(),
        admin_notification_email: (s.admin_notification_email || "info@fakheralamshipping.com").trim().toLowerCase(),
        admin_cc: (s.admin_cc || "").trim(),
        admin_bcc: (s.admin_bcc || "").trim(),
        smtp_host: (s.smtp_host || "").trim(),
        smtp_port: Number(s.smtp_port) || 587,
        smtp_username: (s.smtp_username || "").trim(),
        ssl_mode: s.ssl_mode === "ssl" ? "ssl" : s.ssl_mode === "none" ? "none" : "tls",
        has_password: false,
      };

      // Password Lifecycle: Never store unencrypted, never store in system_settings
      if (s.clear_password) {
        await adminClient.from("smtp_secrets").delete().eq("key", "smtp_password");
        sanitizedSmtp.has_password = false;
      } else if (s.new_password && s.new_password.trim().length > 0) {
        const encrypted = await encryptSecret(s.new_password.trim());
        await adminClient.from("smtp_secrets").upsert({
          key: "smtp_password",
          encrypted_value: encrypted,
          updated_at: new Date().toISOString(),
        });
        sanitizedSmtp.has_password = true;
      } else {
        // Retain existing state
        const { data: existingSecret } = await adminClient
          .from("smtp_secrets")
          .select("key")
          .eq("key", "smtp_password")
          .maybeSingle();
        sanitizedSmtp.has_password = Boolean(existingSecret?.key);
      }

      // Persist metadata in system_settings
      await Promise.all([
        adminClient.from("system_settings").upsert({
          key: "email_smtp_settings",
          value: sanitizedSmtp,
          description: "Authoritative SMTP and sender identity configuration",
          updated_by: callerUser.id,
          updated_at: new Date().toISOString(),
        }),
        adminClient.from("system_settings").upsert({
          key: "email_notification_preferences",
          value: {
            staff_invitations: Boolean(n.staff_invitations),
            customer_account_magic_links: Boolean(n.customer_account_magic_links),
            customer_quotation_confirmation: Boolean(n.customer_quotation_confirmation),
            admin_quotation_notifications: Boolean(n.admin_quotation_notifications),
          },
          description: "Outbound email notification triggers and toggles",
          updated_by: callerUser.id,
          updated_at: new Date().toISOString(),
        }),
      ]);

      // Optional Sync to Supabase Auth via Management API if token provided
      const mgmtToken = Deno.env.get("SUPABASE_MANAGEMENT_API_ACCESS_TOKEN");
      const projectRef = Deno.env.get("SUPABASE_PROJECT_REF") || supabaseUrl.replace("https://", "").split(".")[0];
      let authSyncStatus: "not_configured" | "synced" | "failed" = "not_configured";

      if (mgmtToken && projectRef) {
        try {
          let secretPass = "";
          if (sanitizedSmtp.has_password) {
            const { data: secRow } = await adminClient
              .from("smtp_secrets")
              .select("encrypted_value")
              .eq("key", "smtp_password")
              .maybeSingle();
            if (secRow?.encrypted_value) {
              secretPass = await decryptSecret(secRow.encrypted_value);
            }
          }

          const patchPayload =
            sanitizedSmtp.provider === "custom_smtp"
              ? {
                  smtp_admin_email: sanitizedSmtp.from_email,
                  smtp_host: sanitizedSmtp.smtp_host,
                  smtp_port: sanitizedSmtp.smtp_port,
                  smtp_user: sanitizedSmtp.smtp_username,
                  smtp_pass: secretPass || undefined,
                  smtp_sender_name: sanitizedSmtp.from_name,
                }
              : {
                  smtp_host: "",
                  smtp_user: "",
                  smtp_pass: "",
                };

          const patchRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${mgmtToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(patchPayload),
          });

          authSyncStatus = patchRes.ok ? "synced" : "failed";
        } catch {
          authSyncStatus = "failed";
        }
      }

      // Record Audit Event without credentials
      await adminClient.from("audit_events").insert({
        entity_table: "system_settings",
        entity_id: "email_smtp_settings",
        action: "UPDATE_SMTP_SETTINGS",
        performed_by: callerUser.id,
        new_data: {
          provider: sanitizedSmtp.provider,
          from_email: sanitizedSmtp.from_email,
          from_name: sanitizedSmtp.from_name,
          smtp_host: sanitizedSmtp.smtp_host,
          smtp_port: sanitizedSmtp.smtp_port,
          ssl_mode: sanitizedSmtp.ssl_mode,
          has_password: sanitizedSmtp.has_password,
          auth_sync_status: authSyncStatus,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email and SMTP settings saved successfully.",
          has_password: sanitizedSmtp.has_password,
          auth_sync_status: authSyncStatus,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: send-test-email
    // -------------------------------------------------------------------------
    if (action === "send-test-email") {
      const recipient = (body.test_recipient || callerUser.email || "").trim().toLowerCase();
      if (!recipient || !recipient.includes("@")) {
        return new Response(JSON.stringify({ error: "A valid recipient email address is required for testing." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: smtpData } = await adminClient
        .from("system_settings")
        .select("value")
        .eq("key", "email_smtp_settings")
        .maybeSingle();

      const conf = (smtpData?.value as Record<string, unknown>) || {};
      const provider = (conf.provider as string) || "supabase";

      let errorSummary: string | null = null;
      let deliveryStatus: "delivered" | "failed" = "delivered";

      if (provider === "custom_smtp") {
        const host = String(conf.smtp_host || "");
        const port = Number(conf.smtp_port) || 587;
        const sslMode = (conf.ssl_mode as "tls" | "ssl" | "none") || "tls";
        const username = String(conf.smtp_username || "");

        if (!host) {
          return new Response(JSON.stringify({ error: "SMTP Host must be configured before sending a test email." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let password = "";
        const { data: secretRow } = await adminClient
          .from("smtp_secrets")
          .select("encrypted_value")
          .eq("key", "smtp_password")
          .maybeSingle();

        if (secretRow?.encrypted_value) {
          try {
            password = await decryptSecret(secretRow.encrypted_value);
          } catch {
            return new Response(
              JSON.stringify({ error: "Failed to decrypt saved SMTP password. Please re-enter the password." }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        try {
          await sendRawSmtpEmail({
            host,
            port,
            sslMode,
            username: username || undefined,
            password: password || undefined,
            from: String(conf.from_email || "noreply@fakheralamshipping.com"),
            fromName: String(conf.from_name || "Fakher Alam Shipping"),
            to: recipient,
            subject: `[Test] Email & SMTP Verification — Fakher Alam Shipping`,
            htmlBody: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #0b192c; padding: 20px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 18px;">SMTP Diagnostic Test</h2>
                  <p style="color: #ff6b00; margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">Configuration Verified</p>
                </div>
                <div style="padding: 24px; color: #1e293b;">
                  <p>Hello,</p>
                  <p>This is a verification email dispatched from the <strong>Fakher Alam Shipping Calculator</strong> administration system.</p>
                  <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0;">
                    <p style="margin: 0; font-size: 13px;"><strong>Provider:</strong> Custom SMTP Server</p>
                    <p style="margin: 4px 0 0; font-size: 13px;"><strong>Host:</strong> ${host}:${port}</p>
                    <p style="margin: 4px 0 0; font-size: 13px;"><strong>Dispatched At:</strong> ${new Date().toISOString()}</p>
                  </div>
                  <p style="font-size: 13px; color: #64748b;">Your custom SMTP host and credentials are communicating properly with carrier servers.</p>
                </div>
              </div>
            `,
          });
        } catch (err: unknown) {
          deliveryStatus = "failed";
          errorSummary = err instanceof Error ? err.message : "SMTP connection failed";
        }
      } else {
        // Supabase Auth Provider Test Email
        try {
          const { error: inviteErr } = await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: recipient,
          });
          if (inviteErr) {
            deliveryStatus = "failed";
            errorSummary = inviteErr.message;
          }
        } catch (err: unknown) {
          deliveryStatus = "failed";
          errorSummary = err instanceof Error ? err.message : "Supabase Auth email test failed";
        }
      }

      // Log delivery attempt with masked recipient
      await adminClient.from("email_delivery_logs").insert({
        email_type: "test_verification",
        recipient_masked: maskEmail(recipient),
        subject: "[Test] Email & SMTP Verification",
        provider,
        status: deliveryStatus,
        error_summary: errorSummary,
        metadata: {
          requested_by: callerUser.id,
          provider,
        },
      });

      // Log audit event
      await adminClient.from("audit_events").insert({
        entity_table: "system_settings",
        entity_id: "test_email",
        action: "TEST_EMAIL_SENT",
        performed_by: callerUser.id,
        new_data: {
          recipient_masked: maskEmail(recipient),
          provider,
          status: deliveryStatus,
          error_summary: errorSummary,
        },
      });

      if (deliveryStatus === "failed") {
        return new Response(
          JSON.stringify({
            success: false,
            error: errorSummary || "Failed to deliver test email.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Test email dispatched successfully to ${maskEmail(recipient)}.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: get-templates
    // -------------------------------------------------------------------------
    if (action === "get-templates") {
      const { data: templates, error: tplErr } = await adminClient
        .from("email_templates")
        .select("*")
        .order("template_key");

      if (tplErr) throw tplErr;

      return new Response(JSON.stringify({ success: true, templates: templates || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: save-template
    // -------------------------------------------------------------------------
    if (action === "save-template") {
      const t = body.template;
      if (!t || !t.template_key || !t.subject || !t.body_html) {
        return new Response(JSON.stringify({ error: "Template key, subject, and HTML body are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch template schema to enforce required placeholders
      const { data: existingTpl } = await adminClient
        .from("email_templates")
        .select("required_placeholders, name")
        .eq("template_key", t.template_key)
        .maybeSingle();

      const requiredPlaceholders: string[] = existingTpl?.required_placeholders || [];
      for (const ph of requiredPlaceholders) {
        if (!t.body_html.includes(ph) && (!t.body_text || !t.body_text.includes(ph))) {
          return new Response(
            JSON.stringify({
              error: `Security constraint: Template must retain the required placeholder "${ph}" for authentication to function.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await adminClient.from("email_templates").update({
        subject: t.subject.trim(),
        body_html: t.body_html,
        body_text: t.body_text || null,
        is_active: t.is_active !== false,
        updated_at: new Date().toISOString(),
      }).eq("template_key", t.template_key);

      // Audit log
      await adminClient.from("audit_events").insert({
        entity_table: "email_templates",
        entity_id: t.template_key,
        action: "UPDATE_EMAIL_TEMPLATE",
        performed_by: callerUser.id,
        new_data: {
          template_key: t.template_key,
          subject: t.subject.trim(),
          is_active: t.is_active !== false,
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: `Email template "${existingTpl?.name || t.template_key}" updated successfully.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: get-delivery-logs
    // -------------------------------------------------------------------------
    if (action === "get-delivery-logs") {
      const page = Math.max(1, body.page || 1);
      const pageSize = Math.min(50, Math.max(5, body.page_size || 15));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: logs, count, error: logsErr } = await adminClient
        .from("email_delivery_logs")
        .select("id, email_type, recipient_masked, subject, provider, status, error_summary, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (logsErr) throw logsErr;

      return new Response(
        JSON.stringify({
          success: true,
          logs: logs || [],
          total: count || 0,
          page,
          page_size: pageSize,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
