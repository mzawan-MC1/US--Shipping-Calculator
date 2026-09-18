import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { adminService, AdminPurchaseLocation, AdminState } from '../../services/adminService';

interface AddEditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLocationId?: string) => void;
  locationToEdit?: AdminPurchaseLocation | null;
  states: AdminState[];
  initialStateCode?: string;
}

export const AddEditLocationModal: React.FC<AddEditLocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  locationToEdit,
  states,
  initialStateCode,
}) => {
  const [name, setName] = useState('');
  const [stateCode, setStateCode] = useState('NJ');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (locationToEdit) {
      setName(locationToEdit.name);
      setStateCode(locationToEdit.stateCode);
      setIsActive(locationToEdit.isActive);
    } else {
      setName('');
      setStateCode(initialStateCode || (states.length > 0 ? states[0].code : 'NJ'));
      setIsActive(true);
    }
    setError(null);
  }, [locationToEdit, isOpen, initialStateCode, states]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Location name is required.');
      return;
    }
    if (!stateCode) {
      setError('State is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (locationToEdit) {
        await adminService.updatePurchaseLocation(locationToEdit.id, {
          name: name.trim(),
          stateCode: stateCode.toUpperCase(),
          isActive,
        });
        onSuccess(locationToEdit.id);
      } else {
        // Auto-generate stable location code
        const nameSlug =
          name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8) || 'LOC';
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const autoCode = `${stateCode.toUpperCase()}-${nameSlug}-${rand}`;

        const res = await adminService.createPurchaseLocation({
          name: name.trim(),
          locationCode: autoCode,
          stateCode: stateCode.toUpperCase(),
          isActive,
        });
        onSuccess(res.id);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save location.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locationToEdit ? 'Edit Pickup Location' : 'Add New Pickup Location'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            US State <span className="text-rose-500">*</span>
          </label>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold"
            required
          >
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} – {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Location Name <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="e.g. Copart Trenton or IAAI Atlanta South"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="locFormIsActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
          />
          <label htmlFor="locFormIsActive" className="font-bold text-slate-700 cursor-pointer">
            Active Pickup Location
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
            {isSaving ? 'Saving...' : locationToEdit ? 'Save Changes' : 'Create Location'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
