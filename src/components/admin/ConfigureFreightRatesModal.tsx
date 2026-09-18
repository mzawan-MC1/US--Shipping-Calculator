import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import {
  adminService,
  AdminRoute,
  AdminShippingMethod,
  AdminFreightRate,
} from '../../services/adminService';
import { Ship, CheckCircle2, XCircle } from 'lucide-react';

interface MethodConfig {
  isEnabled: boolean;
  baseAmount: string;
}

interface ConfigureFreightRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  routes: AdminRoute[];
  shippingMethods: AdminShippingMethod[];
  existingRates: AdminFreightRate[];
  initialRouteId?: string;
}

export const ConfigureFreightRatesModal: React.FC<ConfigureFreightRatesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  routes,
  shippingMethods,
  existingRates,
  initialRouteId,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [methodConfigs, setMethodConfigs] = useState<Record<string, MethodConfig>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected route when modal opens or initialRouteId changes
  useEffect(() => {
    if (isOpen) {
      if (initialRouteId && routes.some((r) => r.id === initialRouteId)) {
        setSelectedRouteId(initialRouteId);
      } else if (routes.length > 0 && (!selectedRouteId || !routes.some((r) => r.id === selectedRouteId))) {
        setSelectedRouteId(routes[0].id);
      }
      setError(null);
    }
  }, [isOpen, initialRouteId, routes]);

  // Update method configs whenever selectedRouteId or existingRates changes
  useEffect(() => {
    if (!selectedRouteId) return;

    const newConfigs: Record<string, MethodConfig> = {};

    for (const sm of shippingMethods) {
      // Look for an active rate first
      const activeRate = existingRates.find(
        (r) => r.routeId === selectedRouteId && r.shippingMethodId === sm.id && r.isActive
      );

      if (activeRate) {
        newConfigs[sm.id] = {
          isEnabled: true,
          baseAmount: activeRate.amountUsd.toString(),
        };
      } else {
        // Look for any existing inactive rate
        const inactiveRate = existingRates.find(
          (r) => r.routeId === selectedRouteId && r.shippingMethodId === sm.id
        );
        newConfigs[sm.id] = {
          isEnabled: false,
          baseAmount: inactiveRate ? inactiveRate.amountUsd.toString() : '1250',
        };
      }
    }

    setMethodConfigs(newConfigs);
    setError(null);
  }, [selectedRouteId, existingRates, shippingMethods]);

  const handleToggle = (methodId: string, enabled: boolean) => {
    setMethodConfigs((prev) => ({
      ...prev,
      [methodId]: {
        ...(prev[methodId] || { baseAmount: '1250' }),
        isEnabled: enabled,
      },
    }));
  };

  const handleAmountChange = (methodId: string, value: string) => {
    setMethodConfigs((prev) => ({
      ...prev,
      [methodId]: {
        ...(prev[methodId] || { isEnabled: false }),
        baseAmount: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) {
      setError('Please select a shipping route.');
      return;
    }

    // Validate that enabled methods have valid positive rates
    const configsToSave: Array<{ shippingMethodId: string; isEnabled: boolean; baseAmount: number }> = [];

    for (const sm of shippingMethods) {
      const cfg = methodConfigs[sm.id] || { isEnabled: false, baseAmount: '0' };
      if (cfg.isEnabled) {
        const amount = parseFloat(cfg.baseAmount);
        if (isNaN(amount) || amount <= 0) {
          setError(`Please provide a valid positive base rate for enabled method: "${sm.name}".`);
          return;
        }
        configsToSave.push({
          shippingMethodId: sm.id,
          isEnabled: true,
          baseAmount: amount,
        });
      } else {
        configsToSave.push({
          shippingMethodId: sm.id,
          isEnabled: false,
          baseAmount: parseFloat(cfg.baseAmount) || 0,
        });
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      await adminService.saveRouteFreightRates(selectedRouteId, configsToSave);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save route freight rates';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Configure Ocean Freight Rates"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-1 text-xs">
        {error && (
          <Alert variant="error" title="Configuration Error">
            {error}
          </Alert>
        )}

        {/* Route Selector Header */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <label className="block font-bold text-slate-700 text-xs">
            Shipping Route <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:ring-1 focus:ring-brand-orange-500 focus:outline-none"
            required
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.originPortName} ({r.originPortCode}) → {r.destinationPortName} ({r.destinationPortCode})
              </option>
            ))}
          </select>
          {selectedRoute && (
            <p className="text-[11px] text-slate-500">
              Configure available shipping methods and base oceanic rates for shipments from{' '}
              <strong className="text-slate-700">{selectedRoute.originPortName}</strong> to{' '}
              <strong className="text-slate-700">{selectedRoute.destinationPortName}</strong>. Rates apply universally regardless of vehicle category or powertrain.
            </p>
          )}
        </div>

        {/* Shipping Methods Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 text-center w-16">Enable</th>
                <th className="py-2.5 px-4 text-start">Shipping Method</th>
                <th className="py-2.5 px-4 text-start w-48">Base Rate (USD)</th>
                <th className="py-2.5 px-4 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {shippingMethods.map((sm) => {
                const cfg = methodConfigs[sm.id] || { isEnabled: false, baseAmount: '1250' };
                const isEnabled = cfg.isEnabled;

                return (
                  <tr
                    key={sm.id}
                    className={`transition-colors ${
                      isEnabled ? 'bg-white hover:bg-slate-50/50' : 'bg-slate-50/40 text-slate-400'
                    }`}
                  >
                    {/* Toggle */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => handleToggle(sm.id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500 cursor-pointer"
                      />
                    </td>

                    {/* Method Name & Description */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Ship className={`w-4 h-4 shrink-0 ${isEnabled ? 'text-brand-orange-500' : 'text-slate-300'}`} />
                        <div>
                          <div className={`font-bold ${isEnabled ? 'text-brand-navy-950' : 'text-slate-500'}`}>
                            {sm.name}
                          </div>
                          {sm.description && (
                            <div className="text-[11px] text-slate-400 line-clamp-1">{sm.description}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Base Rate Input */}
                    <td className="py-3 px-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="0.00"
                          value={cfg.baseAmount}
                          onChange={(e) => handleAmountChange(sm.id, e.target.value)}
                          disabled={!isEnabled}
                          className={`pl-7 text-xs font-semibold ${
                            isEnabled ? 'text-brand-navy-950 bg-white' : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                          }`}
                          required={isEnabled}
                        />
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      {isEnabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <XCircle className="w-3 h-3 text-slate-400" /> Disabled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-500">
            Disabled methods will not appear in the customer quote calculator for this route.
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="font-bold shadow-xs"
            >
              {isSaving ? 'Saving Rates...' : 'Save Ocean Freight Rates'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
