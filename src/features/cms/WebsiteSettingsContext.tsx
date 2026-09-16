import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { adminService, BrandingSettings, DEFAULT_BRANDING } from '../../services/adminService';
import { useI18n } from '../../i18n/I18nContext';

interface WebsiteSettingsContextType {
  branding: BrandingSettings;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
  getWhatsAppLink: (customMessage?: string) => string | null;
  getPhoneTel: () => string;
}

const WebsiteSettingsContext = createContext<WebsiteSettingsContextType | undefined>(undefined);

export const WebsiteSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useI18n();

  const loadSettings = useCallback(async () => {
    try {
      const data = await adminService.getBrandingSettings();
      setBranding(data);
    } catch (err) {
      console.warn('Failed to load live website settings, using defaults', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update dynamic document head (title, favicon, meta description)
  useEffect(() => {
    const isAr = language === 'ar';
    const title = isAr
      ? branding.browserTitleAr || branding.browserTitle || DEFAULT_BRANDING.browserTitleAr
      : branding.browserTitle || DEFAULT_BRANDING.browserTitle;
    document.title = title;

    const desc = isAr
      ? branding.metaDescriptionAr || branding.metaDescription || DEFAULT_BRANDING.metaDescriptionAr
      : branding.metaDescription || DEFAULT_BRANDING.metaDescription;
    let metaTag = document.querySelector('meta[name="description"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'description');
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', desc);

    if (branding.faviconUrl) {
      let linkTag = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!linkTag) {
        linkTag = document.createElement('link');
        linkTag.rel = 'icon';
        document.head.appendChild(linkTag);
      }
      linkTag.href = branding.faviconUrl;
    }
  }, [branding, language]);

  // WhatsApp normalization: digits only wa.me URL
  const getWhatsAppLink = useCallback(
    (customMessage?: string): string | null => {
      const rawNumber = branding.whatsappNumber || '';
      const digitsOnly = rawNumber.replace(/\D/g, '');
      if (digitsOnly.length < 7) {
        return null; // Return null if unconfigured or invalid, allowing components to hide/disable gracefully
      }

      const defaultMsg =
        language === 'ar'
          ? 'مرحباً، أود الاستفسار عن تفاصيل شحن السيارات من أمريكا إلى الإمارات.'
          : 'Hello, I would like to inquire about auto shipping quotes from the USA to the UAE.';
      const msg = customMessage !== undefined ? customMessage : defaultMsg;
      return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(msg)}`;
    },
    [branding.whatsappNumber, language]
  );

  const getPhoneTel = useCallback((): string => {
    const raw = branding.supportPhone || '';
    return raw.replace(/[^\d+]/g, '');
  }, [branding.supportPhone]);

  return (
    <WebsiteSettingsContext.Provider
      value={{
        branding,
        isLoading,
        refreshBranding: loadSettings,
        getWhatsAppLink,
        getPhoneTel,
      }}
    >
      {children}
    </WebsiteSettingsContext.Provider>
  );
};

export const useWebsiteSettings = (): WebsiteSettingsContextType => {
  const context = useContext(WebsiteSettingsContext);
  if (!context) {
    throw new Error('useWebsiteSettings must be used within a WebsiteSettingsProvider');
  }
  return context;
};
