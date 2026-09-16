import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MapPin, Phone, Mail, MessageCircle, Clock, QrCode, ShieldCheck } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-14 w-full overflow-x-hidden">
      <Container className="max-w-3xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold mb-2">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'قناة التواصل المباشر عبر واتساب' : 'Dedicated WhatsApp Support Channel'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-navy-950">{t.navContact}</h1>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            {isAr
              ? 'تواصل مباشرة مع منسقي الخدمات اللوجستية في الشارقة للحصول على عروض أسعار فورية وتتبع الشحنات والقطر الداخلي.'
              : 'Connect directly with our Sharjah logistics coordinators via WhatsApp for live ocean freight quotes, inland towing inquiries, or vehicle tracking.'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Main WhatsApp Focus Card */}
          <Card className="p-6 sm:p-8 bg-brand-navy-950 text-white border-brand-navy-900 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-brand-navy-800">
              <div className="text-center sm:text-start space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isAr ? 'الفريق متاح للرد والتسعير' : 'Online & Ready to Quote'}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {isAr ? 'تسعير وحجز فوري عبر واتساب' : 'Instant WhatsApp Quotation & Booking'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
                  {isAr
                    ? 'أرسل رقم القطعة (Lot Number)، موديل السيارة، أو الرمز البريدي للقطر وسنزودك بتفاصيل كاملة وفورية.'
                    : 'Send your auction lot number, vehicle model, or pickup zip code directly to our team for a fast, itemized quote.'}
                </p>
              </div>

              {/* QR Code Graphic */}
              <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white text-slate-900 shadow-md shrink-0">
                <QrCode className="w-24 h-24 text-brand-navy-950" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mt-1">
                  {isAr ? 'امسح للمحادثة' : 'Scan to Chat'}
                </span>
              </div>
            </div>

            {/* Direct WhatsApp CTA Button */}
            <div className="pt-6">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button
                    variant="whatsapp"
                    size="lg"
                    className="w-full text-base font-black shadow-whatsapp-glow py-4"
                    startIcon={<MessageCircle className="w-6 h-6" />}
                  >
                    {isAr
                      ? `بدء محادثة واتساب (${branding.whatsappNumber})`
                      : `Start WhatsApp Consultation (${branding.whatsappNumber})`}
                  </Button>
                </a>
              ) : (
                <a href={phoneHref} className="block w-full">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full text-base font-black py-4"
                    startIcon={<Phone className="w-6 h-6" />}
                  >
                    {isAr
                      ? `الاتصال بمركز خدمة العملاء (${branding.supportPhone})`
                      : `Call Logistics Support (${branding.supportPhone})`}
                  </Button>
                </a>
              )}
            </div>
          </Card>

          {/* Business Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Headquarters & Address */}
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-brand-orange-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {isAr ? 'المقر التشغيلي' : 'Operations Terminal'}
                  </h4>
                  <p className="text-sm font-bold text-slate-900">{brandTitle}</p>
                  <p className="text-xs text-slate-600">{addressDisplay}</p>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold pt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isAr ? 'منشأة شحن بحري مرخصة بالإمارات' : 'Licensed UAE Freight Facility'}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Working Hours & Availability */}
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {isAr ? 'ساعات العمل الرسمية' : 'Business Working Hours'}
                  </h4>
                  <p className="text-sm font-bold text-slate-900">{hoursDisplay}</p>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'متابعة وتنسيق مباشر لجميع الشحنات الواردة'
                      : 'Active monitoring and customer dispatch support'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Secondary Contact Channels */}
          <Card className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {branding.supportPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-brand-orange-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 block">{isAr ? 'الهاتف المباشر:' : 'Telephone Inquiry:'}</span>
                    <a
                      href={phoneHref}
                      className="font-bold text-slate-900 hover:text-brand-orange-600"
                    >
                      {branding.supportPhone}
                    </a>
                  </div>
                </div>
              )}

              {branding.supportEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-brand-orange-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 block">{isAr ? 'البريد الإلكتروني:' : 'Corporate Email:'}</span>
                    <a
                      href={`mailto:${branding.supportEmail}`}
                      className="font-bold text-slate-900 hover:text-brand-orange-600"
                    >
                      {branding.supportEmail}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </Container>
    </div>
  );
};
