import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../features/auth/AuthContext';
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
  Ship,
  ExternalLink,
} from 'lucide-react';

export interface AdminSidebarProps {
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onClose }) => {
  const { t } = useI18n();
  const location = useLocation();
  const { role } = useAuth();

  const navItems = [
    { label: t.adminDashboardTitle, path: '/admin', icon: LayoutDashboard },
    { label: t.adminEnquiries, path: '/admin/enquiries', icon: MessageSquare },
    { label: t.adminQuotations, path: '/admin/quotations', icon: FileSpreadsheet },
    { label: t.adminCustomers, path: '/admin/customers', icon: Users },
    { label: t.adminRoutes, path: '/admin/routes', icon: Compass },
    { label: t.adminPricing, path: '/admin/pricing', icon: DollarSign },
    { label: t.adminContent, path: '/admin/content', icon: FileText },
    { label: t.adminStaff, path: '/admin/staff', icon: UserCheck },
    { label: t.adminReports, path: '/admin/reports', icon: BarChart3 },
    { label: t.adminSettings, path: '/admin/settings', icon: Settings },
  ];

  const formattedRole = role
    ? role
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Super Admin';

  return (
    <aside className="w-64 bg-brand-navy-950 text-slate-300 flex flex-col min-h-screen border-e border-brand-navy-800">
      {/* Brand & Portal Header */}
      <div className="p-5 border-b border-brand-navy-800/80">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-orange-500 text-white flex items-center justify-center">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white leading-tight">{t.brandName}</h2>
            <p className="text-[10px] text-brand-orange-400 font-bold uppercase tracking-wider">
              Staff Portal
            </p>
          </div>
        </Link>
      </div>

      {/* RBAC notice badge */}
      <div className="px-4 py-2 bg-brand-navy-900/60 border-b border-brand-navy-800/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span>
          Role: <strong className="text-slate-200">{formattedRole}</strong>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
          Verified
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-brand-orange-500 text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-brand-navy-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer link to public website */}
      <div className="p-4 border-t border-brand-navy-800/80">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg bg-brand-navy-900 hover:bg-brand-navy-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Public Website</span>
        </Link>
      </div>
    </aside>
  );
};
