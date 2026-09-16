import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { quotationService } from '../../services/quotationService';
import { QuotationBreakdown } from '../../types/calculator';
import { formatCurrency, convertUsdToAed } from '../../lib/utils';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import {
  Clock,
  Car,
  Fuel,
  ShoppingBag,
  Truck,
  ArrowRight,
  MessageCircle,
  RotateCcw,
  Download,
  ShieldCheck,
  Receipt,
  CheckCircle2,
} from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { t, direction } = useI18n();
  const [currency, setCurrency] = useState<'USD' | 'AED'>('USD');
  const [quote, setQuote] = useState<QuotationBreakdown | null>(() =>
    quotationService.getActiveQuote()
  );
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const active = quotationService.getActiveQuote();
    setQuote(active);
  }, []);

  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <Container className="max-w-md px-4 text-center">
          <Card className="p-8 bg-white border border-slate-200">
            <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-brand-navy-950 mb-2">No Active Quotation</h2>
            <p className="text-xs text-slate-500 mb-6">
              You have not calculated a shipping quotation yet. Use our shipping calculator to
              obtain an accurate quote.
            </p>
            <Link to="/calculator">
              <Button variant="primary" className="w-full">
                Calculate Shipping Now
              </Button>
            </Link>
          </Card>
        </Container>
      </div>
    );
  }

  const displayAmount = (usdAmount: number) => {
    if (currency === 'AED') {
      return formatCurrency(convertUsdToAed(usdAmount), 'AED');
    }
    return formatCurrency(usdAmount, 'USD');
  };

  const displayRangeOrAmount = (minUsd?: number, maxUsd?: number, fallbackUsd: number = 0) => {
    const min = minUsd ?? fallbackUsd;
    const max = maxUsd ?? fallbackUsd;
    if (min !== max && min > 0 && max > 0) {
      if (currency === 'AED') {
        return `${formatCurrency(convertUsdToAed(min), 'AED')} - ${formatCurrency(convertUsdToAed(max), 'AED')}`;
      }
      return `${formatCurrency(min, 'USD')} - ${formatCurrency(max, 'USD')}`;
    }
    return displayAmount(max || fallbackUsd);
  };

  const totalFormatted = quote.isTowingRange
    ? displayRangeOrAmount(
        quote.totalChargesUsdMin,
        quote.totalChargesUsdMax,
        quote.totalChargesUsd
      )
    : displayAmount(quote.totalChargesUsd);

  const totalAedFormatted = quote.isTowingRange
    ? `${formatCurrency(quote.totalChargesAedMin || convertUsdToAed(quote.totalChargesUsdMin || 0), 'AED')} - ${formatCurrency(quote.totalChargesAedMax || convertUsdToAed(quote.totalChargesUsdMax || 0), 'AED')}`
    : formatCurrency(quote.totalChargesAed || convertUsdToAed(quote.totalChargesUsd), 'AED');

  const { branding, getWhatsAppLink } = useWebsiteSettings();
  const brandNameHeader = (branding.shortName || branding.companyName).toUpperCase();
  const whatsappMessage = `*${brandNameHeader} - SHIPPING QUOTATION*
Quote Ref: ${quote.referenceNumber}
Customer: ${quote.input.customerName || 'Customer'}
Route: ${quote.input.loadingPort.toUpperCase()} -> ${quote.input.destinationPort.toUpperCase()}
Total Estimated: ${totalFormatted} (${totalAedFormatted})
View Quote: ${window.location.origin}/results`;

  const whatsappHref = getWhatsAppLink(whatsappMessage);

  const handleDownloadQuotation = () => {
    window.print();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 pb-28 sm:pb-12 w-full overflow-x-hidden">
      <Container className="max-w-2xl px-4 sm:px-6">
        {/* Top Title & Reference Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold max-w-full text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Official Shipping Quotation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-navy-950">{t.resultsTitle}</h1>
          <p className="text-xs sm:text-sm text-slate-600">{t.resultsSubtitle}</p>

          {/* Reference numbers bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-800 shadow-sm">
              Quote Ref: <strong className="text-brand-orange-600">{quote.referenceNumber}</strong>
            </span>
            {quote.enquiryReference && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-800 shadow-sm">
                Enquiry Ref:{' '}
                <strong className="text-brand-navy-900">{quote.enquiryReference}</strong>
              </span>
            )}
            {quote.isIdempotentReplay && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                Verified Snapshot
              </span>
            )}
          </div>
        </div>

        {/* Currency Switch Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-orange-500" />
            <span className="text-xs sm:text-sm font-bold text-slate-700">{t.currencySwitch}</span>
          </div>
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                currency === 'USD'
                  ? 'bg-brand-navy-950 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('AED')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                currency === 'AED'
                  ? 'bg-brand-navy-950 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AED (د.إ)
            </button>
          </div>
        </div>

        {/* Main Quote Result Card */}
        <div className="space-y-5">
          {/* Route & Transit Card */}
          <Card className="p-5 sm:p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black px-2 py-1 rounded bg-blue-900 text-blue-200 shrink-0">
                  USA
                </span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {t.routeSummaryFrom}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 capitalize">
                    {quote.input.loadingPort} Port, USA
                  </h3>
                </div>
              </div>

              <div className="hidden sm:flex items-center text-slate-400">
                <ArrowRight className={`w-5 h-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black px-2 py-1 rounded bg-emerald-900 text-emerald-200 shrink-0">
                  UAE
                </span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {t.routeSummaryTo}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 capitalize">
                    {quote.input.destinationPort === 'khorfakkan'
                      ? 'Port of Khor Fakkan (Sharjah)'
                      : 'Port of Jebel Ali (Dubai)'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Transit Time Callout */}
            <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  {t.estimatedTransitTime}
                </span>
              </div>
              <span className="text-sm sm:text-base font-black text-blue-800">
                {quote.estimatedTransitDaysMin && quote.estimatedTransitDaysMax
                  ? `${quote.estimatedTransitDaysMin} - ${quote.estimatedTransitDaysMax} ${t.days}`
                  : `${quote.estimatedTransitDays} ${t.days}`}
              </span>
            </div>
          </Card>

          {/* Vehicle & Towing Specs */}
          <Card className="p-5 sm:p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-100">
              {t.vehicleAndShippingDetails}
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-1 py-1 border-b border-slate-50">
                <span className="flex items-center gap-2 text-slate-500">
                  <Car className="w-4 h-4 text-slate-400 shrink-0" />
                  Vehicle Category:
                </span>
                <strong className="text-slate-800 capitalize">{quote.input.vehicleType}</strong>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 py-1 border-b border-slate-50">
                <span className="flex items-center gap-2 text-slate-500">
                  <Fuel className="w-4 h-4 text-slate-400 shrink-0" />
                  Powertrain:
                </span>
                <strong className="text-slate-800 capitalize">{quote.input.powertrain}</strong>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 py-1 border-b border-slate-50">
                <span className="flex items-center gap-2 text-slate-500">
                  <ShoppingBag className="w-4 h-4 text-slate-400 shrink-0" />
                  Purchase Source:
                </span>
                <strong className="text-slate-800 uppercase">{quote.input.purchaseSource}</strong>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 py-1 border-b border-slate-50">
                <span className="flex items-center gap-2 text-slate-500">
                  <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
                  Declared Vehicle Value:
                </span>
                <strong className="text-slate-800">
                  ${quote.input.buyingPrice?.toLocaleString()} USD
                </strong>
              </div>

              {/* Inland Towing Specs */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block">Inland Towing Origin:</span>
                    <span className="font-semibold text-slate-800 break-words">
                      {quote.input.towFromLocation || 'Delivered to Loading Port'}
                    </span>
                  </div>
                </div>
                <div>
                  {quote.isTowingRange ? (
                    <Badge variant="orange" size="sm">
                      Estimated Range: ${quote.towingFeeMin} - ${quote.towingFeeMax}
                    </Badge>
                  ) : quote.towingFeeMin && quote.towingFeeMin > 0 ? (
                    <Badge variant="success" size="sm">
                      Fixed Rate: ${quote.towingFeeMin}
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Port Delivery
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Cost Breakdown Table */}
          <Card className="p-5 sm:p-6 divide-y divide-slate-100">
            {/* Ocean Freight Section */}
            <div className="pb-3.5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  {t.costBreakdown}
                </h4>
                <Badge variant="info" size="sm">
                  Consolidated Container
                </Badge>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between gap-2">
                  <span className="break-words">
                    Ocean Freight ({quote.input.loadingPort.toUpperCase()} to{' '}
                    {quote.input.destinationPort.toUpperCase()})
                  </span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {displayAmount(quote.oceanFreight)}
                  </span>
                </div>

                {/* Inland Towing Line Item */}
                {(quote.towingFeeMin !== undefined && quote.towingFeeMin > 0) ||
                (quote.towingFeeMax !== undefined && quote.towingFeeMax > 0) ? (
                  <div className="flex justify-between gap-2">
                    <span className="break-words">
                      Inland Towing to Port{' '}
                      {quote.isTowingRange ? '(Estimated Range)' : '(Fixed Tariff)'}
                    </span>
                    <span className="font-semibold text-slate-900 shrink-0">
                      {displayRangeOrAmount(quote.towingFeeMin, quote.towingFeeMax)}
                    </span>
                  </div>
                ) : null}

                {quote.powertrainSurcharge > 0 && (
                  <div className="flex justify-between gap-2 text-amber-700">
                    <span className="break-words">
                      Powertrain / Handling Surcharge ({quote.input.powertrain})
                    </span>
                    <span className="font-semibold shrink-0">
                      {displayAmount(quote.powertrainSurcharge)}
                    </span>
                  </div>
                )}
                {quote.vehicleTypeSurcharge > 0 && (
                  <div className="flex justify-between gap-2 text-amber-700">
                    <span className="break-words">
                      Vehicle Category Surcharge ({quote.input.vehicleType})
                    </span>
                    <span className="font-semibold shrink-0">
                      {displayAmount(quote.vehicleTypeSurcharge)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                  <span>Ocean Freight & Inland Logistics Subtotal</span>
                  <span className="text-brand-orange-600">
                    {quote.isTowingRange
                      ? displayRangeOrAmount(
                          quote.oceanFreightTotal + (quote.towingFeeMin || 0),
                          quote.oceanFreightTotal + (quote.towingFeeMax || 0)
                        )
                      : displayAmount(quote.oceanFreightTotal + (quote.towingFeeMin || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Destination Clearance Section */}
            <div className="py-3.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-2">
                {t.customsClearanceTitle}
              </h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between gap-2">
                  <span className="break-words">{t.customsClearanceFee}</span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {displayAmount(quote.customsClearance)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="break-words">{t.additionalPortCharges}</span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {displayAmount(quote.destinationCharges)}
                  </span>
                </div>
              </div>
            </div>

            {/* Government Duties Section (Statutory 5% Duty + 5% VAT) */}
            <div className="py-3.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-2">
                UAE Statutory Government Charges
              </h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between gap-2">
                  <span className="break-words">Customs Duty (5% of CIF valuation)</span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {displayRangeOrAmount(quote.dutyMin, quote.dutyMax, quote.customsDuty)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="break-words">UAE Import VAT (5% of VAT Base)</span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {displayRangeOrAmount(quote.vatMin, quote.vatMax, quote.vat)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Callout (Cleanly displays range if applicable) */}
            <div className="pt-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-brand-navy-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-orange-400 block">
                    {t.totalCharges} ({currency}) {quote.isTowingRange ? '• Estimated Range' : ''}
                  </span>
                  <span className="text-xs text-slate-400">
                    All maritime, inland towing, clearance & statutory duties
                  </span>
                </div>
                <div className="text-start sm:text-end w-full sm:w-auto">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-brand-orange-400 block break-words">
                    {totalFormatted}
                  </span>
                  {currency === 'USD' && (
                    <span className="text-[11px] text-slate-300 font-semibold block">
                      ≈ {totalAedFormatted}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Authoritative Disclaimer from Database Engine */}
          <Alert variant="info" title="Authoritative Quotation Disclaimer">
            {quote.disclaimer || t.demoDataDisclaimer}
          </Alert>

          {downloadSuccess && (
            <Alert variant="success" title="Quotation Generated">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Authoritative quotation snapshot recorded. Stamped PDF dispatch ready (Ref:{' '}
                  <strong>{quote.referenceNumber}</strong>).
                </span>
              </div>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <a
              href={whatsappHref || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button
                variant="whatsapp"
                size="lg"
                className="w-full text-sm sm:text-base font-black shadow-lg"
                startIcon={<MessageCircle className="w-5 h-5" />}
              >
                {t.btnSendWhatsapp}
              </Button>
            </a>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/calculator" className="w-full">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full font-bold"
                  startIcon={<RotateCcw className="w-4 h-4" />}
                >
                  {t.btnRecalculate}
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="md"
                className="w-full font-bold"
                onClick={handleDownloadQuotation}
                startIcon={<Download className="w-4 h-4" />}
              >
                {t.btnDownloadQuote}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};
