import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { adminService, AdminFreightRate, AdminTowingRate } from '../../services/adminService';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../features/auth/AuthContext';
import {
  DollarSign,
  Ship,
  Truck,
  RefreshCw,
  Clock,
  TrendingUp,
  AlertCircle,
  Edit2,
} from 'lucide-react';

export const AdminTariffsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManagePricing = hasPermission('pricing.manage');

  const [activeTab, setActiveTab] = useState<'freight' | 'towing' | 'exchange'>('freight');
  const [freightRates, setFreightRates] = useState<AdminFreightRate[]>([]);
  const [towingRates, setTowingRates] = useState<AdminTowingRate[]>([]);
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; updatedAt: string }>({
    rate: 3.6725,
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Exchange rate modal
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [newExchangeRate, setNewExchangeRate] = useState('3.6725');
  const [isUpdatingExchange, setIsUpdatingExchange] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [f, t, e] = await Promise.all([
        adminService.getFreightRates(),
        adminService.getTowingRates(),
        adminService.getExchangeRate(),
      ]);
      setFreightRates(f);
      setTowingRates(t);
      setExchangeRate(e);
      setNewExchangeRate(e.rate.toString());
    } catch (err) {
      console.warn('Failed to load tariffs', err);
      setActionError('Unable to load pricing tariffs.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    loadData();
  };

  const handleUpdateExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newExchangeRate);
    if (isNaN(val) || val <= 0) {
      setActionError('Please enter a valid positive exchange rate.');
      return;
    }

    setIsUpdatingExchange(true);
    setActionError(null);
    try {
      await adminService.updateExchangeRate(val);
      setActionSuccess(`Currency exchange rate updated to 1 USD = ${val} AED.`);
      setIsExchangeModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update rate';
      setActionError(msg);
    } finally {
      setIsUpdatingExchange(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Pricing & Shipping Rates
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              System Online
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-orange-500" />
            Freight & Towing Rates
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Shipping rates governing ocean container shipping, US inland towing brackets, and
            currency conversions.
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
          onClick={() => setActiveTab('freight')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'freight'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>Ocean Freight Rates ({freightRates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('towing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'towing'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Inland Towing Brackets ({towingRates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('exchange')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'exchange'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Currency Exchange Rate</span>
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading tariff schedules...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OCEAN FREIGHT RATES */}
          {activeTab === 'freight' && (
            <Card className="bg-white border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-brand-navy-950">Ocean Freight Tariffs</h3>
                  <p className="text-xs text-slate-500">
                    Base ocean shipping tariffs per vehicle category and route.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4">Vehicle Category</th>
                      <th className="py-3 px-4">Shipping Method</th>
                      <th className="py-3 px-4">Rate (USD)</th>
                      <th className="py-3 px-4">Effective Dates</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {freightRates.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-brand-navy-950">{f.routeDesc}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant="navy">{f.category}</Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{f.shippingMethod}</td>
                        <td className="py-3.5 px-4 font-bold text-brand-orange-600 text-sm">
                          {formatCurrency(f.amountUsd)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(f.effectiveFrom).toLocaleDateString()}
                          {f.effectiveTo
                            ? ` – ${new Date(f.effectiveTo).toLocaleDateString()}`
                            : ' (Active)'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 2: INLAND TOWING */}
          {activeTab === 'towing' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Inland Towing Tariff Notice:</strong>
                  <span>
                    Locations designated as <em>Range</em> indicate variable inland carrier rates.
                    On customer quotes and invoices, these indicate that the final towing amount is
                    subject to carrier confirmation upon vehicle pickup.
                  </span>
                </div>
              </div>

              <Card className="bg-white border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Origin State / Auction</th>
                        <th className="py-3 px-4">Loading Port</th>
                        <th className="py-3 px-4">Vehicle Category</th>
                        <th className="py-3 px-4">Pricing Mode</th>
                        <th className="py-3 px-4">Towing Amount (USD)</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {towingRates.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-bold text-brand-navy-950">
                            {t.originLocation}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {t.loadingPort}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="orange">{t.vehicleCategory}</Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            {t.isRange ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Estimated Range
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Fixed Amount
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {t.isRange ? (
                              <div>
                                <span>
                                  {formatCurrency(t.minAmount)} – {formatCurrency(t.maxAmount)}
                                </span>
                                <span className="text-[10px] text-amber-700 block font-normal">
                                  Subject to confirmation
                                </span>
                              </div>
                            ) : (
                              <span>{formatCurrency(t.fixedAmount)}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: EXCHANGE RATE */}
          {activeTab === 'exchange' && (
            <Card className="p-6 bg-white border border-slate-200 max-w-xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-brand-navy-950">
                    USD / AED Operational Exchange Rate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Governs all real-time AED settlement conversions in quotations and invoices.
                  </p>
                </div>
                {canManagePricing && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsExchangeModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Update Rate
                  </Button>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Current Rate
                  </span>
                  <div className="text-3xl font-black text-brand-navy-950 mt-1">
                    1 USD = <span className="text-brand-orange-600">{exchangeRate.rate}</span> AED
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last updated: {new Date(exchangeRate.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500 leading-relaxed">
                Standard UAE Central Bank peg is maintained at 3.6725. Adjustments here immediately
                update the calculator and all issued customer proposals.
              </div>
            </Card>
          )}
        </>
      )}

      {/* Update Exchange Rate Modal */}
      <Modal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        title="Update USD to AED Exchange Rate"
      >
        <form onSubmit={handleUpdateExchange} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              New Exchange Rate (AED per 1 USD) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              step="0.0001"
              value={newExchangeRate}
              onChange={(e) => setNewExchangeRate(e.target.value)}
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Standard operational benchmark is 3.6725.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExchangeModalOpen(false)}
              disabled={isUpdatingExchange}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUpdatingExchange}
              className="font-bold"
            >
              {isUpdatingExchange ? 'Saving...' : 'Apply New Rate'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
