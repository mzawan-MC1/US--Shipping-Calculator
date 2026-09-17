import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { Button } from '../ui/Button';
import { Container } from '../ui/Container';
import {
  Calculator,
  MessageCircle,
  CheckCircle2,
  Anchor,
  Truck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export const HomeHero: React.FC = () => {
  const { language, direction } = useI18n();
  const { branding, getWhatsAppLink } = useWebsiteSettings();

  const isAr = language === 'ar';
  const isRtl = direction === 'rtl';

  // CMS Content with authoritative defaults
  const eyebrow = isAr
    ? branding.heroEyebrowAr || 'شحن مركبات مرخص • من أمريكا إلى الإمارات'
    : branding.heroEyebrowEn || 'Licensed Vehicle Shipping • USA to UAE';

  const headline = isAr
    ? branding.heroHeadlineAr || 'اشحن مركبتك من الولايات المتحدة إلى الإمارات'
    : branding.heroHeadlineEn || 'Ship Your Vehicle from the USA to the UAE';

  const description = isAr
    ? branding.heroDescriptionAr ||
      'شحن موثوق للمركبات من كبرى مزادات وموانئ أمريكا إلى الإمارات—مع تقديرات شفافة، وتنسيق القطر الداخلي، ودعم عملاء مخصص.'
    : branding.heroDescriptionEn ||
      'Reliable vehicle shipping from major US auctions and ports to the UAE—with transparent estimates, inland towing coordination and dedicated customer support.';

  const primaryLabel = isAr
    ? branding.heroPrimaryCtaLabelAr || 'احسب تكلفة الشحن'
    : branding.heroPrimaryCtaLabel || 'Calculate Shipping';
  const primaryDest = branding.heroPrimaryCtaDestination || '/calculator';

  const secondaryLabel = isAr
    ? branding.heroSecondaryCtaLabelAr || 'طلب عرض عبر واتساب'
    : branding.heroSecondaryCtaLabel || 'Get a WhatsApp Quote';

  const whatsappQuoteHref = getWhatsAppLink(
    isAr
      ? 'مرحباً، أود الحصول على عرض أسعار فوري لشحن مركبة من الولايات المتحدة الأمريكية إلى دولة الإمارات.'
      : 'Hello, I would like to request an instant quote for shipping a vehicle from the USA to the UAE.'
  );

  const secondaryDest =
    !branding.heroSecondaryCtaDestination || branding.heroSecondaryCtaDestination === 'whatsapp'
      ? whatsappQuoteHref
      : branding.heroSecondaryCtaDestination;

  const motionEnabled = branding.heroMotionEnabled !== false;

  return (
    <section className="relative bg-gradient-to-b from-brand-navy-950 via-brand-navy-900 to-brand-navy-950 text-white pt-8 pb-14 sm:pt-14 sm:pb-20 overflow-hidden">
      {/* Background ambient lighting and pattern */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <Container className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-navy-800/90 border border-brand-navy-700/80 text-xs font-bold text-brand-orange-400 shadow-inner">
            <span
              className={`w-2 h-2 rounded-full bg-brand-orange-500 ${
                motionEnabled ? 'animate-pulse' : ''
              }`}
            />
            <span>{eyebrow}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-[1.15]">
            {headline}
          </h1>

          {/* Supporting Text */}
          <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            {description}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            {primaryDest.startsWith('http') ? (
              <a
                href={primaryDest}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto shadow-orange-glow text-base font-extrabold px-7 py-3.5"
                  startIcon={<Calculator className="w-5 h-5" />}
                >
                  {primaryLabel}
                </Button>
              </a>
            ) : (
              <Link to={primaryDest} className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto shadow-orange-glow text-base font-extrabold px-7 py-3.5"
                  startIcon={<Calculator className="w-5 h-5" />}
                >
                  {primaryLabel}
                </Button>
              </Link>
            )}

            {secondaryDest && (
              <a
                href={secondaryDest}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button
                  variant="whatsapp"
                  size="lg"
                  className="w-full sm:w-auto text-base font-extrabold px-6 py-3.5 shadow-whatsapp-glow"
                  startIcon={<MessageCircle className="w-5 h-5" />}
                >
                  {secondaryLabel}
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Hero Visual Presentation */}
        <div className="mt-10 max-w-4xl mx-auto">
          {branding.heroMediaType === 'video' && branding.heroVideoUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-brand-navy-800 shadow-2xl bg-black/60 aspect-video max-w-3xl mx-auto">
              <video
                src={branding.heroVideoUrl}
                poster={branding.heroVideoPosterUrl || undefined}
                autoPlay={motionEnabled}
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ) : branding.heroMediaType === 'image' && branding.heroImageUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-brand-navy-800 shadow-2xl bg-brand-navy-900 aspect-video max-w-3xl mx-auto">
              <img
                src={branding.heroImageUrl}
                alt="USA to UAE Vehicle Shipping"
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            /* Authoritative High-End Vector Illustration & Floating Cards */
            <div className="relative pt-2">
              {/* Transit Map Arc Graphic */}
              <div className="relative rounded-2xl bg-gradient-to-b from-brand-navy-900/90 to-brand-navy-950/90 border border-brand-navy-700/60 p-4 sm:p-6 shadow-2xl backdrop-blur-sm overflow-hidden">
                {/* Route Header Bar */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-brand-navy-800/80 text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px]">
                      US
                    </span>
                    <span>{isAr ? 'موانئ ومزادات أمريكا' : 'USA Loading Ports (NY, Savannah, Houston, LA)'}</span>
                  </div>

                  <div className="flex items-center gap-1 text-brand-orange-400 font-mono text-[11px]">
                    <span>{isAr ? 'خط سير بحري مباشر' : 'Direct Maritime Corridor'}</span>
                    {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      AE
                    </span>
                    <span>{isAr ? 'موانئ الإمارات (خورفكان وجبل علي)' : 'UAE Ports (Khorfakkan & Jebel Ali)'}</span>
                  </div>
                </div>

                {/* SVG Visual: Ship, Vehicle, Ocean, and Journey Arc */}
                <div className="relative w-full max-w-2xl mx-auto">
                  <svg
                    viewBox="0 0 700 290"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto drop-shadow-2xl select-none"
                    aria-label="USA to UAE Auto Logistics Route"
                  >
                    <defs>
                      <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0B1E3B" />
                        <stop offset="100%" stopColor="#040D1A" />
                      </linearGradient>
                      <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#F97316" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
                      </linearGradient>
                      <linearGradient id="carPaint" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F8FAFC" />
                        <stop offset="50%" stopColor="#E2E8F0" />
                        <stop offset="100%" stopColor="#CBD5E1" />
                      </linearGradient>
                      <linearGradient id="shipHull" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1E293B" />
                        <stop offset="70%" stopColor="#0F172A" />
                        <stop offset="100%" stopColor="#020617" />
                      </linearGradient>
                      <linearGradient id="orangeBox" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FB923C" />
                        <stop offset="100%" stopColor="#EA580C" />
                      </linearGradient>
                    </defs>

                    {/* Ocean Floor */}
                    <rect x="0" y="195" width="700" height="95" fill="url(#oceanGrad)" />
                    <path
                      d="M0 200 Q 175 194, 350 200 T 700 200 L 700 290 L 0 290 Z"
                      fill="#030A14"
                      opacity="0.5"
                    />

                    {/* Dynamic USA to UAE Route Arc */}
                    <path
                      d="M 60 170 Q 350 20 640 170"
                      stroke="url(#routeGrad)"
                      strokeWidth="2.5"
                      strokeDasharray="6 6"
                      fill="none"
                    />

                    {/* USA Port Node */}
                    <circle cx="60" cy="170" r="10" fill="#0284C7" fillOpacity="0.2" />
                    <circle cx="60" cy="170" r="5" fill="#38BDF8" />

                    {/* UAE Port Node */}
                    <circle cx="640" cy="170" r="10" fill="#059669" fillOpacity="0.2" />
                    <circle cx="640" cy="170" r="5" fill="#10B981" />

                    {/* Port Cranes (USA - Left) */}
                    <g opacity="0.4" stroke="#64748B" strokeWidth="2">
                      <line x1="45" y1="195" x2="65" y2="135" />
                      <line x1="65" y1="135" x2="85" y2="195" />
                      <line x1="50" y1="145" x2="110" y2="145" />
                      <line x1="85" y1="145" x2="85" y2="170" strokeDasharray="2 2" />
                    </g>

                    {/* Modern High-End Container Vessel */}
                    <g id="vessel" transform="translate(100, 10)">
                      {/* Vessel Bridge */}
                      <rect x="90" y="100" width="50" height="70" rx="3" fill="#F1F5F9" />
                      <rect x="95" y="108" width="40" height="8" rx="2" fill="#0284C7" opacity="0.8" />
                      <rect x="108" y="78" width="14" height="22" fill="#EF4444" />
                      <rect x="104" y="74" width="22" height="4" rx="1" fill="#1E293B" />
                      <line x1="115" y1="60" x2="115" y2="74" stroke="#94A3B8" strokeWidth="2" />

                      {/* Cargo Containers */}
                      {/* Row 1 */}
                      <rect x="148" y="132" width="46" height="22" rx="2" fill="url(#orangeBox)" />
                      <rect x="198" y="132" width="46" height="22" rx="2" fill="#2563EB" />
                      <rect x="248" y="132" width="46" height="22" rx="2" fill="#059669" />
                      <rect x="298" y="132" width="46" height="22" rx="2" fill="url(#orangeBox)" />
                      <rect x="348" y="132" width="42" height="22" rx="2" fill="#2563EB" />

                      {/* Row 2 */}
                      <rect x="152" y="108" width="44" height="21" rx="2" fill="#1E40AF" />
                      <rect x="200" y="108" width="44" height="21" rx="2" fill="url(#orangeBox)" />
                      <rect x="250" y="108" width="44" height="21" rx="2" fill="#E2E8F0" />
                      <rect x="300" y="108" width="44" height="21" rx="2" fill="#059669" />

                      {/* Ship Hull */}
                      <path d="M 60 170 L 420 170 L 465 190 L 430 215 L 75 215 Z" fill="url(#shipHull)" />
                      <path d="M 75 210 L 430 210 L 425 215 L 75 215 Z" fill="#DC2626" />
                      {/* Wake */}
                      <path
                        d="M 50 215 C 130 212, 290 217, 480 215"
                        stroke="#38BDF8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        opacity="0.8"
                      />
                    </g>

                    {/* Modern Export Vehicle in Foreground */}
                    <g id="exportCar" transform="translate(300, 160) scale(0.7)">
                      {/* Ground Shadow */}
                      <ellipse cx="230" cy="115" rx="200" ry="14" fill="#000000" opacity="0.65" />

                      {/* Vehicle Body Silhouette */}
                      <path
                        d="M50 85 C65 65, 110 50, 160 48 L220 30 C250 22, 330 22, 360 38 L400 55 C430 62, 450 72, 455 85 L450 102 C440 108, 430 110, 420 110 C410 110, 395 90, 370 90 C345 90, 330 110, 200 110 C190 110, 175 90, 150 90 C125 90, 110 110, 70 110 C55 110, 45 100, 50 85 Z"
                        fill="url(#carPaint)"
                      />

                      {/* Windshield & Cabin */}
                      <path
                        d="M175 48 L225 32 C250 25, 320 25, 350 38 L385 52 C370 54, 210 54, 175 48 Z"
                        fill="#0F172A"
                      />
                      <path d="M235 34 L325 34 L335 48 L225 48 Z" fill="#38BDF8" opacity="0.35" />

                      {/* Lights */}
                      <polygon points="440,78 454,82 448,88 435,85" fill="#38BDF8" />
                      <polygon points="54,82 65,80 62,88 52,86" fill="#EF4444" />

                      {/* Alloy Wheels */}
                      <circle cx="370" cy="98" r="26" fill="#0F172A" />
                      <circle cx="370" cy="98" r="18" fill="#475569" />
                      <circle cx="370" cy="98" r="10" fill="#E2E8F0" />

                      <circle cx="150" cy="98" r="26" fill="#0F172A" />
                      <circle cx="150" cy="98" r="18" fill="#475569" />
                      <circle cx="150" cy="98" r="10" fill="#E2E8F0" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* 3 Floating Status / Trust Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
                {/* Card 1: USA Pickup */}
                <div className="bg-brand-navy-900/90 border border-brand-navy-700/80 rounded-xl p-3.5 flex items-start gap-3 backdrop-blur shadow-md">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <span>{isAr ? 'استلام وسحب المزاد' : 'USA Auction Pickup'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {isAr
                        ? 'نقل داخلي من ساحات كوبارت، إياي، ومانهيم إلى الميناء'
                        : 'Direct dispatch from Copart, IAAI & Manheim yards to port'}
                    </p>
                  </div>
                </div>

                {/* Card 2: Ocean Freight */}
                <div className="bg-brand-navy-900/90 border border-brand-navy-700/80 rounded-xl p-3.5 flex items-start gap-3 backdrop-blur shadow-md">
                  <div className="w-8 h-8 rounded-lg bg-brand-orange-500/20 text-brand-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Anchor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <span>{isAr ? 'شحن بحري بالحاويات' : 'Direct Ocean Freight'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {isAr
                        ? 'حاويات مخصصة ومحمية مع بوليصة شحن وتأمين بحري'
                        : 'Secure containerized shipping with formal bill of lading'}
                    </p>
                  </div>
                </div>

                {/* Card 3: UAE Delivery */}
                <div className="bg-brand-navy-900/90 border border-brand-navy-700/80 rounded-xl p-3.5 flex items-start gap-3 backdrop-blur shadow-md">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <span>{isAr ? 'تخليص جمركي وتسليم' : 'UAE Customs & Handover'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {isAr
                        ? 'تخليص سريع بميناء خورفكان وجبل علي وتسليم الشارقة'
                        : 'Khorfakkan & Jebel Ali port clearance to Sharjah yard'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
};
