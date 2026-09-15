import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Ship, Lock, Mail, ArrowLeft } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@fakheralamshipping.com');
  const [password, setPassword] = useState('••••••••••••');

  const handleDemoSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // In Phase 1 prototype, bypasses to admin dashboard shell
    navigate('/admin');
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
            Internal Staff Portal
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 sm:p-8 space-y-4">
          <Alert variant="info" title="Phase 1 Demo Authentication">
            Production login will be authenticated via Supabase Auth with server-enforced RBAC.
            Click <strong>Sign In</strong> below to preview the staff portal.
          </Alert>

          <form onSubmit={handleDemoSignIn} className="space-y-4 pt-2">
            <Input
              label="Staff Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              startIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button variant="primary" size="lg" type="submit" className="w-full font-black">
              Sign In to Staff Portal
            </Button>
          </form>

          <div className="pt-2 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Website</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
