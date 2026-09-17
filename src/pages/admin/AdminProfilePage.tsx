import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  Mail,
  Shield,
  Phone,
  Globe,
  Bell,
  Camera,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  Check,
  Lock,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const AdminProfilePage: React.FC = () => {
  const { user, staffProfile, role, updateProfile, refreshStaffProfile } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Initialize data from staffProfile
  useEffect(() => {
    if (staffProfile) {
      setFullName(staffProfile.full_name || '');
      setPhone(staffProfile.phone || '');
      setLanguage((staffProfile.preferred_language as 'en' | 'ar') || 'en');
      setAvatarUrl(staffProfile.avatar_url || null);
      if (staffProfile.notification_preferences) {
        setNotifyEmail(staffProfile.notification_preferences.email ?? true);
        setNotifyBrowser(staffProfile.notification_preferences.browser ?? true);
      }
    } else if (user) {
      setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
    }
  }, [staffProfile, user]);

  // Scroll to hash section if present in URL
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location.hash]);

  // Handle Avatar Upload
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileErrorMsg('Avatar image size must be less than 5MB.');
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setProfileErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setIsUploadingAvatar(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${Date.now()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = publicData.publicUrl;

      // Update staff_profiles table
      const { error: updateError } = await supabase
        .from('staff_profiles')
        .update({
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      updateProfile({ avatar_url: newAvatarUrl });
      setProfileSuccessMsg('Profile picture updated successfully.');
    } catch (err: unknown) {
      console.error('Avatar upload failed:', err);
      setProfileErrorMsg(
        err instanceof Error ? err.message : 'Failed to upload profile picture.'
      );
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const notificationPreferences = {
        email: notifyEmail,
        browser: notifyBrowser,
      };

      const { error } = await supabase
        .from('staff_profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          preferred_language: language,
          notification_preferences: notificationPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update immediate AuthContext state
      updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        preferred_language: language,
        notification_preferences: notificationPreferences,
      });

      setProfileSuccessMsg('Profile details updated successfully.');
      await refreshStaffProfile();
    } catch (err: unknown) {
      console.error('Profile update failed:', err);
      setProfileErrorMsg(
        err instanceof Error ? err.message : 'Failed to update profile.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    if (!user?.email) {
      setPasswordErrorMsg('User session not found. Please log in again.');
      return;
    }

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      // 1. Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error('Current password is incorrect.');
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setPasswordSuccessMsg('Password changed successfully. Your account is secure.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('Password change error:', err);
      setPasswordErrorMsg(
        err instanceof Error ? err.message : 'Failed to change password.'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formattedRole = role
    ? role
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Super Admin';

  const userInitials = fullName
    ? fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'U';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Area */}
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || 'Avatar'}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-brand-orange-500/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-navy-900 text-brand-orange-400 text-2xl font-black flex items-center justify-center border-4 border-white shadow-md ring-2 ring-brand-orange-500/30">
                {userInitials}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 end-0 p-2 rounded-full bg-brand-orange-500 hover:bg-brand-orange-600 text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
              title="Upload new avatar"
              aria-label="Upload new avatar"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          {/* User Overview */}
          <div className="flex-1 text-center sm:text-start">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-black text-brand-navy-950">
                  {fullName || 'Staff Profile'}
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  {user?.email}
                </p>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-orange-50 text-brand-orange-600 border border-brand-orange-200">
                  {formattedRole}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Active
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3 max-w-xl">
              Manage your staff profile credentials, contact information, language, and
              account security. Changes made here apply across the administrative staff portal.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Read-Only System Information */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-brand-navy-950 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-orange-500" />
              Account Metadata
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Official Email Address
                </label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user?.email || 'N/A'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Managed by system Super Administrator
                </span>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Assigned Staff Role
                </label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold capitalize">
                  {formattedRole}
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Staff Account Status
                </label>
                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Active Staff Member
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  User Identifier (UUID)
                </label>
                <div className="p-2 rounded bg-slate-50 font-mono text-[10px] text-slate-500 truncate select-all">
                  {user?.id || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile & Settings & Password */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile & Contact Details Section */}
          <div
            id="account"
            className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 scroll-mt-20"
          >
            <h2 className="text-base font-bold text-brand-navy-950 mb-1 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-orange-500" />
              Personal & Contact Information
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Update your display name, contact phone, preferred portal language, and notifications.
            </p>

            {profileSuccessMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ahmad Al Mansoori"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+971 50 123 4567"
                      className="w-full ps-9 pe-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Preferred Portal Language
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      language === 'en'
                        ? 'border-brand-orange-500 bg-brand-orange-50 text-brand-orange-700 ring-1 ring-brand-orange-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" /> English (EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ar')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      language === 'ar'
                        ? 'border-brand-orange-500 bg-brand-orange-50 text-brand-orange-700 ring-1 ring-brand-orange-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" /> العربية (AR)
                  </button>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-500" />
                  Staff Notification Preferences
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-orange-500 focus:ring-brand-orange-400 border-slate-300"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-700 block">
                        Email Notifications
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Receive email alerts for new customer enquiries and high-priority quotes.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyBrowser}
                      onChange={(e) => setNotifyBrowser(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-orange-500 focus:ring-brand-orange-400 border-slate-300"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-700 block">
                        Portal In-App Alerts
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Display real-time system alerts and quotation notifications in the admin header.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-xl bg-brand-orange-500 hover:bg-brand-orange-600 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Section */}
          <div
            id="password"
            className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 scroll-mt-20"
          >
            <h2 className="text-base font-bold text-brand-navy-950 mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-brand-orange-500" />
              Change Account Password
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Ensure your staff account is protected with a strong, distinct password.
            </p>

            {passwordSuccessMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full ps-9 pe-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full ps-9 pe-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be at least 8 characters long with a mix of characters.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full ps-9 pe-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange-500"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 rounded-xl bg-brand-navy-900 hover:bg-brand-navy-950 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4 text-brand-orange-400" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
