import React, { useState, useEffect, useRef } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useI18n } from '../../i18n/I18nContext';
import {
  Menu,
  X,
  Globe,
  Bell,
  LogOut,
  User,
  Settings,
  KeyRound,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const SIDEBAR_COLLAPSED_KEY = 'admin_sidebar_collapsed';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const { language, toggleLanguage } = useI18n();
  const { user, profile, staffProfile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Persist sidebar collapsed preference
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (err) {
        console.error('Failed to save sidebar collapsed state:', err);
      }
      return next;
    });
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname, location.hash]);

  // Handle escape key to close drawers and dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sidebarOpen) setSidebarOpen(false);
        if (profileDropdownOpen) setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, profileDropdownOpen]);

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleSignOut = async () => {
    setProfileDropdownOpen(false);
    await signOut();
    navigate('/admin/login');
  };

  const displayName = profile?.fullName || staffProfile?.full_name || user?.email?.split('@')[0] || 'Staff Member';
  const displayEmail = profile?.email || staffProfile?.email || user?.email || '';
  const avatarUrl = profile?.avatarUrl || staffProfile?.avatar_url;
  const formattedRole = role
    ? role
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Super Admin';

  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('') || 'U';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col w-full overflow-x-hidden relative">
      {/* Desktop Fixed Full-Height Sidebar (100vh) */}
      <div
        className={`hidden lg:block fixed top-0 bottom-0 start-0 z-40 h-screen bg-brand-navy-950 border-e border-brand-navy-800 transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <AdminSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>

      {/* Mobile & Tablet Off-Canvas Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 max-w-xs h-full bg-brand-navy-950 shadow-2xl flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 end-4 z-20 p-2 text-slate-400 hover:text-white rounded-lg bg-brand-navy-900/60 hover:bg-brand-navy-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area - Offsets dynamically based on desktop sidebar width */}
      <div
        className={`flex-1 flex flex-col min-w-0 w-full transition-all duration-200 min-h-screen ${
          isCollapsed ? 'lg:ps-20' : 'lg:ps-64'
        }`}
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm w-full">
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

            {/* Staff Profile Dropdown Trigger */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 ps-2 py-1 pe-2 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all text-xs text-slate-700"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover border border-brand-orange-400 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-orange-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                    {userInitials}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-start">
                  <span className="font-bold leading-tight truncate max-w-[130px]">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {formattedRole}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform hidden sm:block ${
                    profileDropdownOpen ? 'rotate-180 text-brand-orange-500' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute end-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Account Header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {displayEmail}
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-brand-orange-50 text-brand-orange-600 text-[10px] font-bold">
                      {formattedRole}
                    </span>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-1">
                    <Link
                      to="/admin/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-orange-500 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/admin/profile#account"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-orange-500 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </Link>
                    <Link
                      to="/admin/profile#password"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-orange-500 transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      <span>Change Password</span>
                    </Link>
                  </div>

                  <hr className="border-slate-100 my-1" />

                  {/* Sign Out */}
                  <div className="py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-start"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Security Status Banner */}
        <div className="bg-brand-navy-900 border-b border-brand-navy-800 px-4 py-2 text-xs text-slate-300 flex items-center justify-between w-full">
          <span className="truncate">
            🔒 <strong>Staff Portal:</strong> Authenticated staff session active.
          </span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
            System Online
          </span>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
