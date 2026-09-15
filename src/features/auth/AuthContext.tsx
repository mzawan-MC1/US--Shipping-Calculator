import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface StaffProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  staffProfile: StaffProfile | null;
  profile: { fullName: string; email: string } | null;
  role: string | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: Error | string }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STAFF: StaffProfile = {
  id: 'demo-staff-admin-id',
  email: 'admin@fakheralamshipping.com',
  full_name: 'Operations Manager (Demo)',
  is_active: true,
  role: 'super_admin',
};

const DEMO_PERMISSIONS = [
  'dashboard.view',
  'enquiries.view',
  'enquiries.manage',
  'quotations.view',
  'quotations.manage',
  'customers.view',
  'customers.manage',
  'routes.view',
  'routes.manage',
  'pricing.view',
  'pricing.manage',
  'cms.view',
  'cms.manage',
  'staff.view',
  'staff.manage',
  'reports.view',
  'settings.view',
  'settings.manage',
  'audit.view',
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaffData = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // 1. Fetch staff profile
      const { data: profile } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (profile) {
        // Fetch role
        const { data: roleData } = await supabase
          .from('staff_role_assignments')
          .select('role_id')
          .eq('staff_id', userId)
          .limit(1)
          .single();

        setStaffProfile({
          ...profile,
          role: roleData?.role_id,
        });
      }

      // 2. Fetch permissions via RPC
      const { data: userPerms } = await supabase.rpc('get_user_permissions', {
        target_user_id: userId,
      });

      if (Array.isArray(userPerms)) {
        setPermissions(userPerms.map((p: { permission_id: string }) => p.permission_id));
      }
    } catch (err) {
      console.error('[AuthContext] Error loading staff data:', err);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Check if previously logged in to demo
      const demoAuth = localStorage.getItem('fa_demo_auth');
      if (demoAuth === 'true') {
        setUser({ id: DEMO_STAFF.id, email: DEMO_STAFF.email } as User);
        setStaffProfile(DEMO_STAFF);
        setPermissions(DEMO_PERMISSIONS);
      }
      setIsLoading(false);
      return;
    }

    // Live Supabase Auth session initialization
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        fetchStaffData(initSession.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchStaffData(newSession.user.id);
      } else {
        setStaffProfile(null);
        setPermissions([]);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchStaffData]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      // Demo authentication mode fallback
      if (password.length >= 6) {
        localStorage.setItem('fa_demo_auth', 'true');
        setUser({ id: DEMO_STAFF.id, email } as User);
        setStaffProfile({ ...DEMO_STAFF, email });
        setPermissions(DEMO_PERMISSIONS);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 6 characters in demo mode.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        await fetchStaffData(data.user.id);
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      return { success: false, error: errorMsg };
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      localStorage.removeItem('fa_demo_auth');
      setUser(null);
      setStaffProfile(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setStaffProfile(null);
    setPermissions([]);
    setIsLoading(false);
  };

  const hasPermission = (permission: string): boolean => {
    if (staffProfile?.role === 'super_admin') return true;
    return permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    return staffProfile?.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        staffProfile,
        profile: staffProfile
          ? { fullName: staffProfile.full_name, email: staffProfile.email }
          : null,
        role: staffProfile?.role || null,
        permissions,
        isLoading,
        isAuthenticated: Boolean(user),
        signIn,
        signOut,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
