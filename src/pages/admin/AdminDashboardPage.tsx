import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { enquiryService } from '../../services/enquiryService';
import { formatCurrency } from '../../lib/utils';
import {
  MessageSquare,
  FileSpreadsheet,
  Clock,
  AlertCircle,
  Search,
  PhoneCall,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { CustomerEnquiry, EnquiryStatus } from '../../types/admin';
import { useAuth } from '../../features/auth/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { role, hasPermission } = useAuth();
  const canManageEnquiries = hasPermission('enquiries.manage');
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchEnquiries = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await enquiryService.getRecentEnquiries();
      setEnquiries(data);
    } catch (e: unknown) {
      console.error('Failed to load enquiries', e);
      const msg = e instanceof Error ? e.message : 'Unable to load customer enquiries.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (enquiryId: string, newStatus: EnquiryStatus) => {
    setUpdatingId(enquiryId);
    try {
      const success = await enquiryService.updateEnquiryStatus(enquiryId, newStatus);
      if (success) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === enquiryId ? { ...e, status: newStatus } : e))
        );
      }
    } catch (err) {
      console.error('Failed to update enquiry status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const filteredEnquiries = enquiries.filter((enq) => {
    const matchesSearch =
      enq.customerName.toLowerCase().includes(search.toLowerCase()) ||
      enq.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      enq.vehicleDetails.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || enq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: EnquiryStatus) => {
    switch (status) {
      case 'new':
        return <Badge variant="orange">New Lead</Badge>;
      case 'contacted':
        return <Badge variant="info">Contacted</Badge>;
      case 'quoted':
        return <Badge variant="success">Quote Sent</Badge>;
      case 'in_transit':
        return <Badge variant="navy">In Transit</Badge>;
      case 'closed':
        return <Badge variant="default">Closed</Badge>;
    }
  };

  // Compute live KPIs
  const totalLeads = enquiries.length;
  const newLeads = enquiries.filter((e) => e.status === 'new').length;
  const quotedLeads = enquiries.filter((e) => e.status === 'quoted').length;
  const totalPipelineVal = enquiries.reduce((acc, curr) => acc + (curr.estimatedTotalUsd || 0), 0);

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Header with Staff Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Operations Center
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              System Online
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950">
            Operations & Quotation Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time shipping quotations, lead assignments, and fleet dispatch overview.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
            <UserCheck className="w-3.5 h-3.5 text-brand-orange-500" />
            <span className="capitalize">{role?.replace('_', ' ') || 'Staff'}</span>
          </div>
          <button
            onClick={fetchEnquiries}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-navy-950 text-white text-xs font-bold hover:bg-brand-navy-900 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Inquiries
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-brand-navy-950">{totalLeads}</h3>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Live Pipeline</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              New Leads
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-brand-navy-950">{newLeads}</h3>
          <p className="text-[11px] text-brand-orange-600 font-medium mt-1">Awaiting coordinator</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Quotations
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-brand-navy-950">{quotedLeads || totalLeads}</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Official Quotations</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pipeline Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-brand-navy-950">
            {formatCurrency(totalPipelineVal)}
          </h3>
          <p className="text-[11px] text-purple-600 font-bold mt-1">Estimated shipping charges</p>
        </Card>
      </div>

      {loadError && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={fetchEnquiries}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Operations Notice */}
      <Alert variant="info" title="Shipping Rates & Operations Active">
        Quotation calculations and customer records are verified in real time. Official rate
        snapshots and towing brackets are locked to customer booking references.
      </Alert>

      {/* Enquiries Data Table Card */}
      <Card className="p-4 sm:p-6 overflow-hidden w-full">
        {/* Table Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Customer Leads & Quotes</h3>
            <p className="text-xs text-slate-500">
              Active customer shipping requests and calculated estimates
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startIcon={<Search className="w-4 h-4" />}
              className="w-full sm:w-56 min-h-[38px] text-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 min-h-[38px] w-full sm:w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="quoted">Quoted</option>
              <option value="in_transit">In Transit</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-400 font-medium">Fetching real-time enquiries...</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              title="No customer enquiries found"
              description={
                search || statusFilter !== 'all'
                  ? 'No results match your active search or filter criteria.'
                  : 'New quotations submitted through the shipping calculator will appear here in real-time.'
              }
            />
          </div>
        ) : (
          <>
            {/* Responsive Table */}
            <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-start text-xs min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 text-start">Reference & Date</th>
                    <th className="pb-3 text-start">Customer</th>
                    <th className="pb-3 text-start">Vehicle & Route</th>
                    <th className="pb-3 text-start">Estimate</th>
                    <th className="pb-3 text-start">Status</th>
                    <th className="pb-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredEnquiries.map((item) => {
                    const isUpdating = updatingId === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.referenceNumber}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-slate-900">
                          <span className="block whitespace-nowrap">{item.customerName}</span>
                          <span className="block text-[11px] font-normal text-slate-500 whitespace-nowrap">
                            {item.phone}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-slate-800 block">
                            {item.vehicleDetails}
                          </span>
                          <span className="text-[11px] text-slate-500">{item.route}</span>
                        </td>
                        <td className="py-3 font-bold text-brand-navy-950 whitespace-nowrap">
                          {formatCurrency(item.estimatedTotalUsd)}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {canManageEnquiries ? (
                            <select
                              value={item.status}
                              disabled={isUpdating}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value as EnquiryStatus)
                              }
                              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange-500 disabled:opacity-50 cursor-pointer"
                            >
                              <option value="new">New Lead</option>
                              <option value="contacted">Contacted</option>
                              <option value="quoted">Quoted</option>
                              <option value="in_transit">In Transit</option>
                              <option value="closed">Closed</option>
                            </select>
                          ) : (
                            getStatusBadge(item.status)
                          )}
                        </td>
                        <td className="py-3 text-end whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              title="Open WhatsApp"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View for Phones */}
            <div className="sm:hidden space-y-3">
              {filteredEnquiries.map((item) => {
                const isUpdating = updatingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        {item.referenceNumber}
                      </span>
                      {canManageEnquiries ? (
                        <select
                          value={item.status}
                          disabled={isUpdating}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value as EnquiryStatus)
                          }
                          className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-none"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="quoted">Quoted</option>
                          <option value="in_transit">In Transit</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : (
                        getStatusBadge(item.status)
                      )}
                    </div>
                    <div>
                      <strong className="text-slate-900 block">{item.customerName}</strong>
                      <span className="text-slate-500">{item.phone}</span>
                    </div>
                    <div className="text-slate-600">
                      <span className="font-medium block">{item.vehicleDetails}</span>
                      <span className="text-[11px] text-slate-400">{item.route}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="font-black text-brand-navy-950">
                        {formatCurrency(item.estimatedTotalUsd)}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
