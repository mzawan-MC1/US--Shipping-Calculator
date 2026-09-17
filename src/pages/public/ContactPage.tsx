import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { enquiryService, ContactEnquirySubject } from '../../services/enquiryService';
import { normalizePhone } from '../../lib/utils';
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  QrCode,
  ShieldCheck,
  Send,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { t, language } = useI18n();
  const { branding, getWhatsAppLink, getPhoneTel } = useWebsiteSettings();

  const isAr = language === 'ar';
  const brandTitle = isAr ? branding.companyNameAr : branding.companyName;
  const addressDisplay = isAr ? branding.headquartersAddressAr : branding.headquartersAddress;
  const hoursDisplay = isAr ? branding.businessHoursAr : branding.businessHours;

  const whatsappHref = getWhatsAppLink(
    isAr
      ? `مرحباً ${brandTitle}، أود الاستفسار عن تفاصيل وحساب تكلفة شحن سيارة من أمريكا إلى الإمارات.`
      : `Hello ${brandTitle}, I would like to inquire about car shipping rates from USA to UAE.`
  );
  const phoneHref = `tel:${getPhoneTel()}`;

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState<ContactEnquirySubject>('shipping_quote_assistance');
  const [message, setMessage] = useState('');
  const [preferredMethod, setPreferredMethod] = useState<'phone' | 'whatsapp' | 'email'>('whatsapp');
  const [consent, setConsent] = useState(true);

  // Bot protection & cooldown
  const [honeypot, setHoneypot] = useState('');
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number>(0);

  // Submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessRef, setSubmitSuccessRef] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validate Google Maps embed URL
  const sanitizeEmbedUrl = (url?: string): string => {
    const fallback =
      'https://maps.google.com/maps?q=Industrial+Area+2,+Sharjah,+UAE&t=&z=14&ie=UTF8&iwloc=&output=embed';
    if (!url) return fallback;
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol === 'https:' &&
        (parsed.hostname.endsWith('google.com') || parsed.hostname.endsWith('google.ae')) &&
        parsed.pathname.startsWith('/maps')
      ) {
        return url;
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const mapEmbedUrl = sanitizeEmbedUrl(branding.googleMapsEmbedUrl);
  const mapDirectUrl =
    branding.googleMapsLocationUrl ||
    'https://maps.google.com/?q=Industrial+Area+2,+Sharjah,+UAE';
  const locationEnabled = branding.locationSectionEnabled !== false;
  const locationHeading = isAr
    ? branding.locationHeadingAr || 'موقعنا في الشارقة، الإمارات'
    : branding.locationHeadingEn || 'Visit Our Operations Yard & Office';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccessRef(null);

    // Honeypot check
    if (honeypot.trim()) {
      // Silently discard spam bot submission
      setSubmitSuccessRef('ENQ-OK');
      return;
    }

    // Cooldown check (minimum 10 seconds between submissions)
    const now = Date.now();
    if (now - lastSubmittedAt < 10000) {
      setSubmitError(
        isAr
          ? 'يرجى الانتظار بضع ثوانٍ قبل إرسال استفسار جديد.'
          : 'Please wait a few moments before submitting another inquiry.'
      );
      return;
    }

    // Validation
    if (fullName.trim().length < 2 || fullName.trim().length > 120) {
      setSubmitError(
        isAr ? 'يجب أن يكون الاسم الكامل بين 2 و 120 حرفاً.' : 'Please enter your full name (2 to 120 characters).'
      );
      return;
    }

    const cleanedPhone = normalizePhone(phone);
    if (cleanedPhone.length < 7 || cleanedPhone.length > 20) {
      setSubmitError(
        isAr
          ? 'يرجى إدخال رقم هاتف دولي صحيح (بين 7 و 20 رقماً).'
          : 'Please enter a valid international phone number (7 to 20 digits).'
      );
      return;
    }

    const emailClean = email.trim().toLowerCase();
    if (emailClean && (emailClean.length > 254 || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(emailClean))) {
      setSubmitError(
        isAr ? 'صيغة البريد الإلكتروني غير صحيحة.' : 'Please enter a valid email address.'
      );
      return;
    }

    if (preferredMethod === 'email' && (!emailClean || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(emailClean))) {
      setSubmitError(
        isAr
          ? 'يرجى إدخال بريد إلكتروني صحيح عند اختيار البريد كوسيلة مفضلة.'
          : 'Please enter a valid email address when email is selected as your preferred contact method.'
      );
      return;
    }

    if (message.trim().length < 10 || message.trim().length > 5000) {
      setSubmitError(
        isAr
          ? 'يجب أن تكون رسالتك بين 10 و 5,000 حرف.'
          : 'Please write your message or shipping questions (between 10 and 5,000 characters).'
      );
      return;
    }

    if (!consent) {
      setSubmitError(
        isAr
          ? 'يرجى الموافقة على التواصل معك بشأن هذا الاستفسار.'
          : 'Please confirm consent to be contacted regarding this inquiry.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const phonePayload = phone.trim().startsWith('+') ? phone.trim() : `+${cleanedPhone}`;

      const result = await enquiryService.submitContactEnquiry({
        full_name: fullName.trim(),
        phone: phonePayload,
        email: emailClean || undefined,
        subject,
        message: message.trim(),
        preferred_contact_method: preferredMethod,
        consent: true,
      });

      setLastSubmittedAt(Date.now());
      setSubmitSuccessRef(result.reference_number);

      // Reset form
      setFullName('');
      setPhone('');
      setEmail('');
      setMessage('');
      setSubject('shipping_quote_assistance');
    } catch (err: unknown) {
      const raw = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
      let mappedMsg: string;

      if (raw.includes('consent')) {
        mappedMsg = isAr
          ? 'يرجى الموافقة على التواصل معك لمتابعة الاستفسار.'
          : 'Consent is required to submit an inquiry.';
      } else if (raw.includes('full name')) {
        mappedMsg = isAr
          ? 'يجب أن يكون الاسم الكامل بين 2 و 120 حرفاً.'
          : 'Full name must be between 2 and 120 characters.';
      } else if (raw.includes('phone')) {
        mappedMsg = isAr
          ? 'يرجى إدخال رقم هاتف دولي صحيح متضمناً رمز الدولة.'
          : 'Please provide a valid international phone number with country code.';
      } else if (raw.includes('email')) {
        mappedMsg = isAr
          ? 'يرجى إدخال عنوان بريد إلكتروني صحيح.'
          : 'Please enter a valid email address.';
      } else if (raw.includes('subject')) {
        mappedMsg = isAr
          ? 'يرجى اختيار موضوع استفسار صحيح.'
          : 'Please select a valid inquiry subject.';
      } else if (raw.includes('message')) {
        mappedMsg = isAr
          ? 'يجب أن تكون الرسالة بين 10 و 5,000 حرف.'
          : 'Message must be between 10 and 5,000 characters.';
      } else if (raw.includes('too many') || raw.includes('duplicate')) {
        mappedMsg = isAr
          ? 'تم استلام عدد كبير من الاستفسارات من هذا الرقم. يرجى الانتظار بضع دقائق أو التواصل عبر واتساب.'
          : 'Too many inquiries received. Please wait a few minutes before trying again or reach out on WhatsApp.';
      } else {
        mappedMsg = isAr
          ? 'تعذر إرسال الاستفسار في الوقت الحالي. يرجى المحاولة لاحقاً أو التواصل عبر واتساب.'
          : 'Unable to submit your inquiry at this moment. Please try again later or reach out via WhatsApp.';
      }

      setSubmitError(mappedMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-14 w-full overflow-x-hidden">
      <Container className="max-w-6xl px-4 sm:px-6 space-y-12">
        {/* Section A: Heading & Assistance Intro */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-navy-900 text-brand-orange-400 border border-brand-navy-800 text-xs font-bold shadow-sm">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isAr ? 'دعم واستفسارات الشحن الدولي' : 'Dedicated Shipping Assistance'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-brand-navy-950 tracking-tight">
            {t.navContact}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {isAr
              ? 'فريقنا المتخصص في الشارقة جاهز للإجابة على جميع استفسارات الشحن البحري، القطر الداخلي من مزادات أمريكا، وتخليص الجمارك الإماراتي.'
              : 'Our operations team in Sharjah is ready to assist you with auction towing, ocean container quotes, vehicle tracking, and UAE customs clearance.'}
          </p>
        </div>

        {/* Section B & C: Contact Cards & Direct Inquiry Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Core Contact Information (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* WhatsApp Highlight Card */}
            <Card className="p-6 bg-brand-navy-950 text-white border-brand-navy-900 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-brand-navy-800">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isAr ? 'متاح للرد والتسعير' : 'Online for Instant Quotes'}</span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {isAr ? 'محادثة واتساب مباشرة' : 'Direct WhatsApp Support'}
                  </h3>
                </div>
                <div className="p-2 bg-white rounded-xl text-brand-navy-950 shadow-sm shrink-0">
                  <QrCode className="w-10 h-10" />
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {isAr
                  ? 'أرسل رقم اللوت أو الرمز البريدي في أمريكا وسنزودك بعرض أسعار فوري وشامل.'
                  : 'Message us with your auction lot number or US pickup zip code for instant rates.'}
              </p>

              <div className="mt-4">
                {whatsappHref ? (
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="block">
                    <Button
                      variant="whatsapp"
                      size="md"
                      className="w-full text-sm font-extrabold shadow-whatsapp-glow"
                      startIcon={<MessageCircle className="w-5 h-5" />}
                    >
                      {isAr ? `تحدث عبر واتساب (${branding.whatsappNumber})` : `WhatsApp (${branding.whatsappNumber})`}
                    </Button>
                  </a>
                ) : (
                  <a href={phoneHref} className="block">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full text-sm font-extrabold"
                      startIcon={<Phone className="w-5 h-5" />}
                    >
                      {isAr ? `اتصل بنا (${branding.supportPhone})` : `Call Us (${branding.supportPhone})`}
                    </Button>
                  </a>
                )}
              </div>
            </Card>

            {/* Core Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
              {/* Telephone */}
              {branding.supportPhone && (
                <Card className="p-4 flex items-center gap-3.5 hover:border-brand-orange-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange-600 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      {isAr ? 'الهاتف المباشر' : 'Direct Phone Line'}
                    </span>
                    <a
                      href={phoneHref}
                      className="text-sm font-bold text-slate-900 hover:text-brand-orange-600 transition-colors"
                    >
                      {branding.supportPhone}
                    </a>
                  </div>
                </Card>
              )}

              {/* Email */}
              {branding.supportEmail && (
                <Card className="p-4 flex items-center gap-3.5 hover:border-brand-orange-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      {isAr ? 'البريد الإلكتروني الرسمي' : 'Official Email'}
                    </span>
                    <a
                      href={`mailto:${branding.supportEmail}`}
                      className="text-sm font-bold text-slate-900 hover:text-brand-orange-600 transition-colors"
                    >
                      {branding.supportEmail}
                    </a>
                  </div>
                </Card>
              )}

              {/* Operating Hours */}
              <Card className="p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {isAr ? 'ساعات العمل' : 'Working Hours'}
                  </span>
                  <p className="text-xs font-bold text-slate-800">{hoursDisplay}</p>
                </div>
              </Card>

              {/* Office Address */}
              <Card className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {isAr ? 'المقر والساحة التشغيلية' : 'Headquarters & Yard'}
                  </span>
                  <p className="text-xs font-bold text-slate-900">{brandTitle}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{addressDisplay}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isAr ? 'شحن بحري مرخص ومعتمد' : 'Licensed UAE Freight Forwarder'}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Column: Direct Contact / Inquiry Form (7 cols) */}
          <div className="lg:col-span-7">
            <Card className="p-6 sm:p-8 bg-white border-slate-200 shadow-xl">
              <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-black text-brand-navy-950">
                  {isAr ? 'إرسال استفسار شحن مباشر' : 'Send a Shipping Inquiry'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {isAr
                    ? 'املأ النموذج وسيقوم مسؤول الخدمات اللوجستية بالرد عليك في أقرب وقت.'
                    : 'Fill out this form and a logistics coordinator will get in touch with you.'}
                </p>
              </div>

              {/* Confirmation Alert */}
              {submitSuccessRef && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm">
                      {isAr
                        ? 'تم استلام استفسارك بنجاح!'
                        : 'Inquiry received successfully!'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    {isAr ? 'رقم المرجع الخاص باستفسارك هو:' : 'Your inquiry reference number is:'}{' '}
                    <strong className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                      {submitSuccessRef}
                    </strong>
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {isAr
                      ? 'سيتواصل معك فريقنا خلال ساعات العمل وفق وسيلة الاتصال المفضلة.'
                      : 'Our dispatch team will review your request and contact you shortly.'}
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {submitError && (
                <div className="mb-6">
                  <Alert variant="error">{submitError}</Alert>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field (hidden from real users) */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="company_website_url">Do not fill this out</label>
                  <input
                    type="text"
                    id="company_website_url"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Full Name & Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isAr ? 'الاسم الكامل' : 'Full Name'}{' '}
                      <span className="text-brand-orange-500">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder={isAr ? 'مثال: محمد الشامسي' : 'e.g. John Doe'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp Number'}{' '}
                      <span className="text-brand-orange-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      required
                      placeholder="+971 50 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSubmitting}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Email & Enquiry Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isAr ? 'البريد الإلكتروني' : 'Email Address'}{' '}
                      <span className="text-slate-400 font-normal">({isAr ? 'اختياري' : 'Optional'})</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isAr ? 'موضوع الاستفسار' : 'Inquiry Topic'}
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value as ContactEnquirySubject)}
                      disabled={isSubmitting}
                      className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange-500"
                    >
                      <option value="shipping_quote_assistance">
                        {isAr ? 'مساعدة في تسعير الشحن' : 'Shipping Quote Assistance'}
                      </option>
                      <option value="vehicle_pickup_towing">
                        {isAr ? 'سحب ونقل سيارات المزاد' : 'Vehicle Pickup & Towing'}
                      </option>
                      <option value="port_route_information">
                        {isAr ? 'معلومات الموانئ والمسارات' : 'Port & Route Information'}
                      </option>
                      <option value="existing_quotation">
                        {isAr ? 'استفسار عن تسعيرة سابقة' : 'Existing Quotation Inquiry'}
                      </option>
                      <option value="general_enquiry">
                        {isAr ? 'استفسار عام' : 'General Inquiry'}
                      </option>
                      <option value="other">
                        {isAr ? 'موضوع آخر' : 'Other'}
                      </option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isAr ? 'رسالتك أو تفاصيل الشحنة' : 'Message or Vehicle Details'}{' '}
                    <span className="text-brand-orange-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={
                      isAr
                        ? 'يرجى ذكر نوع السيارة، سنة الصنع، أو رقم اللوت للمزاد وأي تفاصيل أخرى...'
                        : 'Provide vehicle make/model, auction yard name, or any questions...'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange-500 resize-y"
                  />
                </div>

                {/* Preferred Contact Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isAr ? 'وسيلة الاتصال المفضلة' : 'Preferred Contact Method'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['whatsapp', 'phone', 'email'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPreferredMethod(method)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center capitalize ${
                          preferredMethod === method
                            ? 'bg-brand-navy-950 text-white border-brand-navy-950 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {method === 'whatsapp' ? 'WhatsApp' : method === 'phone' ? (isAr ? 'هاتف' : 'Phone') : (isAr ? 'إيميل' : 'Email')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      disabled={isSubmitting}
                      className="mt-0.5 rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
                    />
                    <span className="text-xs text-slate-600 leading-snug">
                      {isAr
                        ? 'أوافق على قيام فاخر علم لشحن السيارات بالتواصل معي بشأن هذا الاستفسار وفق سياسة الخصوصية.'
                        : 'I agree to be contacted by Fakher Alam regarding this vehicle shipping inquiry.'}
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full shadow-orange-glow font-extrabold text-sm py-3.5"
                    startIcon={isSubmitting ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
                  >
                    {isSubmitting
                      ? isAr
                        ? 'جاري إرسال الاستفسار...'
                        : 'Sending Inquiry...'
                      : isAr
                      ? 'إرسال الاستفسار'
                      : 'Submit Inquiry'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>

        {/* Section D: Location & Google Maps Section */}
        {locationEnabled && (
          <div className="pt-6 border-t border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-brand-navy-950">
                  {locationHeading}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {addressDisplay}
                </p>
              </div>

              {mapDirectUrl && (
                <a
                  href={mapDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold"
                    endIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    {isAr ? 'عرض في خرائط جوجل' : 'View on Google Maps'}
                  </Button>
                </a>
              )}
            </div>

            {/* Responsive Google Maps Embed with verified HTTPS domain */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 aspect-[16/7] sm:aspect-[21/8] w-full min-h-[300px] relative">
              <iframe
                title="Fakher Alam Office Location"
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};
