import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import {
  LayoutDashboard,
  MessageSquare,
  FileSpreadsheet,
  Users,
  Compass,
  DollarSign,
  FileText,
  UserCheck,
  BarChart3,
  Settings,
  ExternalLink,
  History,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  onClose,
}) => {
  const location = useLocation();
  const { role, hasPermission } = useAuth();
  const { branding } = useWebsiteSettings();

  const brandName = branding.shortName || branding.companyName || 'Fakher Alam';
  const favicon = branding.faviconUrl;

  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Operations Dashboard', path: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      title: 'CUSTOMERS & QUOTATIONS',
      items: [
        { label: 'Customer Enquiries', path: '/admin/enquiries', icon: MessageSquare, permission: 'enquiries.view' },
        { label: 'Quotations & Revisions', path: '/admin/quotations', icon: FileSpreadsheet, permission: 'quotations.view' },
        { label: 'Customer Directory', path: '/admin/customers', icon: Users, permission: 'customers.view' },
      ],
    },
    {
      title: 'SHIPPING MANAGEMENT',
      items: [
        { label: 'Countries, Ports & Routes', path: '/admin/routes', icon: Compass, permission: 'routes.view' },
        { label: 'Freight, Towing & Tariffs', path: '/admin/pricing', icon: DollarSign, permission: 'pricing.view' },
      ],
    },
    {
      title: 'CONTENT & WEBSITE',
      items: [
        { label: 'Website CMS', path: '/admin/content', icon: FileText, permission: 'cms.view' },
      ],
    },
    {
      title: 'TEAM & ACCESS',
      items: [
        { label: 'Staff & Roles', path: '/admin/staff', icon: UserCheck, permission: 'staff.view' },
      ],
    },
    {
      title: 'REPORTING',
      items: [
        { label: 'KPIs & Reports', path: '/admin/reports', icon: BarChart3, permission: 'reports.view' },
        { label: 'Activity History', path: '/admin/activity', icon: History, permission: 'audit.view' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'System Settings', path: '/admin/settings', icon: Settings, permission: 'settings.view' },
      ],
    },
  ];

  const formattedRole = role
    ? role
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Super Admin';

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-brand-navy-950 text-slate-300 flex flex-col h-full border-e border-brand-navy-800 select-none transition-all duration-200`}
    >
      {/* Brand & Portal Header */}
      <div
        className={`p-4 border-b border-brand-navy-800/80 shrink-0 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        <Link
          to="/admin"
          className="flex items-center gap-3 min-w-0"
          title={brandName}
          aria-label={brandName}
        >
          {favicon ? (
            <img
              src={favicon}
              alt={brandName}
              className="w-9 h-9 rounded-lg object-contain shrink-0 bg-brand-navy-900 p-1 border border-brand-navy-800 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-brand-orange-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-orange-glow">
              {brandName.charAt(0)}
            </div>
          )}

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-white leading-tight truncate">
                {brandName}
              </h2>
              <p className="text-[10px] text-brand-orange-400 font-bold uppercase tracking-wider">
                Staff Portal
              </p>
            </div>
          )}
        </Link>

        {/* Desktop Toggle Collapse Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-brand-navy-900 transition-colors ${
              isCollapsed ? 'mt-2' : ''
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* RBAC role notice (expanded mode only) */}
      {!isCollapsed && (
        <div className="px-4 py-2 bg-brand-navy-900/60 border-b border-brand-navy-800/40 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              Role: <strong className="text-slate-200">{formattedRole}</strong>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold shrink-0">
            Verified
          </span>
        </div>
      )}

      {/* Navigation Groups with scroll */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto overscroll-contain">
        {sections.map((section) => {
          // Filter section items by RBAC
          const visibleItems = section.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  {section.title}
                </div>
              ) : (
                <div className="my-2 border-t border-brand-navy-900" />
              )}

              {visibleItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/admin/content' && location.pathname === '/admin/cms') ||
                  (item.path === '/admin' && location.pathname === '/admin/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    title={isCollapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isCollapsed ? 'justify-center px-2' : ''
                    } ${
                      isActive
                        ? 'bg-brand-orange-500 text-white shadow-sm font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-brand-navy-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Public Website Button at the bottom */}
      <div className="p-3 border-t border-brand-navy-800/80 shrink-0">
        <Link
          to="/"
          title={isCollapsed ? 'Public Website' : undefined}
          aria-label="Public Website"
          className={`flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg bg-brand-navy-900 hover:bg-brand-navy-800 transition-colors ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {!isCollapsed && <span>Public Website</span>}
        </Link>
      </div>
    </aside>
  );
};
