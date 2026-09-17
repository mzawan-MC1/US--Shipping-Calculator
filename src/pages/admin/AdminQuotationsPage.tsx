import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { adminService, AdminQuotation } from '../../services/adminService';
import { formatCurrency, formatAED } from '../../lib/utils';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { generateQuotationPdf, PdfQuotationData } from '../../services/pdfService';
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
  Download,
  Car,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

export const AdminQuotationsPage: React.FC = () => {
  const { branding } = useWebsiteSettings();
  const [quotations, setQuotations] = useState<AdminQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
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

  const handleDownloadPdf = async (quote: AdminQuotation) => {
    setIsDownloadingPdf(true);
    try {
      const snap = (quote.pricingSnapshot as Record<string, unknown>) || {};
      const origin = (snap.originPort as string) || quote.route.split('→')[0]?.trim() || 'USA Port / Auction';
      const destination = (snap.destinationPort as string) || quote.route.split('→')[1]?.trim() || 'UAE Port (Jebel Ali)';
      const shippingMethod = (snap.shippingMethod as string) || 'Containerized Ocean Freight';
      const transitTime = (snap.transitTime as string) || '30 - 45 Days';

      const pdfData: PdfQuotationData = {
        referenceNumber: quote.referenceNumber,
        createdAt: quote.createdAt,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        customerEmail: quote.customerEmail,
        vehicleDetails: quote.vehicleDetails,
        originPort: origin,
        destinationPort: destination,
        shippingMethod,
        transitTime,
        declaredValueUsd: quote.declaredValueUsd,
        oceanFreightUsd: quote.oceanFreightUsd,
        towingFeeMin: quote.towingFeeMin,
        towingFeeMax: quote.towingFeeMax,
        isTowingRange: quote.isTowingRange,
        clearanceFeeUsd: quote.customsClearanceUsd || 150,
        portHandlingFeeUsd: quote.portHandlingUsd || 200,
        surchargesUsd: quote.surchargesUsd || 0,
        cifUsd: quote.cifMax || 0,
        customsDutyUsd: quote.customsDutyUsd,
        importVatUsd: quote.importVatUsd,
        totalUsdMin: quote.totalUsdMin,
        totalUsdMax: quote.totalUsdMax,
        totalAedMin: quote.totalAedMin,
        totalAedMax: quote.totalAedMax,
        exchangeRate: quote.exchangeRate || 3.6725,
        disclaimer: quote.disclaimer,
        rules: snap.rules as PdfQuotationData['rules'],
      };
      await generateQuotationPdf(pdfData, branding);
    } catch (err) {
      console.error('Failed to generate quotation PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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
          <div className="w-full sm:max-w-xs relative">
            <Input
              type="text"
              placeholder="Search reference, customer, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="text-xs"
            />
          </div>
          <span className="text-xs text-slate-500 self-center">
            Showing <strong>{filteredQuotes.length}</strong> of {quotations.length} quotes
          </span>
        </div>

        {/* Quotations Table */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="w-12 h-12 text-slate-300 stroke-[1.5]" />}
            title="No quotations found"
            description={
              search ? 'Try adjusting your search criteria.' : 'Customer quotes will appear here once requested.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Vehicle</th>
                  <th className="py-3 px-3">Route</th>
                  <th className="py-3 px-3 text-end">Est. Total (USD)</th>
                  <th className="py-3 px-3 text-end">Est. Total (AED)</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => {
                  const hasRange = q.isTowingRange && q.totalUsdMin !== q.totalUsdMax;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-navy-950">
                        {q.referenceNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{q.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{q.customerPhone}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[150px] truncate" title={q.vehicleDetails}>
                        {q.vehicleDetails}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate" title={q.route}>
                        {q.route}
                      </td>
                      <td className="py-3 px-3 text-end font-semibold text-slate-900 whitespace-nowrap">
                        {hasRange
                          ? `${formatCurrency(q.totalUsdMin)} – ${formatCurrency(q.totalUsdMax)}`
                          : formatCurrency(q.totalUsdMax || q.totalUsdMin)}
                      </td>
                      <td className="py-3 px-3 text-end font-bold text-brand-orange-600 whitespace-nowrap">
                        {hasRange
                          ? `${formatAED(q.totalAedMin)} – ${formatAED(q.totalAedMax)}`
                          : formatAED(q.totalAedMax || q.totalAedMin)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQuote(q)}
                          startIcon={<Eye className="w-3 h-3" />}
                          className="text-[11px] font-bold px-2 py-1"
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

      {/* Reorganized Authoritative Quotation Breakdown Modal (Sections A through G) */}
      {selectedQuote && (() => {
        const rate = selectedQuote.exchangeRate || 3.6725;
        const declaredValue = selectedQuote.declaredValueUsd || 0;
        const oceanFreight = selectedQuote.oceanFreightUsd || 0;
        const towingMin = selectedQuote.towingFeeMin || 0;
        const towingMax = selectedQuote.towingFeeMax || 0;
        const effectiveTowing = selectedQuote.isTowingRange ? towingMax : (towingMin || towingMax);
        const portHandling = selectedQuote.portHandlingUsd || 200;
        const clearance = selectedQuote.customsClearanceUsd || 150;
        const surcharges = selectedQuote.surchargesUsd || 0;

        // Subtotal of shipping charges (strictly services, NO vehicle purchase price)
        const subtotalShippingUsd = oceanFreight + effectiveTowing + portHandling + clearance + surcharges;
        const subtotalShippingAed = subtotalShippingUsd * rate;

        // CIF Base & Government Charges
        const cifUsd = selectedQuote.cifMax || (declaredValue + oceanFreight);
        const customsDutyUsd = selectedQuote.customsDutyUsd || (cifUsd * 0.05);
        const vatBaseUsd = cifUsd + customsDutyUsd;
        const importVatUsd = selectedQuote.importVatUsd || (vatBaseUsd * 0.05);
        const totalGovChargesUsd = customsDutyUsd + importVatUsd;
        const totalGovChargesAed = totalGovChargesUsd * rate;

        // Grand Totals
        const grandTotalShippingAndGovUsd = subtotalShippingUsd + totalGovChargesUsd;
        const grandTotalShippingAndGovAed = grandTotalShippingAndGovUsd * rate;

        const createdDate = new Date(selectedQuote.createdAt);
        const validUntilDate = new Date(createdDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        const snap = (selectedQuote.pricingSnapshot as Record<string, unknown>) || {};
        const originPort = (snap.originPort as string) || selectedQuote.route.split('→')[0]?.trim() || 'USA Port / Auction';
        const destinationPort = (snap.destinationPort as string) || selectedQuote.route.split('→')[1]?.trim() || 'UAE Port (Jebel Ali)';

        return (
          <Modal
            isOpen={Boolean(selectedQuote)}
            onClose={() => setSelectedQuote(null)}
            title={`Official Quotation Breakdown: ${selectedQuote.referenceNumber}`}
            className="max-w-3xl"
          >
            <div className="space-y-6 text-xs pt-1 pb-2">
              {/* SECTION A: Quotation & Reference Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-navy-950 text-white text-[10px] font-black flex items-center justify-center">
                      A
                    </span>
                    <h3 className="text-xs font-bold text-brand-navy-950 uppercase tracking-wider">
                      Quotation & Reference Information
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Locked Tariffs Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Quotation ID
                    </span>
                    <strong className="font-mono text-slate-900 font-bold block text-sm">
                      {selectedQuote.referenceNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Issue Date
                    </span>
                    <span className="text-slate-700 font-medium">
                      {createdDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Valid Until
                    </span>
                    <span className="text-slate-700 font-medium">
                      {validUntilDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Customer Type
                    </span>
                    <span className="text-slate-700 font-medium">
                      Individual / Commercial
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION B: Customer & Contact Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-brand-navy-950 text-white text-[10px] font-black flex items-center justify-center">
                    B
                  </span>
                  <h3 className="text-xs font-bold text-brand-navy-950 uppercase tracking-wider">
                    Customer & Contact Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Client Full Name
                    </span>
                    <strong className="text-slate-900 block text-xs">
                      {selectedQuote.customerName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Phone / WhatsApp
                    </span>
                    <span className="text-slate-700 font-mono">
                      {selectedQuote.customerPhone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Email Address
                    </span>
                    <span className="text-slate-700 truncate block">
                      {selectedQuote.customerEmail || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Destination Country / Emirate
                    </span>
                    <span className="text-slate-700 font-medium">
                      United Arab Emirates (Dubai / Sharjah)
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION C: Vehicle & Shipping Route */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-brand-navy-950 text-white text-[10px] font-black flex items-center justify-center">
                    C
                  </span>
                  <h3 className="text-xs font-bold text-brand-navy-950 uppercase tracking-wider">
                    Vehicle & Shipping Route
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                      <Car className="w-3 h-3 text-brand-orange-500" /> Vehicle Specification
                    </span>
                    <strong className="text-slate-900 block">
                      {selectedQuote.vehicleDetails}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-500" /> Origin / Dispatch Port
                    </span>
                    <span className="text-slate-700 font-medium block">
                      {originPort}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                      <Ship className="w-3 h-3 text-emerald-500" /> Destination Port & Transit
                    </span>
                    <span className="text-slate-700 font-medium block">
                      {destinationPort} (~30-45 Days)
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION D: Vehicle Value & CIF Base */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-brand-navy-950 text-white text-[10px] font-black flex items-center justify-center">
                    D
                  </span>
                  <h3 className="text-xs font-bold text-brand-navy-950 uppercase tracking-wider">
                    Vehicle Value & CIF Valuation Base
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <th className="py-1.5 px-2 text-start">Valuation Parameter</th>
                        <th className="py-1.5 px-2 text-end">Amount (USD)</th>
                        <th className="py-1.5 px-2 text-end">Amount (AED)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 text-slate-700">
                      <tr>
                        <td className="py-1.5 px-2">Declared Vehicle Purchase Value</td>
                        <td className="py-1.5 px-2 text-end font-medium">
                          {declaredValue > 0 ? formatCurrency(declaredValue) : 'Not Declared ($0.00)'}
                        </td>
                        <td className="py-1.5 px-2 text-end text-slate-500">
                          {declaredValue > 0 ? formatAED(declaredValue * rate) : 'AED 0.00'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2">Eligible Ocean Freight (included in CIF)</td>
                        <td className="py-1.5 px-2 text-end font-medium">{formatCurrency(oceanFreight)}</td>
                        <td className="py-1.5 px-2 text-end text-slate-500">{formatAED(oceanFreight * rate)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2">Transit Marine Cargo Insurance</td>
                        <td className="py-1.5 px-2 text-end font-medium">Included / Standard</td>
                        <td className="py-1.5 px-2 text-end text-slate-500">Carrier Terms</td>
                      </tr>
                      <tr className="font-bold bg-white/60">
                        <td className="py-2 px-2 text-brand-navy-950">Total Official CIF Valuation Base</td>
                        <td className="py-2 px-2 text-end text-brand-navy-950 font-bold">{formatCurrency(cifUsd)}</td>
                        <td className="py-2 px-2 text-end text-brand-orange-600 font-bold">{formatAED(cifUsd * rate)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION E: Itemized Shipping & Logistics Charges */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-navy-950 text-white text-[10px] font-black flex items-center justify-center">
                      E
                    </span>
                    <h3 className="text-xs font-bold text-brand-navy-950 uppercase tracking-wider">
                      Itemized Shipping & Logistics Charges
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Excludes Vehicle Purchase Price
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                        <th className="py-2 px-3 text-start">Logistics Service Item</th>
                        <th className="py-2 px-3 text-start">Notes</th>
                        <th className="py-2 px-3 text-end">Amount (USD)</th>
                        <th className="py-2 px-3 text-end">Amount (AED)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2 px-3 font-medium flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-brand-orange-500" /> Inland Towing (Origin Auction to US Port)
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">
                          {selectedQuote.isTowingRange ? 'Carrier Range Bracket' : 'Fixed Station Rate'}
                        </td>
                        <td className="py-2 px-3 text-end font-semibold">
                          {selectedQuote.isTowingRange
                            ? `${formatCurrency(towingMin)} – ${formatCurrency(towingMax)}`
                            : formatCurrency(towingMin || towingMax)}
                        </td>
                        <td className="py-2 px-3 text-end text-slate-500">
                          {selectedQuote.isTowingRange
                            ? `${formatAED(towingMin * rate)} – ${formatAED(towingMax * rate)}`
                            : formatAED((towingMin || towingMax) * rate)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium flex items-center gap-1.5">
                          <Ship className="w-3.5 h-3.5 text-blue-500" /> Ocean Freight (US Port to UAE)
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">Containerized Cargo Carrier</td>
                        <td className="py-2 px-3 text-end font-semibold">{formatCurrency(oceanFreight)}</td>
                        <td className="py-2 px-3 text-end text-slate-500">{formatAED(oceanFreight * rate)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium flex items-center gap-1.5">
                          <Ship className="w-3.5 h-3.5 text-indigo-500" /> Destination Port Handling & Terminal Charges
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">Non-VAT Base / Destination Service</td>
                        <td className="py-2 px-3 text-end font-semibold">{formatCurrency(portHandling)}</td>
                        <td className="py-2 px-3 text-end text-slate-500">{formatAED(portHandling * rate)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" /> UAE Customs Clearance & Documentation
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">Agency filing & port paperwork</td>
                        <td className="py-2 px-3 text-end font-semibold">{formatCurrency(clearance)}</td>
                        <td className="py-2 px-3 text-end text-slate-500">{formatAED(clearance * rate)}</td>
                      </tr>
                      {surcharges > 0 && (
                        <tr>
                          <td className="py-2 px-3 font-medium flex items-center gap-1.5 text-amber-800">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Condition / Fuel Surcharges
                          </td>
                          <td className="py-2 px-3 text-[11px] text-amber-600">Non-runner or specialized handling</td>
                          <td className="py-2 px-3 text-end font-semibold text-amber-800">{formatCurrency(surcharges)}</td>
                          <td className="py-2 px-3 text-end text-slate-500">{formatAED(surcharges * rate)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-brand-orange-50/50 border-t-2 border-brand-orange-200 font-bold text-brand-navy-950">
                        <td colSpan={2} className="py-2.5 px-3">
                          Subtotal of Shipping & Logistics Services
                        </td>
                        <td className="py-2.5 px-3 text-end font-black text-brand-navy-950">
                          {formatCurrency(subtotalShippingUsd)}
                        </td>
                        <td className="py-2.5 px-3 text-end font-black text-brand-orange-600">
                          {formatAED(subtotalShippingAed)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SECTION F: UAE Customs & Import VAT */}
              <div className="bg-emerald-50/30 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-emerald-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-black flex items-center justify-center">
                    F
                  </span>
                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    UAE Customs Duty & Import VAT (Statutory Government Fees)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-emerald-200">
                        <th className="py-1.5 px-2 text-start">Government Fee Component</th>
                        <th className="py-1.5 px-2 text-start">Calculation Basis</th>
                        <th className="py-1.5 px-2 text-end">Amount (USD)</th>
                        <th className="py-1.5 px-2 text-end">Amount (AED)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-200/50 text-slate-700">
                      <tr>
                        <td className="py-2 px-2 font-medium">UAE Customs Duty (5%)</td>
                        <td className="py-2 px-2 text-[11px] text-slate-500">5.0% × CIF Base ({formatCurrency(cifUsd)})</td>
                        <td className="py-2 px-2 text-end font-semibold">{formatCurrency(customsDutyUsd)}</td>
                        <td className="py-2 px-2 text-end text-slate-500">{formatAED(customsDutyUsd * rate)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-medium">UAE Import VAT (5%)</td>
                        <td className="py-2 px-2 text-[11px] text-slate-500">5.0% × [CIF + Duty] ({formatCurrency(vatBaseUsd)})</td>
                        <td className="py-2 px-2 text-end font-semibold">{formatCurrency(importVatUsd)}</td>
                        <td className="py-2 px-2 text-end text-slate-500">{formatAED(importVatUsd * rate)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-100/50 font-bold border-t border-emerald-300 text-emerald-950">
                        <td colSpan={2} className="py-2 px-2">Total UAE Government Charges</td>
                        <td className="py-2 px-2 text-end font-black">{formatCurrency(totalGovChargesUsd)}</td>
                        <td className="py-2 px-2 text-end font-black text-emerald-700">{formatAED(totalGovChargesAed)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SECTION G: Quotation Grand Totals */}
              <div className="bg-brand-navy-950 text-white rounded-2xl p-5 shadow-lg border border-brand-navy-800">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-brand-navy-800">
                  <span className="w-5 h-5 rounded-full bg-brand-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                    G
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Quotation Grand Totals (Landed Services Summary)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-3 rounded-xl bg-brand-navy-900 border border-brand-navy-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Total Logistics & Shipping
                    </span>
                    <strong className="text-white text-base block mt-0.5">
                      {formatCurrency(subtotalShippingUsd)}
                    </strong>
                    <span className="text-[11px] text-brand-orange-400 font-semibold">
                      {formatAED(subtotalShippingAed)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-brand-navy-900 border border-brand-navy-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Total Government Charges
                    </span>
                    <strong className="text-emerald-300 text-base block mt-0.5">
                      {formatCurrency(totalGovChargesUsd)}
                    </strong>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      {formatAED(totalGovChargesAed)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-brand-orange-500 text-white border border-brand-orange-400 shadow-orange-glow">
                    <span className="text-[10px] text-orange-100 uppercase font-black block">
                      Quotation Grand Total
                    </span>
                    <strong className="text-white text-lg block font-black mt-0.5">
                      {formatCurrency(grandTotalShippingAndGovUsd)}
                    </strong>
                    <span className="text-xs text-white font-bold block">
                      {formatAED(grandTotalShippingAndGovAed)}
                    </span>
                  </div>
                </div>

                {declaredValue > 0 && (
                  <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-brand-navy-800/80">
                    * Total Estimated Landed Investment (Vehicle Purchase + Shipping + UAE Government Charges):{' '}
                    <strong className="text-white font-bold">
                      {formatCurrency(declaredValue + grandTotalShippingAndGovUsd)}
                    </strong>{' '}
                    ({formatAED((declaredValue + grandTotalShippingAndGovUsd) * rate)})
                  </p>
                )}
              </div>

              {/* Disclaimer */}
              {selectedQuote.disclaimer && (
                <p className="text-[11px] text-slate-400 italic leading-relaxed px-1">
                  {selectedQuote.disclaimer}
                </p>
              )}

              {/* Action Buttons: Download PDF, Print, Close */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownloadPdf(selectedQuote)}
                    disabled={isDownloadingPdf}
                    startIcon={
                      isDownloadingPdf ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )
                    }
                    className="flex-1 sm:flex-initial text-xs font-bold bg-brand-orange-500 hover:bg-brand-orange-600 shadow-sm"
                  >
                    <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    startIcon={<Printer className="w-3.5 h-3.5" />}
                    className="flex-1 sm:flex-initial text-xs font-bold border-slate-300"
                  >
                    <span>Print Quotation</span>
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuote(null)}
                  className="w-full sm:w-auto text-xs font-bold text-slate-600"
                >
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
