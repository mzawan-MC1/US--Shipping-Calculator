import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { UNVERIFIED_CONTENT } from '../../config/unverifiedContent';
import { Ship, MapPin, Phone, Mail, MessageCircle, ShieldCheck } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="bg-brand-navy-950 text-slate-400 border-t border-brand-navy-800 text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-orange-500 flex items-center justify-center text-white">
                <Ship className="w-5 h-5" />
              </div>
              <span className="text-lg font-black text-white">{t.brandName}</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm max-w-md leading-relaxed">
              Professional, licensed car shipping specialists transporting vehicles from major USA
              auto auctions and ports directly to Khorfakkan Port (Sharjah) and Jebel Ali (Dubai).
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>{UNVERIFIED_CONTENT.licenseDescription}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Quick Links</h4>
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
                <Link to="/results" className="hover:text-white transition-colors">
                  {t.resultsTitle}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  {t.navContact}
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  {t.navAdmin}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Sharjah Office</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-orange-400 shrink-0 mt-0.5" />
                <span>{UNVERIFIED_CONTENT.addressFull}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-orange-400 shrink-0" />
                <a href={`tel:${UNVERIFIED_CONTENT.phoneTel}`} className="hover:text-white">
                  {UNVERIFIED_CONTENT.phonePrimary}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-brand-whatsapp shrink-0" />
                <a
                  href={`https://wa.me/${UNVERIFIED_CONTENT.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp Chat
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-orange-400 shrink-0" />
                <a href={`mailto:${UNVERIFIED_CONTENT.emailSupport}`} className="hover:text-white">
                  {UNVERIFIED_CONTENT.emailSupport}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-brand-navy-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 Fakher Alam Used Cars Shipping. All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] px-2 py-0.5 rounded bg-brand-navy-900 border border-brand-navy-800 text-slate-300">
              SiteGround Preview Release
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
