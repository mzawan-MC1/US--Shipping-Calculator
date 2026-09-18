import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AdminPurchaseLocation, AdminState, adminService } from '../../services/adminService';
import { locationsBulkService } from '../../services/towingBulkService';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Building,
  Anchor,
  AlertCircle,
  Archive,
} from 'lucide-react';

interface PickupLocationsTableProps {
  locations: AdminPurchaseLocation[];
  states: AdminState[];
  canManagePricing: boolean;
  onRefresh: () => void;
  onOpenAddLocation: () => void;
  onOpenEditLocation: (loc: AdminPurchaseLocation) => void;
  onOpenImportModal: () => void;
  onSetActionSuccess: (msg: string) => void;
  onSetActionError: (msg: string) => void;
}

export const PickupLocationsTable: React.FC<PickupLocationsTableProps> = ({
  locations,
  states,
  canManagePricing,
  onRefresh,
  onOpenAddLocation,
  onOpenEditLocation,
  onOpenImportModal,
  onSetActionSuccess,
  onSetActionError,
}) => {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [deleteConfirmLoc, setDeleteConfirmLoc] = useState<AdminPurchaseLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((l) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        l.name.toLowerCase().includes(q) ||
        (l.locationCode && l.locationCode.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.zipCode && l.zipCode.includes(q)) ||
        (l.auctionCompany && l.auctionCompany.toLowerCase().includes(q));

      const matchesState = stateFilter === 'ALL' || l.stateCode === stateFilter;
      const matchesStatus =
        statusFilter === 'ALL' || (statusFilter === 'active' ? l.isActive : !l.isActive);

      return matchesSearch && matchesState && matchesStatus;
    });
  }, [locations, search, stateFilter, statusFilter]);

  const handleToggleStatus = async (loc: AdminPurchaseLocation) => {
    try {
      await adminService.updatePurchaseLocation(loc.id, {
        isActive: !loc.isActive,
      });
      onSetActionSuccess(`Location "${loc.name}" is now ${!loc.isActive ? 'active' : 'inactive'}.`);
      onRefresh();
    } catch (err: unknown) {
      onSetActionError(err instanceof Error ? err.message : 'Failed to update location status.');
    }
  };

  const handleExecuteDelete = async (action: 'archive' | 'delete') => {
    if (!deleteConfirmLoc) return;
    setIsDeleting(true);
    try {
      await adminService.deletePurchaseLocation(deleteConfirmLoc.id, action);
      onSetActionSuccess(
        action === 'archive'
          ? `Location "${deleteConfirmLoc.name}" has been safely archived.`
          : `Location "${deleteConfirmLoc.name}" was permanently deleted.`
      );
      setDeleteConfirmLoc(null);
      onRefresh();
    } catch (err: unknown) {
      onSetActionError(err instanceof Error ? err.message : `Failed to ${action} location.`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search location name, code, city, or ZIP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* State Filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All US States ({states.length})</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} – {s.name} ({s.locationsCount || 0})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'active' | 'inactive')}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Action buttons */}
        {canManagePricing && (
          <div className="flex items-center gap-2">
            {/* Export buttons */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden text-xs">
              <span className="px-2.5 py-1.5 text-slate-500 font-semibold bg-slate-50 border-r border-slate-200 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Export:
              </span>
              <button
                onClick={() => locationsBulkService.exportLocations(filteredLocations, 'csv')}
                className="px-2.5 py-1.5 hover:bg-slate-100 font-bold text-slate-700 transition"
                title="Export filtered locations to CSV"
              >
                CSV
              </button>
              <button
                onClick={() => locationsBulkService.exportLocations(filteredLocations, 'xlsx')}
                className="px-2.5 py-1.5 hover:bg-slate-100 font-bold text-slate-700 border-l border-slate-200 transition"
                title="Export filtered locations to Excel"
              >
                Excel
              </button>
            </div>

            {/* Import button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImportModal}
              className="flex items-center gap-1.5 text-xs font-bold"
            >
              <Upload className="w-3.5 h-3.5 text-brand-orange-500" />
              Import
            </Button>

            {/* Add Location button */}
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddLocation}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Location
            </Button>
          </div>
        )}
      </div>

      {/* Table Card */}
      <Card className="bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs min-w-[850px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Location Name & Code</th>
                <th className="py-3 px-4">Auction / Company</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">ZIP Code</th>
                <th className="py-3 px-4">Connected Ports</th>
                <th className="py-3 px-4">Status</th>
                {canManagePricing && <th className="py-3 px-4 text-end">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={canManagePricing ? 8 : 7} className="py-12 text-center text-slate-400 text-xs">
                    No pickup locations found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLocations.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-brand-navy-950 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                        {l.stateCode}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1.5 font-normal">
                        {l.stateName || l.stateCode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>
                        <span>{l.name}</span>
                        {l.locationCode && (
                          <span className="block font-mono text-[10px] text-slate-400 font-normal">
                            {l.locationCode}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        <Building className="w-3 h-3 text-amber-600" />
                        {l.auctionCompany || 'Private/Other'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {l.city || '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {l.zipCode || l.postalCode || '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          (l.connectedPortsCount || 0) > 0
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Anchor className="w-3 h-3 text-blue-600" />
                        {l.connectedPortsCount || 0} port{(l.connectedPortsCount || 0) !== 1 ? 's' : ''}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {l.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                        </span>
                      )}
                    </td>

                    {canManagePricing && (
                      <td className="py-3.5 px-4 text-end whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(l)}
                            className="text-[10px] py-1 px-2 font-bold"
                          >
                            {l.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenEditLocation(l)}
                            className="p-1 text-slate-600 hover:text-slate-900"
                            title="Edit Location"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmLoc(l)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Archive / Delete Location"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete / Archive Confirmation Dialog */}
      {deleteConfirmLoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Manage Location Removal</h3>
                <p className="text-xs text-slate-600 mt-1">
                  How would you like to handle <strong>{deleteConfirmLoc.name}</strong> (
                  {deleteConfirmLoc.stateCode})?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-600">
              <p>
                <strong>Archive (Recommended):</strong> Hides the location from customer calculators while
                safely preserving historical quotation snapshots and connected tariffs.
              </p>
              <p>
                <strong>Permanent Delete:</strong> Removes the row entirely. Will fail safely if the location
                is referenced in existing quotations or active tariffs.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmLoc(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExecuteDelete('archive')}
                disabled={isDeleting}
                className="text-amber-700 border-amber-300 hover:bg-amber-50 font-bold"
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                Archive
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleExecuteDelete('delete')}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Permanent Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
