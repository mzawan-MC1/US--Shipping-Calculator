import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { adminService, AdminCmsNotice, BrandingSettings, DEFAULT_BRANDING } from '../../services/adminService';
import { useAuth } from '../../features/auth/AuthContext';
import {
  FileText,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Megaphone,
  Building2,
  Upload,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  Clock,
} from 'lucide-react';

export const AdminCmsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageCms = hasPermission('cms.manage');

  const [activeTab, setActiveTab] = useState<'branding' | 'notices'>('branding');
  const [notices, setNotices] = useState<AdminCmsNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notice modal
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeId, setNoticeId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [content, setContent] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [bannerType, setBannerType] = useState<'info' | 'warning' | 'success' | 'announcement'>('info');
  const [displayLocation, setDisplayLocation] = useState<'all' | 'calculator' | 'home' | 'portal'>('calculator');
  const [isActive, setIsActive] = useState(true);
  const [isSavingNotice, setIsSavingNotice] = useState(false);

  // Branding form state
  const [companyName, setCompanyName] = useState(DEFAULT_BRANDING.companyName);
  const [companyNameAr, setCompanyNameAr] = useState(DEFAULT_BRANDING.companyNameAr);
  const [shortName, setShortName] = useState(DEFAULT_BRANDING.shortName);
  const [shortNameAr, setShortNameAr] = useState(DEFAULT_BRANDING.shortNameAr);
  const [tagline, setTagline] = useState(DEFAULT_BRANDING.tagline);
  const [taglineAr, setTaglineAr] = useState(DEFAULT_BRANDING.taglineAr);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_BRANDING.logoUrl);
  const [darkLogoUrl, setDarkLogoUrl] = useState(DEFAULT_BRANDING.darkLogoUrl);
  const [faviconUrl, setFaviconUrl] = useState(DEFAULT_BRANDING.faviconUrl);
  const [browserTitle, setBrowserTitle] = useState(DEFAULT_BRANDING.browserTitle);
  const [browserTitleAr, setBrowserTitleAr] = useState(DEFAULT_BRANDING.browserTitleAr);
  const [metaDescription, setMetaDescription] = useState(DEFAULT_BRANDING.metaDescription);
  const [metaDescriptionAr, setMetaDescriptionAr] = useState(DEFAULT_BRANDING.metaDescriptionAr);
  const [supportPhone, setSupportPhone] = useState(DEFAULT_BRANDING.supportPhone);
  const [supportEmail, setSupportEmail] = useState(DEFAULT_BRANDING.supportEmail);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_BRANDING.whatsappNumber);
  const [addressEn, setAddressEn] = useState(DEFAULT_BRANDING.headquartersAddress);
  const [addressAr, setAddressAr] = useState(DEFAULT_BRANDING.headquartersAddressAr);
  const [businessHours, setBusinessHours] = useState(DEFAULT_BRANDING.businessHours);
  const [businessHoursAr, setBusinessHoursAr] = useState(DEFAULT_BRANDING.businessHoursAr);
  const [copyrightText, setCopyrightText] = useState(DEFAULT_BRANDING.copyrightText);
  const [copyrightTextAr, setCopyrightTextAr] = useState(DEFAULT_BRANDING.copyrightTextAr);

  // Social links
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');

  // Upload progress states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingDarkLogo, setIsUploadingDarkLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [n, b] = await Promise.all([
        adminService.getCmsNotices(),
        adminService.getBrandingSettings(),
      ]);
      setNotices(n);

      setCompanyName(b.companyName);
      setCompanyNameAr(b.companyNameAr);
      setShortName(b.shortName);
      setShortNameAr(b.shortNameAr);
      setTagline(b.tagline);
      setTaglineAr(b.taglineAr);
      setLogoUrl(b.logoUrl);
      setDarkLogoUrl(b.darkLogoUrl);
      setFaviconUrl(b.faviconUrl);
      setBrowserTitle(b.browserTitle);
      setBrowserTitleAr(b.browserTitleAr);
      setMetaDescription(b.metaDescription);
      setMetaDescriptionAr(b.metaDescriptionAr);
      setSupportPhone(b.supportPhone);
      setSupportEmail(b.supportEmail);
      setWhatsappNumber(b.whatsappNumber);
      setAddressEn(b.headquartersAddress);
      setAddressAr(b.headquartersAddressAr);
      setBusinessHours(b.businessHours);
      setBusinessHoursAr(b.businessHoursAr);
      setCopyrightText(b.copyrightText);
      setCopyrightTextAr(b.copyrightTextAr);
      setSocialFacebook(b.socialLinks.facebook || '');
      setSocialInstagram(b.socialLinks.instagram || '');
      setSocialTwitter(b.socialLinks.twitter || '');
      setSocialLinkedin(b.socialLinks.linkedin || '');
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

  // Asset Upload Handlers
  const handleUploadAsset = async (
    file: File,
    type: 'logo' | 'darkLogo' | 'favicon'
  ) => {
    setActionError(null);
    setActionSuccess(null);

    if (type === 'logo') setIsUploadingLogo(true);
    if (type === 'darkLogo') setIsUploadingDarkLogo(true);
    if (type === 'favicon') setIsUploadingFavicon(true);

    try {
      const publicUrl = await adminService.uploadBrandingAsset(file, type);
      if (type === 'logo') setLogoUrl(publicUrl);
      if (type === 'darkLogo') setDarkLogoUrl(publicUrl);
      if (type === 'favicon') setFaviconUrl(publicUrl);
      setActionSuccess(`${type.toUpperCase()} image uploaded successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Asset upload failed';
      setActionError(msg);
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      if (type === 'darkLogo') setIsUploadingDarkLogo(false);
      if (type === 'favicon') setIsUploadingFavicon(false);
    }
  };

  // Save Branding Form
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated: BrandingSettings = {
        companyName,
        companyNameAr,
        shortName,
        shortNameAr,
        tagline,
        taglineAr,
        logoUrl,
        darkLogoUrl,
        faviconUrl,
        browserTitle,
        browserTitleAr,
        metaDescription,
        metaDescriptionAr,
        supportPhone,
        supportEmail,
        whatsappNumber,
        headquartersAddress: addressEn,
        headquartersAddressAr: addressAr,
        businessHours,
        businessHoursAr,
        copyrightText,
        copyrightTextAr,
        socialLinks: {
          facebook: socialFacebook.trim() || undefined,
          instagram: socialInstagram.trim() || undefined,
          twitter: socialTwitter.trim() || undefined,
          linkedin: socialLinkedin.trim() || undefined,
        },
      };

      await adminService.updateBrandingSettings(updated);
      setActionSuccess('Branding & website identity saved successfully.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save branding';
      setActionError(msg);
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Notice Handlers
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

    setIsSavingNotice(true);
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
      setIsSavingNotice(false);
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

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Content & Identity Management
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Bilingual (EN / AR)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-orange-500" />
            Website CMS & Branding
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure official branding identity, logos, SEO titles, public contact channels, and bilingual announcements.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'branding'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Branding & Website Identity</span>
        </button>

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
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading CMS configuration...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BRANDING & WEBSITE IDENTITY */}
          {activeTab === 'branding' && (
            <form onSubmit={handleSaveBranding} className="space-y-6">
              {/* Section: Brand Assets & Logos */}
              <Card className="p-5 sm:p-6 bg-white border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-brand-navy-950 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-orange-500" />
                    Visual Assets & Logos (Supabase Storage)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload brand logos and site favicon directly to the secure public branding bucket.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Primary Logo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Primary Logo (Light Navbars)</label>
                    <div className="h-28 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Primary Logo" className="max-h-16 object-contain" />
                      ) : (
                        <div className="text-center text-slate-400">
                          <p className="text-[11px] font-bold">No logo uploaded</p>
                          <p className="text-[10px]">Using styled company initials</p>
                        </div>
                      )}
                    </div>
                    {canManageCms && (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={logoInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadAsset(e.target.files[0], 'logo');
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          startIcon={<Upload className="w-3 h-3" />}
                          className="w-full text-[11px] font-bold whitespace-nowrap"
                        >
                          {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                        </Button>
                        {logoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogoUrl('')}
                            className="text-xs text-rose-500"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dark Logo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Dark Logo (Dark Navbars / Footers)</label>
                    <div className="h-28 rounded-xl border border-dashed border-slate-700 bg-brand-navy-950 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                      {darkLogoUrl ? (
                        <img src={darkLogoUrl} alt="Dark Logo" className="max-h-16 object-contain" />
                      ) : (
                        <div className="text-center text-slate-400">
                          <p className="text-[11px] font-bold text-white">No dark logo</p>
                          <p className="text-[10px] text-slate-400">Falls back to primary or text</p>
                        </div>
                      )}
                    </div>
                    {canManageCms && (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={darkLogoInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadAsset(e.target.files[0], 'darkLogo');
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingDarkLogo}
                          onClick={() => darkLogoInputRef.current?.click()}
                          startIcon={<Upload className="w-3 h-3" />}
                          className="w-full text-[11px] font-bold whitespace-nowrap"
                        >
                          {isUploadingDarkLogo ? 'Uploading...' : 'Upload Dark Logo'}
                        </Button>
                        {darkLogoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDarkLogoUrl('')}
                            className="text-xs text-rose-500"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Favicon */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Browser Tab Favicon</label>
                    <div className="h-28 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="text-center text-slate-400">
                          <p className="text-[11px] font-bold">Default standard icon</p>
                        </div>
                      )}
                    </div>
                    {canManageCms && (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={faviconInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadAsset(e.target.files[0], 'favicon');
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingFavicon}
                          onClick={() => faviconInputRef.current?.click()}
                          startIcon={<Upload className="w-3 h-3" />}
                          className="w-full text-[11px] font-bold whitespace-nowrap"
                        >
                          {isUploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                        </Button>
                        {faviconUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFaviconUrl('')}
                            className="text-xs text-rose-500"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Section: Bilingual Identity */}
              <Card className="p-5 sm:p-6 bg-white border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-brand-navy-950">Company Identity & Slogans (Bilingual)</h3>
                  <p className="text-xs text-slate-500">Official names and taglines displayed across English and Arabic interfaces.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company Legal Name (English) *</label>
                    <Input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم الشركة الرسمي (عربي) *</label>
                    <Input
                      type="text"
                      dir="rtl"
                      value={companyNameAr}
                      onChange={(e) => setCompanyNameAr(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Short Brand Name (English)</label>
                    <Input
                      type="text"
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الاسم المختصر (عربي)</label>
                    <Input
                      type="text"
                      dir="rtl"
                      value={shortNameAr}
                      onChange={(e) => setShortNameAr(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Brand Tagline (English)</label>
                    <Input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">شعار الشركة التسويقي (عربي)</label>
                    <Input
                      type="text"
                      dir="rtl"
                      value={taglineAr}
                      onChange={(e) => setTaglineAr(e.target.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Section: SEO Metadata & Browser Tab Titles */}
              <Card className="p-5 sm:p-6 bg-white border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-brand-navy-950">SEO Metadata & Page Titles</h3>
                  <p className="text-xs text-slate-500">Browser tab titles and meta descriptions governing search previews.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Browser Title (English)</label>
                    <Input
                      type="text"
                      value={browserTitle}
                      onChange={(e) => setBrowserTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">عنوان المتصفح (عربي)</label>
                    <Input
                      type="text"
                      dir="rtl"
                      value={browserTitleAr}
                      onChange={(e) => setBrowserTitleAr(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Meta Description (English)</label>
                    <textarea
                      rows={2}
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-brand-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">وصف الصفحة لمحركات البحث (عربي)</label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={metaDescriptionAr}
                      onChange={(e) => setMetaDescriptionAr(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-brand-orange-500"
                    />
                  </div>
                </div>
              </Card>

              {/* Section: Contact Details & Public Channels */}
              <Card className="p-5 sm:p-6 bg-white border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-brand-navy-950">Official Customer Contact Channels</h3>
                  <p className="text-xs text-slate-500">
                    Live phone numbers, WhatsApp lines, email addresses, and regional headquarters.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-brand-orange-500" />
                      Telephone Support *
                    </label>
                    <Input
                      type="tel"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-brand-orange-500" />
                      Official Support Email *
                    </label>
                    <Input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp Coordination Line *
                    </label>
                    <Input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Include country code (e.g. +971508322799). Automatically normalized to digits only for wa.me links.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Headquarters Address (English)</label>
                    <Input
                      type="text"
                      value={addressEn}
                      onChange={(e) => setAddressEn(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">عنوان المقر الرئيسي (عربي)</label>
                    <Input
                      type="text"
                      dir="rtl"
                      value={addressAr}
                      onChange={(e) => setAddressAr(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Business Operating Hours (English)
                    </label>
                    <Input
                      type="text"
                      value={businessHours}
                      onChange={(e) => setBusinessHours(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">أوقات العمل الرسمية (عربي)</label>
                    <Input
                      type="text"
                      dir="rtl"
                      value={businessHoursAr}
                      onChange={(e) => setBusinessHoursAr(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Footer Copyright Notice (English)</label>
                    <Input
                      type="text"
                      value={copyrightText}
                      onChange={(e) => setCopyrightText(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">حقوق الملكية الفكرية (عربي)</label>
                    <Input
                      type="text"
                      dir="rtl"
                      value={copyrightTextAr}
                      onChange={(e) => setCopyrightTextAr(e.target.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Section: Social Links */}
              <Card className="p-5 sm:p-6 bg-white border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-brand-navy-950">Official Social Media Profiles</h3>
                  <p className="text-xs text-slate-500">Public profile URLs linked in the website header and footer.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Facebook URL</label>
                    <Input
                      type="url"
                      placeholder="https://facebook.com/..."
                      value={socialFacebook}
                      onChange={(e) => setSocialFacebook(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Instagram URL</label>
                    <Input
                      type="url"
                      placeholder="https://instagram.com/..."
                      value={socialInstagram}
                      onChange={(e) => setSocialInstagram(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Twitter / X URL</label>
                    <Input
                      type="url"
                      placeholder="https://x.com/..."
                      value={socialTwitter}
                      onChange={(e) => setSocialTwitter(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">LinkedIn URL</label>
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/company/..."
                      value={socialLinkedin}
                      onChange={(e) => setSocialLinkedin(e.target.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Save Button */}
              {canManageCms && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSavingBranding}
                    className="font-bold px-8 shadow-sm"
                  >
                    {isSavingBranding ? 'Saving Configuration...' : 'Save Branding & Identity'}
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: NOTICES */}
          {activeTab === 'notices' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                  No public announcements or advisories currently published.
                </div>
              ) : (
                notices.map((n) => (
                  <Card key={n.id} className="p-5 bg-white border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              n.bannerType === 'warning'
                                ? 'warning'
                                : n.bannerType === 'success'
                                  ? 'success'
                                  : 'navy'
                            }
                          >
                            {n.bannerType.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Location: {n.displayLocation}
                          </span>
                        </div>
                        <h4 className="font-bold text-brand-navy-950 text-sm">{n.title}</h4>
                        {n.titleAr && (
                          <h5 className="text-xs text-slate-600 font-medium mt-0.5" dir="rtl">
                            {n.titleAr}
                          </h5>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canManageCms && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditNotice(n)}
                              className="p-1 text-slate-500 hover:text-slate-800"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNotice(n.id)}
                              className="p-1 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {n.content}
                    </p>
                    {n.contentAr && (
                      <p
                        className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100"
                        dir="rtl"
                      >
                        {n.contentAr}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Order: {n.displayOrder}</span>
                      <span className={n.isActive ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {n.isActive ? '● Live on Site' : '○ Draft / Inactive'}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Notice Modal */}
      <Modal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        title={noticeId ? 'Edit Announcement' : 'Publish New Announcement'}
      >
        <form onSubmit={handleSaveNotice} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Title (English) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Holiday Port Operating Schedule"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">العنوان (عربي)</label>
            <Input
              type="text"
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال: جدول مواعيد الموانئ خلال العطلة"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Content (English) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-brand-orange-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">المحتوى (عربي)</label>
            <textarea
              rows={3}
              dir="rtl"
              value={contentAr}
              onChange={(e) => setContentAr(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-brand-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Banner Type</label>
              <select
                value={bannerType}
                onChange={(e) =>
                  setBannerType(e.target.value as 'info' | 'warning' | 'success' | 'announcement')
                }
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              >
                <option value="info">Information (Blue)</option>
                <option value="warning">Notice / Advisory (Amber)</option>
                <option value="success">Update (Green)</option>
                <option value="announcement">Important Notice (Navy)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Location</label>
              <select
                value={displayLocation}
                onChange={(e) =>
                  setDisplayLocation(e.target.value as 'all' | 'calculator' | 'home' | 'portal')
                }
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              >
                <option value="calculator">Shipping Calculator Page</option>
                <option value="home">Home Page</option>
                <option value="portal">Customer Portal</option>
                <option value="all">Everywhere</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="noticeIsActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="noticeIsActive" className="font-bold text-slate-700">
              Active / Published
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNoticeModalOpen(false)}
              disabled={isSavingNotice}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingNotice}
              className="font-bold"
            >
              {isSavingNotice ? 'Saving...' : 'Publish Announcement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
