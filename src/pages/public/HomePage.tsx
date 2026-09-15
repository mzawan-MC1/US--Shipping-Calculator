import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { ShippingHeroGraphic } from '../../components/ui/ShippingHeroGraphic';
import { UNVERIFIED_CONTENT } from '../../config/unverifiedContent';
import {
  Calculator,
  MessageCircle,
  ShieldCheck,
  Clock,
  Award,
  Headphones,
  Star,
  Ship,
  Truck,
  FileCheck,
  Box,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { US_LOADING_PORTS, UAE_DESTINATION_PORTS } from '../../services/mockData';

export const HomePage: React.FC = () => {
  const { t, direction } = useI18n();

  const whatsappHref = `https://wa.me/${UNVERIFIED_CONTENT.whatsappNumber}?text=${encodeURIComponent(
    'Hello Fakher Alam Shipping, I would like to get a quote for vehicle shipping from USA to UAE.'
  )}`;

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
    { label: t.featureLicensed, icon: <ShieldCheck className="w-6 h-6 text-blue-600" /> },
    { label: t.featureWorldwide, icon: <Ship className="w-6 h-6 text-cyan-600" /> },
    { label: t.featureDoorToPort, icon: <Truck className="w-6 h-6 text-amber-600" /> },
    { label: t.featureExportDocs, icon: <FileCheck className="w-6 h-6 text-emerald-600" /> },
    { label: t.featureContainerLoading, icon: <Box className="w-6 h-6 text-indigo-600" /> },
    {
      label: t.featureCustomsClearance,
      icon: <ClipboardList className="w-6 h-6 text-violet-600" />,
    },
    { label: t.featureVehicleInspection, icon: <CheckCircle2 className="w-6 h-6 text-teal-600" /> },
    { label: t.featureSupport247, icon: <Headphones className="w-6 h-6 text-rose-600" /> },
  ];

  const journeySteps = [
    {
      num: '01',
      title: 'Auction Purchase & Towing',
      desc: 'Buy from Copart, IAAI, Manheim or private dealers. We tow your car directly from any USA state to our nearest port facility.',
    },
    {
      num: '02',
      title: 'Inspection & Container Loading',
      desc: 'Comprehensive photos and condition report upon port arrival, followed by safe container consolidation and US customs export clearance.',
    },
    {
      num: '03',
      title: 'Ocean Freight to UAE',
      desc: 'Fast, secure maritime transit from Newark, Savannah, Houston, Los Angeles, or Baltimore directly to Khorfakkan or Jebel Ali.',
    },
    {
      num: '04',
      title: 'Clearance & Handover',
      desc: 'Expert customs clearance, VAT assessment, and handover at our Sharjah / Khorfakkan terminal ready for registration.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-brand-navy-950 text-white overflow-hidden py-8 sm:py-14 border-b border-brand-navy-800">
        {/* Subtle background glow effect */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-700 via-brand-navy-900 to-transparent pointer-events-none" />

        <Container className="relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            {/* Licensed Badge Placeholder */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-navy-900/90 border border-brand-navy-700 text-xs font-bold text-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-brand-orange-500 animate-ping" />
              <span>{UNVERIFIED_CONTENT.licenseTitle}</span>
              <span className="text-slate-500">•</span>
              <span className="text-brand-orange-400">{UNVERIFIED_CONTENT.headquartersCity}</span>
            </div>

            {/* Clean Country Headline (No duplicated US/AE fallback labels) */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              <span>{t.heroTitlePart1} </span>
              <span className="inline-flex items-center px-2.5 py-0.5 mx-1 rounded-xl bg-blue-950 border border-blue-500/40 text-blue-400 shadow-sm">
                USA
              </span>{' '}
              <span>{t.heroTitleTo} </span>
              <span className="inline-flex items-center px-2.5 py-0.5 mx-1 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 shadow-sm">
                UAE
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-300 text-xs sm:text-base max-w-xl mx-auto whitespace-pre-line leading-relaxed font-medium">
              {t.heroSubtitle}
            </p>

            {/* Original Maritime Cargo & Vehicle Graphic */}
            <div className="pt-2 pb-1">
              <ShippingHeroGraphic className="max-w-md sm:max-w-lg" />
            </div>

            {/* Hero CTAs */}
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
            </div>

            {/* Trustpilot highlight (Marked as unverified demo) */}
            <div className="pt-1 flex items-center justify-center gap-2 text-xs text-slate-300 font-semibold">
              <div className="flex items-center text-emerald-400">
                <Star className="w-3.5 h-3.5 fill-emerald-400" />
                <Star className="w-3.5 h-3.5 fill-emerald-400" />
                <Star className="w-3.5 h-3.5 fill-emerald-400" />
                <Star className="w-3.5 h-3.5 fill-emerald-400" />
                <Star className="w-3.5 h-3.5 fill-emerald-400" />
              </div>
              <span>
                Trustpilot {UNVERIFIED_CONTENT.trustpilotRating} Rating (
                {UNVERIFIED_CONTENT.trustpilotReviewCount})
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
                <p className="text-[10px] sm:text-[11px] font-bold text-brand-orange-400 tracking-wider uppercase">
                  {badge.subtitle}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Interactive Routes Preview */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-navy-950">
              {t.heroUsPortsTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Regular weekly container sailings from five major coastal hubs directly to the UAE
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* US Loading Ports Card */}
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <span className="text-xs font-black px-2 py-1 rounded bg-blue-900 text-blue-200">
                  USA
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    USA Loading Ports
                  </h3>
                  <p className="text-xs text-slate-500">Weekly departures & container loading</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {US_LOADING_PORTS.map((port) => (
                  <div
                    key={port.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">{port.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        {port.stateOrCity}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{port.code}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* UAE Destination Ports Card */}
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <span className="text-xs font-black px-2 py-1 rounded bg-emerald-900 text-emerald-200">
                  UAE
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    UAE Destination Ports
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fast clearance & vehicle pickup terminals
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {UAE_DESTINATION_PORTS.map((port) => (
                  <div
                    key={port.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">{port.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        {port.stateOrCity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-2">
                      <MapPin className="w-3.5 h-3.5 text-brand-orange-500" />
                      <span>Dedicated terminal & yard</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* Why Choose Fakher Alam */}
      <section className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-navy-950">
              {t.whyChooseUsTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Complete vehicle logistics from auction gavel to Sharjah handover
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {whyChooseFeatures.map((feat, idx) => (
              <Card key={idx} className="p-4 text-center flex flex-col items-center justify-center">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center mb-2.5">
                  {feat.icon}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">{feat.label}</h4>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Shipping Journey Timeline */}
      <section className="py-12 sm:py-16 bg-white">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-navy-950">
              How Car Shipping Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              A transparent, hassle-free 4-stage vehicle transit journey
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {journeySteps.map((step) => (
              <div
                key={step.num}
                className="relative p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block text-2xl font-black text-brand-orange-500 mb-2">
                    {step.num}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">{step.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA banner */}
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-brand-navy-950 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-1 text-center sm:text-start">
              <h3 className="text-lg sm:text-2xl font-black">
                Ready to Calculate Your Shipping Cost?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Instant estimates for ocean freight, customs duty, and UAE VAT.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link to="/calculator" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto font-extrabold">
                  {t.calculateShipping}
                </Button>
              </Link>
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
            </div>
          </div>

          {/* Provisional Content Notice */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{UNVERIFIED_CONTENT.provisionalNotice}</span>
          </div>
        </Container>
      </section>
    </div>
  );
};
