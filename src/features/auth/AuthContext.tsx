import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface StaffProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role?: string;
  avatar_url?: string | null;
  phone?: string | null;
  preferred_language?: string | null;
  notification_preferences?: { email?: boolean; browser?: boolean } | null;
}

export interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  country?: string | null;
  city?: string | null;
  created_at?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  staffProfile: StaffProfile | null;
  customerProfile: CustomerProfile | null;
  profile: { fullName: string; email: string; avatarUrl?: string | null; phone?: string | null } | null;
  role: string | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: Error | string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<StaffProfile>) => void;
  refreshStaffProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomerData = useCallback(async (email?: string | null) => {
    if (!isSupabaseConfigured || !supabase || !email) return;
    try {
      const { data: cust } = await supabase
        .from('customers')
        .select('*')
        .ilike('email', email.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cust) {
        setCustomerProfile(cust);
      }
    } catch (e) {
      console.warn('[AuthContext] Error fetching customer data:', e);
    }
  }, []);

  const fetchStaffData = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // 1. Fetch staff profile (querying without is_active filter to distinguish inactive vs not found)
      const { data: initialProfile, error: profileErr } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let profile = initialProfile;

      if (profileErr) {
        console.error('[AuthContext] Error loading staff profile:', profileErr);
        throw new Error('Failed to verify staff credentials.');
      }

      // If profile does not exist yet, check if user has a valid pending invitation to accept
      if (!profile) {
        const { data: acceptData, error: acceptErr } =
          await supabase.rpc('accept_staff_invitation');

        if (!acceptErr && (acceptData as { success?: boolean } | null)?.success) {
          const { data: newProfile } = await supabase
            .from('staff_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          profile = newProfile;
        }
      }

      if (!profile) {
        // User is not a staff member. Do not kick them out — they may be a customer using the portal.
        setStaffProfile(null);
        setPermissions([]);
        return;
      }

      if (!profile.is_active) {
        // Inactive staff invariant: immediately invalidate session and reject
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setStaffProfile(null);
        setPermissions([]);
        throw new Error('Account is deactivated. Contact Super Admin.');
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('staff_role_assignments')
        .select('role_id')
        .eq('staff_id', userId)
        .limit(1)
        .maybeSingle();

      const notifPrefs = profile.notification_preferences as { email?: boolean; browser?: boolean } | null;
      setStaffProfile({
        ...profile,
        notification_preferences: notifPrefs,
        role: roleData?.role_id,
      });

      // 2. Fetch permissions via RPC
      const { data: userPerms, error: permsErr } = await supabase.rpc('get_user_permissions', {
        target_user_id: userId,
      });

      if (permsErr) {
        console.error('[AuthContext] Error loading permissions:', permsErr);
      } else if (Array.isArray(userPerms)) {
        setPermissions(userPerms.map((p: { permission_id: string }) => p.permission_id));
      }
    } catch (err) {
      console.error('[AuthContext] Error in fetchStaffData:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    // Live Supabase Auth session initialization
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        Promise.all([
          fetchStaffData(initSession.user.id).catch((err) => {
            console.warn('[AuthContext] Staff check:', err.message);
          }),
          fetchCustomerData(initSession.user.email),
        ]).finally(() => setIsLoading(false));
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
        try {
          await Promise.all([
            fetchStaffData(newSession.user.id).catch(() => {}),
            fetchCustomerData(newSession.user.email),
          ]);
        } catch (err: unknown) {
          console.warn('[AuthContext] Auth state change notice:', err);
        }
      } else {
        setStaffProfile(null);
        setCustomerProfile(null);
        setPermissions([]);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchStaffData, fetchCustomerData]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Authentication service is unavailable. Please check configuration.',
      };
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
        try {
          await fetchStaffData(data.user.id);
        } catch (fetchErr: unknown) {
          setIsLoading(false);
          const errorMsg =
            fetchErr instanceof Error ? fetchErr.message : 'Account verification failed.';
          return { success: false, error: errorMsg };
        }
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
      setUser(null);
      setStaffProfile(null);
      setCustomerProfile(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setStaffProfile(null);
    setCustomerProfile(null);
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

  const updateProfile = (updates: Partial<StaffProfile>): void => {
    setStaffProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const refreshStaffProfile = async (): Promise<void> => {
    if (user?.id) {
      await fetchStaffData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        staffProfile,
        customerProfile,
        profile: staffProfile
          ? {
              fullName: staffProfile.full_name,
              email: staffProfile.email,
              avatarUrl: staffProfile.avatar_url,
              phone: staffProfile.phone,
            }
          : customerProfile
            ? {
                fullName: customerProfile.full_name,
                email: customerProfile.email || '',
                phone: customerProfile.phone,
              }
            : null,
        role: staffProfile?.role || null,
        permissions,
        isLoading,
        isAuthenticated: Boolean(user && staffProfile && staffProfile.is_active),
        isStaff: Boolean(user && staffProfile && staffProfile.is_active),
        isCustomer: Boolean(user && !staffProfile),
        signIn,
        signOut,
        updateProfile,
        refreshStaffProfile,
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
