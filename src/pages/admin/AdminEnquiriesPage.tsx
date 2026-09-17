import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { enquiryService, formatContactSubject } from '../../services/enquiryService';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../features/auth/AuthContext';
import { CustomerEnquiry, EnquiryStatus } from '../../types/admin';
import {
  MessageSquare,
  Search,
  RefreshCw,
  PhoneCall,
  Eye,
  Calendar,
  Truck,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const AdminEnquiriesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageEnquiries = hasPermission('enquiries.manage');

  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<CustomerEnquiry | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchEnquiries = useCallback(async () => {
    try {
      const data = await enquiryService.getRecentEnquiries();
      setEnquiries(data);
    } catch (err) {
      console.warn('Failed to load enquiries', err);
      setActionError('Unable to load customer enquiries. Please refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    fetchEnquiries();
  };

  const handleStatusChange = async (enquiryId: string, newStatus: EnquiryStatus) => {
    setUpdatingId(enquiryId);
    setActionError(null);
    try {
      const success = await enquiryService.updateEnquiryStatus(enquiryId, newStatus);
      if (success) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === enquiryId ? { ...e, status: newStatus } : e))
        );
        if (selectedEnquiry && selectedEnquiry.id === enquiryId) {
          setSelectedEnquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        setActionSuccess('Enquiry status updated successfully.');
      } else {
        setActionError('Failed to update enquiry status.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating status';
      setActionError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: EnquiryStatus) => {
    switch (status) {
      case 'new':
        return <Badge variant="orange">New Lead</Badge>;
      case 'contacted':
        return <Badge variant="info">Contacted</Badge>;
      case 'quoted':
        return <Badge variant="success">Quote Issued</Badge>;
      case 'in_transit':
        return <Badge variant="navy">In Transit</Badge>;
      case 'closed':
        return <Badge variant="default">Closed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const filteredEnquiries = enquiries.filter((item) => {
    const matchesSearch =
      item.customerName.toLowerCase().includes(search.toLowerCase()) ||
      item.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.vehicleDetails.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Lead Management
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Live Feed
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-brand-orange-500" />
            Customer Shipping Enquiries
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time customer quotation requests received via the web calculator and direct
            WhatsApp bookings.
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

      {/* Main Table Card */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200 overflow-hidden w-full">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder="Search by customer, reference, vehicle, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startIcon={<Search className="w-4 h-4" />}
              className="w-full sm:w-72 min-h-[38px] text-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 min-h-[38px] w-full sm:w-auto cursor-pointer"
            >
              <option value="all">All Enquiries ({enquiries.length})</option>
              <option value="new">New Leads</option>
              <option value="contacted">Contacted</option>
              <option value="quoted">Quoted</option>
              <option value="in_transit">In Transit</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 font-semibold self-end sm:self-auto">
            Showing {filteredEnquiries.length} of {enquiries.length} enquiries
          </span>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-400 font-medium">Fetching customer enquiries...</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              title="No customer enquiries found"
              description={
                search || statusFilter !== 'all'
                  ? 'No results match your current search or status filter.'
                  : 'New customer leads generated by the public shipping calculator will appear here automatically.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 text-start">Reference & Date</th>
                  <th className="pb-3 text-start">Customer Details</th>
                  <th className="pb-3 text-start">Vehicle Specification</th>
                  <th className="pb-3 text-start">Route</th>
                  <th className="pb-3 text-start">Estimated Total</th>
                  <th className="pb-3 text-start">Status</th>
                  <th className="pb-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEnquiries.map((item) => {
                  const isUpdating = updatingId === item.id;
                  const cleanPhone = item.phone.replace(/[^0-9]/g, '');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-mono font-bold text-brand-navy-950 whitespace-nowrap">
                        {item.referenceNumber}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>

                      <td className="py-3.5 font-semibold text-slate-900">
                        <span className="block">{item.customerName}</span>
                        <span className="block text-[11px] font-mono font-normal text-slate-500">
                          {item.phone}
                        </span>
                      </td>

                      <td className="py-3.5 max-w-[200px]">
                        <span className="font-semibold text-slate-800 block truncate">
                          {item.vehicleDetails}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                          {item.source === 'contact_form' ? (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">
                              Contact Form
                            </span>
                          ) : (
                            `Source: ${item.source.replace('_', ' ')}`
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 text-slate-600 whitespace-nowrap">{item.route}</td>

                      <td className="py-3.5 font-bold text-brand-navy-950 whitespace-nowrap">
                        {item.source === 'contact_form' && item.estimatedTotalUsd === 0
                          ? '—'
                          : formatCurrency(item.estimatedTotalUsd)}
                      </td>

                      <td className="py-3.5 whitespace-nowrap">
                        {canManageEnquiries ? (
                          <select
                            value={item.status}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleStatusChange(item.id, e.target.value as EnquiryStatus)
                            }
                            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="new">New Lead</option>
                            <option value="contacted">Contacted</option>
                            <option value="quoted">Quote Issued</option>
                            <option value="in_transit">In Transit</option>
                            <option value="closed">Closed</option>
                          </select>
                        ) : (
                          getStatusBadge(item.status)
                        )}
                      </td>

                      <td className="py-3.5 text-end whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedEnquiry(item)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-brand-orange-600 hover:border-brand-orange-200 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Contact Customer on WhatsApp"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
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

      {/* Detail Modal */}
      {selectedEnquiry && (
        <Modal
          isOpen={Boolean(selectedEnquiry)}
          onClose={() => setSelectedEnquiry(null)}
          title={`Enquiry: ${selectedEnquiry.referenceNumber}`}
        >
          <div className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Customer
                </span>
                <strong className="text-slate-900 text-sm block">
                  {selectedEnquiry.customerName}
                </strong>
                <span className="text-slate-600 font-mono">{selectedEnquiry.phone}</span>
                {selectedEnquiry.email && (
                  <span className="text-slate-500 block">{selectedEnquiry.email}</span>
                )}
                {selectedEnquiry.preferredContactMethod && (
                  <span className="text-[11px] text-blue-700 font-semibold block mt-1">
                    Prefers: {selectedEnquiry.preferredContactMethod}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Status & Source
                </span>
                <div className="mt-1">{getStatusBadge(selectedEnquiry.status)}</div>
                <span className="text-slate-400 text-[11px] block mt-1">
                  Received {new Date(selectedEnquiry.createdAt).toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                  Source: {selectedEnquiry.source.replace('_', ' ')}
                </span>
              </div>
            </div>

            {selectedEnquiry.source === 'contact_form' || selectedEnquiry.message ? (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-900 uppercase">
                    Subject / Topic
                  </span>
                  {selectedEnquiry.consentGivenAt && (
                    <span className="text-[10px] text-emerald-700 font-medium">
                      ✓ Customer Consent Given
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  {formatContactSubject(selectedEnquiry.subject)}
                </p>
                <div className="pt-2 border-t border-blue-100">
                  <span className="text-[10px] font-bold text-blue-900 uppercase block mb-1">
                    Inquiry Message
                  </span>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-blue-100 font-sans text-xs">
                    {selectedEnquiry.message || 'No written message provided.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-orange-500" />
                  <span className="font-bold text-slate-800">{selectedEnquiry.vehicleDetails}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-slate-700">{selectedEnquiry.route}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600">
                    Estimated Total:{' '}
                    <strong className="text-brand-navy-950 text-sm">
                      {formatCurrency(selectedEnquiry.estimatedTotalUsd)}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <a
                href={`https://wa.me/${selectedEnquiry.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Message on WhatsApp</span>
                <ExternalLink className="w-3 h-3 ms-1" />
              </a>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEnquiry(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
