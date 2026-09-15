import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Button } from '../ui/Button';
import { UNVERIFIED_CONTENT } from '../../config/unverifiedContent';
import { Ship, Menu, X, MessageCircle, Globe, ShieldCheck } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { t, language, toggleLanguage } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: t.navHome, path: '/' },
    { label: t.navCalculator, path: '/calculator' },
    { label: t.navContact, path: '/contact' },
    { label: t.navAdmin, path: '/admin' },
  ];

  const whatsappHref = `https://wa.me/${UNVERIFIED_CONTENT.whatsappNumber}?text=${encodeURIComponent(
    'Hello Fakher Alam Shipping, I would like to inquire about car shipping rates from USA to UAE.'
  )}`;

  return (
    <header className="sticky top-0 z-40 bg-brand-navy-950 text-white border-b border-brand-navy-800 shadow-md">
      {/* Top micro-bar for Sharjah location and direct contact */}
      <div className="bg-brand-navy-900 border-b border-brand-navy-800/60 py-1.5 px-4 text-xs font-medium text-slate-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{UNVERIFIED_CONTENT.addressFull}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-400">
              {UNVERIFIED_CONTENT.phonePrimary}
            </span>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-brand-navy-800 hover:bg-brand-navy-700 text-white transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-brand-orange-400" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand Logo Placeholder */}
        <Link to="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange-600 to-brand-orange-400 flex items-center justify-center text-white shadow-orange-glow group-hover:scale-105 transition-transform">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-wider text-white">
                {t.brandName}
              </span>
              <span className="hidden xs:inline-flex items-center gap-0.5 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <ShieldCheck className="w-3 h-3" /> UAE
              </span>
            </div>
            <p className="text-[11px] font-bold tracking-widest text-brand-orange-400 uppercase">
              {t.brandTagline}
            </p>
          </div>
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
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <Button variant="whatsapp" size="sm" startIcon={<MessageCircle className="w-4 h-4" />}>
              WhatsApp
            </Button>
          </a>
          <Link to="/calculator">
            <Button variant="primary" size="sm">
              {t.calculateShipping}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp Quote"
            className="p-2 rounded-lg bg-brand-whatsapp text-white sm:hidden"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
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
          </div>
        </div>
      )}
    </header>
  );
};
