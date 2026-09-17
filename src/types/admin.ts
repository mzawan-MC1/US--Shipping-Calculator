export type StaffRole = 'super_admin' | 'operations' | 'sales_agent' | 'customs_officer';

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  isActive: boolean;
  lastSignIn?: string;
}

export interface RbacPermission {
  canManagePricing: boolean;
  canManageQuotations: boolean;
  canManageEnquiries: boolean;
  canManageRoutes: boolean;
  canManageStaff: boolean;
  canViewReports: boolean;
  canManageContent: boolean;
}

export type EnquiryStatus = 'new' | 'contacted' | 'quoted' | 'in_transit' | 'closed';

export interface CustomerEnquiry {
  id: string;
  referenceNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  vehicleDetails: string;
  route: string;
  estimatedTotalUsd: number;
  status: EnquiryStatus;
  createdAt: string;
  source: 'web_calculator' | 'whatsapp' | 'manual' | 'contact_form';
  subject?: string;
  message?: string;
  preferredContactMethod?: string;
  consentGivenAt?: string;
}

export interface AdminKpiMetrics {
  totalEnquiriesThisMonth: number;
  activeQuotationsCount: number;
  averageTransitDays: number;
  pendingFollowUps: number;
}
