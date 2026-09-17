import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Spinner } from '../components/ui/Spinner';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

// Direct import for fast first-paint of the public home page
import { HomePage } from '../pages/public/HomePage';

// Route-level code splitting
const CalculatorPage = lazy(() =>
  import('../pages/public/CalculatorPage').then((m) => ({ default: m.CalculatorPage }))
);
const ResultsPage = lazy(() =>
  import('../pages/public/ResultsPage').then((m) => ({ default: m.ResultsPage }))
);
const ContactPage = lazy(() =>
  import('../pages/public/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const DesignSystemPage = lazy(() =>
  import('../pages/public/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage }))
);

const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminLoginPage = lazy(() =>
  import('../pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminEnquiriesPage = lazy(() =>
  import('../pages/admin/AdminEnquiriesPage').then((m) => ({ default: m.AdminEnquiriesPage }))
);
const AdminQuotationsPage = lazy(() =>
  import('../pages/admin/AdminQuotationsPage').then((m) => ({ default: m.AdminQuotationsPage }))
);
const AdminCustomersPage = lazy(() =>
  import('../pages/admin/AdminCustomersPage').then((m) => ({ default: m.AdminCustomersPage }))
);
const AdminRoutesPage = lazy(() =>
  import('../pages/admin/AdminRoutesPage').then((m) => ({ default: m.AdminRoutesPage }))
);
const AdminTariffsPage = lazy(() =>
  import('../pages/admin/AdminTariffsPage').then((m) => ({ default: m.AdminTariffsPage }))
);
const AdminCmsPage = lazy(() =>
  import('../pages/admin/AdminCmsPage').then((m) => ({ default: m.AdminCmsPage }))
);
const AdminStaffPage = lazy(() =>
  import('../pages/admin/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage }))
);
const AdminReportsPage = lazy(() =>
  import('../pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }))
);
const AdminSettingsPage = lazy(() =>
  import('../pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);
const AdminActivityPage = lazy(() =>
  import('../pages/admin/AdminActivityPage').then((m) => ({ default: m.AdminActivityPage }))
);
const AdminProfilePage = lazy(() =>
  import('../pages/admin/AdminProfilePage').then((m) => ({ default: m.AdminProfilePage }))
);

const SuspenseLoader: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <Spinner size="lg" />
    <span className="text-xs font-semibold text-slate-400 mt-3 tracking-wide">
      Loading portal...
    </span>
  </div>
);

// Public Layout Wrapper
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <HomePage />
            </PublicLayout>
          }
        />
        <Route
          path="/calculator"
          element={
            <PublicLayout>
              <CalculatorPage />
            </PublicLayout>
          }
        />
        <Route
          path="/results"
          element={
            <PublicLayout>
              <ResultsPage />
            </PublicLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <PublicLayout>
              <ContactPage />
            </PublicLayout>
          }
        />

        {/* Design System (Strictly Dev-Only: Redirects to / in Production) */}
        <Route
          path="/design-system"
          element={
            import.meta.env.DEV ? (
              <PublicLayout>
                <DesignSystemPage />
              </PublicLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Admin Auth Route */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminDashboardPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/enquiries"
          element={
            <ProtectedRoute requiredPermission="enquiries.view">
              <AdminLayout>
                <AdminEnquiriesPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quotations"
          element={
            <ProtectedRoute requiredPermission="quotations.view">
              <AdminLayout>
                <AdminQuotationsPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute requiredPermission="customers.view">
              <AdminLayout>
                <AdminCustomersPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/routes"
          element={
            <ProtectedRoute requiredPermission="routes.view">
              <AdminLayout>
                <AdminRoutesPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pricing"
          element={
            <ProtectedRoute requiredPermission="pricing.view">
              <AdminLayout>
                <AdminTariffsPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content"
          element={
            <ProtectedRoute requiredPermission="cms.view">
              <AdminLayout>
                <AdminCmsPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute requiredPermission="staff.view">
              <AdminLayout>
                <AdminStaffPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requiredPermission="reports.view">
              <AdminLayout>
                <AdminReportsPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredPermission="settings.view">
              <AdminLayout>
                <AdminSettingsPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activity"
          element={
            <ProtectedRoute requiredPermission="audit.view">
              <AdminLayout>
                <AdminActivityPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminProfilePage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cms"
          element={<Navigate to="/admin/content" replace />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
