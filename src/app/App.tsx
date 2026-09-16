import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nContext';
import { AuthProvider } from '../features/auth/AuthContext';
import { WebsiteSettingsProvider } from '../features/cms/WebsiteSettingsContext';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <AuthProvider>
        <WebsiteSettingsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </WebsiteSettingsProvider>
      </AuthProvider>
    </I18nProvider>
  );
};
