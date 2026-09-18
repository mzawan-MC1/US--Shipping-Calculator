import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatCurrency } from '../../lib/utils';
import {
  adminService,
  AdminState,
  AdminPurchaseLocation,
  AdminPort,
  AdminVehicleCategory,
  BulkRateAdjustmentPreviewItem,
} from '../../services/adminService';
import { TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

interface BulkTowingAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  states: AdminState[];
  locations: AdminPurchaseLocation[];
  ports: AdminPort[];
  categories: AdminVehicleCategory[];
}

export const BulkTowingAdjustmentModal: React.FC<BulkTowingAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  states,
  locations,
  ports,
  categories,
}) => {
  // Filter settings
  const [filterState, setFilterState] = useState('');
  const [filterLocationId, setFilterLocationId] = useState('');
  const [filterPortId, setFilterPortId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRateType, setFilterRateType] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('true');

  // Adjustment settings
  const [adjustmentType, setAdjustmentType] = useState<
    'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease'
  >('percentage_increase');
  const [value, setValue] = useState('5');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');

  // Preview state
  const [previewList, setPreviewList] = useState<BulkRateAdjustmentPreviewItem[] | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter locations by chosen state
  const stateLocations = filterState
    ? locations.filter((l) => l.stateCode === filterState)
    : locations;

  const handlePreview = async () => {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) {
      setError('Please specify a positive adjustment value.');
      return;
    }

    setIsPreviewing(true);
    setError(null);

    try {
      const items = await adminService.previewBulkRateAdjustment(
        {
          state_code: filterState || null,
          purchase_location_id: filterLocationId || null,
          loading_port_id: filterPortId || null,
          vehicle_category_id: filterCategory || null,
          rate_type: filterRateType || null,
          is_active: filterStatus === '' ? null : filterStatus === 'true',
        },
        {
          adjustment_type: adjustmentType,
          value: val,
          effective_from: effectiveFrom,
          effective_to: effectiveTo || null,
        }
      );
      setPreviewList(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate adjustment preview.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApply = async () => {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive adjustment value.');
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      const res = await adminService.applyBulkRateAdjustment(
        {
          state_code: filterState || null,
          purchase_location_id: filterLocationId || null,
          loading_port_id: filterPortId || null,
          vehicle_category_id: filterCategory || null,
          rate_type: filterRateType || null,
          is_active: filterStatus === '' ? null : filterStatus === 'true',
        },
        {
          adjustment_type: adjustmentType,
          value: val,
          effective_from: effectiveFrom,
          effective_to: effectiveTo || null,
        }
      );

      onSuccess(res.message);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to apply bulk rate adjustment.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Inland Towing Rate Adjustment"
    >
      <div className="space-y-4 pt-1 text-xs">
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Safe Batch Update Engine:</strong>
            <span>
              Adjusts active tariffs without altering historical quotation snapshots. Future quotes will
              automatically use updated rates.
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Step 1: Filter Scope */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-brand-navy-900 text-white text-[10px] flex items-center justify-center font-bold">
              1
            </span>
            Target Rate Scope (Filters)
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">State</label>
              <select
                value={filterState}
                onChange={(e) => {
                  setFilterState(e.target.value);
                  setFilterLocationId('');
                  setPreviewList(null);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">All States</option>
                {states.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} – {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Pickup Location</label>
              <select
                value={filterLocationId}
                onChange={(e) => {
                  setFilterLocationId(e.target.value);
                  setPreviewList(null);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Locations</option>
                {stateLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.stateCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">US Loading Port</label>
              <select
                value={filterPortId}
                onChange={(e) => {
                  setFilterPortId(e.target.value);
                  setPreviewList(null);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Loading Ports</option>
                {ports
                  .filter((p) => p.isLoadingPort)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Vehicle Category</label>
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setPreviewList(null);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Pricing Mode</label>
              <select
                value={filterRateType}
                onChange={(e) => {
                  setFilterRateType(e.target.value);
                  setPreviewList(null);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Modes (Fixed & Range)</option>
                <option value="fixed">Fixed Flat Rates Only</option>
                <option value="range">Estimated Ranges Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPreviewList(null);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="true">Active Tariffs Only</option>
                <option value="false">Inactive Tariffs Only</option>
                <option value="">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Adjustment Rules */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-brand-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
              2
            </span>
            Adjustment Rule
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Adjustment Type</label>
              <select
                value={adjustmentType}
                onChange={(e) => {
                  setAdjustmentType(e.target.value as unknown as typeof adjustmentType);
                  setPreviewList(null);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
              >
                <option value="percentage_increase">Percentage Increase (+%)</option>
                <option value="percentage_decrease">Percentage Decrease (-%)</option>
                <option value="fixed_increase">Fixed USD Increase (+$)</option>
                <option value="fixed_decrease">Fixed USD Decrease (-$)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Value {adjustmentType.includes('percentage') ? '(%)' : '($ USD)'}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setPreviewList(null);
                }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Effective From</label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => {
                  setEffectiveFrom(e.target.value);
                  setPreviewList(null);
                }}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Effective To (Optional)</label>
              <Input
                type="date"
                value={effectiveTo}
                onChange={(e) => {
                  setEffectiveTo(e.target.value);
                  setPreviewList(null);
                }}
              />
            </div>
          </div>
        </div>

        {/* Preview Button */}
        <div className="flex justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={isPreviewing}
            className="flex items-center gap-1.5 font-bold"
          >
            <TrendingUp className="w-3.5 h-3.5 text-brand-orange-500" />
            {isPreviewing ? 'Calculating...' : 'Preview Affected Rates'}
          </Button>
        </div>

        {/* Step 3: Preview Results */}
        {previewList !== null && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">
                Preview Summary: {previewList.length} rate{previewList.length !== 1 ? 's' : ''} matched
              </span>
              {previewList.length > 0 && (
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready to apply
                </span>
              )}
            </div>

            {previewList.length === 0 ? (
              <div className="p-4 bg-slate-50 text-slate-500 text-center rounded-xl text-xs border border-slate-200">
                No towing rates match the selected filter criteria.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-start text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Port</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Old Rate</th>
                      <th className="p-2.5 text-center">→</th>
                      <th className="p-2.5">New Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {previewList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2 font-semibold">
                          {item.location_name} ({item.state_code})
                        </td>
                        <td className="p-2 font-medium text-slate-600">{item.port_code}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold">
                            {item.vehicle_category_id ? item.vehicle_category_id.toUpperCase() : 'ALL'}
                          </span>
                        </td>
                        <td className="p-2 text-slate-500">
                          {item.rate_type === 'fixed'
                            ? formatCurrency(item.old_fixed || 0)
                            : `${formatCurrency(item.old_min || 0)} - ${formatCurrency(item.old_max || 0)}`}
                        </td>
                        <td className="p-2 text-center text-slate-400 font-bold">
                          <ArrowRight className="w-3 h-3 inline" />
                        </td>
                        <td className="p-2 font-bold text-brand-navy-950">
                          {item.rate_type === 'fixed'
                            ? formatCurrency(item.new_fixed || 0)
                            : `${formatCurrency(item.new_min || 0)} - ${formatCurrency(item.new_max || 0)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={isApplying || !previewList || previewList.length === 0}
            className="font-bold"
          >
            {isApplying ? 'Applying Rates...' : `Apply Adjustment (${previewList ? previewList.length : 0})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
