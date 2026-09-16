import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../features/auth/AuthContext';
import { Settings, Shield, RefreshCw, Clock, Percent, CheckCircle2, Lock } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { role, hasPermission } = useAuth();
  const canManageSettings = hasPermission('settings.manage');

  const [activeTab, setActiveTab] = useState<'parameters' | 'security'>('parameters');
  const [validityDays, setValidityDays] = useState('14');
  const [customsDuty, setCustomsDuty] = useState('5.0');
  const [vatRate, setVatRate] = useState('5.0');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [settlementCurrency, setSettlementCurrency] = useState('AED');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const allSettings = await adminService.getSystemSettings();
      const params = (allSettings.operational_parameters as Record<string, unknown>) || {};
      if (params.quotation_validity_days) setValidityDays(String(params.quotation_validity_days));
      if (params.default_customs_duty_rate) {
        setCustomsDuty(String(Number(params.default_customs_duty_rate) * 100));
      }
      if (params.default_vat_rate) {
        setVatRate(String(Number(params.default_vat_rate) * 100));
      }
      if (params.default_currency) setDefaultCurrency(String(params.default_currency));
      if (params.settlement_currency) setSettlementCurrency(String(params.settlement_currency));
    } catch (err) {
      console.warn('Failed to load settings', err);
      setActionError('Unable to load settings.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    loadSettings();
  };

  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);

    const valDays = parseInt(validityDays, 10);
    const dutyVal = parseFloat(customsDuty) / 100;
    const vatVal = parseFloat(vatRate) / 100;

    if (isNaN(valDays) || valDays < 1) {
      setActionError('Quotation validity must be at least 1 day.');
      setIsSaving(false);
      return;
    }

    try {
      await adminService.updateSystemSetting('operational_parameters', {
        quotation_validity_days: valDays,
        default_customs_duty_rate: dutyVal,
        default_vat_rate: vatVal,
        default_currency: defaultCurrency,
        settlement_currency: settlementCurrency,
        auto_assign_leads: true,
      });
      setActionSuccess('Operational parameters updated successfully.');
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings.';
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              System Configuration
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Global Rules
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-orange-500" />
            System & Operational Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure quotation expiration rules, standard customs duty calculations, and security
            governance parameters.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {actionError && (
        <Alert variant="error" title="Notice">
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('parameters')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'parameters'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Operational Parameters</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'security'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security & Governance</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading settings...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OPERATIONAL PARAMETERS */}
          {activeTab === 'parameters' && (
            <Card className="p-6 bg-white border border-slate-200 max-w-2xl">
              <h3 className="text-base font-bold text-brand-navy-950 mb-1">
                Quotation & Tax Computation Rules
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Governs automatic quotation expiration windows and baseline customs valuation rates.
              </p>

              <form onSubmit={handleSaveParameters} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Quotation Validity Period (Days)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        max="90"
                        value={validityDays}
                        onChange={(e) => setValidityDays(e.target.value)}
                        startIcon={<Clock className="w-4 h-4" />}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Proposals automatically expire after this period unless renewed.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Default UAE Customs Duty (%)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        value={customsDuty}
                        onChange={(e) => setCustomsDuty(e.target.value)}
                        startIcon={<Percent className="w-4 h-4" />}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Standard GCC automotive customs tariff rate (default: 5.0%).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Standard UAE Import VAT (%)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="25"
                        value={vatRate}
                        onChange={(e) => setVatRate(e.target.value)}
                        startIcon={<Percent className="w-4 h-4" />}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Federal Tax Authority standard VAT rate (default: 5.0%).
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Base Quotation Currency
                    </label>
                    <select
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer min-h-[38px]"
                    >
                      <option value="USD">USD (US Dollar - International Freight)</option>
                    </select>
                  </div>
                </div>

                {canManageSettings && (
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSaving}
                      className="font-bold"
                    >
                      {isSaving ? 'Saving...' : 'Save Parameters'}
                    </Button>
                  </div>
                )}
              </form>
            </Card>
          )}

          {/* TAB 2: SECURITY & GOVERNANCE */}
          {activeTab === 'security' && (
            <div className="space-y-4 max-w-2xl">
              <Card className="p-6 bg-white border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-brand-navy-950">
                      Staff Access & Security
                    </h3>
                    <p className="text-xs text-slate-500">
                      Staff access and operations are managed through assigned roles.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs text-slate-700">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <strong className="block text-slate-900">Active Staff Session Role</strong>
                      <span className="text-slate-400 text-[11px]">
                        Assigned security clearance
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-brand-navy-900 text-white font-bold capitalize">
                      {role?.replace('_', ' ') || 'Super Admin'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <strong className="block text-slate-900">Public Registration Barrier</strong>
                      <span className="text-slate-400 text-[11px]">Staff registration status</span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Invitation-Only
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <strong className="block text-slate-900">Security Audit Trail</strong>
                      <span className="text-slate-400 text-[11px]">
                        Administrative event logging
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <Lock className="w-3.5 h-3.5" /> Active & Immutable
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
