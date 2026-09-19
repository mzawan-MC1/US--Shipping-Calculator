import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../ui/Button';
import { Ship, Menu, X, MessageCircle, Globe, Phone } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { t, language, toggleLanguage } = useI18n();
  const { branding, getWhatsAppLink, getPhoneTel } = useWebsiteSettings();
  const { isAuthenticated, staffProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isStaff = Boolean(isAuthenticated && staffProfile?.is_active);
  const isAr = language === 'ar';

  const navLinks = [
    { label: t.navHome, path: '/' },
    { label: t.navCalculator, path: '/calculator' },
    { label: isAr ? 'حسابي' : 'My Account', path: '/customer/dashboard' },
    { label: t.navContact, path: '/contact' },
    ...(isStaff ? [{ label: t.navAdmin, path: '/admin' }] : []),
  ];

  const whatsappHref = getWhatsAppLink();
  const phoneHref = `tel:${getPhoneTel()}`;
  const addressDisplay = isAr ? branding.headquartersAddressAr : branding.headquartersAddress;
  const brandTitle = isAr ? branding.companyNameAr : branding.companyName;

  return (
    <header className="sticky top-0 z-40 bg-brand-navy-950 text-white border-b border-brand-navy-800 shadow-md">
      {/* Top micro-bar for Sharjah location and direct contact */}
      <div className="bg-brand-navy-900 border-b border-brand-navy-800/60 py-1.5 px-4 text-xs font-medium text-slate-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{addressDisplay}</span>
          </div>
          <div className="flex items-center gap-3">
            {branding.supportPhone && (
              <a
                href={phoneHref}
                className="hidden sm:inline text-slate-400 hover:text-slate-200 transition-colors"
              >
                {branding.supportPhone}
              </a>
            )}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-brand-navy-800 hover:bg-brand-navy-700 text-white transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-brand-orange-400" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center group focus:outline-none shrink-0"
          aria-label={brandTitle}
        >
          {branding.darkLogoUrl || branding.logoUrl ? (
            <img
              src={branding.darkLogoUrl || branding.logoUrl}
              alt={brandTitle}
              className="h-10 sm:h-12 w-auto max-w-[180px] sm:max-w-[240px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange-600 to-brand-orange-400 flex items-center justify-center text-white shadow-orange-glow group-hover:scale-105 transition-transform shrink-0">
                <Ship className="w-6 h-6" />
              </div>
              <span className="text-base sm:text-lg font-black tracking-wider text-white">
                {brandTitle}
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors py-1 ${
                  isActive
                    ? 'text-brand-orange-400 border-b-2 border-brand-orange-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="sm" startIcon={<MessageCircle className="w-4 h-4" />}>
                WhatsApp
              </Button>
            </a>
          )}
          <Link to="/calculator">
            <Button variant="primary" size="sm">
              {t.calculateShipping}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Quote"
              className="p-2 rounded-lg bg-brand-whatsapp text-white sm:hidden"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          ) : (
            <a
              href={phoneHref}
              aria-label="Call support"
              className="p-2 rounded-lg bg-brand-navy-800 text-white sm:hidden"
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-brand-navy-800 focus:outline-none"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-brand-navy-900 border-b border-brand-navy-800 px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl font-bold text-sm ${
                    isActive
                      ? 'bg-brand-orange-500 text-white'
                      : 'text-slate-200 hover:bg-brand-navy-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-3 border-t border-brand-navy-800 flex flex-col gap-2">
            <Link to="/calculator" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="lg" className="w-full">
                {t.calculateShipping}
              </Button>
            </Link>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="whatsapp"
                  size="lg"
                  className="w-full"
                  startIcon={<MessageCircle className="w-5 h-5" />}
                >
                  {t.whatsappQuote}
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
