import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { MOCK_ADMIN_KPIS, MOCK_ENQUIRIES } from '../../services/mockData';
import { formatCurrency } from '../../lib/utils';
import {
  MessageSquare,
  FileSpreadsheet,
  Clock,
  AlertCircle,
  Search,
  Eye,
  PhoneCall,
} from 'lucide-react';
import { EnquiryStatus } from '../../types/admin';

export const AdminDashboardPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredEnquiries = MOCK_ENQUIRIES.filter((enq) => {
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

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950">
            Operations & Quotation Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time overview of vehicle shipping inquiries, active quotations, and pipeline
            metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-semibold text-slate-700 shadow-sm">
            Status: <strong className="text-emerald-600">Online</strong>
          </span>
        </div>
      </div>

      {/* Responsive KPI Cards: 1-col on phone, 2-col on tablet (768px), 4-col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Enquiries (30d)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-brand-navy-950">
            {MOCK_ADMIN_KPIS.totalEnquiriesThisMonth}
          </h3>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">↑ +18% from last month</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Quotes
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-brand-navy-950">
            {MOCK_ADMIN_KPIS.activeQuotationsCount}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Estimated pipeline</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg Transit
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-brand-navy-950">
            {MOCK_ADMIN_KPIS.averageTransitDays} Days
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">US Ports to Sharjah</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Follow-Ups
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-brand-navy-950">
            {MOCK_ADMIN_KPIS.pendingFollowUps}
          </h3>
          <p className="text-[11px] text-rose-600 font-bold mt-1">Requires coordinator action</p>
        </Card>
      </div>

      {/* Pricing Engine Architectural Callout */}
      <Alert variant="info" title="CTO Architecture Standard">
        Authoritative tariffs, ocean freight matrices, and inland towing rates are maintained in
        PostgreSQL tables and executed via secure Supabase functions. Frontend calculations are
        strictly preview simulations.
      </Alert>

      {/* Enquiries Data Table Card */}
      <Card className="p-4 sm:p-6 overflow-hidden w-full">
        {/* Table Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Customer Leads & Quotes</h3>
            <p className="text-xs text-slate-500">
              Inbound requests submitted via web calculator & WhatsApp
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

        {/* Responsive Table for Tablet/Desktop with internal horizontal scroll container */}
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
              {filteredEnquiries.map((item) => (
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
                  <td className="py-3 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                  <td className="py-3 text-end whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        title="View Enquiry"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View for Phones */}
        <div className="sm:hidden space-y-3">
          {filteredEnquiries.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">{item.referenceNumber}</span>
                {getStatusBadge(item.status)}
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
          ))}
        </div>
      </Card>
    </div>
  );
};
