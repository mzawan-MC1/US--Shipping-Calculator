import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BrandingSettings } from './adminService';
import { QuotationRuleItem, QuotationLineItem } from '../types/calculator';

export interface PdfQuotationData {
  language?: 'en' | 'ar';
  referenceNumber: string;
  enquiryReference?: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleDetails: string;
  originPort: string;
  destinationPort: string;
  originPortAr?: string;
  destinationPortAr?: string;
  shippingMethod: string;
  shippingMethodAr?: string;
  transitTime?: string;
  declaredValueUsd?: number;
  oceanFreightUsd: number;
  oceanFreightBaseUsd?: number;
  towingFeeMin: number;
  towingFeeMax: number;
  isTowingRange: boolean;
  clearanceFeeUsd?: number;
  portHandlingFeeUsd?: number;
  surchargesUsd?: number;
  cifUsd?: number;
  customsDutyUsd: number;
  vatBaseUsd?: number;
  importVatUsd: number;
  totalUsdMin: number;
  totalUsdMax: number;
  totalAedMin: number;
  totalAedMax: number;
  exchangeRate: number;
  disclaimer?: string;
  rules?: QuotationRuleItem[];
  lineItems?: QuotationLineItem[];
}

export async function generateQuotationPdf(
  data: PdfQuotationData,
  branding: BrandingSettings
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isAr = data.language === 'ar';

  if (isAr) {
    const { AMIRI_REGULAR_BASE64 } = await import('../assets/fonts/amiriFont');
    doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_REGULAR_BASE64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri', 'normal');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // Colors
  const navyColor = [11, 25, 44] as [number, number, number]; // #0B192C
  const orangeColor = [255, 107, 0] as [number, number, number]; // #FF6B00
  const grayColor = [100, 116, 139] as [number, number, number]; // Slate-500
  const lightBg = [248, 250, 252] as [number, number, number]; // Slate-50

  const fontName = isAr ? 'Amiri' : 'helvetica';

  const ar = (text: string | null | undefined): string => {
    if (!text) return '';
    return isAr ? doc.processArabic(text) : text;
  };

  // 1. Company Branding Header
  doc.setFillColor(...navyColor);
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, isAr ? 'normal' : 'bold');

  if (isAr) {
    doc.setFontSize(14);
    const companyTitle = ar(branding.companyName || 'فاخر علم لشحن السيارات المستعملة ذ.م.م');
    doc.text(companyTitle, pageWidth - margin - 6, currentY + 10, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(255, 179, 128);
    const tagline = ar(branding.tagline || 'خدمات الشحن واللوجستيات المتميزة من مزادات أمريكا إلى موانئ الإمارات');
    doc.text(tagline, pageWidth - margin - 6, currentY + 17, { align: 'right' });

    // Top-Left Ref Badge (Arabic layout)
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(ar('عرض أسعار رسمي'), margin + 6, currentY + 9);
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Ref: ${data.referenceNumber}`, margin + 6, currentY + 16);
  } else {
    doc.setFontSize(16);
    const companyTitle = (branding.companyName || 'FAKHER ALAM USED CARS SHIPPING LLC').toUpperCase();
    doc.text(companyTitle, margin + 6, currentY + 10);

    doc.setFontSize(8);
    doc.setTextColor(255, 179, 128);
    const tagline = (branding.tagline || 'PREMIER AUTO LOGISTICS FROM US AUCTIONS TO UAE PORTS').toUpperCase();
    doc.text(tagline, margin + 6, currentY + 17);

    // Top-Right Ref Badge (English layout)
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('OFFICIAL QUOTATION', pageWidth - margin - 6, currentY + 9, { align: 'right' });
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Ref: ${data.referenceNumber}`, pageWidth - margin - 6, currentY + 16, { align: 'right' });
  }

  currentY += 28;

  // 2. Metadata Grid (Quotation Dates & Client Details)
  const issueDate = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString(isAr ? 'ar-AE' : 'en-US');
  const validUntilDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(
    isAr ? 'ar-AE' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'FD');

  if (isAr) {
    // Col 1 (Right): Customer Details in Arabic
    const colRightX = pageWidth - margin - 5;
    doc.setFontSize(8);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...orangeColor);
    doc.text(ar('بيانات العميل / مقدم الطلب'), colRightX, currentY + 6, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(...navyColor);
    doc.text(ar(data.customerName || 'العميل المحترم'), colRightX, currentY + 12, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(ar(`الهاتف: ${data.customerPhone || 'غير متوفر'}`), colRightX, currentY + 18, { align: 'right' });
    if (data.customerEmail) {
      doc.text(ar(`البريد: ${data.customerEmail}`), colRightX, currentY + 23, { align: 'right' });
    }

    // Col 2 (Left): Quotation Info in Arabic
    const colLeftX = margin + 5;
    doc.setFontSize(8);
    doc.setTextColor(...orangeColor);
    doc.text(ar('مواصفات عرض الأسعار'), colLeftX, currentY + 6);

    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(ar(`تاريخ الإصدار: ${issueDate}`), colLeftX, currentY + 12);
    doc.text(ar(`مدة الصلاحية: 14 يوماً (${validUntilDate})`), colLeftX, currentY + 17);
    if (data.enquiryReference) {
      doc.text(ar(`مرجع الاستفسار: ${data.enquiryReference}`), colLeftX, currentY + 22);
    }
  } else {
    // Col 1 (Left): Customer Details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orangeColor);
    doc.text('CUSTOMER / APPLICANT', margin + 5, currentY + 6);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navyColor);
    doc.text(data.customerName || 'Inquirer', margin + 5, currentY + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`Phone: ${data.customerPhone || 'N/A'}`, margin + 5, currentY + 18);
    if (data.customerEmail) {
      doc.text(`Email: ${data.customerEmail}`, margin + 5, currentY + 23);
    }

    // Col 2 (Right): Quotation Info
    const col2X = margin + contentWidth * 0.55;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orangeColor);
    doc.text('QUOTATION SPECIFICATIONS', col2X, currentY + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`Issue Date: ${issueDate}`, col2X, currentY + 12);
    doc.text(`Validity: 14 Days (${validUntilDate})`, col2X, currentY + 17);
    if (data.enquiryReference) {
      doc.text(`Enquiry Ref: ${data.enquiryReference}`, col2X, currentY + 22);
    }
  }

  currentY += 32;

  // 3. Vehicle & Route Details Card
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

  if (isAr) {
    const rightX = pageWidth - margin - 5;
    doc.setFontSize(8);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...orangeColor);
    doc.text(ar('مواصفات المركبة ومسار الشحن الدولي'), rightX, currentY + 5, { align: 'right' });

    const isUUID = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    const safeOriginPort = data.originPort && !isUUID(data.originPort) ? data.originPort : 'US Loading Port';
    const safeDestPort = data.destinationPort && !isUUID(data.destinationPort) ? data.destinationPort : 'UAE Destination Port';
    const safeOriginPortAr = data.originPortAr && !isUUID(data.originPortAr) ? data.originPortAr : safeOriginPort;
    const safeDestPortAr = data.destinationPortAr && !isUUID(data.destinationPortAr) ? data.destinationPortAr : safeDestPort;

    doc.setFontSize(8);
    doc.setTextColor(...navyColor);
    doc.text(ar(`المركبة: ${data.vehicleDetails || 'سيارة ركاب (سيدان / قياسية)'}`), rightX, currentY + 11, { align: 'right' });
    const routeText = `${safeOriginPortAr} إلى ${safeDestPortAr}`;
    doc.text(ar(`المسار: ${routeText}`), rightX, currentY + 17, { align: 'right' });

    const leftX = margin + 5;
    doc.text(ar(`طريقة الشحن: ${data.shippingMethodAr || data.shippingMethod || 'حاوية بحرية مشتركة'}`), leftX, currentY + 11);
    doc.text(ar(`المدة المتوقعة: ${data.transitTime || '28 - 35 يوماً'}`), leftX, currentY + 17);
  } else {
    const isUUID = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    const safeOriginPort = data.originPort && !isUUID(data.originPort) ? data.originPort : 'US Loading Port';
    const safeDestPort = data.destinationPort && !isUUID(data.destinationPort) ? data.destinationPort : 'UAE Destination Port';

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orangeColor);
    doc.text('VEHICLE & ROUTE SPECIFICATIONS', margin + 5, currentY + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...navyColor);
    doc.text(`Vehicle: ${data.vehicleDetails || 'Sedan (Standard Passenger)'}`, margin + 5, currentY + 11);
    doc.text(`Route: ${safeOriginPort} -> ${safeDestPort}`, margin + 5, currentY + 17);

    const routeCol2X = margin + contentWidth * 0.55;
    doc.text(`Shipping Method: ${data.shippingMethod || 'Consolidated Ocean Container'}`, routeCol2X, currentY + 11);
    doc.text(`Est. Transit Time: ${data.transitTime || '28 - 35 Days'}`, routeCol2X, currentY + 17);
  }

  currentY += 26;

  // 4. Financial Breakdown Table
  const clearanceFee = data.clearanceFeeUsd ?? 150.0;
  const portHandlingFee = data.portHandlingFeeUsd ?? 200.0;
  const clearanceSubtotal = clearanceFee + portHandlingFee;
  const surcharges = data.surchargesUsd ?? 0.0;
  const hasTowing = data.towingFeeMin > 0 || data.towingFeeMax > 0;

  const oceanAndTowingSubtotalMin = data.oceanFreightUsd + (hasTowing ? data.towingFeeMin : 0);
  const oceanAndTowingSubtotalMax = data.oceanFreightUsd + (hasTowing ? data.towingFeeMax : 0);
  const uaeGovSubtotal = data.customsDutyUsd + data.importVatUsd;

  if (isAr) {
    const towingCellAr = hasTowing
      ? data.isTowingRange
        ? `$${data.towingFeeMin.toFixed(2)} - $${data.towingFeeMax.toFixed(2)} (${ar('تقديري')})`
        : `$${data.towingFeeMin.toFixed(2)}`
      : ar('غير مطلوب ($0.00)');

    const oceanAndTowingSubtotalAr = hasTowing && data.isTowingRange
      ? `$${oceanAndTowingSubtotalMin.toFixed(2)} - $${oceanAndTowingSubtotalMax.toFixed(2)}`
      : `$${oceanAndTowingSubtotalMax.toFixed(2)}`;

    const tableBodyAr: string[][] = [
      ['$ ' + (data.oceanFreightBaseUsd ?? data.oceanFreightUsd).toFixed(2), ar('1. تعرفة الشحن البحري الأساسية (من ميناء التصدير إلى ميناء الوصول)'), '1'],
    ];

    const shipAdjs = data.lineItems?.filter((i) => i.category === 'shipping_adjustment') || [];
    shipAdjs.forEach((adj) => {
      tableBodyAr.push(['$ ' + (adj.amount_usd || 0).toFixed(2), ar(`• ${adj.description || adj.reason || 'تعديل تعرفة الشحن البحري'}`), '•']);
    });

    tableBodyAr.push([towingCellAr, ar('2. النقل الداخلي وسحب المركبة (إلى ميناء الشحن الأمريكي)'), '2']);

    const towAdjs = data.lineItems?.filter((i) => i.category === 'towing_adjustment') || [];
    towAdjs.forEach((adj) => {
      tableBodyAr.push(['$ ' + (adj.amount_usd || 0).toFixed(2), ar(`• ${adj.description || adj.reason || 'تعديل سحب ونقل داخلي'}`), '•']);
    });

    tableBodyAr.push(
      [oceanAndTowingSubtotalAr, ar(hasTowing ? '3. المجموع الفرعي للشحن البحري والنقل الداخلي' : '3. المجموع الفرعي للشحن البحري'), '3'],
      ['$ ' + clearanceFee.toFixed(2), ar('• التخليص الجمركي والمعاملات في موانئ دولة الإمارات'), '4a'],
      ['$ ' + portHandlingFee.toFixed(2), ar('• رسوم مناولة الرصيف ومحطة الحاويات وإذن التسليم'), '4b']
    );

    const addSurchargesAr = data.lineItems?.filter((i) => !['base_ocean_freight', 'shipping_adjustment', 'base_inland_towing', 'towing_adjustment', 'customs_clearance_fee', 'port_handling_fee', 'customs_duty', 'import_vat'].includes(i.category)) || [];
    addSurchargesAr.forEach((surch) => {
      tableBodyAr.push(['$ ' + (surch.amount_usd || 0).toFixed(2), ar(`• ${surch.description || 'رسوم إضافية'}`), '•']);
    });

    tableBodyAr.push(
      ['$ ' + clearanceSubtotal.toFixed(2), ar('4. المجموع الفرعي لرسوم التخليص والموانئ في الوجهة'), '4'],
      ['$ ' + data.customsDutyUsd.toFixed(2), ar('• الرسوم الجمركية النظامية (5% من القيمة التقديرية CIF)'), '5a'],
      ['$ ' + data.importVatUsd.toFixed(2), ar('• ضريبة القيمة المضافة للاستيراد (5% من وعاء الضريبة CIF + الرسوم)'), '5b'],
      ['$ ' + uaeGovSubtotal.toFixed(2), ar('5. المجموع الفرعي للرسوم والضرائب الحكومية بدولة الإمارات'), '5']
    );

    if (surcharges > 0 && addSurchargesAr.length === 0) {
      tableBodyAr.push(['$ ' + surcharges.toFixed(2), ar('• رسوم حالة المركبة وتعديل الوقود الإضافية'), '+']);
    }

    if (data.declaredValueUsd && data.declaredValueUsd > 0) {
      tableBodyAr.push([
        '$ ' + data.declaredValueUsd.toFixed(2),
        ar('7. القيمة المصرح بها لشراء المركبة (مرجع لاحتساب CIF والرسوم فقط؛ غير مضافة لإجمالي الشحن)'),
        '7'
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [[ar('المبلغ (دولار)'), ar('بيان الرسوم والتقييم الجمركي النظامي المعتمد'), ar('#')]],
      body: tableBodyAr,
      theme: 'grid',
      styles: {
        font: 'Amiri',
        fontSize: 8,
      },
      headStyles: {
        fillColor: navyColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        font: 'Amiri',
      },
      columnStyles: {
        0: { cellWidth: 55, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 10, halign: 'center' },
      },
    });
  } else {
    const towingCell = hasTowing
      ? data.isTowingRange
        ? `$${data.towingFeeMin.toFixed(2)} - $${data.towingFeeMax.toFixed(2)} (Estimated Range)`
        : `$${data.towingFeeMin.toFixed(2)} (Fixed Tariff)`
      : 'Inland Towing: Not requested ($0.00)';

    const oceanAndTowingSubtotal = hasTowing && data.isTowingRange
      ? `$${oceanAndTowingSubtotalMin.toFixed(2)} - $${oceanAndTowingSubtotalMax.toFixed(2)}`
      : `$${oceanAndTowingSubtotalMax.toFixed(2)}`;

    const tableBody: string[][] = [
      ['1', '1. Ocean Freight Base Tariff (Origin Port to UAE Port)', `$${(data.oceanFreightBaseUsd ?? data.oceanFreightUsd).toFixed(2)}`],
    ];

    const shipAdjsEn = data.lineItems?.filter((i) => i.category === 'shipping_adjustment') || [];
    shipAdjsEn.forEach((adj) => {
      tableBody.push(['•', `  • ${adj.description || adj.reason || 'Ocean Freight Adjustment'}`, `$${(adj.amount_usd || 0).toFixed(2)}`]);
    });

    tableBody.push(['2', '2. Inland Towing to Origin Departure Port', towingCell]);

    const towAdjsEn = data.lineItems?.filter((i) => i.category === 'towing_adjustment') || [];
    towAdjsEn.forEach((adj) => {
      tableBody.push(['•', `  • ${adj.description || adj.reason || 'Towing Winching / Condition Adjustment'}`, `$${(adj.amount_usd || 0).toFixed(2)}`]);
    });

    tableBody.push(
      ['3', hasTowing ? '3. Ocean Freight & Inland Towing Subtotal' : '3. Ocean Freight Subtotal', oceanAndTowingSubtotal],
      ['4a', '  • Customs Clearance & Port Documentation', `$${clearanceFee.toFixed(2)}`],
      ['4b', '  • Port & Terminal Handling Charges', `$${portHandlingFee.toFixed(2)}`]
    );

    const addSurchargesEn = data.lineItems?.filter((i) => !['base_ocean_freight', 'shipping_adjustment', 'base_inland_towing', 'towing_adjustment', 'customs_clearance_fee', 'port_handling_fee', 'customs_duty', 'import_vat'].includes(i.category)) || [];
    addSurchargesEn.forEach((surch) => {
      tableBody.push(['•', `  • ${surch.description || 'Additional Surcharge'}`, `$${(surch.amount_usd || 0).toFixed(2)}`]);
    });

    tableBody.push(
      ['4', '4. Destination Clearance Subtotal', `$${clearanceSubtotal.toFixed(2)}`],
      ['5a', '  • Statutory UAE Customs Duty (5% of CIF Valuation)', `$${data.customsDutyUsd.toFixed(2)}`],
      ['5b', '  • Statutory UAE Import VAT (5% of [CIF + Duty])', `$${data.importVatUsd.toFixed(2)}`],
      ['5', '5. UAE Government Charges Subtotal', `$${uaeGovSubtotal.toFixed(2)}`]
    );

    if (surcharges > 0 && addSurchargesEn.length === 0) {
      tableBody.push(['+', 'Vehicle Condition & Specialized Surcharges', `$${surcharges.toFixed(2)}`]);
    }

    if (data.declaredValueUsd && data.declaredValueUsd > 0) {
      tableBody.push([
        '7',
        '7. Declared Vehicle Purchase Price (For CIF valuation/duty only; excluded from shipping total)',
        `$${data.declaredValueUsd.toFixed(2)}`
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Charge Description & Operational Valuation', 'Amount (USD)']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: navyColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 55, halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 4;

  // 5. Grand Totals Summary Box
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

  const grandTotalUsd = data.isTowingRange
    ? `$${Math.round(data.totalUsdMin).toLocaleString()} - $${Math.round(data.totalUsdMax).toLocaleString()} USD`
    : `$${Math.round(data.totalUsdMax).toLocaleString()} USD`;

  const grandTotalAed = data.isTowingRange
    ? `${Math.round(data.totalAedMin).toLocaleString()} - ${Math.round(data.totalAedMax).toLocaleString()} AED`
    : `${Math.round(data.totalAedMax).toLocaleString()} AED`;

  if (isAr) {
    doc.setFontSize(8);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...grayColor);
    doc.text(ar('إجمالي التكاليف التقديرية (مستحقة السداد في موانئ دبي / الشارقة)'), pageWidth - margin - 5, currentY + 6, { align: 'right' });

    doc.setFontSize(13);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...orangeColor);
    doc.text(grandTotalUsd, margin + 5, currentY + 15);

    doc.setFontSize(10);
    doc.setTextColor(...navyColor);
    doc.text(ar(`المعادل: ${grandTotalAed}`), pageWidth - margin - 5, currentY + 13, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setTextColor(...grayColor);
    doc.text(ar(`سعر الصرف المعتمد: 1 دولار = ${data.exchangeRate || 3.6725} درهم`), pageWidth - margin - 5, currentY + 19, { align: 'right' });
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text('TOTAL ESTIMATED CHARGES (PAYABLE IN DUBAI / SHARJAH)', margin + 5, currentY + 6);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orangeColor);
    doc.text(grandTotalUsd, margin + 5, currentY + 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navyColor);
    doc.text(grandTotalAed, pageWidth - margin - 5, currentY + 13, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`Locked Operational Rate: 1 USD = ${data.exchangeRate || 3.6725} AED`, pageWidth - margin - 5, currentY + 19, { align: 'right' });
  }

  currentY += 28;

  // Disclaimer text
  doc.setFontSize(7);
  doc.setFont(fontName, isAr ? 'normal' : 'italic');
  doc.setTextColor(...grayColor);

  const rawDisclaimer = isAr
    ? data.disclaimer || 'تُحسب الرسوم الجمركية (5%) وضريبة القيمة المضافة (5%) استناداً إلى قيمة CIF التقديرية وفقاً لقوانين الجمارك والضرائب في دولة الإمارات. تظل رسوم المناولة والتخليص منفصلة. الأسعار صالحة لمدة 14 يوماً تقويمياً.'
    : data.disclaimer || 'Customs duty (5%) and import VAT (5%) are statutory government charges calculated on CIF valuation. Terminal handling and clearance remain separate. Rates are valid for 14 calendar days.';

  if (isAr) {
    const rawLines: string[] = doc.splitTextToSize(rawDisclaimer, contentWidth);
    rawLines.forEach((line: string) => {
      const shaped = doc.processArabic(line);
      doc.text(shaped, pageWidth - margin, currentY, { align: 'right' });
      currentY += 3.5;
    });
    currentY += 4;
  } else {
    const splitDisclaimer: string[] = doc.splitTextToSize(rawDisclaimer, contentWidth);
    doc.text(splitDisclaimer, margin, currentY);
    currentY += splitDisclaimer.length * 3.5 + 4;
  }

  // 6. Rules & Regulations Section
  if (data.rules && data.rules.length > 0) {
    if (currentY + 30 > pageHeight - 25) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFontSize(9);
    doc.setFont(fontName, isAr ? 'normal' : 'bold');
    doc.setTextColor(...navyColor);

    if (isAr) {
      doc.text(ar('الشروط والأحكام واللوائح الرسمية'), pageWidth - margin, currentY, { align: 'right' });
    } else {
      doc.text('RULES & REGULATIONS / TERMS OF SERVICE', margin, currentY);
    }
    currentY += 5;

    for (const rule of data.rules) {
      if (currentY + 15 > pageHeight - 25) {
        doc.addPage();
        currentY = margin;
      }

      // Helper to strip HTML tags for plain text PDF rendering
      const cleanHtml = (text: string): string => {
        return text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      };

      if (isAr) {
        const ruleTitleAr = cleanHtml(rule.title_ar || rule.title || rule.title_en || 'شرط');
        const ruleBodyAr = cleanHtml(rule.content_ar || rule.content || rule.content_en || '');

        doc.setFontSize(8);
        doc.setFont(fontName, 'normal');
        doc.setTextColor(...orangeColor);
        doc.text(ar(`* ${ruleTitleAr}`), pageWidth - margin - 2, currentY, { align: 'right' });
        currentY += 4;

        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const splitContentAr: string[] = doc.splitTextToSize(ruleBodyAr, contentWidth - 4);
        splitContentAr.forEach((line: string) => {
          doc.text(doc.processArabic(line), pageWidth - margin - 4, currentY, { align: 'right' });
          currentY += 3.2;
        });
        currentY += 3;
      } else {
        const ruleTitle = cleanHtml(rule.title || rule.title_en || 'Rule');
        const ruleBody = cleanHtml(rule.content || rule.content_en || '');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...orangeColor);
        doc.text(`* ${ruleTitle}`, margin + 2, currentY);
        currentY += 4;

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const splitContent: string[] = doc.splitTextToSize(ruleBody, contentWidth - 4);
        doc.text(splitContent, margin + 4, currentY);
        currentY += splitContent.length * 3.2 + 3;
      }
    }
  }

  // 7. Multi-page Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

    doc.setFontSize(6.5);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(148, 163, 184);

    if (isAr) {
      const contactParts = [
        branding.companyName || 'فاخر علم لشحن السيارات المستعملة',
        branding.headquartersAddress || 'المنطقة الصناعية 4، الشارقة، الإمارات',
        branding.supportPhone ? `الهاتف: ${branding.supportPhone}` : '',
        branding.whatsappNumber ? `واتساب: ${branding.whatsappNumber}` : '',
        branding.supportEmail ? `البريد: ${branding.supportEmail}` : '',
      ].filter(Boolean);

      doc.text(ar(contactParts.join(' | ')), pageWidth - margin, pageHeight - 11, { align: 'right' });
      doc.text(`Ref: ${data.referenceNumber} | صفحة ${i} من ${totalPages}`, margin, pageHeight - 11);
    } else {
      const contactParts = [
        branding.companyName || 'Fakher Alam Used Cars Shipping LLC',
        branding.headquartersAddress || 'Industrial Area 4, Sharjah, UAE',
        branding.supportPhone ? `Tel: ${branding.supportPhone}` : '',
        branding.whatsappNumber ? `WhatsApp: ${branding.whatsappNumber}` : '',
        branding.supportEmail ? `Email: ${branding.supportEmail}` : '',
      ].filter(Boolean);

      doc.text(contactParts.join(' | '), margin, pageHeight - 11);
      doc.text(
        `Quotation Ref: ${data.referenceNumber}  |  Page ${i} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 11,
        { align: 'right' }
      );
    }
  }

  // Save the PDF
  const filename = `Fakher-Alam-Quotation-${data.referenceNumber || 'QT'}.pdf`;
  doc.save(filename);
}

