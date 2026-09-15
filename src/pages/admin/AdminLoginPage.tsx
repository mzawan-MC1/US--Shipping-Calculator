import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Ship, Lock, Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('admin@fakheralamshipping.com');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect immediately
  React.useEffect(() => {
    if (isAuthenticated) {
      const state = location.state as { from?: { pathname?: string } } | null;
      const from = state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

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
            Internal Staff Portal • Phase 2A
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 sm:p-8 space-y-4 shadow-xl">
          {errorMsg && (
            <Alert variant="error" title="Sign-In Error">
              {errorMsg}
            </Alert>
          )}

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

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDemoBypass}
              disabled={isSubmitting}
              className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-brand-orange-600" />
              <span>Sign In with Demo Super Admin</span>
            </button>

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
