import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BrandingSettings } from './adminService';
import { QuotationRuleItem } from '../types/calculator';

export interface PdfQuotationData {
  referenceNumber: string;
  enquiryReference?: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleDetails: string;
  originPort: string;
  destinationPort: string;
  shippingMethod: string;
  transitTime?: string;
  declaredValueUsd?: number;
  oceanFreightUsd: number;
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

  // 1. Company Branding Header
  doc.setFillColor(...navyColor);
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const companyTitle = (branding.companyName || 'FAKHER ALAM USED CARS SHIPPING LLC').toUpperCase();
  doc.text(companyTitle, margin + 6, currentY + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 179, 128); // soft orange
  const tagline = (branding.tagline || 'PREMIER AUTO LOGISTICS FROM US AUCTIONS TO UAE PORTS').toUpperCase();
  doc.text(tagline, margin + 6, currentY + 17);

  // Top-Right Ref Badge
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL QUOTATION', pageWidth - margin - 6, currentY + 9, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`Ref: ${data.referenceNumber}`, pageWidth - margin - 6, currentY + 16, { align: 'right' });

  currentY += 28;

  // 2. Metadata Grid (Quotation Dates & Client Details)
  const issueDate = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US');
  const validUntilDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'FD');

  // Col 1: Customer Details
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

  // Col 2: Quotation Info
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

  currentY += 32;

  // 3. Vehicle & Route Details Card
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...orangeColor);
  doc.text('VEHICLE & ROUTE SPECIFICATIONS', margin + 5, currentY + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...navyColor);
  doc.text(`Vehicle: ${data.vehicleDetails || 'Sedan (Standard Passenger)'}`, margin + 5, currentY + 11);
  doc.text(`Route: ${data.originPort || 'US Loading Port'} -> ${data.destinationPort || 'UAE Destination Port'}`, margin + 5, currentY + 17);

  const routeCol2X = margin + contentWidth * 0.55;
  doc.text(`Shipping Method: ${data.shippingMethod || 'Consolidated Ocean Container'}`, routeCol2X, currentY + 11);
  doc.text(`Est. Transit Time: ${data.transitTime || '28 - 35 Days'}`, routeCol2X, currentY + 17);

  currentY += 26;

  // 4. Financial Breakdown Table
  const clearanceFee = data.clearanceFeeUsd ?? 150.0;
  const portHandlingFee = data.portHandlingFeeUsd ?? 200.0;
  const surcharges = data.surchargesUsd ?? 0.0;

  const towingCell = data.isTowingRange
    ? `$${data.towingFeeMin.toFixed(2)} - $${data.towingFeeMax.toFixed(2)} (Estimated Bracket)`
    : data.towingFeeMin > 0
    ? `$${data.towingFeeMin.toFixed(2)} (Fixed Tariff)`
    : 'Port Delivery (Direct)';

  const tableBody = [
    ['1', 'Ocean Freight (Origin Port to UAE Destination Port)', `$${data.oceanFreightUsd.toFixed(2)}`],
    ['2', 'US Inland Towing to Departure Port', towingCell],
    ['3', 'UAE Customs Clearance & Port Documentation', `$${clearanceFee.toFixed(2)}`],
    ['4', 'Destination Port Terminal Handling & Delivery Order', `$${portHandlingFee.toFixed(2)}`],
  ];

  if (surcharges > 0) {
    tableBody.push(['5', 'Vehicle Condition & Fuel Surcharges', `$${surcharges.toFixed(2)}`]);
  }

  tableBody.push(
    ['5', 'Statutory UAE Customs Duty (5% of CIF Valuation)', `$${data.customsDutyUsd.toFixed(2)}`],
    ['6', 'Statutory UAE Import VAT (5% of CIF + Duty)', `$${data.importVatUsd.toFixed(2)}`]
  );

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Charge Description & Statutory Valuation', 'Amount (USD)']],
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
    ? `AED ${Math.round(data.totalAedMin).toLocaleString()} - ${Math.round(data.totalAedMax).toLocaleString()}`
    : `AED ${Math.round(data.totalAedMax).toLocaleString()}`;

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

  currentY += 28;

  // Disclaimer text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...grayColor);
  const disclaimerText = data.disclaimer || 'Customs duty (5%) and import VAT (5%) are statutory government charges calculated on CIF valuation. Terminal handling and clearance remain separate. Rates are valid for 14 calendar days.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth);
  doc.text(splitDisclaimer, margin, currentY);
  currentY += splitDisclaimer.length * 3.5 + 4;

  // 6. Rules & Regulations Section
  if (data.rules && data.rules.length > 0) {
    if (currentY + 30 > pageHeight - 25) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navyColor);
    doc.text('RULES & REGULATIONS / TERMS OF SERVICE', margin, currentY);
    currentY += 5;

    for (const rule of data.rules) {
      if (currentY + 15 > pageHeight - 25) {
        doc.addPage();
        currentY = margin;
      }

      const ruleTitle = rule.title || rule.title_en || 'Rule';
      const ruleBody = rule.content || rule.content_en || '';

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...orangeColor);
      doc.text(`* ${ruleTitle}`, margin + 2, currentY);
      currentY += 4;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const splitContent = doc.splitTextToSize(ruleBody, contentWidth - 4);
      doc.text(splitContent, margin + 4, currentY);
      currentY += splitContent.length * 3.2 + 3;
    }
  }

  // 7. Multi-page Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);

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

  // Save the PDF
  const filename = `Fakher-Alam-Quotation-${data.referenceNumber || 'QT'}.pdf`;
  doc.save(filename);
}
