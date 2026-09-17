import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { adminService, AdminCustomer } from '../../services/adminService';
import { useAuth } from '../../features/auth/AuthContext';
import { Users, UserPlus, Search, RefreshCw, PhoneCall, MapPin, Car, Mail } from 'lucide-react';

export const AdminCustomersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageCustomers = hasPermission('customers.manage');

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Add customer modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Sharjah');
  const [country, setCountry] = useState('UAE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await adminService.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.warn('Failed to load customers', err);
      setActionError('Unable to load customer directory.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    fetchCustomers();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setActionError('Customer full name must be at least 2 characters.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 7) {
      setActionError('Please provide a valid contact phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.createCustomer({
        fullName,
        phone,
        email: email || undefined,
        city,
        country,
        notes: notes || undefined,
      });
      setActionSuccess(`Customer "${fullName}" added successfully.`);
      setIsAddOpen(false);
      setFullName('');
      setPhone('');
      setEmail('');
      setNotes('');
      await fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register customer.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              CRM & Directory
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Verified Profiles
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-orange-500" />
            Customer Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered vehicle importers, commercial buyers, and individual shipping clients.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            startIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="text-xs font-bold whitespace-nowrap"
          >
            Refresh
          </Button>

          {canManageCustomers && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Customer
            </Button>
          )}
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

      {/* Main Card */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200 overflow-hidden w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <Input
            placeholder="Search by customer name, phone, email, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<Search className="w-4 h-4" />}
            className="w-full sm:w-80 min-h-[38px] text-xs"
          />
          <span className="text-xs text-slate-400 font-semibold self-end sm:self-auto">
            Showing {filteredCustomers.length} of {customers.length} customers
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-400 font-medium">Loading customer directory...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              title="No customers found"
              description={
                search
                  ? 'No customers match your search criteria.'
                  : 'Customers will automatically be recorded when quotations and leads are submitted.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 text-start">Customer Name</th>
                  <th className="pb-3 text-start">Contact Information</th>
                  <th className="pb-3 text-start">Location</th>
                  <th className="pb-3 text-start">Shipments / Vehicles</th>
                  <th className="pb-3 text-start">Registered Date</th>
                  <th className="pb-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCustomers.map((c) => {
                  const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-bold text-brand-navy-950">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-navy-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {c.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block">{c.fullName}</span>
                            {c.notes && (
                              <span className="text-[11px] text-slate-400 font-normal block truncate max-w-xs">
                                {c.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 font-mono text-slate-800">
                        <span className="block font-bold">{c.phone}</span>
                        {c.email && (
                          <span className="text-[11px] text-slate-500 font-sans block">
                            {c.email}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {c.city || 'Sharjah'}, {c.country || 'UAE'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 font-bold text-slate-800">
                        <div className="flex items-center gap-1 text-xs">
                          <Car className="w-3.5 h-3.5 text-brand-orange-500" />
                          <span>
                            {c.vehicleCount || 0} vehicle{c.vehicleCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 text-end whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Message via WhatsApp"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Customer Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register New Customer">
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Tariq Al-Mansoor"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Contact Phone Number <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. +971 50 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <Input
              type="email"
              placeholder="e.g. tariq@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">City</label>
              <Input
                placeholder="e.g. Sharjah, Dubai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Country</label>
              <Input
                placeholder="e.g. UAE, Oman"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
            <Input
              placeholder="e.g. Commercial dealer, preferred delivery to Sharjah Industrial 4"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="font-bold"
            >
              {isSubmitting ? 'Saving...' : 'Register Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
