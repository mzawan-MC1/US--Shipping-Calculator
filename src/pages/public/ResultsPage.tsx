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
import { generateQuotationPdf, PdfQuotationData } from '../../services/pdfService';
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
  Share2,
  Printer,
} from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { t, language, direction } = useI18n();
  const isAr = language === 'ar';
  const [currency, setCurrency] = useState<'USD' | 'AED'>('USD');
  const [quote, setQuote] = useState<QuotationBreakdown | null>(() =>
    quotationService.getActiveQuote()
  );
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Authoritative Human-Readable Route Resolution
  const originDisplay = quote.routeInfo?.origin_port_name
    ? {
        name: isAr && quote.routeInfo.origin_port_name_ar ? quote.routeInfo.origin_port_name_ar : quote.routeInfo.origin_port_name,
        subtitle: `${quote.routeInfo.origin_port_state ? quote.routeInfo.origin_port_state + ', ' : ''}${isAr && quote.routeInfo.origin_country_name_ar ? quote.routeInfo.origin_country_name_ar : (quote.routeInfo.origin_country_name || 'United States')}`,
        countryCode: quote.routeInfo.origin_country_code || 'USA',
      }
    : {
        name: quote.input.loadingPort || (isAr ? 'ميناء التحميل' : 'Loading Port'),
        subtitle: isAr ? 'الولايات المتحدة الأمريكية' : 'United States',
        countryCode: 'USA',
      };

  const destDisplay = quote.routeInfo?.destination_port_name
    ? {
        name: isAr && quote.routeInfo.destination_port_name_ar ? quote.routeInfo.destination_port_name_ar : quote.routeInfo.destination_port_name,
        subtitle: `${quote.routeInfo.destination_port_state ? quote.routeInfo.destination_port_state + ', ' : ''}${isAr && quote.routeInfo.destination_country_name_ar ? quote.routeInfo.destination_country_name_ar : (quote.routeInfo.destination_country_name || 'United Arab Emirates')}`,
        countryCode: quote.routeInfo.destination_country_code || 'ARE',
      }
    : {
        name: quote.input.destinationPort || (isAr ? 'ميناء الوصول' : 'Destination Port'),
        subtitle: isAr ? 'الإمارات العربية المتحدة' : 'United Arab Emirates',
        countryCode: 'ARE',
      };

  const vehicleDesc = [
    quote.input.year,
    quote.input.make,
    quote.input.model,
  ].filter(Boolean).join(' ') || `${quote.input.vehicleType} (${quote.input.powertrain})`;

  const towingSummary = quote.isTowingRange
    ? `$${quote.towingFeeMin} - $${quote.towingFeeMax} (Estimated Range)`
    : quote.towingFeeMin && quote.towingFeeMin > 0
      ? `$${quote.towingFeeMin} (Fixed Tariff)`
      : 'Port Delivery (Direct)';

  const whatsappMessage = `*${brandNameHeader} - OFFICIAL SHIPPING QUOTATION*
📄 *Quote Ref:* ${quote.referenceNumber}
👤 *Customer:* ${quote.input.customerName || 'Customer'}
🚗 *Vehicle:* ${vehicleDesc}
🚢 *Route:* ${originDisplay.name} (${originDisplay.subtitle}) ➔ ${destDisplay.name} (${destDisplay.subtitle})
⏱️ *Transit Time:* ${quote.estimatedTransitDaysMin && quote.estimatedTransitDaysMax ? `${quote.estimatedTransitDaysMin}-${quote.estimatedTransitDaysMax} Days` : `${quote.estimatedTransitDays} Days`}

💵 *Cost Summary:*
• Ocean Freight: $${quote.oceanFreight?.toLocaleString()}
• Inland Towing: ${towingSummary}
• Customs Clearance: $${quote.customsClearance?.toLocaleString()}
• Port Handling: $${quote.destinationCharges?.toLocaleString()}
• Customs Duty (5%): $${(quote.dutyMax ?? quote.customsDuty)?.toLocaleString()}
• UAE Import VAT (5%): $${(quote.vatMax ?? quote.vat)?.toLocaleString()}

💰 *Total Estimated:* ${totalFormatted} (${totalAedFormatted})

ℹ️ *Note:* ${quote.disclaimer || 'Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation. Quotation valid for 14 days.'}

🔗 *View Online:* ${window.location.origin}/results`;

  const whatsappHref = getWhatsAppLink(whatsappMessage);

  const handleDownloadQuotation = async () => {
    try {
      const pdfData: PdfQuotationData = {
        language: isAr ? 'ar' : 'en',
        referenceNumber: quote.referenceNumber,
        enquiryReference: quote.enquiryReference,
        createdAt: quote.createdAt,
        customerName: quote.input.customerName || (isAr ? 'العميل المحترم' : 'Valued Customer'),
        customerPhone: quote.input.customerPhone || 'N/A',
        customerEmail: quote.input.customerEmail,
        vehicleDetails: `${quote.input.year} ${quote.input.make} ${quote.input.model}`.trim(),
        originPort: originDisplay.name,
        destinationPort: destDisplay.name,
        originPortAr: quote.routeInfo?.origin_port_name_ar || originDisplay.name,
        destinationPortAr: quote.routeInfo?.destination_port_name_ar || destDisplay.name,
        shippingMethod: quote.input.shippingMethod || 'Containerized Ocean Freight',
        shippingMethodAr: isAr ? 'شحن بحري في حاويات' : undefined,
        transitTime: `${quote.estimatedTransitDaysMin || quote.estimatedTransitDays || 30}-${quote.estimatedTransitDaysMax || 45} ${isAr ? 'يوم' : 'Days'}`,
        declaredValueUsd: quote.input.buyingPrice,
        oceanFreightUsd: quote.oceanFreight,
        towingFeeMin: quote.towingFeeMin || 0,
        towingFeeMax: quote.towingFeeMax || 0,
        isTowingRange: Boolean(quote.isTowingRange),
        clearanceFeeUsd: quote.customsClearance,
        portHandlingFeeUsd: quote.destinationCharges,
        surchargesUsd: (quote.powertrainSurcharge || 0) + (quote.vehicleTypeSurcharge || 0),
        cifUsd: quote.cifMax || quote.cifMin || ((quote.input.buyingPrice || 0) + quote.oceanFreight),
        customsDutyUsd: quote.customsDuty,
        importVatUsd: quote.vat,
        totalUsdMin: quote.totalChargesUsdMin || quote.totalChargesUsd,
        totalUsdMax: quote.totalChargesUsdMax || quote.totalChargesUsd,
        totalAedMin: quote.totalChargesAedMin || convertUsdToAed(quote.totalChargesUsdMin || quote.totalChargesUsd),
        totalAedMax: quote.totalChargesAedMax || convertUsdToAed(quote.totalChargesUsdMax || quote.totalChargesUsd),
        exchangeRate: (quote.snapshot?.exchangeRate as number) || 3.6725,
        disclaimer: quote.disclaimer,
        rules: quote.rules,
      };
      await generateQuotationPdf(pdfData, branding);
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to generate PDF quotation:', err);
      // Fallback to window.print if PDF generation encounters an issue
      window.print();
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${brandNameHeader} - Quotation ${quote.referenceNumber}`,
          text: `Shipping quotation ${quote.referenceNumber} from ${originDisplay.name} to ${destDisplay.name}. Total: ${totalFormatted}`,
          url: window.location.href,
        });
        return;
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }
    // Fallback: Copy link
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      if (whatsappHref) {
        window.open(whatsappHref, '_blank');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 pb-28 sm:pb-12 w-full overflow-x-hidden print:bg-white print:py-2 print:pb-0">
      <Container className="max-w-2xl px-4 sm:px-6 print:max-w-none print:px-0">
        {/* Printable Official Letterhead Header */}
        <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-black tracking-tight text-brand-navy-950">
              {branding.companyName || 'FAKHER ALAM USED CARS SHIPPING LLC'}
            </h1>
            <p className="text-xs text-slate-600">
              Premier Auto Logistics from US Auctions to UAE Ports • TRN: 100492817200003
            </p>
          </div>
          <div className="text-end">
            <span className="text-sm font-bold font-mono text-brand-orange-600 block">
              {quote.referenceNumber}
            </span>
            <span className="text-xs text-slate-500">
              Date: {new Date(quote.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Top Title & Reference Header */}
        <div className="text-center space-y-2 mb-6 print:hidden">
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
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 print:hidden">
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
          <Card className="p-5 sm:p-6 overflow-hidden print:border-slate-300 print:shadow-none">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 print:border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black px-2 py-1 rounded bg-blue-900 text-blue-200 shrink-0">
                  {originDisplay.countryCode || 'USA'}
                </span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {t.routeSummaryFrom}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {originDisplay.name}
                  </h3>
                  {originDisplay.subtitle && (
                    <span className="text-xs text-slate-500 block">{originDisplay.subtitle}</span>
                  )}
                </div>
              </div>

              <div className="hidden sm:flex items-center text-slate-400">
                <ArrowRight className={`w-5 h-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black px-2 py-1 rounded bg-emerald-900 text-emerald-200 shrink-0">
                  {destDisplay.countryCode || 'ARE'}
                </span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {t.routeSummaryTo}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {destDisplay.name}
                  </h3>
                  {destDisplay.subtitle && (
                    <span className="text-xs text-slate-500 block">{destDisplay.subtitle}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Transit Time Callout */}
            <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between print:border-slate-200 print:bg-slate-50">
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

          {/* Rules & Regulations Terms Snapshot */}
          {quote.rules && quote.rules.length > 0 && (
            <Card className="p-5 sm:p-6 bg-white border border-slate-200">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-brand-orange-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy-950">
                  {isAr ? 'الشروط والأحكام واللوائح الرسمية' : 'Quotation Rules, Terms & Regulations'}
                </h4>
              </div>
              <div className="space-y-3">
                {quote.rules.map((rule, idx) => {
                  const ruleTitle = (isAr ? rule.title_ar : null) || rule.title || rule.title_en || 'Quotation Rule';
                  const ruleContent = (isAr ? rule.content_ar : null) || rule.content || rule.content_en || '';
                  return (
                    <div key={rule.ruleKey || rule.rule_key || rule.id || idx} className="text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-brand-navy-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <strong className="text-slate-900 font-bold block mb-0.5">
                            {ruleTitle}
                          </strong>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {ruleContent}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Authoritative Disclaimer from Database Engine */}
          <Alert variant="info" title="Authoritative Quotation Disclaimer" className="print:border-slate-300 print:text-slate-700">
            {quote.disclaimer || t.demoDataDisclaimer}
          </Alert>

          {downloadSuccess && (
            <Alert variant="success" title="Quotation Generated" className="print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Authoritative quotation PDF downloaded successfully (Ref:{' '}
                  <strong>{quote.referenceNumber}</strong>).
                </span>
              </div>
            </Alert>
          )}

          {copiedLink && (
            <Alert variant="success" title={isAr ? 'تم نسخ الرابط' : 'Link Copied'} className="print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isAr ? 'تم نسخ رابط عرض السعر بنجاح للمشاركة.' : 'Quotation link copied to clipboard for easy sharing.'}
                </span>
              </div>
            </Alert>
          )}

          {/* Action Buttons (Hidden on Print) */}
          <div className="space-y-3 pt-2 print:hidden">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Button
                variant="secondary"
                size="md"
                className="w-full font-bold text-xs"
                onClick={handleShare}
                startIcon={<Share2 className="w-3.5 h-3.5" />}
              >
                {isAr ? 'مشاركة' : 'Share'}
              </Button>

              <Button
                variant="primary"
                size="md"
                className="w-full font-bold text-xs bg-brand-orange-500 hover:bg-brand-orange-600 shadow-sm"
                onClick={handleDownloadQuotation}
                startIcon={<Download className="w-3.5 h-3.5" />}
              >
                {isAr ? 'تحميل PDF' : 'Download PDF'}
              </Button>

              <Button
                variant="outline"
                size="md"
                className="w-full font-bold text-xs"
                onClick={() => window.print()}
                startIcon={<Printer className="w-3.5 h-3.5" />}
              >
                {isAr ? 'طباعة' : 'Print'}
              </Button>

              <Link to="/calculator" className="w-full">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full font-bold text-xs"
                  startIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  {isAr ? 'إعادة الحساب' : 'Recalculate'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};
