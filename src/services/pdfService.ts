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
  towingFeeBaseMin?: number;
  towingFeeBaseMax?: number;
  isTowingRange: boolean;
  clearanceFeeUsd?: number;
  portHandlingFeeUsd?: number;
  surchargesUsd?: number;
  includeInlandTowing?: boolean;
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

/**
 * Safely converts an image URL into a base64 Data URL for jsPDF embedding
 */
async function loadLogoDataUrl(url?: string): Promise<{ dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' } | null> {
  if (!url || typeof window === 'undefined') return null;
  if (url.startsWith('data:image/')) {
    const isPng = url.includes('image/png');
    return { dataUrl: url, width: 200, height: 60, format: isPng ? 'PNG' : 'JPEG' };
  }
  try {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 200;
    canvas.height = img.naturalHeight || img.height || 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    return { dataUrl, width: canvas.width, height: canvas.height, format: 'PNG' };
  } catch (err) {
    console.warn('[PDF] Failed to load logo from URL, using clean text header fallback:', err);
    return null;
  }
}

/**
 * Parses HTML or newline content into structured blocks (headings, bullets, paragraphs)
 * to avoid flattening Terms & Regulations into one unreadable paragraph.
 */
function parseHtmlToStructuredBlocks(html: string): { type: 'heading' | 'bullet' | 'paragraph'; text: string }[] {
  if (!html) return [];

  let formatted = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n:::BULLET:::$1\n');
  formatted = formatted.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n:::HEADING:::$1\n');
  formatted = formatted.replace(/<\/p>/gi, '\n\n');
  formatted = formatted.replace(/<br\s*[\/]?>/gi, '\n');
  formatted = formatted.replace(/<\/div>/gi, '\n');
  formatted = formatted.replace(/<[^>]*>/g, '');
  formatted = formatted
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const lines = formatted.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const blocks: { type: 'heading' | 'bullet' | 'paragraph'; text: string }[] = [];

  for (const line of lines) {
    if (line.startsWith(':::HEADING:::')) {
      blocks.push({ type: 'heading', text: line.replace(':::HEADING:::', '').trim() });
    } else if (line.startsWith(':::BULLET:::')) {
      blocks.push({ type: 'bullet', text: line.replace(':::BULLET:::', '').trim() });
    } else if (line.startsWith('•') || line.startsWith('-')) {
      blocks.push({ type: 'bullet', text: line.replace(/^[•\-]\s*/, '').trim() });
    } else {
      blocks.push({ type: 'paragraph', text: line });
    }
  }

  return blocks;
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

  // Authoritative Theme Colors
  const navyColor = [11, 25, 44] as [number, number, number]; // #0B192C
  const orangeColor = [255, 107, 0] as [number, number, number]; // #FF6B00
  const grayColor = [100, 116, 139] as [number, number, number]; // Slate-500
  const lightBg = [248, 250, 252] as [number, number, number]; // Slate-50

  const fontName = isAr ? 'Amiri' : 'helvetica';

  const ar = (text: string | null | undefined): string => {
    if (!text) return '';
    return isAr ? doc.processArabic(text) : text;
  };

  // 1. Company Branding Header (Dark Header with Dynamic Logo or Clean Text Fallback)
  doc.setFillColor(...navyColor);
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  // Load appropriate logo for dark background from admin settings (darkLogoUrl or logoUrl)
  const logoUrl = branding.darkLogoUrl || branding.logoUrl;
  const logoData = await loadLogoDataUrl(logoUrl);

  if (isAr) {
    if (logoData) {
      const maxW = 65;
      const maxH = 16;
      const ratio = Math.min(maxW / logoData.width, maxH / logoData.height);
      const logoW = Math.max(10, Math.round(logoData.width * ratio));
      const logoH = Math.max(6, Math.round(logoData.height * ratio));
      try {
        doc.addImage(logoData.dataUrl, logoData.format, pageWidth - margin - 6 - logoW, currentY + (24 - logoH) / 2, logoW, logoH, undefined, 'FAST');
      } catch (e) {
        console.warn('[PDF] addImage failed:', e);
      }
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontName, 'normal');
      doc.setFontSize(14);
      const companyTitle = ar(branding.companyName || 'فاخر علم لشحن السيارات المستعملة ذ.م.م');
      doc.text(companyTitle, pageWidth - margin - 6, currentY + 10, { align: 'right' });

      doc.setFontSize(8);
      doc.setTextColor(255, 179, 128);
      const tagline = ar(branding.tagline || 'خدمات الشحن واللوجستيات المتميزة من مزادات أمريكا إلى موانئ الإمارات');
      doc.text(tagline, pageWidth - margin - 6, currentY + 17, { align: 'right' });
    }

    // Top-Left Ref Badge (Arabic layout)
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(ar('عرض أسعار رسمي'), margin + 6, currentY + 9);
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Ref: ${data.referenceNumber}`, margin + 6, currentY + 16);
  } else {
    if (logoData) {
      const maxW = 65;
      const maxH = 16;
      const ratio = Math.min(maxW / logoData.width, maxH / logoData.height);
      const logoW = Math.max(10, Math.round(logoData.width * ratio));
      const logoH = Math.max(6, Math.round(logoData.height * ratio));
      try {
        doc.addImage(logoData.dataUrl, logoData.format, margin + 6, currentY + (24 - logoH) / 2, logoW, logoH, undefined, 'FAST');
      } catch (e) {
        console.warn('[PDF] addImage failed:', e);
      }
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      const companyTitle = (branding.companyName || 'FAKHER ALAM USED CARS SHIPPING LLC').toUpperCase();
      doc.text(companyTitle, margin + 6, currentY + 10);

      doc.setFontSize(8);
      doc.setTextColor(255, 179, 128);
      const tagline = (branding.tagline || 'PREMIER AUTO LOGISTICS FROM US AUCTIONS TO UAE PORTS').toUpperCase();
      doc.text(tagline, margin + 6, currentY + 17);
    }

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
  doc.rect(margin, currentY, contentWidth, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, contentWidth, 24, 'S');

  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont(fontName, 'normal');

  if (isAr) {
    doc.text(ar('العميل المستفيد:'), pageWidth - margin - 6, currentY + 6, { align: 'right' });
    doc.text(ar('رقم الهاتف:'), pageWidth - margin - 6, currentY + 12, { align: 'right' });
    if (data.customerEmail) {
      doc.text(ar('البريد الإلكتروني:'), pageWidth - margin - 6, currentY + 18, { align: 'right' });
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont(fontName, 'normal');
    doc.text(ar(data.customerName), pageWidth - margin - 35, currentY + 6, { align: 'right' });
    doc.text(data.customerPhone, pageWidth - margin - 35, currentY + 12, { align: 'right' });
    if (data.customerEmail) {
      doc.text(data.customerEmail, pageWidth - margin - 35, currentY + 18, { align: 'right' });
    }

    doc.setTextColor(...grayColor);
    doc.text(ar('تاريخ الإصدار:'), margin + 45, currentY + 6, { align: 'right' });
    doc.text(ar('صالح لغاية:'), margin + 45, currentY + 12, { align: 'right' });
    doc.text(ar('حالة العرض:'), margin + 45, currentY + 18, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.text(issueDate, margin + 6, currentY + 6);
    doc.text(validUntilDate, margin + 6, currentY + 12);
    doc.setTextColor(...orangeColor);
    doc.text(ar('معتمد رسمياً'), margin + 6, currentY + 18);
  } else {
    doc.text('Client Name:', margin + 6, currentY + 6);
    doc.text('Phone / WhatsApp:', margin + 6, currentY + 12);
    if (data.customerEmail) {
      doc.text('Email Address:', margin + 6, currentY + 18);
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(data.customerName, margin + 35, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(data.customerPhone, margin + 35, currentY + 12);
    if (data.customerEmail) {
      doc.text(data.customerEmail, margin + 35, currentY + 18);
    }

    doc.setTextColor(...grayColor);
    const col2X = margin + contentWidth * 0.6;
    doc.text('Issue Date:', col2X, currentY + 6);
    doc.text('Valid Until:', col2X, currentY + 12);
    doc.text('Quotation Status:', col2X, currentY + 18);

    doc.setTextColor(15, 23, 42);
    doc.text(issueDate, col2X + 25, currentY + 6);
    doc.text(validUntilDate, col2X + 25, currentY + 12);
    doc.setTextColor(...orangeColor);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL / CONFIRMED', col2X + 25, currentY + 18);
  }

  currentY += 28;

  // 3. Operational Logistics Summary Box
  doc.setFillColor(...lightBg);
  doc.rect(margin, currentY, contentWidth, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, contentWidth, 22, 'S');

  doc.setFontSize(8);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(15, 23, 42);

  if (isAr) {
    const originPortAr = data.originPortAr || data.originPort;
    const destPortAr = data.destinationPortAr || data.destinationPort;
    doc.text(ar(`مواصفات المركبة: ${data.vehicleDetails}`), pageWidth - margin - 6, currentY + 6, { align: 'right' });
    doc.text(ar(`مسار الشحن: من ${originPortAr} إلى ${destPortAr}`), pageWidth - margin - 6, currentY + 12, { align: 'right' });
    doc.text(ar(`نظام الشحن: ${data.shippingMethodAr || data.shippingMethod}`), pageWidth - margin - 6, currentY + 17, { align: 'right' });
  } else {
    doc.text(`Vehicle Description: ${data.vehicleDetails}`, margin + 6, currentY + 6);
    doc.text(`Maritime Route: ${data.originPort} to ${data.destinationPort}`, margin + 6, currentY + 12);
    doc.text(`Shipping Method: ${data.shippingMethod}`, margin + 6, currentY + 17);
    const routeCol2X = margin + contentWidth * 0.6;
    doc.text(`Est. Transit Time: ${data.transitTime || '28 - 35 Days'}`, routeCol2X, currentY + 17);
  }

  currentY += 26;

  // 4. Financial Breakdown Table (Clean 2-Column: Description | Amount USD)
  const clearanceFee = data.clearanceFeeUsd ?? 150.0;
  const portHandlingFee = data.portHandlingFeeUsd ?? 200.0;
  const clearanceSubtotal = clearanceFee + portHandlingFee;
  const uaeGovSubtotal = data.customsDutyUsd + data.importVatUsd;

  const hasTowingRequested = data.includeInlandTowing !== false;
  const towAdjs = data.lineItems?.filter((i) => i.category === 'towing_adjustment' && (i.amount_usd || 0) > 0) || [];
  const shipAdjs = data.lineItems?.filter((i) => i.category === 'shipping_adjustment' && (i.amount_usd || 0) > 0) || [];
  const towAdjSum = towAdjs.reduce((sum, item) => sum + (item.amount_usd || 0), 0);
  const shipAdjSum = shipAdjs.reduce((sum, item) => sum + (item.amount_usd || 0), 0);

  // Authoritative Base Towing (guarantees Base + Surcharges = Subtotal exactly matching Results page)
  const towingBaseMin = data.towingFeeBaseMin !== undefined
    ? data.towingFeeBaseMin
    : Math.max(0, data.towingFeeMin - towAdjSum);
  const towingBaseMax = data.towingFeeBaseMax !== undefined
    ? data.towingFeeBaseMax
    : Math.max(0, data.towingFeeMax - towAdjSum);

  const towingCell = hasTowingRequested
    ? data.isTowingRange
      ? `$${towingBaseMin.toFixed(2)} - $${towingBaseMax.toFixed(2)} (Estimated Range)`
      : `$${towingBaseMin.toFixed(2)}`
    : 'Not requested ($0.00)';

  const towingSubtotal = hasTowingRequested
    ? data.isTowingRange
      ? `$${data.towingFeeMin.toFixed(2)} - $${data.towingFeeMax.toFixed(2)}`
      : `$${data.towingFeeMin.toFixed(2)}`
    : '$0.00';

  // Authoritative Base Ocean Freight
  const oceanBase = data.oceanFreightBaseUsd !== undefined
    ? data.oceanFreightBaseUsd
    : Math.max(0, data.oceanFreightUsd - shipAdjSum);
  const oceanSubtotal = `$${data.oceanFreightUsd.toFixed(2)}`;

  // Transport Subtotal = Inland Towing Subtotal + Ocean Freight Subtotal
  const transportSubtotalMin = data.oceanFreightUsd + (hasTowingRequested ? data.towingFeeMin : 0);
  const transportSubtotalMax = data.oceanFreightUsd + (hasTowingRequested ? data.towingFeeMax : 0);
  const transportSubtotal = hasTowingRequested && data.isTowingRange
    ? `$${transportSubtotalMin.toFixed(2)} - $${transportSubtotalMax.toFixed(2)}`
    : `$${transportSubtotalMax.toFixed(2)}`;

  if (isAr) {
    const towingCellAr = hasTowingRequested
      ? data.isTowingRange
        ? `$${towingBaseMin.toFixed(2)} - $${towingBaseMax.toFixed(2)} (${ar('تقديري')})`
        : `$${towingBaseMin.toFixed(2)}`
      : ar('غير مطلوب ($0.00)');

    const tableBodyAr: string[][] = [
      // 1. Inland Towing
      [ar('1. النقل البري الداخلي والسحب'), ''],
      [ar(`تعرفة السحب الأساسية (إلى ميناء ${data.originPortAr || data.originPort})`), towingCellAr],
    ];

    towAdjs.forEach((adj) => {
      const desc = adj.description_ar || adj.description || 'رسوم سحب إضافية';
      tableBodyAr.push([ar(`  • ${desc}`), `$${(adj.amount_usd || 0).toFixed(2)}`]);
    });

    tableBodyAr.push([ar('إجمالي النقل الداخلي الفرعي'), towingSubtotal]);

    // 2. Ocean Freight
    tableBodyAr.push([ar('2. الشحن البحري الدولي'), '']);
    tableBodyAr.push([ar(`تعرفة الشحن البحري الأساسية (${data.originPortAr || data.originPort} إلى ${data.destinationPortAr || data.destinationPort})`), `$${oceanBase.toFixed(2)}`]);

    shipAdjs.forEach((adj) => {
      const desc = adj.description_ar || adj.description || 'رسوم شحن بحري إضافية';
      tableBodyAr.push([ar(`  • ${desc}`), `$${(adj.amount_usd || 0).toFixed(2)}`]);
    });

    tableBodyAr.push([ar('إجمالي الشحن البحري الفرعي'), oceanSubtotal]);

    // 3. Transport Subtotal
    tableBodyAr.push([ar('3. إجمالي النقل الفرعي (النقل الداخلي + الشحن البحري)'), transportSubtotal]);

    // 4. Destination Clearance
    tableBodyAr.push([ar('4. رسوم التخليص والموانئ في الوجهة'), '']);
    tableBodyAr.push([ar('التخليص الجمركي والمعاملات في موانئ دولة الإمارات'), `$${clearanceFee.toFixed(2)}`]);
    tableBodyAr.push([ar('رسوم مناولة الرصيف ومحطة الحاويات وإذن التسليم'), `$${portHandlingFee.toFixed(2)}`]);
    tableBodyAr.push([ar('إجمالي رسوم التخليص والموانئ الفرعي'), `$${clearanceSubtotal.toFixed(2)}`]);

    // 5. UAE Government Charges
    tableBodyAr.push([ar('5. الرسوم والضرائب الحكومية بدولة الإمارات'), '']);
    tableBodyAr.push([ar('الرسوم الجمركية النظامية (5% من القيمة التقديرية CIF)'), `$${data.customsDutyUsd.toFixed(2)}`]);
    tableBodyAr.push([ar('ضريبة القيمة المضافة للاستيراد (5% من وعاء الضريبة CIF + الرسوم)'), `$${data.importVatUsd.toFixed(2)}`]);
    tableBodyAr.push([ar('إجمالي الرسوم والضرائب الحكومية الفرعي'), `$${uaeGovSubtotal.toFixed(2)}`]);

    // Declared Value Info Note
    if (data.declaredValueUsd && data.declaredValueUsd > 0) {
      tableBodyAr.push([
        ar('القيمة المصرح بها للمركبة (تُستخدم لاحتساب الجمارك والضريبة فقط؛ غير مضافة للإجمالي)'),
        `$${data.declaredValueUsd.toFixed(2)}`
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [[ar('بيان الرسوم والتقييم الجمركي النظامي المعتمد'), ar('المبلغ (دولار)')]],
      body: tableBodyAr,
      theme: 'grid',
      headStyles: {
        fillColor: navyColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        font: 'Amiri',
      },
      bodyStyles: {
        font: 'Amiri',
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'right' },
        1: { cellWidth: 55, halign: 'left', fontStyle: 'bold' },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body') {
          const rowData = hookData.row.raw as string[];
          const desc = rowData?.[0] || '';
          if (/^[1-5]\.\s/.test(desc)) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [241, 245, 249];
            if (desc.includes('إجمالي النقل الفرعي')) {
              hookData.cell.styles.textColor = navyColor;
              hookData.cell.styles.fontSize = 8.5;
            } else {
              hookData.cell.styles.textColor = orangeColor;
              hookData.cell.styles.fontSize = 8;
            }
          } else if (desc.includes('الفرعي')) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [248, 250, 252];
          } else if (desc.includes('القيمة المصرح بها للمركبة')) {
            hookData.cell.styles.textColor = grayColor;
            hookData.cell.styles.fontStyle = 'italic';
          }
        }
      },
    });
  } else {
    // English Clean Two-Column Table
    const tableBody: string[][] = [
      // 1. Inland Towing
      ['1. INLAND TOWING', ''],
      [`Base Inland Towing (${data.originPort} loading port)`, towingCell],
    ];

    towAdjs.forEach((adj) => {
      tableBody.push([`  • ${adj.description || 'Towing Surcharge'}`, `$${(adj.amount_usd || 0).toFixed(2)}`]);
    });

    tableBody.push(['Inland Towing Subtotal', towingSubtotal]);

    // 2. Ocean Freight
    tableBody.push(['2. OCEAN FREIGHT', '']);
    tableBody.push([`Ocean Freight Base Tariff (${data.originPort} to ${data.destinationPort})`, `$${oceanBase.toFixed(2)}`]);

    shipAdjs.forEach((adj) => {
      tableBody.push([`  • ${adj.description || 'Ocean Freight Adjustment'}`, `$${(adj.amount_usd || 0).toFixed(2)}`]);
    });

    tableBody.push(['Ocean Freight Subtotal', oceanSubtotal]);

    // 3. Transport Subtotal
    tableBody.push(['3. TRANSPORT SUBTOTAL (Inland Towing + Ocean Freight)', transportSubtotal]);

    // 4. Destination Clearance
    tableBody.push(['4. DESTINATION CLEARANCE', '']);
    tableBody.push(['Customs Clearance & Documentation', `$${clearanceFee.toFixed(2)}`]);
    tableBody.push(['Port & Terminal Handling Charges', `$${portHandlingFee.toFixed(2)}`]);
    tableBody.push(['Destination Clearance Subtotal', `$${clearanceSubtotal.toFixed(2)}`]);

    // 5. UAE Government Statutory Charges
    tableBody.push(['5. UAE GOVERNMENT STATUTORY CHARGES', '']);
    tableBody.push(['UAE Customs Duty (5% of CIF)', `$${data.customsDutyUsd.toFixed(2)}`]);
    tableBody.push(['UAE Import VAT (5% of CIF + Duty)', `$${data.importVatUsd.toFixed(2)}`]);
    tableBody.push(['UAE Government Charges Subtotal', `$${uaeGovSubtotal.toFixed(2)}`]);

    // Declared Vehicle Purchase Price Note
    if (data.declaredValueUsd && data.declaredValueUsd > 0) {
      tableBody.push([
        'Declared Vehicle Purchase Price (Valuation basis for CIF/duty/VAT only; not in total)',
        `$${data.declaredValueUsd.toFixed(2)}`
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Description', 'Amount (USD)']],
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
        0: { cellWidth: 'auto' },
        1: { cellWidth: 55, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body') {
          const rowData = hookData.row.raw as string[];
          const desc = rowData?.[0] || '';
          if (/^[1-5]\.\s/.test(desc)) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [241, 245, 249]; // slate-100
            if (desc.includes('TRANSPORT SUBTOTAL')) {
              hookData.cell.styles.textColor = navyColor;
              hookData.cell.styles.fontSize = 8.5;
            } else {
              hookData.cell.styles.textColor = orangeColor;
              hookData.cell.styles.fontSize = 8;
            }
          } else if (desc.includes('Subtotal')) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [248, 250, 252]; // slate-50
          } else if (desc.includes('Declared Vehicle Purchase Price')) {
            hookData.cell.styles.textColor = grayColor;
            hookData.cell.styles.fontStyle = 'italic';
          }
        }
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
    doc.setFontSize(8.5);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...navyColor);
    doc.text(ar('إجمالي الشحن والتخليص والرسوم الجمركية التقديري:'), pageWidth - margin - 5, currentY + 7, { align: 'right' });

    doc.setFontSize(13);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...orangeColor);
    doc.text(grandTotalUsd, pageWidth - margin - 5, currentY + 14, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(...navyColor);
    doc.text(grandTotalAed, margin + 5, currentY + 14);

    doc.setFontSize(7);
    doc.setTextColor(...grayColor);
    doc.text(ar(`سعر الصرف المعتمد: 1 دولار = ${data.exchangeRate || 3.6725} درهم إماراتي`), margin + 5, currentY + 20);
  } else {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navyColor);
    doc.text('TOTAL ESTIMATED SHIPPING & CLEARANCE:', margin + 5, currentY + 7);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orangeColor);
    doc.text(grandTotalUsd, margin + 5, currentY + 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navyColor);
    doc.text(grandTotalAed, pageWidth - margin - 5, currentY + 13, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`Locked Operational Rate: 1 USD = ${data.exchangeRate || 3.6725} AED`, pageWidth - margin - 5, currentY + 19, { align: 'right' });
  }

  currentY += 28;

  // Authoritative Disclaimer text
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

  // 6. Rules & Regulations / Terms of Service (Structured rendering preserving paragraphs & lists)
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

    for (let i = 0; i < data.rules.length; i++) {
      const rule = data.rules[i];
      if (currentY + 18 > pageHeight - 25) {
        doc.addPage();
        currentY = margin;
      }

      const ruleTitle = (isAr ? rule.title_ar : null) || rule.title || rule.title_en || `Rule ${i + 1}`;
      const rawContent = (isAr ? rule.content_ar : null) || rule.content || rule.content_en || '';
      const blocks = parseHtmlToStructuredBlocks(rawContent);

      // Section header: "1. Rule Title"
      doc.setFontSize(8);
      doc.setFont(fontName, isAr ? 'normal' : 'bold');
      doc.setTextColor(...orangeColor);

      if (isAr) {
        doc.text(ar(`${i + 1}. ${ruleTitle}`), pageWidth - margin - 2, currentY, { align: 'right' });
      } else {
        doc.text(`${i + 1}. ${ruleTitle}`, margin + 2, currentY);
      }
      currentY += 4;

      // Render each structured block without merging
      for (const block of blocks) {
        if (currentY + 10 > pageHeight - 20) {
          doc.addPage();
          currentY = margin;
        }

        if (block.type === 'heading') {
          doc.setFontSize(7.5);
          doc.setFont(fontName, isAr ? 'normal' : 'bold');
          doc.setTextColor(30, 41, 59);
          if (isAr) {
            doc.text(ar(block.text), pageWidth - margin - 4, currentY, { align: 'right' });
          } else {
            doc.text(block.text, margin + 4, currentY);
          }
          currentY += 3.5;
        } else if (block.type === 'bullet') {
          doc.setFontSize(7);
          doc.setFont(fontName, 'normal');
          doc.setTextColor(51, 65, 85);
          const bulletLine = `• ${block.text}`;
          const splitBullet = doc.splitTextToSize(ar(bulletLine), contentWidth - 8);
          if (isAr) {
            splitBullet.forEach((l: string) => {
              doc.text(doc.processArabic(l), pageWidth - margin - 6, currentY, { align: 'right' });
              currentY += 3.2;
            });
          } else {
            doc.text(splitBullet, margin + 6, currentY);
            currentY += splitBullet.length * 3.2;
          }
          currentY += 1;
        } else {
          doc.setFontSize(7);
          doc.setFont(fontName, 'normal');
          doc.setTextColor(71, 85, 105);
          const splitPara = doc.splitTextToSize(ar(block.text), contentWidth - 6);
          if (isAr) {
            splitPara.forEach((l: string) => {
              doc.text(doc.processArabic(l), pageWidth - margin - 4, currentY, { align: 'right' });
              currentY += 3.2;
            });
          } else {
            doc.text(splitPara, margin + 4, currentY);
            currentY += splitPara.length * 3.2;
          }
          currentY += 2;
        }
      }
      currentY += 2.5;
    }
  }

  // 7. Multi-page Professional Footers
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
        branding.supportPhone ? `${ar('هاتف:')} ${branding.supportPhone}` : null,
        branding.supportEmail ? `${ar('بريد:')} ${branding.supportEmail}` : null,
        branding.headquartersAddressAr ? ar(branding.headquartersAddressAr) : null,
      ].filter(Boolean);

      if (contactParts.length > 0) {
        doc.text(contactParts.join(' | '), pageWidth - margin, pageHeight - 11, { align: 'right' });
      }

      doc.text(ar('وثيقة رسمية صادرة آلياً من نظام تسعير فاخر علم للشحن'), pageWidth - margin, pageHeight - 7, { align: 'right' });
      doc.text(ar(`صفحة ${i} من ${totalPages}`), margin, pageHeight - 7);
    } else {
      const contactParts = [
        branding.supportPhone ? `Tel: ${branding.supportPhone}` : null,
        branding.supportEmail ? `Email: ${branding.supportEmail}` : null,
        branding.headquartersAddress || 'Sharjah, UAE',
      ].filter(Boolean);

      if (contactParts.length > 0) {
        doc.text(contactParts.join(' | '), margin, pageHeight - 11);
      }

      doc.text('Computer-generated authoritative quotation. Subject to carrier tariff confirmation.', margin, pageHeight - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }
  }

  // Output filename
  const cleanRef = (data.referenceNumber || 'quote').replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `Fakher_Alam_Quotation_${cleanRef}.pdf`;
  doc.save(filename);
}
