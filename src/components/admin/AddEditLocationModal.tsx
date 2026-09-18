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
  const [locationCode, setLocationCode] = useState('');
  const [stateCode, setStateCode] = useState('NJ');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [auctionCompany, setAuctionCompany] = useState('Copart');
  const [address, setAddress] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (locationToEdit) {
      setName(locationToEdit.name);
      setLocationCode(locationToEdit.locationCode || '');
      setStateCode(locationToEdit.stateCode);
      setCity(locationToEdit.city || '');
      setZipCode(locationToEdit.zipCode || locationToEdit.postalCode || '');
      setAuctionCompany(locationToEdit.auctionCompany || 'Copart');
      setAddress(locationToEdit.address || '');
      setInternalNotes(locationToEdit.internalNotes || '');
      setIsActive(locationToEdit.isActive);
    } else {
      setName('');
      setLocationCode('');
      setStateCode(initialStateCode || (states.length > 0 ? states[0].code : 'NJ'));
      setCity('');
      setZipCode('');
      setAuctionCompany('Copart');
      setAddress('');
      setInternalNotes('');
      setIsActive(true);
    }
    setError(null);
  }, [locationToEdit, isOpen, initialStateCode, states]);

  // Auto-suggest location code when state or name changes and code wasn't manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!locationToEdit && (!locationCode || locationCode.startsWith(`${stateCode}-`))) {
      const clean = val.trim().substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (clean) {
        setLocationCode(`${stateCode}-${clean}`);
      }
    }
  };

  const handleStateChange = (val: string) => {
    setStateCode(val);
    if (!locationToEdit && (!locationCode || locationCode.includes('-'))) {
      const parts = locationCode.split('-');
      const suffix = parts.length > 1 ? parts.slice(1).join('-') : name.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (suffix) {
        setLocationCode(`${val}-${suffix}`);
      }
    }
  };

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
          locationCode: locationCode.trim().toUpperCase() || undefined,
          stateCode: stateCode.toUpperCase(),
          city: city.trim() || null,
          zipCode: zipCode.trim() || null,
          auctionCompany: auctionCompany.trim() || null,
          address: address.trim() || null,
          internalNotes: internalNotes.trim() || null,
          isActive,
        });
        onSuccess(locationToEdit.id);
      } else {
        const res = await adminService.createPurchaseLocation({
          name: name.trim(),
          locationCode: locationCode.trim().toUpperCase() || undefined,
          stateCode: stateCode.toUpperCase(),
          city: city.trim() || undefined,
          zipCode: zipCode.trim() || undefined,
          auctionCompany: auctionCompany.trim() || undefined,
          address: address.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              US State <span className="text-rose-500">*</span>
            </label>
            <select
              value={stateCode}
              onChange={(e) => handleStateChange(e.target.value)}
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
              Auction / Company
            </label>
            <select
              value={auctionCompany}
              onChange={(e) => setAuctionCompany(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold"
            >
              <option value="Copart">Copart</option>
              <option value="IAAI">IAAI</option>
              <option value="Manheim">Manheim</option>
              <option value="Impact">Impact</option>
              <option value="Adesa">Adesa</option>
              <option value="ACV">ACV Auctions</option>
              <option value="Private Yard">Private Yard</option>
              <option value="Dealership">Dealership</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Location Name <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="e.g. Copart Trenton or IAAI Atlanta South"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Location Code
            </label>
            <Input
              type="text"
              placeholder="e.g. CP-TRENTON"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Unique identifier</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">City</label>
            <Input
              type="text"
              placeholder="e.g. Trenton"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ZIP Code</label>
            <Input
              type="text"
              placeholder="e.g. 08610"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Street Address (Optional)
          </label>
          <Input
            type="text"
            placeholder="e.g. 100 Yard Rd"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Internal Notes (Optional)
          </label>
          <Input
            type="text"
            placeholder="Operational or gate notes"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
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
          <label htmlFor="locFormIsActive" className="font-bold text-slate-700">
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
