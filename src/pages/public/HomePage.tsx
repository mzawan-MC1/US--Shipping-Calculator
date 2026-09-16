import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { ShippingHeroGraphic } from '../../components/ui/ShippingHeroGraphic';
import {
  Calculator,
  MessageCircle,
  ShieldCheck,
  Clock,
  Award,
  Headphones,
  Ship,
  Truck,
  FileCheck,
  Box,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { US_LOADING_PORTS, UAE_DESTINATION_PORTS } from '../../config/calculatorConfig';

export const HomePage: React.FC = () => {
  const { t, language, direction } = useI18n();
  const { branding, getWhatsAppLink } = useWebsiteSettings();

  const isAr = language === 'ar';
  const brandTitle = isAr ? branding.companyNameAr : branding.companyName;
  const brandTagline = isAr
    ? branding.taglineAr || t.brandTagline
    : branding.tagline || t.brandTagline;

  const whatsappHref = getWhatsAppLink(
    isAr
      ? `مرحباً ${brandTitle}، أود الاستفسار عن تفاصيل وحساب تكلفة شحن سيارة من أمريكا إلى الإمارات.`
      : `Hello ${brandTitle}, I would like to get a quote for vehicle shipping from USA to UAE.`
  );

  const trustBadges = [
    {
      title: t.badgeSafeShipping,
      subtitle: t.badgeSafeShippingDesc,
      icon: <ShieldCheck className="w-6 h-6 text-blue-400" />,
    },
    {
      title: t.badgeOnTime,
      subtitle: t.badgeOnTimeDesc,
      icon: <Clock className="w-6 h-6 text-amber-400" />,
    },
    {
      title: t.badgeBestPrice,
      subtitle: t.badgeBestPriceDesc,
      icon: <Award className="w-6 h-6 text-brand-orange-400" />,
    },
    {
      title: t.badgeSupport,
      subtitle: t.badgeSupportDesc,
      icon: <Headphones className="w-6 h-6 text-emerald-400" />,
    },
  ];

  const whyChooseFeatures = [
    { label: t.featureLicensed, icon: <ShieldCheck className="w-6 h-6 text-brand-orange-500" /> },
    { label: t.featureWorldwide, icon: <Ship className="w-6 h-6 text-brand-orange-500" /> },
    { label: t.featureDoorToPort, icon: <Truck className="w-6 h-6 text-brand-orange-500" /> },
    { label: t.featureExportDocs, icon: <FileCheck className="w-6 h-6 text-brand-orange-500" /> },
    { label: t.featureContainerLoading, icon: <Box className="w-6 h-6 text-brand-orange-500" /> },
    {
      label: t.featureCustomsClearance,
      icon: <Award className="w-6 h-6 text-brand-orange-500" />,
    },
    {
      label: t.featureVehicleInspection,
      icon: <CheckCircle2 className="w-6 h-6 text-brand-orange-500" />,
    },
    { label: t.featureSupport247, icon: <Headphones className="w-6 h-6 text-brand-orange-500" /> },
  ];

  const steps = [
    {
      step: 1,
      title: isAr ? 'شراء المزاد والنقل الداخلي' : 'Auction Purchase & Tow',
      desc: isAr
        ? 'استلام سيارتك من أي ساحة مزاد أمريكية (كوبارت، إياي، مانهيم) ونقلها بأمان إلى أقرب ميناء تحميل.'
        : 'Vehicle collected from any US auction yard (Copart, IAAI, Manheim) and securely towed to the nearest loading port.',
      icon: <ClipboardList className="w-6 h-6 text-white" />,
    },
    {
      step: 2,
      title: isAr ? 'فحص الميناء والشحن بالحاويات' : 'Port Inspection & Loading',
      desc: isAr
        ? 'فحص استلام، تصوير عالي الدقة لحالة المركبة، إنهاء إجراءات التصدير، وتحميل الحاوية بحرفية.'
        : 'Arrival inspection, high-resolution condition photos, export customs clearance, and careful container stuffing.',
      icon: <Truck className="w-6 h-6 text-white" />,
    },
    {
      step: 3,
      title: isAr ? 'الشحن البحري الدولي' : 'Ocean Freight Transit',
      desc: isAr
        ? 'إبحار الحاويات مباشرة من موانئ أمريكا إلى ميناء خورفكان أو جبل علي مع توثيق بوليصة الشحن.'
        : 'Direct container vessel transit from USA ports to Khorfakkan or Jebel Ali with complete bill of lading documentation.',
      icon: <Ship className="w-6 h-6 text-white" />,
    },
    {
      step: 4,
      title: isAr ? 'التخليص الجمركي والتسليم' : 'UAE Clearance & Handover',
      desc: isAr
        ? 'تخليص جمركي سريع، احتساب الرسوم والضريبة بدقة، وتسليم المركبة من ساحتنا بالشارقة.'
        : 'Fast UAE customs inspection, 5% duty assessment, 5% VAT handling, and final collection from our Sharjah yard.',
      icon: <CheckCircle2 className="w-6 h-6 text-white" />,
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16 w-full overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-brand-navy-950 via-brand-navy-900 to-brand-navy-950 text-white pt-10 pb-16 sm:pt-16 sm:pb-24 overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <Container className="relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Trust Pills */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-navy-800/80 border border-brand-navy-700 text-xs font-semibold text-brand-orange-400 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-brand-orange-500 animate-ping" />
              <span>{brandTagline}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-none">
              {t.heroTitlePart1}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange-400 to-amber-300">
                {t.heroTitleHighlightUs}
              </span>{' '}
              {t.heroTitleTo}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                {t.heroTitleHighlightUae}
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* Hero Graphic Container */}
            <div className="py-4">
              <ShippingHeroGraphic />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to="/calculator" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto text-sm sm:text-base font-extrabold"
                  startIcon={<Calculator className="w-5 h-5" />}
                  endIcon={
                    direction === 'rtl' ? (
                      <ArrowRight className="w-5 h-5 rotate-180" />
                    ) : (
                      <ArrowRight className="w-5 h-5" />
                    )
                  }
                >
                  {t.calculateShipping}
                </Button>
              </Link>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="whatsapp"
                    size="lg"
                    className="w-full sm:w-auto text-sm sm:text-base font-extrabold"
                    startIcon={<MessageCircle className="w-5 h-5" />}
                  >
                    {t.whatsappQuote}
                  </Button>
                </a>
              )}
            </div>

            {/* Verified UAE Compliance highlight */}
            <div className="pt-1 flex items-center justify-center gap-2 text-xs text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {isAr
                  ? 'خدمات لوجستية وشحن بحري مرخص ومعتمد في دولة الإمارات العربية المتحدة'
                  : 'Licensed UAE Maritime Freight Forwarder & Customs Clearance Specialist'}
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* Trust Badges Bar */}
      <section className="bg-brand-navy-900 border-b border-brand-navy-800 py-6 text-white">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {trustBadges.map((badge, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center p-3 rounded-xl bg-brand-navy-950/60 border border-brand-navy-800/80"
              >
                <div className="mb-1.5">{badge.icon}</div>
                <h4 className="text-xs sm:text-sm font-black tracking-wider text-slate-100">
                  {badge.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{badge.subtitle}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How It Works */}
      <section>
        <Container>
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              {t.navHome}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-navy-950">
              {isAr ? 'كيف يعمل شحن السيارات؟' : 'How Car Shipping Works'}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              {isAr
                ? 'رحلة نقل واضحة وموثوقة من المزاد إلى التسليم في الشارقة'
                : 'A transparent, hassle-free 4-stage vehicle transit journey'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <Card key={s.step} className="p-6 relative overflow-hidden group">
                <div className="w-12 h-12 rounded-2xl bg-brand-orange-500 flex items-center justify-center mb-4 shadow-orange-glow group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <div className="text-4xl font-black text-slate-100 absolute top-4 end-4 pointer-events-none">
                  0{s.step}
                </div>
                <h3 className="text-base font-bold text-brand-navy-950 mb-2">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Popular Shipping Routes Display */}
      <section className="bg-slate-100/60 py-12 border-y border-slate-200">
        <Container>
          <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950">
              {t.heroUsPortsTitle}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              {isAr
                ? 'رحلات بحرية منتظمة أسبوعياً من أبرز موانئ الشحن الأمريكية إلى موانئ الإمارات مباشرة'
                : 'Standard departures from all major US shipping hubs directly to Khorfakkan and Jebel Ali.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {US_LOADING_PORTS.slice(0, 4).map((origin) => (
              <div
                key={origin.id}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-orange-600 mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{origin.name}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {origin.name} → {UAE_DESTINATION_PORTS[0].name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Consolidated & Dedicated Containers</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Est. Transit:</span>
                  <span className="font-bold text-slate-900">30 – 45 days</span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Why Choose Fakher Alam Shipping */}
      <section>
        <Container>
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-navy-950">
              {t.whyChooseUsTitle}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              {isAr
                ? 'لوجستيات متكاملة للمركبات من مزادات أمريكا حتى الاستلام في الشارقة'
                : 'Complete vehicle logistics from auction gavel to Sharjah handover'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {whyChooseFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3.5 shadow-sm"
              >
                <div className="p-2.5 rounded-lg bg-slate-50 shrink-0">{feat.icon}</div>
                <span className="text-xs sm:text-sm font-bold text-brand-navy-950 leading-snug">
                  {feat.label}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Bottom CTA Card */}
      <section>
        <Container>
          <div className="bg-brand-navy-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-start">
              <h3 className="text-lg sm:text-2xl font-black">
                {isAr ? 'جاهز لحساب تكاليف شحن سيارتك؟' : 'Ready to Calculate Your Shipping Cost?'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                {isAr
                  ? 'تقديرات فورية ودقيقة للشحن البحري، التخليص الجمركي، والرسوم النظامية.'
                  : 'Instant estimates for ocean freight, customs duty, and UAE VAT.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link to="/calculator" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto font-extrabold">
                  {t.calculateShipping}
                </Button>
              </Link>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button variant="whatsapp" size="lg" className="w-full sm:w-auto font-extrabold">
                    {t.whatsappQuote}
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Legal Compliance Assurance */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              {isAr
                ? `${brandTitle} - شحن بحري وتخليص جمركي موثوق وفق أنظمة الموانئ والجمارك بدولة الإمارات العربية المتحدة.`
                : `${brandTitle} - Authoritative maritime shipping, inland towing, and UAE customs clearance.`}
            </span>
          </div>
        </Container>
      </section>
    </div>
  );
};
