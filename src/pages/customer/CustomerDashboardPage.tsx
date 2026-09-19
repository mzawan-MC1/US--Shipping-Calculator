import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { useI18n } from '../../i18n/I18nContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { generateQuotationPdf, PdfQuotationData } from '../../services/pdfService';
import {
  User,
  Mail,
  Phone,
  FileText,
  Download,
  ExternalLink,
  LogOut,
  Calendar,
  Truck,
  Ship,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface CustomerQuote {
  id: string;
  reference_number: string;
  enquiry_reference?: string;
  created_at: string;
  status: string;
  subtotal_ocean_freight?: number;
  total_charges_usd_min: number;
  total_charges_usd_max: number;
  total_charges_aed_min?: number;
  total_charges_aed_max?: number;
  is_towing_range?: boolean;
  pricing_snapshot: any;
}

export const CustomerDashboardPage: React.FC = () => {
  const { user, customerProfile, signOut, isCustomer } = useAuth();
  const { branding } = useWebsiteSettings();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const [emailInput, setEmailInput] = useState('');
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);

  const fetchCustomerQuotes = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user?.email) return;
    setIsLoadingQuotes(true);

    try {
      // First try calling get_customer_portal_data RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_customer_portal_data');
      if (!rpcErr && rpcData?.success && Array.isArray(rpcData.quotations)) {
        setQuotes(rpcData.quotations);
        setIsLoadingQuotes(false);
        return;
      }

      // Fallback to direct query using RLS
      const { data: directQuotes, error: directErr } = await supabase
        .from('quotations')
        .select(`
          id,
          reference_number,
          created_at,
          subtotal_ocean_freight,
          total_charges_usd_min,
          total_charges_usd_max,
          total_charges_aed_min,
          total_charges_aed_max,
          is_towing_range,
          pricing_snapshot,
          enquiry:enquiries (
            reference_number,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (directErr) {
        console.warn('[CustomerPortal] Query error:', directErr);
      } else if (directQuotes) {
        const mapped: CustomerQuote[] = directQuotes.map((q: any) => ({
          id: q.id,
          reference_number: q.reference_number,
          enquiry_reference: q.enquiry?.reference_number,
          created_at: q.created_at,
          status: q.enquiry?.status || 'new',
          subtotal_ocean_freight: q.subtotal_ocean_freight,
          total_charges_usd_min: q.total_charges_usd_min,
          total_charges_usd_max: q.total_charges_usd_max,
          total_charges_aed_min: q.total_charges_aed_min,
          total_charges_aed_max: q.total_charges_aed_max,
          is_towing_range: q.is_towing_range,
          pricing_snapshot: q.pricing_snapshot,
        }));
        setQuotes(mapped);
      }
    } catch (err) {
      console.error('[CustomerPortal] Fetch error:', err);
    } finally {
      setIsLoadingQuotes(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (user) {
      fetchCustomerQuotes();
    }
  }, [user, fetchCustomerQuotes]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setAuthError(isAr ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address.');
      return;
    }

    setIsSendingLink(true);
    setAuthError(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Authentication is currently not configured.');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/customer/dashboard`,
        },
      });

      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send login link. Please try again.');
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleDownloadPdf = async (quote: CustomerQuote) => {
    setDownloadingQuoteId(quote.id);
    try {
      const snap = quote.pricing_snapshot;
      const fin = snap?.financials;
      const customer = snap?.customer;
      const vehicle = snap?.vehicle;
      const route = snap?.route;
      const towing = snap?.towing;

      const pdfData: PdfQuotationData = {
        language: isAr ? 'ar' : 'en',
        referenceNumber: quote.reference_number,
        enquiryReference: quote.enquiry_reference,
        createdAt: quote.created_at,
        customerName: customer?.full_name || customerProfile?.full_name || 'Valued Customer',
        customerPhone: customer?.phone || customerProfile?.phone || 'N/A',
        customerEmail: customer?.email || user?.email || undefined,
        vehicleDetails: `${vehicle?.year || ''} ${vehicle?.make || ''} ${vehicle?.model || ''}`.trim() || 'Vehicle',
        originPort: route?.origin_port_name || 'US Loading Port',
        destinationPort: route?.destination_port_name || 'UAE Destination Port',
        originPortAr: route?.origin_port_name_ar,
        destinationPortAr: route?.destination_port_name_ar,
        shippingMethod: route?.shipping_method_name || 'Containerized Ocean Freight',
        shippingMethodAr: isAr ? 'شحن بحري في حاويات' : undefined,
        transitTime: `${route?.transit_days_min || 30}-${route?.transit_days_max || 45} Days`,
        declaredValueUsd: vehicle?.declared_value_usd,
        oceanFreightUsd: fin?.subtotal_ocean_freight || 0,
        oceanFreightBaseUsd: fin?.ocean_freight_base || fin?.subtotal_ocean_freight || 0,
        towingFeeMin: fin?.towing_fee_min || 0,
        towingFeeMax: fin?.towing_fee_max || 0,
        towingFeeBaseMin: fin?.towing_fee_base_min || fin?.towing_fee_min || 0,
        towingFeeBaseMax: fin?.towing_fee_base_max || fin?.towing_fee_max || 0,
        isTowingRange: Boolean(fin?.is_towing_range),
        includeInlandTowing: fin?.include_inland_towing !== false,
        clearanceFeeUsd: fin?.customs_clearance_fee || 150,
        portHandlingFeeUsd: fin?.port_additional_charges || 200,
        cifUsd: fin?.cif_value_max || fin?.cif_value_min,
        customsDutyUsd: fin?.customs_duty_max || 0,
        importVatUsd: fin?.import_vat_max || 0,
        totalUsdMin: quote.total_charges_usd_min,
        totalUsdMax: quote.total_charges_usd_max,
        totalAedMin: quote.total_charges_aed_min || Math.round(quote.total_charges_usd_min * 3.6725),
        totalAedMax: quote.total_charges_aed_max || Math.round(quote.total_charges_usd_max * 3.6725),
        exchangeRate: fin?.exchange_rate || 3.6725,
        disclaimer: snap?.disclaimer,
        rules: snap?.rules || [],
        lineItems: snap?.line_items || [],
      };

      await generateQuotationPdf(pdfData, branding);
    } catch (err) {
      console.error('[CustomerPortal] PDF download failed:', err);
    } finally {
      setDownloadingQuoteId(null);
    }
  };

  const handleViewQuoteDetails = (quote: CustomerQuote) => {
    try {
      const snap = quote.pricing_snapshot;
      if (snap) {
        const liveQuote = {
          id: quote.id,
          referenceNumber: quote.reference_number,
          enquiryReference: quote.enquiry_reference,
          createdAt: quote.created_at,
          input: {
            vehicleType: snap.vehicle?.category_id || 'sedan',
            powertrain: snap.vehicle?.powertrain_id || 'petrol',
            conditionId: snap.vehicle?.condition_id || 'operable',
            purchaseSource: snap.vehicle?.purchase_source_id || 'other',
            loadingPort: snap.route?.origin_port_id,
            destinationPort: snap.route?.destination_port_id,
            shippingMethod: snap.route?.shipping_method_id,
            buyingPrice: snap.vehicle?.declared_value_usd || 0,
            includeInlandTowing: snap.towing?.is_requested !== false,
            customerName: snap.customer?.full_name || '',
            customerPhone: snap.customer?.phone || '',
            customerEmail: snap.customer?.email || '',
          },
          estimatedTransitDays: snap.route?.transit_days_max || 45,
          estimatedTransitDaysMin: snap.route?.transit_days_min,
          estimatedTransitDaysMax: snap.route?.transit_days_max,
          oceanFreight: snap.financials?.subtotal_ocean_freight || 0,
          oceanFreightBase: snap.financials?.ocean_freight_base,
          oceanFreightTotal: snap.financials?.subtotal_ocean_freight || 0,
          customsClearance: snap.financials?.customs_clearance_fee || 150,
          destinationCharges: snap.financials?.port_additional_charges || 200,
          customsDuty: snap.financials?.customs_duty_max || 0,
          vat: snap.financials?.import_vat_max || 0,
          cifMin: snap.financials?.cif_value_min,
          cifMax: snap.financials?.cif_value_max,
          towingFeeMin: snap.financials?.towing_fee_min || 0,
          towingFeeMax: snap.financials?.towing_fee_max || 0,
          towingFeeBaseMin: snap.financials?.towing_fee_base_min,
          towingFeeBaseMax: snap.financials?.towing_fee_base_max,
          isTowingRange: Boolean(snap.financials?.is_towing_range),
          includeInlandTowing: snap.towing?.is_requested !== false,
          totalChargesUsd: quote.total_charges_usd_max,
          totalChargesUsdMin: quote.total_charges_usd_min,
          totalChargesUsdMax: quote.total_charges_usd_max,
          totalChargesAed: quote.total_charges_aed_max || Math.round(quote.total_charges_usd_max * 3.6725),
          totalChargesAedMin: quote.total_charges_aed_min,
          totalChargesAedMax: quote.total_charges_aed_max,
          towChargeStatus: snap.financials?.is_towing_range ? 'range' : 'included',
          isEstimate: false,
          lineItems: snap.line_items || [],
          routeInfo: snap.route,
          rules: snap.rules || [],
          snapshot: snap,
        };
        sessionStorage.setItem('fakher_alam_active_quote', JSON.stringify(liveQuote));
        navigate('/results');
      }
    } catch (e) {
      console.warn('Navigation error:', e);
    }
  };

  // 1. Unauthenticated View: Magic Link Login Form
  if (!user) {
    return (
      <div className="min-h-[75vh] bg-slate-50 py-12 px-4 sm:px-6">
        <Container size="sm">
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-md">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-navy-950 text-brand-orange-500 flex items-center justify-center mx-auto mb-3 shadow-md">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {isAr ? 'بوابة العملاء والمستندات' : 'Customer Portal & Saved Quotes'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isAr
                  ? 'أدخل بريدك الإلكتروني للوصول المباشر إلى عروض الأسعار المحفوظة وملفك الشخصي بدون كلمة مرور.'
                  : 'Enter your email to receive a secure, passwordless login link to view all your saved shipping quotations.'}
              </p>
            </div>

            {magicLinkSent ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-900">
                  {isAr ? 'تم إرسال رابط تسجيل الدخول!' : 'Login Link Sent!'}
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {isAr
                    ? `لقد أرسلنا رابط تسجيل دخول آمن إلى ${emailInput}. يرجى فحص بريدك الإلكتروني والنقر على الرابط للمتابعة.`
                    : `We sent a secure sign-in link to ${emailInput}. Please check your inbox and click the link to access your portal.`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMagicLinkSent(false)}
                  className="mt-2"
                >
                  {isAr ? 'استخدام بريد إلكتروني آخر' : 'Use different email'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                {authError && (
                  <Alert variant="danger" title={isAr ? 'خطأ' : 'Error'}>
                    {authError}
                  </Alert>
                )}

                <Input
                  label={isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  type="email"
                  required
                  placeholder="name@example.com"
                  startIcon={<Mail className="w-4 h-4" />}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  autoFocus
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isSendingLink}
                >
                  {isAr ? 'إرسال رابط تسجيل الدخول الآمن' : 'Send Secure Login Link'}
                </Button>

                <div className="text-center pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/calculator')}
                    startIcon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    {isAr ? 'الرجوع لحاسبة الأسعار (فحص تقديري)' : 'Go to Calculator (Check Price)'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </Container>
      </div>
    );
  }

  // 2. Authenticated Customer Dashboard View
  const profileName = customerProfile?.full_name || user.user_metadata?.full_name || 'Valued Customer';
  const profilePhone = customerProfile?.phone || user.user_metadata?.phone || 'Not configured';

  return (
    <div className="min-h-[85vh] bg-slate-50 py-8 px-4 sm:px-6">
      <Container size="lg" className="space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-brand-navy-950 text-white rounded-2xl shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="warning" size="sm">
                {isAr ? 'حساب العميل' : 'Customer Account'}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">{user.email}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {isAr ? `مرحباً، ${profileName}` : `Welcome, ${profileName}`}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              {isAr
                ? 'إدارة عروض أسعار الشحن البحري، تفاصيل المركبات، وتحميل المستندات الرسمية.'
                : 'Manage your official shipping quotations, vehicle specs, and download PDF documents.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calculator')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              startIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {isAr ? 'حاسبة جديدة' : 'New Quote'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              startIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              {isAr ? 'خروج' : 'Sign Out'}
            </Button>
          </div>
        </div>

        {/* Grid: Profile Info & Quotes List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: My Profile */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5 bg-white border border-slate-200">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-orange-500" />
                {isAr ? 'الملف الشخصي' : 'My Profile'}
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'الاسم الكامل:' : 'Full Name:'}</span>
                  <strong className="text-slate-900 text-sm block">{profileName}</strong>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
                  <span className="text-slate-800 font-mono block">{user.email}</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'رقم الهاتف / واتساب:' : 'WhatsApp / Phone:'}</span>
                  <span className="text-slate-800 font-semibold block">{profilePhone}</span>
                </div>

                {customerProfile?.city && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">{isAr ? 'المدينة / الدولة:' : 'Location:'}</span>
                    <span className="text-slate-800 block">
                      {[customerProfile.city, customerProfile.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>{isAr ? 'صلاحية عروض الأسعار' : 'Quotation Validity'}</strong>
                <p className="mt-0.5 text-amber-800">
                  {isAr
                    ? 'عروض الأسعار صالحة لمدة 14 يوماً من تاريخ الإصدار.'
                    : 'Official quotations remain valid for 14 calendar days from creation.'}
                </p>
              </div>
            </div>
          </div>

          {/* Column 2 & 3: My Quotations / Requests */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-orange-500" />
                  {isAr ? 'عروض الأسعار وطلبات الشحن المحفوظة' : 'My Quotations & Requests'}
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}
                </span>
              </div>

              {isLoadingQuotes ? (
                <div className="py-12 text-center">
                  <Spinner size="md" />
                  <p className="text-xs text-slate-400 mt-2">{isAr ? 'جاري تحميل عروض الأسعار...' : 'Loading quotations...'}</p>
                </div>
              ) : quotes.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {isAr ? 'لا توجد عروض أسعار محفوظة حالياً.' : 'No saved quotations found.'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {isAr
                      ? 'قم باستخدام حاسبة الشحن واختر "حفظ عرض السعر وإنشاء الحساب" لتظهر هنا.'
                      : 'Use the shipping calculator and select "Save Quote & Create My Account" to save official quotes.'}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/calculator')}
                    className="mt-2"
                  >
                    {isAr ? 'حساب عرض سعر الآن' : 'Calculate Shipping Now'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => {
                    const snap = quote.pricing_snapshot;
                    const vehicle = snap?.vehicle;
                    const route = snap?.route;
                    const vehicleDesc = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'Standard Vehicle';
                    const routeDesc = `${route?.origin_port_name || 'US Port'} ➔ ${route?.destination_port_name || 'UAE Port'}`;
                    const createdDate = new Date(quote.created_at).toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });

                    const totalDisplay = quote.is_towing_range
                      ? `$${Math.round(quote.total_charges_usd_min).toLocaleString()} - $${Math.round(quote.total_charges_usd_max).toLocaleString()} USD`
                      : `$${Math.round(quote.total_charges_usd_max).toLocaleString()} USD`;

                    return (
                      <div
                        key={quote.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-brand-navy-950">
                              {quote.reference_number}
                            </span>
                            <Badge variant={quote.status === 'confirmed' ? 'success' : 'info'} size="sm">
                              {quote.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{vehicleDesc}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Ship className="w-3.5 h-3.5 text-slate-400" />
                              {routeDesc}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {createdDate}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <span className="text-base font-black text-brand-orange-600">
                            {totalDisplay}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewQuoteDetails(quote)}
                              className="text-xs"
                            >
                              {isAr ? 'عرض' : 'View'}
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={downloadingQuoteId === quote.id}
                              onClick={() => handleDownloadPdf(quote)}
                              className="text-xs"
                              startIcon={<Download className="w-3.5 h-3.5" />}
                            >
                              PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};
