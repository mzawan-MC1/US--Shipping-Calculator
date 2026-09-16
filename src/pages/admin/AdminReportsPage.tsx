import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { adminService, AdminQuotation } from '../../services/adminService';
import { enquiryService } from '../../services/enquiryService';
import { formatCurrency, formatAED } from '../../lib/utils';
import {
  BarChart3,
  RefreshCw,
  Download,
  TrendingUp,
  FileSpreadsheet,
  MessageSquare,
  Compass,
} from 'lucide-react';
import { CustomerEnquiry } from '../../types/admin';

export const AdminReportsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<AdminQuotation[]>([]);
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [q, e] = await Promise.all([
        adminService.getQuotations(),
        enquiryService.getRecentEnquiries(),
      ]);
      setQuotations(q);
      setEnquiries(e);
    } catch (err) {
      console.warn('Failed to load reporting data', err);
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
    loadData();
  };

  // Metrics
  const totalEnquiries = enquiries.length;
  const totalQuotations = quotations.length;
  const pipelineUsd = quotations.reduce((acc, curr) => acc + curr.totalUsdMax, 0);
  const pipelineAed = quotations.reduce((acc, curr) => acc + curr.totalAedMax, 0);
  const conversionRate =
    totalEnquiries > 0 ? Math.round((totalQuotations / totalEnquiries) * 100) : 0;
  const avgQuoteUsd = totalQuotations > 0 ? Math.round(pipelineUsd / totalQuotations) : 0;

  // Route breakdown
  const routeCounts = new Map<string, number>();
  for (const q of quotations) {
    routeCounts.set(q.route, (routeCounts.get(q.route) || 0) + 1);
  }

  const exportCSV = () => {
    if (quotations.length === 0) return;
    const headers = [
      'Reference',
      'Customer',
      'Vehicle',
      'Route',
      'Ocean Freight (USD)',
      'Total USD',
      'Total AED',
      'Date',
    ];
    const rows = quotations.map((q) => [
      q.referenceNumber,
      `"${q.customerName}"`,
      `"${q.vehicleDetails}"`,
      `"${q.route}"`,
      q.oceanFreightUsd,
      q.totalUsdMax,
      q.totalAedMax,
      q.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `fakher_alam_shipping_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Business Intelligence
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Authoritative Metrics
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-orange-500" />
            Operational KPIs & Volume Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key performance indicators, shipping route conversion statistics, and commercial volume
            trends.
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

          <Button
            variant="outline"
            size="sm"
            disabled={quotations.length === 0}
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 text-brand-orange-500" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-medium">Compiling reports...</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Enquiries
                </span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-brand-navy-950">{totalEnquiries}</p>
              <p className="text-[11px] text-slate-500 mt-1">Inbound web & WhatsApp requests</p>
            </Card>

            <Card className="p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Quotations Issued
                </span>
                <div className="p-2 rounded-lg bg-orange-50 text-brand-orange-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-brand-navy-950">{totalQuotations}</p>
              <p className="text-[11px] text-brand-orange-600 font-semibold mt-1">
                {conversionRate}% conversion rate
              </p>
            </Card>

            <Card className="p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pipeline Value (USD)
                </span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-brand-navy-950">
                {formatCurrency(pipelineUsd)}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {formatAED(pipelineAed)}
              </p>
            </Card>

            <Card className="p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Average Quotation
                </span>
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-brand-navy-950">
                {formatCurrency(avgQuoteUsd)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Per vehicle shipping estimate</p>
            </Card>
          </div>

          {/* Route Performance Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 bg-white border border-slate-200">
              <h3 className="text-base font-bold text-brand-navy-950 mb-1">
                Volume by Shipping Corridor
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Distribution of issued customer quotations by port origin and destination.
              </p>

              {routeCounts.size === 0 ? (
                <EmptyState
                  title="No route volume data available"
                  description="When customer quotations are calculated, route frequency breakdown will display here."
                />
              ) : (
                <div className="space-y-3">
                  {Array.from(routeCounts.entries()).map(([route, count]) => {
                    const pct = Math.round((count / totalQuotations) * 100);
                    return (
                      <div key={route} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <span>{route}</span>
                          <span>
                            {count} quotes ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-brand-orange-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5 bg-white border border-slate-200">
              <h3 className="text-base font-bold text-brand-navy-950 mb-1">
                Lead Distribution by Source
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Origination channel for all customer enquiries.
              </p>

              {enquiries.length === 0 ? (
                <EmptyState
                  title="No lead volume data available"
                  description="Inbound enquiries from the web calculator and WhatsApp will be analyzed here."
                />
              ) : (
                <div className="space-y-3">
                  {['web_calculator', 'whatsapp', 'manual'].map((src) => {
                    const count = enquiries.filter((e) => e.source === src).length;
                    const pct = totalEnquiries > 0 ? Math.round((count / totalEnquiries) * 100) : 0;
                    const label = src.replace('_', ' ').toUpperCase();
                    return (
                      <div key={src} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <span>{label}</span>
                          <span>
                            {count} leads ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-brand-navy-900 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
