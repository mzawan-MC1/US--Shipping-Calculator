import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteRequestBody {
  action?: "invite" | "resend" | "revoke";
  email?: string;
  full_name?: string;
  role_id?: string;
  invitation_id?: string;
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
        JSON.stringify({ error: "Unauthorized: Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Supabase environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate caller using caller's JWT token
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
        JSON.stringify({ error: "Unauthorized: Invalid, expired, or unverified session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Authorize caller: Verify active staff profile and staff.manage permission
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: callerProfile } = await adminClient
      .from("staff_profiles")
      .select("id, is_active")
      .eq("id", callerUser.id)
      .maybeSingle();

    if (!callerProfile || !callerProfile.is_active) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Caller account is inactive or not an authorized staff member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: hasManagePerm } = await callerClient.rpc("has_permission", {
      required_perm: "staff.manage",
    });

    if (!hasManagePerm) {
      return new Response(
        JSON.stringify({ error: "Forbidden: staff.manage permission required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse and validate request body
    const body: InviteRequestBody = await req.json().catch(() => ({}));
    const action = body.action || "invite";
    const cleanEmail = (body.email || "").trim().toLowerCase();
    const cleanName = (body.full_name || "").trim();
    const roleId = (body.role_id || "").trim();

    // 4. Action: Revoke pending invitation
    if (action === "revoke") {
      const inviteId = body.invitation_id;
      if (!inviteId && !cleanEmail) {
        return new Response(
          JSON.stringify({ error: "invitation_id or email is required to revoke an invitation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let deleteQuery = adminClient.from("staff_invitations").delete();
      if (inviteId) {
        deleteQuery = deleteQuery.eq("id", inviteId);
      } else {
        deleteQuery = deleteQuery.eq("email", cleanEmail);
      }

      const { error: delError } = await deleteQuery;
      if (delError) {
        return new Response(JSON.stringify({ error: delError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log audit event
      await adminClient.from("audit_events").insert({
        entity_table: "staff_invitations",
        entity_id: inviteId || cleanEmail,
        action: "INVITATION_REVOKED",
        performed_by: callerUser.id,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Staff invitation revoked successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Validation for Invite & Resend
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return new Response(
        JSON.stringify({ error: "A valid email address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Resend
    if (action === "resend") {
      const { data: existingInvite } = await adminClient
        .from("staff_invitations")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!existingInvite) {
        return new Response(
          JSON.stringify({ error: "No pending invitation found for this email address" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let emailSent = false;
      let emailNotice = "Record invitation only (Outbound email service not configured on project)";

      try {
        const { error: resendErr } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
          data: { full_name: existingInvite.full_name, role_id: existingInvite.role_id },
        });
        if (!resendErr) {
          emailSent = true;
          emailNotice = "Invitation email resent successfully";
        }
      } catch (_e) {
        emailSent = false;
      }

      await adminClient
        .from("staff_invitations")
        .update({ created_at: new Date().toISOString() })
        .eq("id", existingInvite.id);

      return new Response(
        JSON.stringify({
          success: true,
          action: "resend",
          email_sent: emailSent,
          message: emailSent
            ? "Invitation email resent to " + cleanEmail
            : "Invitation renewed in directory. Outbound email service is unconfigured.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Invite (New)
    if (cleanName.length < 2) {
      return new Response(
        JSON.stringify({ error: "Full name must be at least 2 characters long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role exists
    const { data: roleRow } = await adminClient
      .from("roles")
      .select("id, name")
      .eq("id", roleId)
      .maybeSingle();

    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: `Invalid role '${roleId}'. Role does not exist in system.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if staff profile already active
    const { data: existingStaff } = await adminClient
      .from("staff_profiles")
      .select("id, email, is_active")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingStaff && existingStaff.is_active) {
      return new Response(
        JSON.stringify({ error: "A staff account with this email is already active." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if pending invitation already exists (prevent duplicate invites)
    const { data: existingInvite } = await adminClient
      .from("staff_invitations")
      .select("id, email, role_id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({
          error: "A pending invitation already exists for this email address. Use Resend or Revoke.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger Supabase Admin Auth invite
    let emailSent = false;
    let authUserCreated = false;

    try {
      const { data: inviteRes, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        cleanEmail,
        {
          data: {
            full_name: cleanName,
            role_id: roleId,
          },
        }
      );

      if (!inviteErr && inviteRes?.user) {
        emailSent = true;
        authUserCreated = true;
      } else if (inviteErr?.message?.includes("already been registered") || inviteErr?.message?.includes("already exists")) {
        authUserCreated = true;
      }
    } catch (_err) {
      emailSent = false;
    }

    // Record in staff_invitations
    const { data: newInvite, error: insertErr } = await adminClient
      .from("staff_invitations")
      .insert({
        email: cleanEmail,
        full_name: cleanName,
        role_id: roleId,
        invited_by: callerUser.id,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit event
    await adminClient.from("audit_events").insert({
      entity_table: "staff_invitations",
      entity_id: newInvite.id,
      action: "INVITATION_CREATED",
      performed_by: callerUser.id,
      new_data: { email: cleanEmail, full_name: cleanName, role_id: roleId, email_sent: emailSent },
    });

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: newInvite.id,
        auth_user_created: authUserCreated,
        email_sent: emailSent,
        status: emailSent ? "invited_email_sent" : "recorded_only",
        message: emailSent
          ? `Invitation email dispatched to ${cleanEmail}`
          : `Staff invitation recorded for ${cleanEmail}. (Outbound email service unconfigured; record preserved)`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
