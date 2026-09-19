-- Migration: 20260919210000_email_and_smtp_settings_schema.sql
-- Description: Schema for secure SMTP credentials storage, email templates, delivery logs, and audit trail actions.

BEGIN;

-- 1. Server-Only Encrypted SMTP Secrets Table
-- This table stores encrypted credentials and has Row Level Security ENABLED and FORCED.
-- Zero policies exist for anon or authenticated, completely blocking direct client-side SELECT, INSERT, UPDATE, DELETE.
-- Only the service_role key (used inside protected Supabase Edge Functions) can access this table.
CREATE TABLE IF NOT EXISTS public.smtp_secrets (
    key text PRIMARY KEY,
    encrypted_value text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.smtp_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_secrets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.smtp_secrets FROM PUBLIC;
REVOKE ALL ON TABLE public.smtp_secrets FROM anon;
REVOKE ALL ON TABLE public.smtp_secrets FROM authenticated;
GRANT ALL ON TABLE public.smtp_secrets TO service_role;

-- 2. Email Delivery Logs Table
-- Append-only audit record for outbound email delivery attempts with masked recipients and sanitized status.
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email_type text NOT NULL,
    recipient_masked text NOT NULL,
    subject text,
    provider text NOT NULL DEFAULT 'supabase',
    status text NOT NULL CHECK (status IN ('delivered', 'sent', 'failed', 'queued')),
    error_summary text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_created_at ON public.email_delivery_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status ON public.email_delivery_logs(status);

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view email delivery logs"
ON public.email_delivery_logs FOR SELECT TO authenticated
USING (public.has_permission('settings.view') OR public.has_permission('staff.view'));

-- 3. Email Templates Table
-- Authoritative templates for staff invitations, customer magic links, and quotation confirmations.
CREATE TABLE IF NOT EXISTS public.email_templates (
    template_key text PRIMARY KEY,
    name text NOT NULL,
    description text,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text,
    supported_placeholders text[] NOT NULL DEFAULT '{}',
    required_placeholders text[] NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view email templates"
ON public.email_templates FOR SELECT TO authenticated
USING (public.has_permission('settings.view') OR public.has_permission('staff.view'));

CREATE POLICY "Super admins can manage email templates"
ON public.email_templates FOR ALL TO authenticated
USING (public.has_permission('settings.manage'))
WITH CHECK (public.has_permission('settings.manage'));

-- 4. Seed Default System Settings for Email & SMTP (Without credentials)
INSERT INTO public.system_settings (key, value, description)
VALUES
(
    'email_smtp_settings',
    jsonb_build_object(
        'provider', 'supabase',
        'from_email', 'noreply@fakheralamshipping.com',
        'from_name', 'Fakher Alam Shipping',
        'reply_to', 'info@fakheralamshipping.com',
        'admin_notification_email', 'info@fakheralamshipping.com',
        'admin_cc', '',
        'admin_bcc', '',
        'smtp_host', '',
        'smtp_port', 587,
        'smtp_username', '',
        'ssl_mode', 'tls',
        'has_password', false
    ),
    'Authoritative SMTP and sender identity configuration'
),
(
    'email_notification_preferences',
    jsonb_build_object(
        'staff_invitations', true,
        'customer_account_magic_links', true,
        'customer_quotation_confirmation', true,
        'admin_quotation_notifications', true
    ),
    'Outbound email notification triggers and toggles'
)
ON CONFLICT (key) DO NOTHING;

-- 5. Seed Core Email Templates with Brand-Aligned Styling and Required Placeholders
INSERT INTO public.email_templates (
    template_key, name, description, subject, body_html, body_text, supported_placeholders, required_placeholders
) VALUES
(
    'staff_invitation',
    'Staff Team Invitation',
    'Invitation email dispatched to newly invited team members with their portal activation link.',
    'You have been invited to join the {{company_name}} Staff Portal',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #0b192c; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">{{company_name}}</h1>
    <p style="color: #ff6b00; margin: 4px 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase;">Staff Portal Access</p>
  </div>
  <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Welcome, {{staff_name}}!</h2>
    <p style="font-size: 14px; color: #475569;">You have been invited to join the operations team at <strong>{{company_name}}</strong> as a verified staff member.</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #ff6b00; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Assigned Role:</strong> {{role_name}}</p>
    </div>
    <p style="font-size: 14px; color: #475569;">Click the button below to accept your invitation and set up your secure staff credentials:</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{action_link}}" style="background-color: #ff6b00; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Accept Staff Invitation</a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">This invitation link is valid for 7 days. If you did not anticipate this email, please contact your administrator.</p>
  </div>
  <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b;">
    &copy; {{company_name}} &bull; Confidential Operational Communications
  </div>
</div>',
    'Welcome {{staff_name}}!\n\nYou have been invited to join {{company_name}} as {{role_name}}.\n\nAccept your invitation at: {{action_link}}\n\nThis link is valid for 7 days.',
    ARRAY['{{company_name}}', '{{staff_name}}', '{{role_name}}', '{{action_link}}'],
    ARRAY['{{action_link}}']
),
(
    'customer_magic_link',
    'Customer Magic Link & Account Activation',
    'Passwordless authentication and secure quote review link for customer portal.',
    'Your Secure Access Link — {{company_name}} Customer Portal',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #0b192c; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">{{company_name}}</h1>
    <p style="color: #ff6b00; margin: 4px 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase;">Customer Portal & Quotations</p>
  </div>
  <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Hello, {{customer_name}}</h2>
    <p style="font-size: 14px; color: #475569;">Click the button below to securely access your customer account and view your saved vehicle shipping quotations:</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{action_link}}" style="background-color: #ff6b00; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Access My Saved Quotes</a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">For your security, this passwordless sign-in link expires in 15 minutes and can only be used once.</p>
  </div>
  <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b;">
    &copy; {{company_name}} &bull; UAE & International Vehicle Logistics
  </div>
</div>',
    'Hello {{customer_name}},\n\nClick the link below to access your saved vehicle shipping quotations:\n\n{{action_link}}\n\nThis link expires in 15 minutes.',
    ARRAY['{{company_name}}', '{{customer_name}}', '{{action_link}}'],
    ARRAY['{{action_link}}']
),
(
    'quotation_confirmation',
    'Customer Quotation Confirmation',
    'Automated quotation confirmation email sent to the customer upon quote generation.',
    'Quotation Confirmation [{{quotation_reference}}] — {{company_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #0b192c; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">{{company_name}}</h1>
    <p style="color: #ff6b00; margin: 4px 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase;">Official Shipping Quotation</p>
  </div>
  <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Quotation Reference: {{quotation_reference}}</h2>
    <p style="font-size: 14px; color: #475569;">Dear {{customer_name}},</p>
    <p style="font-size: 14px; color: #475569;">Thank you for choosing {{company_name}}. Your vehicle shipping quote has been generated successfully.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-size: 13px;"><strong>Vehicle:</strong> {{vehicle_description}}</p>
      <p style="margin: 0 0 8px; font-size: 13px;"><strong>Maritime Route:</strong> {{route_description}}</p>
      <p style="margin: 0; font-size: 15px; font-weight: 800; color: #ff6b00;"><strong>Total Estimated Charges:</strong> {{total_amount}}</p>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{{portal_link}}" style="background-color: #0b192c; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">View in Customer Portal</a>
    </div>
    <p style="font-size: 12px; color: #64748b;">This quotation is valid for {{valid_days}} days from the date of issue.</p>
  </div>
  <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b;">
    &copy; {{company_name}} &bull; UAE Vehicle Shipping & Logistics
  </div>
</div>',
    'Dear {{customer_name}},\n\nYour quotation {{quotation_reference}} for {{vehicle_description}} is ready.\nTotal Estimated Charges: {{total_amount}}\nRoute: {{route_description}}\n\nView quote: {{portal_link}}',
    ARRAY['{{company_name}}', '{{customer_name}}', '{{quotation_reference}}', '{{vehicle_description}}', '{{route_description}}', '{{total_amount}}', '{{valid_days}}', '{{portal_link}}'],
    ARRAY['{{quotation_reference}}', '{{total_amount}}']
),
(
    'admin_new_quotation',
    'Admin New Quotation Notification',
    'Instant notification dispatched to operations/admin inbox when a customer saves a quote or requests booking.',
    'New Customer Quotation: {{quotation_reference}} ({{total_amount}})',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #0b192c; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Operations Alert &bull; New Quote</h1>
  </div>
  <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
    <h3 style="margin-top: 0; color: #0f172a;">New Quotation: {{quotation_reference}}</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #64748b;">Customer:</td><td style="padding: 6px 0; font-weight: 700;">{{customer_name}} ({{customer_phone}})</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Vehicle:</td><td style="padding: 6px 0; font-weight: 700;">{{vehicle_description}}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Route:</td><td style="padding: 6px 0; font-weight: 700;">{{route_description}}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Total Amount:</td><td style="padding: 6px 0; font-weight: 800; color: #ff6b00;">{{total_amount}}</td></tr>
    </table>
    <div style="margin-top: 20px;">
      <a href="{{admin_quotation_link}}" style="background-color: #ff6b00; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">Open in Admin Portal</a>
    </div>
  </div>
</div>',
    'New Quotation Generated: {{quotation_reference}}\nCustomer: {{customer_name}} ({{customer_phone}})\nVehicle: {{vehicle_description}}\nRoute: {{route_description}}\nTotal: {{total_amount}}\n\nAdmin Link: {{admin_quotation_link}}',
    ARRAY['{{company_name}}', '{{quotation_reference}}', '{{customer_name}}', '{{customer_phone}}', '{{vehicle_description}}', '{{route_description}}', '{{total_amount}}', '{{admin_quotation_link}}'],
    ARRAY['{{quotation_reference}}', '{{admin_quotation_link}}']
)
ON CONFLICT (template_key) DO NOTHING;

-- 6. Update audit_events_action_check to permit SMTP audit actions
ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_action_check;

ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_action_check CHECK (
    action IN (
        -- Standard CRUD actions
        'create',
        'update',
        'delete',
        'execute',
        -- Role Management actions
        'CREATE_ROLE',
        'UPDATE_ROLE',
        'DELETE_ROLE',
        'CLONE_ROLE',
        -- Staff Management actions
        'ROLE_UPDATED',
        'STATUS_TOGGLED',
        'PROVISION_ACTIVE',
        'INVITE_PENDING',
        'INVITATION_RESENT',
        'INVITATION_REVOKED',
        'STAFF_INVITATION_ACCEPTED',
        'INVITATION_CREATED',
        'INVITATION_ACCEPTED',
        -- Email & SMTP Settings actions
        'UPDATE_SMTP_SETTINGS',
        'TEST_EMAIL_SENT',
        'UPDATE_EMAIL_TEMPLATE'
    )
);

COMMIT;
