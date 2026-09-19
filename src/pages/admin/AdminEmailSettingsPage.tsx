import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  adminService,
  AdminEmailSmtpSettings,
  AdminNotificationPreferences,
  AdminEmailTemplate,
  AdminEmailDeliveryLog,
} from '../../services/adminService';
import { useAuth } from '../../features/auth/AuthContext';
import {
  Mail,
  Server,
  Bell,
  FileCode,
  ListOrdered,
  RefreshCw,
  Send,
  Lock,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Key,
  Info,
} from 'lucide-react';

export const AdminEmailSettingsPage: React.FC = () => {
  const { user, role } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'smtp' | 'notifications' | 'templates' | 'logs'>('smtp');

  // Loading & Action feedback states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Tab 1: SMTP Settings State
  const [settings, setSettings] = useState<AdminEmailSmtpSettings>({
    provider: 'supabase',
    from_email: '',
    from_name: 'Fakher Alam Auto Shipping',
    reply_to: '',
    admin_notification_email: '',
    admin_cc: '',
    admin_bcc: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    ssl_mode: 'tls',
    has_password: false,
  });
  const [newPassword, setNewPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Tab 2: Notifications Preferences State
  const [notifications, setNotifications] = useState<AdminNotificationPreferences>({
    staff_invitations: true,
    customer_account_magic_links: true,
    customer_quotation_confirmation: true,
    admin_quotation_notifications: true,
  });

  // Tab 3: Email Templates State
  const [templates, setTemplates] = useState<AdminEmailTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('staff_invitation');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [templateIsActive, setTemplateIsActive] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Tab 4: Delivery Logs State
  const [logs, setLogs] = useState<AdminEmailDeliveryLog[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logPageSize] = useState(15);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Load Main Settings & Notifications
  const loadData = useCallback(async () => {
    try {
      setActionError(null);
      const data = await adminService.getEmailSettings();
      setSettings(data.settings);
      setNotifications(data.notifications);

      if (!testRecipient && user?.email) {
        setTestRecipient(user.email);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve email settings.';
      setActionError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.email, testRecipient]);

  // Load Templates
  const loadTemplates = useCallback(async () => {
    try {
      const list = await adminService.getEmailTemplates();
      setTemplates(list);
      if (list.length > 0) {
        const found = list.find((t) => t.template_key === selectedTemplateKey) || list[0];
        setSelectedTemplateKey(found.template_key);
        setTemplateSubject(found.subject);
        setTemplateHtml(found.body_html);
        setTemplateIsActive(found.is_active);
      }
    } catch (err: unknown) {
      console.warn('Could not load email templates', err);
    }
  }, [selectedTemplateKey]);

  // Load Delivery Logs
  const loadLogs = useCallback(async (page: number) => {
    setIsLogsLoading(true);
    try {
      const result = await adminService.getEmailDeliveryLogs(page, logPageSize);
      setLogs(result.logs);
      setLogTotal(result.total);
      setLogPage(result.page);
    } catch (err: unknown) {
      console.warn('Could not load delivery logs', err);
    } finally {
      setIsLogsLoading(false);
    }
  }, [logPageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates();
    } else if (activeTab === 'logs') {
      loadLogs(1);
    }
  }, [activeTab, loadTemplates, loadLogs]);

  // Handle template selection change
  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    setTemplateError(null);
    setTemplateSuccess(null);
    const tmpl = templates.find((t) => t.template_key === key);
    if (tmpl) {
      setTemplateSubject(tmpl.subject);
      setTemplateHtml(tmpl.body_html);
      setTemplateIsActive(tmpl.is_active);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    if (activeTab === 'smtp' || activeTab === 'notifications') {
      await loadData();
    } else if (activeTab === 'templates') {
      await loadTemplates();
    } else if (activeTab === 'logs') {
      await loadLogs(logPage);
    }
    setIsRefreshing(false);
  };

  // Save Tab 1: SMTP Settings
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);

    // Validation
    if (!settings.from_email || !settings.from_email.includes('@')) {
      setActionError('A valid sender "From Email" is required.');
      setIsSaving(false);
      return;
    }

    if (settings.provider === 'custom_smtp') {
      if (!settings.smtp_host.trim()) {
        setActionError('Custom SMTP Host is required.');
        setIsSaving(false);
        return;
      }
      if (!settings.smtp_port || settings.smtp_port < 1 || settings.smtp_port > 65535) {
        setActionError('A valid SMTP Port (1-65535) is required.');
        setIsSaving(false);
        return;
      }
    }

    try {
      const res = await adminService.saveEmailSettings({
        settings: {
          ...settings,
          new_password: newPassword.trim() ? newPassword : undefined,
          clear_password: clearPassword,
        },
        notifications,
      });

      setActionSuccess(res.message || 'SMTP settings updated successfully.');
      setSettings((prev) => ({ ...prev, has_password: res.has_password }));
      setNewPassword('');
      setClearPassword(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save email settings.';
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Tab 2: Notification Preferences
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await adminService.saveEmailSettings({
        settings,
        notifications,
      });
      setActionSuccess('Notification routing preferences saved successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save notification preferences.';
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Send Test Email
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !testRecipient.includes('@')) {
      setTestResult({ success: false, message: 'Please provide a valid destination email address.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await adminService.sendTestEmail(testRecipient.trim());
      setTestResult({ success: true, message: res.message || 'Test email dispatched successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send test email.';
      setTestResult({ success: false, message: msg });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Save Selected Email Template with required placeholder checks
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateSaving(true);
    setTemplateError(null);
    setTemplateSuccess(null);

    const currentTmpl = templates.find((t) => t.template_key === selectedTemplateKey);
    if (!currentTmpl) {
      setTemplateError('Selected template not found.');
      setTemplateSaving(false);
      return;
    }

    // Critical validation: check that all required placeholders exist in the body
    const missingTokens = (currentTmpl.required_placeholders || []).filter(
      (token) => !templateHtml.includes(token)
    );

    if (missingTokens.length > 0) {
      setTemplateError(
        `Security requirement: The template body MUST include the following mandatory tokens: ${missingTokens.join(
          ', '
        )}`
      );
      setTemplateSaving(false);
      return;
    }

    if (!templateSubject.trim()) {
      setTemplateError('Subject line cannot be blank.');
      setTemplateSaving(false);
      return;
    }

    try {
      const res = await adminService.saveEmailTemplate({
        template_key: selectedTemplateKey,
        subject: templateSubject.trim(),
        body_html: templateHtml,
        is_active: templateIsActive,
      });

      setTemplateSuccess(res.message || 'Template saved successfully.');
      // Refresh local templates state
      setTemplates((prev) =>
        prev.map((t) =>
          t.template_key === selectedTemplateKey
            ? { ...t, subject: templateSubject, body_html: templateHtml, is_active: templateIsActive }
            : t
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update template.';
      setTemplateError(msg);
    } finally {
      setTemplateSaving(false);
    }
  };

  const currentTemplate = templates.find((t) => t.template_key === selectedTemplateKey);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 max-w-md shadow-sm">
          <h3 className="font-black text-sm uppercase tracking-wide">Super Admin Restricted</h3>
          <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
            This configuration module contains sensitive infrastructure settings and is strictly restricted to Super Administrators.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <Spinner size="lg" />
        <span className="text-xs font-semibold text-slate-400 mt-3 tracking-wide">
          Loading Email & SMTP Infrastructure...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              System Infrastructure
            </span>
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-red-600" />
              Super Admin Only
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <Mail className="w-6 h-6 text-brand-orange-500" />
            Email & SMTP Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage transactional email delivery, outbound SMTP credentials, automated notifications, and template content.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            startIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="text-xs font-bold whitespace-nowrap"
          >
            Refresh
          </Button>
        </div>
      </div>

      {actionError && (
        <Alert variant="error" title="Notice">
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('smtp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'smtp'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>SMTP Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'templates'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Email Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Delivery Logs</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SMTP SETTINGS */}
      {/* ============================================================== */}
      {activeTab === 'smtp' && (
        <div className="space-y-6">
          {/* Supabase Auth SMTP separation notice */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-950 text-sm">
                Application Email Delivery Configuration
              </p>
              <p className="leading-relaxed text-blue-900">
                This page configures application transactional email delivery (customer quote confirmations, PDF receipts, admin notification alerts, and live test dispatches).
              </p>
              <p className="font-bold text-blue-950 pt-0.5">
                Supabase Auth SMTP for staff invitations and magic-link emails must be configured separately in Supabase Dashboard.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSmtp} className="space-y-6">
            {/* Section A: Email Provider */}
            <Card className="p-6">
              <h3 className="text-sm font-bold text-brand-navy-950 mb-1 flex items-center gap-2">
                <Server className="w-4 h-4 text-brand-orange-500" />
                Application Email Delivery Provider
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Choose whether application emails route through the default Supabase service or your custom SMTP server.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settings.provider === 'supabase'
                      ? 'border-brand-orange-500 bg-brand-orange-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value="supabase"
                    checked={settings.provider === 'supabase'}
                    onChange={() => setSettings((s) => ({ ...s, provider: 'supabase' }))}
                    className="mt-0.5 text-brand-orange-500 focus:ring-brand-orange-500"
                  />
                  <div>
                    <div className="text-sm font-bold text-brand-navy-950 flex items-center gap-2">
                      Supabase Auth Service
                      <Badge variant="default" size="sm">Built-in</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Uses the built-in Supabase Auth email service. Subject to default provider hourly rate limits.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settings.provider === 'custom_smtp'
                      ? 'border-brand-orange-500 bg-brand-orange-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value="custom_smtp"
                    checked={settings.provider === 'custom_smtp'}
                    onChange={() => setSettings((s) => ({ ...s, provider: 'custom_smtp' }))}
                    className="mt-0.5 text-brand-orange-500 focus:ring-brand-orange-500"
                  />
                  <div>
                    <div className="text-sm font-bold text-brand-navy-950 flex items-center gap-2">
                      Custom SMTP Server
                      <Badge variant="orange" size="sm">Recommended</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Route high-volume transactional emails through your own domain or service (SendGrid, Mailgun, AWS SES, Google Workspace).
                    </p>
                  </div>
                </label>
              </div>
            </Card>

            {/* Section B: Sender Identity */}
            <Card className="p-6">
              <h3 className="text-sm font-bold text-brand-navy-950 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-orange-500" />
                Sender Identity & Headers
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Define the branding and addresses displayed in email clients when users receive messages.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="From Email Address"
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => setSettings((s) => ({ ...s, from_email: e.target.value }))}
                  placeholder="e.g. notifications@fakheralam.com"
                  helperText="Verified sender address with SPF/DKIM configured"
                  required
                />

                <Input
                  label="From Name"
                  type="text"
                  value={settings.from_name}
                  onChange={(e) => setSettings((s) => ({ ...s, from_name: e.target.value }))}
                  placeholder="e.g. Fakher Alam Auto Shipping"
                  helperText="Friendly company name shown in recipients' inbox"
                  required
                />

                <Input
                  label="Reply-To Email Address"
                  type="email"
                  value={settings.reply_to}
                  onChange={(e) => setSettings((s) => ({ ...s, reply_to: e.target.value }))}
                  placeholder="e.g. support@fakheralam.com"
                  helperText="Optional fallback where customer replies will go"
                />
              </div>
            </Card>

            {/* Section C: Admin Routing */}
            <Card className="p-6">
              <h3 className="text-sm font-bold text-brand-navy-950 mb-1 flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-orange-500" />
                Admin Notification Routing
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Configure who receives admin alerts when quotations are created or inquiries are submitted.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Primary Admin Notification Email"
                  type="email"
                  value={settings.admin_notification_email}
                  onChange={(e) => setSettings((s) => ({ ...s, admin_notification_email: e.target.value }))}
                  placeholder="e.g. dispatch@fakheralam.com"
                  helperText="Primary operational inbox"
                />

                <Input
                  label="Admin CC (Comma-separated)"
                  type="text"
                  value={settings.admin_cc}
                  onChange={(e) => setSettings((s) => ({ ...s, admin_cc: e.target.value }))}
                  placeholder="sales@company.com, manager@company.com"
                  helperText="Recipients copied on new quote notifications"
                />

                <Input
                  label="Admin BCC (Comma-separated)"
                  type="text"
                  value={settings.admin_bcc}
                  onChange={(e) => setSettings((s) => ({ ...s, admin_bcc: e.target.value }))}
                  placeholder="audit@company.com, archive@company.com"
                  helperText="Blind carbon copy for archiving/compliance"
                />
              </div>
            </Card>

            {/* Section D: Custom SMTP Details (conditional) */}
            {settings.provider === 'custom_smtp' && (
              <Card className="p-6 border-brand-orange-200/80 bg-gradient-to-b from-white to-slate-50/40">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-brand-navy-950 flex items-center gap-2">
                      <Key className="w-4 h-4 text-brand-orange-500" />
                      Custom SMTP Server Configuration
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Credentials are encrypted using AES-256-GCM and stored only in server-isolated vault storage.
                    </p>
                  </div>
                  <Badge variant="navy" size="sm">
                    AES-256-GCM Vault
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="SMTP Host"
                    type="text"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings((s) => ({ ...s, smtp_host: e.target.value }))}
                    placeholder="e.g. smtp.sendgrid.net"
                    helperText="Hostname or IP of your SMTP server"
                    required
                  />

                  <Input
                    label="SMTP Port"
                    type="number"
                    value={settings.smtp_port || 587}
                    onChange={(e) => setSettings((s) => ({ ...s, smtp_port: parseInt(e.target.value, 10) || 587 }))}
                    placeholder="587"
                    helperText="Common ports: 587 (TLS), 465 (SSL), 25"
                    required
                  />

                  <Select
                    label="Encryption / SSL Mode"
                    value={settings.ssl_mode}
                    onChange={(e) => setSettings((s) => ({ ...s, ssl_mode: e.target.value as 'tls' | 'ssl' | 'none' }))}
                    helperText="Select STARTTLS for port 587 or direct SSL for port 465"
                  >
                    <option value="tls">STARTTLS (Port 587 - Recommended)</option>
                    <option value="ssl">SSL / TLS (Port 465)</option>
                    <option value="none">None / Plain (Port 25)</option>
                  </Select>

                  <Input
                    label="SMTP Username"
                    type="text"
                    value={settings.smtp_username}
                    onChange={(e) => setSettings((s) => ({ ...s, smtp_username: e.target.value }))}
                    placeholder="e.g. apikey or user@domain.com"
                    helperText="Account or API key identifier"
                  />

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-slate-700">
                      SMTP Password
                    </label>

                    {settings.has_password ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                          <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold">
                            SMTP password saved securely in encrypted vault. Enter a new value below to replace it.
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="relative flex-1 w-full">
                            <Input
                              type={showPasswordInput ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password to replace existing..."
                              disabled={clearPassword}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPasswordInput(!showPasswordInput)}
                            className="text-xs shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5 me-1" />
                            {showPasswordInput ? 'Hide' : 'Reveal'}
                          </Button>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-rose-700 font-semibold cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={clearPassword}
                            onChange={(e) => setClearPassword(e.target.checked)}
                            className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                          />
                          <span>Clear the saved SMTP password on the next save.</span>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>No SMTP password is currently saved in the vault.</span>
                        </div>
                        <Input
                          type={showPasswordInput ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter your SMTP password or API secret key..."
                          helperText="The password will be encrypted immediately and never shown again"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Save Button for SMTP */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="px-6 font-bold"
              >
                {isSaving ? <Spinner size="sm" className="me-2" /> : null}
                Save Email & SMTP Settings
              </Button>
            </div>
          </form>

          {/* Test Email Card */}
          <Card className="p-6 border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-brand-navy-950 mb-1 flex items-center gap-2">
              <Send className="w-4 h-4 text-brand-orange-500" />
              Send Live Test Email
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Dispatch a real transactional test email to verify that your active provider and sender identity pass SPF, DKIM, and authentication checks.
            </p>

            <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-xl">
              <div className="flex-1">
                <Input
                  label="Test Recipient Email"
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                disabled={isSendingTest}
                className="font-bold border-brand-navy-800 text-brand-navy-950 hover:bg-white"
              >
                {isSendingTest ? <Spinner size="sm" className="me-2" /> : <Send className="w-4 h-4 me-1.5" />}
                Send Test Email
              </Button>
            </form>

            {testResult && (
              <div className="mt-4">
                <Alert
                  variant={testResult.success ? 'success' : 'error'}
                  title={testResult.success ? 'Test Email Dispatched' : 'Test Delivery Failed'}
                >
                  {testResult.message}
                </Alert>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: NOTIFICATIONS ROUTING */}
      {/* ============================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-brand-navy-950 mb-1 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-orange-500" />
              Automated Notification Rules
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enable or disable outbound email triggers across the customer lifecycle and staff administration workflows.
            </p>

            <div className="mb-6 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-950">
                  Authentication vs. Application Email Routing
                </p>
                <p className="mt-0.5 text-blue-800 leading-relaxed">
                  Supabase Auth SMTP for staff invitations and magic-link emails must be configured separately in Supabase Dashboard. Toggles below control application event triggering.
                </p>
              </div>
            </div>

            <div className="space-y-4 divide-y divide-slate-100">
              {/* Toggle 1: Staff Invitations */}
              <div className="pt-4 first:pt-0 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-brand-navy-950 flex items-center gap-2">
                    Staff Member Invitations
                    <Badge variant="navy" size="sm">Admin</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Send an automated email containing an invitation token and setup link whenever a new staff member is invited via Staff & Roles.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.staff_invitations}
                    onChange={(e) =>
                      setNotifications((n) => ({ ...n, staff_invitations: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange-500"></div>
                </label>
              </div>

              {/* Toggle 2: Customer Magic Links */}
              <div className="pt-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-brand-navy-950 flex items-center gap-2">
                    Customer Account Magic Links
                    <Badge variant="info" size="sm">Customer</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Deliver passwordless login and account access links to customers when they request an account check or quote recovery.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.customer_account_magic_links}
                    onChange={(e) =>
                      setNotifications((n) => ({ ...n, customer_account_magic_links: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange-500"></div>
                </label>
              </div>

              {/* Toggle 3: Customer Quotation Confirmation */}
              <div className="pt-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-brand-navy-950 flex items-center gap-2">
                    Customer Quotation Confirmation
                    <Badge variant="orange" size="sm">Customer</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Dispatch an official quotation receipt with vehicle details, estimated totals, and a PDF download link immediately after a quote is saved.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.customer_quotation_confirmation}
                    onChange={(e) =>
                      setNotifications((n) => ({ ...n, customer_quotation_confirmation: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange-500"></div>
                </label>
              </div>

              {/* Toggle 4: Admin Quotation Notifications */}
              <div className="pt-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-brand-navy-950 flex items-center gap-2">
                    Admin New Quotation & Enquiry Alerts
                    <Badge variant="navy" size="sm">Operations</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Send real-time alerts to the configured Admin Notification Email, CC, and BCC addresses whenever a high-value quotation or enquiry is generated.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.admin_quotation_notifications}
                    onChange={(e) =>
                      setNotifications((n) => ({ ...n, admin_quotation_notifications: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange-500"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
              <Button
                variant="primary"
                onClick={handleSaveNotifications}
                disabled={isSaving}
                className="px-6 font-bold"
              >
                {isSaving ? <Spinner size="sm" className="me-2" /> : null}
                Save Notification Preferences
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: EMAIL TEMPLATES */}
      {/* ============================================================== */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Template Selector List */}
            <div className="lg:col-span-1 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 mb-2">
                Available Templates ({templates.length})
              </div>
              {templates.map((tmpl) => {
                const isSelected = tmpl.template_key === selectedTemplateKey;
                return (
                  <button
                    key={tmpl.template_key}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.template_key)}
                    className={`w-full text-start p-3.5 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'border-brand-orange-500 bg-brand-orange-50/30 shadow-sm font-bold text-brand-navy-950'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs truncate">{tmpl.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          tmpl.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Template Editor Form */}
            <div className="lg:col-span-3">
              {currentTemplate ? (
                <Card className="p-6">
                  {templateError && (
                    <div className="mb-4">
                      <Alert variant="error" title="Template Validation Error">
                        {templateError}
                      </Alert>
                    </div>
                  )}
                  {templateSuccess && (
                    <div className="mb-4">
                      <Alert variant="success" title="Success">
                        {templateSuccess}
                      </Alert>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-brand-navy-950">
                          {currentTemplate.name}
                        </h3>
                        <Badge variant={templateIsActive ? 'success' : 'default'} size="sm">
                          {templateIsActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Key: <code className="text-brand-orange-600 font-mono">{currentTemplate.template_key}</code>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewMode(!previewMode)}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 me-1" />
                        {previewMode ? 'Edit HTML' : 'Live Preview'}
                      </Button>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer ps-2">
                        <input
                          type="checkbox"
                          checked={templateIsActive}
                          onChange={(e) => setTemplateIsActive(e.target.checked)}
                          className="rounded border-slate-300 text-brand-orange-500 focus:ring-brand-orange-500"
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>

                  {/* Required Tokens Alert */}
                  {currentTemplate.required_placeholders && currentTemplate.required_placeholders.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Required Placeholders:</strong> The following tokens are required for authentication / actions and must remain in the template body:{' '}
                        {currentTemplate.required_placeholders.map((token) => (
                          <code key={token} className="mx-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">
                            {token}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <Input
                      label="Subject Line"
                      type="text"
                      value={templateSubject}
                      onChange={(e) => setTemplateSubject(e.target.value)}
                      placeholder="Email subject..."
                      required
                    />

                    {/* Supported placeholder tags */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Supported Placeholder Variables (Click to copy/insert)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {currentTemplate.supported_placeholders.map((placeholder) => {
                          const isReq = (currentTemplate.required_placeholders || []).includes(placeholder);
                          return (
                            <button
                              key={placeholder}
                              type="button"
                              onClick={() => {
                                setTemplateHtml((prev) => prev + placeholder);
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium border transition-colors ${
                                isReq
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={isReq ? 'Required placeholder' : 'Click to insert'}
                            >
                              {placeholder} {isReq ? '★' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Body Editor or Preview */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        {previewMode ? 'HTML Preview' : 'Template Body (HTML)'}
                      </label>

                      {previewMode ? (
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 min-h-[300px] overflow-auto">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: templateHtml
                                .replace(/{{customer_name}}/g, 'Muhammad Zubair')
                                .replace(/{{inviter_name}}/g, 'System Administrator')
                                .replace(/{{role_name}}/g, 'Operations Manager')
                                .replace(/{{company_name}}/g, 'Fakher Alam Auto Shipping')
                                .replace(/{{action_link}}/g, 'https://example.com/auth/verify?token=example')
                                .replace(/{{quotation_ref}}/g, 'QT-20260919-D3ECFE')
                                .replace(/{{vehicle_summary}}/g, '2017 BMW X5 (Run & Drive)')
                                .replace(/{{total_amount}}/g, '$3,521.58 USD')
                                .replace(/{{origin_summary}}/g, 'New York / Newark')
                                .replace(/{{destination_port}}/g, 'Jebel Ali, UAE')
                                .replace(/{{pdf_download_link}}/g, 'https://example.com/quote/download'),
                            }}
                          />
                        </div>
                      ) : (
                        <textarea
                          rows={12}
                          value={templateHtml}
                          onChange={(e) => setTemplateHtml(e.target.value)}
                          className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-3.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-orange-500/20 focus:border-brand-orange-500 leading-relaxed"
                          placeholder="<div style=...>"
                          required
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={templateSaving}
                        className="px-6 font-bold"
                      >
                        {templateSaving ? <Spinner size="sm" className="me-2" /> : null}
                        Save Template Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Card className="p-12 text-center text-slate-400">
                  Select a template from the list to view or edit.
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: DELIVERY LOGS */}
      {/* ============================================================== */}
      {activeTab === 'logs' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-brand-navy-950 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-brand-orange-500" />
                Outbound Email Delivery History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of recent outbound transactional emails. Recipient emails are masked to protect PII.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadLogs(logPage)}
                disabled={isLogsLoading}
                startIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLogsLoading ? 'animate-spin' : ''}`} />}
                className="text-xs font-bold"
              >
                Refresh Logs
              </Button>
            </div>
          </div>

          {isLogsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Spinner size="md" />
              <span className="text-xs text-slate-400 mt-2">Loading email delivery audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No Email Delivery Records Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Dispatched transactional messages and test emails will be logged here with timestamps and delivery statuses.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Email Type</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Notes / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      let statusBadge = <Badge variant="default" size="sm">queued</Badge>;
                      if (log.status === 'delivered') {
                        statusBadge = <Badge variant="success" size="sm">Delivered</Badge>;
                      } else if (log.status === 'sent') {
                        statusBadge = <Badge variant="info" size="sm">Sent</Badge>;
                      } else if (log.status === 'failed') {
                        statusBadge = <Badge variant="danger" size="sm">Failed</Badge>;
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {log.recipient_masked}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                              {log.email_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={log.subject || ''}>
                            {log.subject || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-semibold uppercase text-[10px]">
                            {log.provider}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {statusBadge}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]" title={log.error_summary || ''}>
                            {log.error_summary || 'OK'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                <div>
                  Showing {logs.length} of {logTotal} email events
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage <= 1}
                    onClick={() => loadLogs(logPage - 1)}
                    className="text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 me-1" />
                    Previous
                  </Button>
                  <span className="px-2 font-bold text-slate-700">Page {logPage}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage * logPageSize >= logTotal}
                    onClick={() => loadLogs(logPage + 1)}
                    className="text-xs"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ms-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
