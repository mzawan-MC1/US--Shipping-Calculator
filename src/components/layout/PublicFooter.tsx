import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { useAuth } from '../../features/auth/AuthContext';
import { Ship, MapPin, Phone, Mail, MessageCircle, ShieldCheck } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { t, language } = useI18n();
  const { branding, getWhatsAppLink, getPhoneTel } = useWebsiteSettings();
  const { isAuthenticated, staffProfile } = useAuth();

  const isStaff = Boolean(isAuthenticated && staffProfile?.is_active);
  const isAr = language === 'ar';
  const brandTitle = isAr ? branding.companyNameAr : branding.companyName;
  const addressDisplay = isAr ? branding.headquartersAddressAr : branding.headquartersAddress;
  const copyrightDisplay = isAr ? branding.copyrightTextAr : branding.copyrightText;
  const whatsappHref = getWhatsAppLink();
  const phoneHref = `tel:${getPhoneTel()}`;

  return (
    <footer className="bg-brand-navy-950 text-slate-400 border-t border-brand-navy-800 text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-block focus:outline-none" aria-label={brandTitle}>
              {branding.darkLogoUrl || branding.logoUrl ? (
                <img
                  src={branding.darkLogoUrl || branding.logoUrl}
                  alt={brandTitle}
                  className="h-16 sm:h-20 w-auto max-w-[260px] sm:max-w-[320px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange-500 flex items-center justify-center text-white shrink-0">
                    <Ship className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-black text-white">{brandTitle}</span>
                </div>
              )}
            </Link>
            <p className="text-slate-300 text-xs sm:text-sm max-w-md leading-relaxed">
              {isAr
                ? 'متخصصون في شحن السيارات وتقديم الخدمات اللوجستية البحرية الموثوقة من موانئ ومزادات الولايات المتحدة الأمريكية مباشرة إلى موانئ دولة الإمارات العربية المتحدة.'
                : 'Professional, licensed car shipping specialists transporting vehicles from major USA auto auctions and ports directly to Khorfakkan Port (Sharjah) and Jebel Ali (Dubai).'}
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isAr
                  ? 'خدمات لوجستية بحرية مرخصة ومعتمدة في دولة الإمارات العربية المتحدة'
                  : 'Licensed & Registered UAE Maritime Freight Forwarder'}
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">
              {isAr ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  {t.navHome}
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="hover:text-white transition-colors">
                  {t.navCalculator}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  {t.navContact}
                </Link>
              </li>
              {isStaff && (
                <li>
                  <Link to="/admin" className="hover:text-white transition-colors">
                    {t.navAdmin}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">
              {isAr ? 'المقر الرئيسي والمساعدة' : 'Headquarters & Support'}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-orange-400 shrink-0 mt-0.5" />
                <span>{addressDisplay}</span>
              </li>
              {branding.supportPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-orange-400 shrink-0" />
                  <a href={phoneHref} className="hover:text-white">
                    {branding.supportPhone}
                  </a>
                </li>
              )}
              {whatsappHref && (
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-brand-whatsapp shrink-0" />
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    {isAr ? 'محادثة واتساب مباشرة' : 'WhatsApp Support'}
                  </a>
                </li>
              )}
              {branding.supportEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-orange-400 shrink-0" />
                  <a href={`mailto:${branding.supportEmail}`} className="hover:text-white">
                    {branding.supportEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-brand-navy-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p className="leading-relaxed">
            © {new Date().getFullYear()} {copyrightDisplay} • Powered by{' '}
            <a
              href="https://mc1services.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-red-500 hover:text-red-400 transition-colors"
            >
              MCS Consultancy
            </a>
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] px-2 py-0.5 rounded bg-brand-navy-900 border border-brand-navy-800 text-slate-300">
              UAE Logistics Platform
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
