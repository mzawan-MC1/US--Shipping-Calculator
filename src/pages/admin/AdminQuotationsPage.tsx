import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { adminService, AdminQuotation } from '../../services/adminService';
import { formatCurrency, formatAED } from '../../lib/utils';
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Eye,
  Ship,
  Truck,
  FileText,
  AlertCircle,
  Printer,
} from 'lucide-react';

export const AdminQuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<AdminQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<AdminQuotation | null>(null);

  const fetchQuotations = useCallback(async () => {
    try {
      const data = await adminService.getQuotations();
      setQuotations(data);
    } catch (err) {
      console.warn('Failed to load quotations', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchQuotations();
  };

  const filteredQuotes = quotations.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.referenceNumber.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      item.vehicleDetails.toLowerCase().includes(q) ||
      item.route.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Quotation Records
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Locked Tariffs
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-orange-500" />
            Official Quotations & Revisions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable quotation snapshots issued to customers with locked ocean freight and towing
            brackets.
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

      {/* Main Card */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200 overflow-hidden w-full">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <Input
            placeholder="Search by quote number, customer, vehicle, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<Search className="w-4 h-4" />}
            className="w-full sm:w-80 min-h-[38px] text-xs"
          />
          <span className="text-xs text-slate-400 font-semibold self-end sm:self-auto">
            Showing {filteredQuotes.length} of {quotations.length} records
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-400 font-medium">Loading quotations...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              title="No quotations found"
              description={
                search
                  ? 'No quotations match your active search terms.'
                  : 'Calculated quotations generated through the customer calculator will be recorded here.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 text-start">Quotation Ref</th>
                  <th className="pb-3 text-start">Customer</th>
                  <th className="pb-3 text-start">Vehicle & Route</th>
                  <th className="pb-3 text-start">Ocean Freight</th>
                  <th className="pb-3 text-start">Towing Fee</th>
                  <th className="pb-3 text-start">Total (USD / AED)</th>
                  <th className="pb-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredQuotes.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-mono font-bold text-brand-navy-950 whitespace-nowrap">
                        {item.referenceNumber}
                        <span className="block text-[10px] font-normal text-slate-400">
                          v{item.version} •{' '}
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
                          {item.customerPhone}
                        </span>
                      </td>

                      <td className="py-3.5 max-w-[220px]">
                        <span className="font-semibold text-slate-800 block truncate">
                          {item.vehicleDetails}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {item.route}
                        </span>
                      </td>

                      <td className="py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.oceanFreightUsd)}
                      </td>

                      <td className="py-3.5 whitespace-nowrap">
                        {item.isTowingRange ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {formatCurrency(item.towingFeeMin)} –{' '}
                              {formatCurrency(item.towingFeeMax)}
                            </span>
                            <span className="text-[10px] text-amber-700 font-medium block">
                              Subject to final dispatch confirmation
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(item.towingFeeMin || item.towingFeeMax)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 whitespace-nowrap">
                        <div className="font-bold text-brand-navy-950">
                          {item.isTowingRange ? (
                            <span>
                              {formatCurrency(item.totalUsdMin)} –{' '}
                              {formatCurrency(item.totalUsdMax)}
                            </span>
                          ) : (
                            <span>{formatCurrency(item.totalUsdMax || item.totalUsdMin)}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.isTowingRange ? (
                            <span>
                              {formatAED(item.totalAedMin)} – {formatAED(item.totalAedMax)}
                            </span>
                          ) : (
                            <span>{formatAED(item.totalAedMax || item.totalAedMin)}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 text-end whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQuote(item)}
                          startIcon={<Eye className="w-3.5 h-3.5 text-brand-orange-500" />}
                          className="text-xs py-1 px-2.5 font-bold whitespace-nowrap"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detailed Quotation Breakdown Modal */}
      {selectedQuote && (
        <Modal
          isOpen={Boolean(selectedQuote)}
          onClose={() => setSelectedQuote(null)}
          title={`Quotation Breakdown: ${selectedQuote.referenceNumber}`}
        >
          <div className="space-y-4 text-xs pt-2">
            {/* Header Snapshot */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Customer
                </span>
                <strong className="text-slate-900 block text-sm">
                  {selectedQuote.customerName}
                </strong>
                <span className="text-slate-600 font-mono">{selectedQuote.customerPhone}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Route</span>
                <strong className="text-slate-800 block">{selectedQuote.route}</strong>
                <span className="text-slate-500 block">{selectedQuote.vehicleDetails}</span>
              </div>
            </div>

            {/* Towing Notice Badge */}
            {selectedQuote.isTowingRange && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Inland Towing Notice:</strong>
                  <span>
                    Inland towing for this auction site is provided as an estimated range (
                    {formatCurrency(selectedQuote.towingFeeMin)} –{' '}
                    {formatCurrency(selectedQuote.towingFeeMax)}). Final towing amount is subject to
                    carrier confirmation upon vehicle pickup.
                  </span>
                </div>
              </div>
            )}

            {/* Cost Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3 text-start">Component</th>
                    <th className="py-2 px-3 text-end">Amount (USD)</th>
                    <th className="py-2 px-3 text-end">Amount (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {/* Vehicle Declared Value & CIF */}
                  {(selectedQuote.declaredValueUsd !== undefined && selectedQuote.declaredValueUsd > 0) && (
                    <tr className="bg-slate-50/50">
                      <td className="py-2 px-3 flex items-center gap-1.5 text-slate-600">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Declared Buying Value</span>
                      </td>
                      <td className="py-2 px-3 text-end font-medium text-slate-600">
                        {formatCurrency(selectedQuote.declaredValueUsd)}
                      </td>
                      <td className="py-2 px-3 text-end text-slate-400">
                        {formatAED(selectedQuote.declaredValueUsd * (selectedQuote.exchangeRate || 3.6725))}
                      </td>
                    </tr>
                  )}

                  {Boolean(selectedQuote.cifMax && selectedQuote.cifMax > 0) && (
                    <tr className="bg-slate-50/50">
                      <td className="py-2 px-3 flex items-center gap-1.5 text-slate-600">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>CIF Valuation Base</span>
                      </td>
                      <td className="py-2 px-3 text-end font-medium text-slate-600">
                        {selectedQuote.isTowingRange && selectedQuote.cifMin !== selectedQuote.cifMax
                          ? `${formatCurrency(selectedQuote.cifMin || 0)} – ${formatCurrency(selectedQuote.cifMax || 0)}`
                          : formatCurrency(selectedQuote.cifMax || 0)}
                      </td>
                      <td className="py-2 px-3 text-end text-slate-400">
                        {formatAED((selectedQuote.cifMax || 0) * (selectedQuote.exchangeRate || 3.6725))}
                      </td>
                    </tr>
                  )}

                  {/* Ocean Freight */}
                  <tr>
                    <td className="py-2 px-3 flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-blue-500" />
                      <span>Ocean Freight (Base Rate)</span>
                    </td>
                    <td className="py-2 px-3 text-end font-semibold">
                      {formatCurrency(selectedQuote.oceanFreightUsd)}
                    </td>
                    <td className="py-2 px-3 text-end text-slate-500">
                      {formatAED(selectedQuote.oceanFreightUsd * (selectedQuote.exchangeRate || 3.6725))}
                    </td>
                  </tr>

                  {/* Inland Towing */}
                  <tr>
                    <td className="py-2 px-3 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-brand-orange-500" />
                      <span>Inland Towing ({selectedQuote.isTowingRange ? 'Range' : 'Fixed'})</span>
                    </td>
                    <td className="py-2 px-3 text-end font-semibold">
                      {selectedQuote.isTowingRange
                        ? `${formatCurrency(selectedQuote.towingFeeMin)} – ${formatCurrency(selectedQuote.towingFeeMax)}`
                        : formatCurrency(selectedQuote.towingFeeMin || selectedQuote.towingFeeMax)}
                    </td>
                    <td className="py-2 px-3 text-end text-slate-500">
                      {selectedQuote.isTowingRange
                        ? `${formatAED(selectedQuote.towingFeeMin * (selectedQuote.exchangeRate || 3.6725))} – ${formatAED(selectedQuote.towingFeeMax * (selectedQuote.exchangeRate || 3.6725))}`
                        : formatAED(
                            (selectedQuote.towingFeeMin || selectedQuote.towingFeeMax) * (selectedQuote.exchangeRate || 3.6725)
                          )}
                    </td>
                  </tr>

                  {/* Surcharges if any */}
                  {(selectedQuote.surchargesUsd !== undefined && selectedQuote.surchargesUsd > 0) && (
                    <tr>
                      <td className="py-2 px-3 flex items-center gap-1.5 text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Condition / Fuel Surcharges</span>
                      </td>
                      <td className="py-2 px-3 text-end font-semibold text-amber-800">
                        {formatCurrency(selectedQuote.surchargesUsd)}
                      </td>
                      <td className="py-2 px-3 text-end text-slate-500">
                        {formatAED(selectedQuote.surchargesUsd * (selectedQuote.exchangeRate || 3.6725))}
                      </td>
                    </tr>
                  )}

                  {/* Customs Clearance */}
                  <tr>
                    <td className="py-2 px-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>UAE Customs Clearance Fee</span>
                    </td>
                    <td className="py-2 px-3 text-end font-semibold">
                      {formatCurrency(selectedQuote.customsClearanceUsd || 150)}
                    </td>
                    <td className="py-2 px-3 text-end text-slate-500">
                      {formatAED((selectedQuote.customsClearanceUsd || 150) * (selectedQuote.exchangeRate || 3.6725))}
                    </td>
                  </tr>

                  {/* Port Handling */}
                  <tr>
                    <td className="py-2 px-3 flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Port Handling & Terminal Charges</span>
                    </td>
                    <td className="py-2 px-3 text-end font-semibold">
                      {formatCurrency(selectedQuote.portHandlingUsd || 200)}
                    </td>
                    <td className="py-2 px-3 text-end text-slate-500">
                      {formatAED((selectedQuote.portHandlingUsd || 200) * (selectedQuote.exchangeRate || 3.6725))}
                    </td>
                  </tr>

                  {/* Customs Duty */}
                  <tr>
                    <td className="py-2 px-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>UAE Customs Duty (5% of CIF)</span>
                    </td>
                    <td className="py-2 px-3 text-end font-semibold">
                      {formatCurrency(selectedQuote.customsDutyUsd)}
                    </td>
                    <td className="py-2 px-3 text-end text-slate-500">
                      {formatAED(selectedQuote.customsDutyUsd * (selectedQuote.exchangeRate || 3.6725))}
                    </td>
                  </tr>

                  {/* Import VAT */}
                  <tr>
                    <td className="py-2 px-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>UAE Import VAT (5% of VAT Base)</span>
                    </td>
                    <td className="py-2 px-3 text-end font-semibold">
                      {formatCurrency(selectedQuote.importVatUsd)}
                    </td>
                    <td className="py-2 px-3 text-end text-slate-500">
                      {formatAED(selectedQuote.importVatUsd * (selectedQuote.exchangeRate || 3.6725))}
                    </td>
                  </tr>

                  {/* Grand Total */}
                  <tr className="bg-slate-50/90 font-black text-brand-navy-950 border-t-2 border-slate-300">
                    <td className="py-2.5 px-3">Total Estimated Shipping</td>
                    <td className="py-2.5 px-3 text-end text-sm">
                      {selectedQuote.isTowingRange
                        ? `${formatCurrency(selectedQuote.totalUsdMin)} – ${formatCurrency(selectedQuote.totalUsdMax)}`
                        : formatCurrency(selectedQuote.totalUsdMax || selectedQuote.totalUsdMin)}
                    </td>
                    <td className="py-2.5 px-3 text-end text-sm text-brand-orange-600">
                      {selectedQuote.isTowingRange
                        ? `${formatAED(selectedQuote.totalAedMin)} – ${formatAED(selectedQuote.totalAedMax)}`
                        : formatAED(selectedQuote.totalAedMax || selectedQuote.totalAedMin)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {selectedQuote.disclaimer && (
              <p className="text-[11px] text-slate-400 italic leading-relaxed">
                {selectedQuote.disclaimer}
              </p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Quotation</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedQuote(null)}
                className="text-xs font-bold"
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
