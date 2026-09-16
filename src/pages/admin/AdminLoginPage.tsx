import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Ship, Lock, Mail, ArrowLeft, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { supabase } from '../../lib/supabase';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('admin@fakheralamshipping.com');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (
      hash.includes('type=invite') ||
      search.includes('type=invite') ||
      hash.includes('type=recovery') ||
      search.includes('type=recovery')
    ) {
      setIsInviteMode(true);
    }
  }, []);

  // If already authenticated and not configuring password, redirect immediately
  useEffect(() => {
    if (isAuthenticated && !isInviteMode) {
      const state = location.state as { from?: { pathname?: string } } | null;
      const from = state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isInviteMode, navigate, location]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error?.message;
        setErrorMsg(msg || 'Authentication failed. Please verify credentials.');
      } else {
        const state = location.state as { from?: { pathname?: string } } | null;
        const from = state?.from?.pathname || '/admin';
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'An unexpected error occurred during sign-in.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (supabase) {
        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateErr) throw new Error(updateErr.message);

        // Link invitation to staff_profiles
        const { error: rpcErr } = await supabase.rpc('accept_staff_invitation');
        if (rpcErr) {
          console.warn('[AdminLoginPage] accept_staff_invitation notice:', rpcErr.message);
        }

        setInviteSuccessMsg('Password configured successfully! Entering portal...');
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 1200);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to set password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoBypass = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const result = await signIn('admin@fakheralamshipping.com', 'demo-bypass-phase2a');
      if (!result.error) {
        navigate('/admin');
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Authentication bypass failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-orange-500 text-white items-center justify-center shadow-orange-glow mb-2">
            <Ship className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white">Fakher Alam Shipping</h1>
          <p className="text-xs text-brand-orange-400 font-bold tracking-wider uppercase">
            Internal Staff Portal • Phase 2B
          </p>
        </div>

        {/* Login or Set Password Card */}
        <Card className="p-6 sm:p-8 space-y-4 shadow-xl">
          {errorMsg && (
            <Alert variant="error" title="Action Error">
              {errorMsg}
            </Alert>
          )}

          {inviteSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{inviteSuccessMsg}</span>
            </div>
          )}

          {isInviteMode ? (
            <form onSubmit={handleSetPassword} className="space-y-4 pt-1">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-800">Staff Invitation Accepted.</span> Please
                set your personal portal password to complete your account setup.
              </div>

              <Input
                label="Create Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                startIcon={<Lock className="w-4 h-4" />}
                placeholder="Minimum 8 characters"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                startIcon={<Lock className="w-4 h-4" />}
                placeholder="Repeat password"
                required
              />

              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={isSubmitting}
                className="w-full font-black flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Setting Password...</span>
                  </>
                ) : (
                  <span>Set Password & Enter Portal</span>
                )}
              </Button>
            </form>
          ) : (
            <>
              <div className="text-xs text-slate-600">
                Sign in with your authorized staff credentials. Sessions are securely persisted and
                verified with Supabase Auth RBAC.
              </div>

              <form onSubmit={handleSignIn} className="space-y-4 pt-1">
                <Input
                  label="Staff Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  startIcon={<Mail className="w-4 h-4" />}
                  placeholder="name@fakheralamshipping.com"
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  startIcon={<Lock className="w-4 h-4" />}
                  placeholder="••••••••••••"
                  required
                />

                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full font-black flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to Staff Portal</span>
                  )}
                </Button>
              </form>
            </>
          )}

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {!isInviteMode && (
              <button
                type="button"
                onClick={handleDemoBypass}
                disabled={isSubmitting}
                className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-brand-orange-600" />
                <span>Sign In with Demo Super Admin</span>
              </button>
            )}

            <div className="text-center pt-1">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Public Website</span>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
