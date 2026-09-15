import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useI18n } from '../../i18n/I18nContext';
import { Menu, Globe, Bell, UserCircle } from 'lucide-react';
import { isDemoMode } from '../../lib/env';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language, toggleLanguage } = useI18n();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row w-full overflow-x-hidden">
      {/* Desktop Sidebar (Only visible on lg: 1024px and wider) */}
      <div className="hidden lg:block shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile & Tablet Drawer (Active on < 1024px including 768px tablet) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 max-w-xs w-full">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area: Takes full available width on tablet and mobile */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger menu visible below lg breakpoint */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-black text-brand-navy-950 truncate">
              Staff Portal Administration
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isDemoMode && (
              <span className="hidden md:inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                Demo Auth Mode
              </span>
            )}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-brand-orange-500" />
              <span>{language === 'en' ? 'العربية' : 'EN'}</span>
            </button>
            <div className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer hidden sm:block">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 ps-2 border-s border-slate-200 text-xs text-slate-600">
              <UserCircle className="w-6 h-6 text-slate-400" />
              <span className="hidden sm:inline font-bold">Admin Staff</span>
            </div>
          </div>
        </header>

        {/* Architecture Notice Banner */}
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-800 flex items-center justify-between">
          <span className="truncate">
            🔒 <strong>Architecture Note:</strong> Full authentication & server-side RBAC
            permissions will be powered by Supabase Auth & PostgreSQL row-level security (RLS).
          </span>
        </div>

        {/* Page Content: Full width with zero horizontal overflow */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
