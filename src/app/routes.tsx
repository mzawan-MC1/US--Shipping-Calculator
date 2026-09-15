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
const AdminPlaceholderPage = lazy(() =>
  import('../pages/admin/AdminPlaceholderPage').then((m) => ({ default: m.AdminPlaceholderPage }))
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
                <AdminPlaceholderPage
                  title="Customer Enquiries"
                  description="Manage all inbound inquiries from the web calculator and WhatsApp."
                  moduleName="Enquiries"
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quotations"
          element={
            <ProtectedRoute requiredPermission="quotations.view">
              <AdminLayout>
                <AdminPlaceholderPage
                  title="Quotations & Revisions"
                  description="Review quotation snapshots, revisions, and customer booking approvals."
                  moduleName="Quotations"
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute requiredPermission="customers.view">
              <AdminLayout>
                <AdminPlaceholderPage
                  title="Customer Directory"
                  description="Manage customer profiles, previous shipments, and contact preferences."
                  moduleName="Customers"
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/routes"
          element={
            <ProtectedRoute requiredPermission="routes.view">
              <AdminLayout>
                <AdminPlaceholderPage
                  title="Countries, Ports & Routes"
                  description="Manage loading origin ports, destination terminals, and transit durations."
                  moduleName="Routes"
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pricing"
          element={
            <ProtectedRoute requiredPermission="pricing.view">
              <AdminLayout>
                <AdminPlaceholderPage
                  title="Freight, Towing & Surcharge Tariffs"
                  description="Central tariff engine for base ocean freight, vehicle surcharges, and state towing rates."
                  moduleName="Tariffs"
                  architectureNote="CRITICAL ARCHITECTURE: Pricing tables and tariff updates are stored in PostgreSQL and calculated authoritatively through secure Supabase RPC functions."
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminPlaceholderPage
                  title="Website Content Management"
                  description="Manage banners, promotional notices, and business hours."
                  moduleName="Content"
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute requiredPermission="staff.view">
              <AdminLayout>
                <AdminPlaceholderPage
                  title="Staff Accounts & Role-Based Access Control"
                  description="Configure staff user roles (Super Admin, Operations, Sales, Customs Officer)."
                  moduleName="Staff"
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requiredPermission="reports.view">
              <AdminLayout>
                <AdminPlaceholderPage
                  title="Reports & Analytics"
                  description="Shipping volume trends, port efficiency, and financial conversion metrics."
                  moduleName="Reports"
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredPermission="settings.view">
              <AdminLayout>
                <AdminPlaceholderPage
                  title="System Settings"
                  description="Exchange rates, WhatsApp routing numbers, and default customs parameters."
                  moduleName="Settings"
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
