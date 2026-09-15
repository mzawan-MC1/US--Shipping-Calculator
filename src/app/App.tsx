import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nContext';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </I18nProvider>
  );
};
