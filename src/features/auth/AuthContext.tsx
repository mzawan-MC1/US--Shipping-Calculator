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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setStaffProfile(null);
        setPermissions([]);
        throw new Error('Access denied: Account is not authorized as staff.');
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

      setStaffProfile({
        ...profile,
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
        fetchStaffData(initSession.user.id)
          .catch((err) => {
            console.warn('[AuthContext] Session invalid:', err.message);
          })
          .finally(() => setIsLoading(false));
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
          await fetchStaffData(newSession.user.id);
        } catch (err: unknown) {
          console.warn('[AuthContext] Auth state change invalid:', err);
        }
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
        isAuthenticated: Boolean(user && staffProfile && staffProfile.is_active),
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
