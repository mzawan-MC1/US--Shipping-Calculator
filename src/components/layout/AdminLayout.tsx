import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useI18n } from '../../i18n/I18nContext';
import { Menu, Globe, Bell, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language, toggleLanguage } = useI18n();
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row w-full overflow-x-hidden">
      {/* Desktop Sidebar (Only visible on lg: 1024px and wider) */}
      <div className="hidden lg:block shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile & Tablet Drawer */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
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

            <div className="flex items-center gap-2 ps-2 border-s border-slate-200 text-xs text-slate-700">
              <UserCircle className="w-6 h-6 text-brand-orange-500" />
              <div className="hidden sm:flex flex-col text-start">
                <span className="font-bold leading-tight truncate max-w-[140px]">
                  {profile?.fullName || user?.email || 'Staff Member'}
                </span>
                <span className="text-[10px] text-slate-400 capitalize">
                  {role?.replace('_', ' ') || 'Staff'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ms-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Security Status Banner */}
        <div className="bg-brand-navy-900 border-b border-brand-navy-800 px-4 py-2 text-xs text-slate-300 flex items-center justify-between">
          <span className="truncate">
            🔒 <strong>Staff Portal:</strong> Authenticated staff session active.
          </span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
            System Online
          </span>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
