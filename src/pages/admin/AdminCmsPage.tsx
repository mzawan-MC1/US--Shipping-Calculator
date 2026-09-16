import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { adminService, AdminCmsNotice } from '../../services/adminService';
import { useAuth } from '../../features/auth/AuthContext';
import {
  FileText,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Megaphone,
  Building2,
} from 'lucide-react';

export const AdminCmsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageCms = hasPermission('cms.manage');

  const [activeTab, setActiveTab] = useState<'notices' | 'contact'>('notices');
  const [notices, setNotices] = useState<AdminCmsNotice[]>([]);
  const [companyProfile, setCompanyProfile] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notice modal
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeId, setNoticeId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [content, setContent] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [bannerType, setBannerType] = useState<'info' | 'warning' | 'success' | 'announcement'>(
    'info'
  );
  const [displayLocation, setDisplayLocation] = useState<'all' | 'calculator' | 'home' | 'portal'>(
    'calculator'
  );
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Contact form state
  const [supportPhone, setSupportPhone] = useState('+971 50 123 4567');
  const [supportEmail, setSupportEmail] = useState('info@fakheralamshipping.com');
  const [whatsappNumber, setWhatsappNumber] = useState('+971501234567');
  const [addressEn, setAddressEn] = useState('Industrial Area 4, Sharjah, United Arab Emirates');
  const [addressAr, setAddressAr] = useState(
    'المنطقة الصناعية 4، الشارقة، الإمارات العربية المتحدة'
  );
  const [isSavingContact, setIsSavingContact] = useState(false);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [n, settings] = await Promise.all([
        adminService.getCmsNotices(),
        adminService.getSystemSettings(),
      ]);
      setNotices(n);
      const profile = (settings.company_profile as Record<string, unknown>) || {};
      setCompanyProfile(profile);
      if (profile.support_phone) setSupportPhone(String(profile.support_phone));
      if (profile.support_email) setSupportEmail(String(profile.support_email));
      if (profile.whatsapp_number) setWhatsappNumber(String(profile.whatsapp_number));
      if (profile.headquarters_address) setAddressEn(String(profile.headquarters_address));
      if (profile.headquarters_address_ar) setAddressAr(String(profile.headquarters_address_ar));
    } catch (err) {
      console.warn('Failed to load CMS content', err);
      setActionError('Unable to load CMS content.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    loadData();
  };

  const openCreateNotice = () => {
    setNoticeId(undefined);
    setTitle('');
    setTitleAr('');
    setContent('');
    setContentAr('');
    setBannerType('info');
    setDisplayLocation('calculator');
    setIsActive(true);
    setIsNoticeModalOpen(true);
  };

  const openEditNotice = (n: AdminCmsNotice) => {
    setNoticeId(n.id);
    setTitle(n.title);
    setTitleAr(n.titleAr || '');
    setContent(n.content);
    setContentAr(n.contentAr || '');
    setBannerType(n.bannerType);
    setDisplayLocation(n.displayLocation);
    setIsActive(n.isActive);
    setIsNoticeModalOpen(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setActionError('Title and content are required.');
      return;
    }

    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await adminService.saveCmsNotice({
        id: noticeId,
        title,
        titleAr: titleAr || undefined,
        content,
        contentAr: contentAr || undefined,
        bannerType,
        displayLocation,
        isActive,
      });
      setActionSuccess(noticeId ? 'Notice updated.' : 'Notice published.');
      setIsNoticeModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save notice';
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    setActionError(null);
    try {
      await adminService.deleteCmsNotice(id);
      setActionSuccess('Notice deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete notice';
      setActionError(msg);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updatedProfile = {
        ...companyProfile,
        support_phone: supportPhone,
        support_email: supportEmail,
        whatsapp_number: whatsappNumber,
        headquarters_address: addressEn,
        headquarters_address_ar: addressAr,
      };
      await adminService.updateSystemSetting('company_profile', updatedProfile);
      setActionSuccess('Contact information updated successfully.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save contact info';
      setActionError(msg);
    } finally {
      setIsSavingContact(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Content Management
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Bilingual (EN / AR)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-orange-500" />
            Website Content & Announcements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage promotional notices, shipping advisories, and official company contact details
            displayed to customers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canManageCms && activeTab === 'notices' && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateNotice}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Notice
            </Button>
          )}
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('notices')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'notices'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Announcements & Advisories ({notices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'contact'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Profile & Contact Info</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading CMS content...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: NOTICES */}
          {activeTab === 'notices' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map((n) => (
                <Card key={n.id} className="p-5 bg-white border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={n.bannerType === 'announcement' ? 'orange' : 'info'}>
                          {n.bannerType.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {n.displayLocation}
                        </span>
                      </div>
                      <h4 className="font-bold text-brand-navy-950 text-sm">{n.title}</h4>
                      {n.titleAr && (
                        <p className="text-xs font-semibold text-slate-600 text-end dir-rtl mt-0.5">
                          {n.titleAr}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canManageCms && (
                        <>
                          <button
                            onClick={() => openEditNotice(n)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-brand-orange-500"
                            title="Edit Notice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600"
                            title="Delete Notice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                  {n.contentAr && (
                    <p className="text-xs text-slate-600 leading-relaxed text-end dir-rtl border-t border-slate-100 pt-2">
                      {n.contentAr}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">
                      Order: {n.displayOrder} • {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                    {n.isActive ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-slate-400">
                        <XCircle className="w-3 h-3" /> Draft
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* TAB 2: COMPANY CONTACT */}
          {activeTab === 'contact' && (
            <Card className="p-6 bg-white border border-slate-200 max-w-2xl">
              <h3 className="text-base font-bold text-brand-navy-950 mb-1">
                Official Business Information
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Customer-facing contact details displayed in public website footers, WhatsApp direct
                links, and quotation receipts.
              </p>

              <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Customer Support Phone
                    </label>
                    <Input
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      WhatsApp Enquiry Number
                    </label>
                    <Input
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Official Email Address
                  </label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Headquarters Address (English)
                  </label>
                  <Input
                    value={addressEn}
                    onChange={(e) => setAddressEn(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Headquarters Address (Arabic)
                  </label>
                  <Input
                    value={addressAr}
                    onChange={(e) => setAddressAr(e.target.value)}
                    className="text-end dir-rtl"
                  />
                </div>

                {canManageCms && (
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSavingContact}
                      className="font-bold"
                    >
                      {isSavingContact ? 'Saving...' : 'Update Business Details'}
                    </Button>
                  </div>
                )}
              </form>
            </Card>
          )}
        </>
      )}

      {/* Notice Modal */}
      <Modal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        title={noticeId ? 'Edit Announcement Notice' : 'Publish New Notice'}
      >
        <form onSubmit={handleSaveNotice} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Notice Title (English) *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Fast Sailings"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notice Title (Arabic)</label>
            <Input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="العنوان بالعربية"
              className="text-end dir-rtl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Content (English) *</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-orange-500 focus:outline-none"
              placeholder="Message details for customers..."
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Content (Arabic)</label>
            <textarea
              rows={3}
              value={contentAr}
              onChange={(e) => setContentAr(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-orange-500 focus:outline-none text-end dir-rtl"
              placeholder="تفاصيل الرسالة باللغة العربية..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Banner Type</label>
              <select
                value={bannerType}
                onChange={(e) => setBannerType(e.target.value as typeof bannerType)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option value="info">Info</option>
                <option value="announcement">Announcement</option>
                <option value="warning">Warning / Advisory</option>
                <option value="success">Success</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Location</label>
              <select
                value={displayLocation}
                onChange={(e) => setDisplayLocation(e.target.value as typeof displayLocation)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option value="calculator">Calculator Page</option>
                <option value="home">Home Page</option>
                <option value="all">All Pages</option>
                <option value="portal">Staff Portal</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveNotice"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-brand-orange-500 focus:ring-brand-orange-500"
            />
            <label htmlFor="isActiveNotice" className="font-bold text-slate-700 cursor-pointer">
              Publish Notice Immediately
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNoticeModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="font-bold"
            >
              {isSaving ? 'Saving...' : 'Save Notice'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
