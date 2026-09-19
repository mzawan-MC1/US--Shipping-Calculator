import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spinner } from '../../components/ui/Spinner';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredPermission?: string;
  superAdminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  superAdminOnly,
}) => {
  const { isAuthenticated, isLoading, hasPermission, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <Spinner size="lg" />
        <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Verifying Staff Authentication...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (superAdminOnly && role !== 'super_admin') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 max-w-md shadow-sm">
          <h3 className="font-black text-sm uppercase tracking-wide">Super Admin Restricted</h3>
          <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
            This configuration module contains sensitive infrastructure settings and is strictly restricted to Super Administrators.
          </p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 max-w-md">
          <h3 className="font-black text-sm uppercase tracking-wide">Permission Restricted</h3>
          <p className="text-xs text-amber-800 mt-1">
            Your staff account does not hold the <code>{requiredPermission}</code> capability
            required to access this module.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
