export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface Translations {
  // Brand & General
  brandName: string;
  brandTagline: string;
  locationSharjah: string;
  calculateShipping: string;
  whatsappQuote: string;
  callUs: string;
  trackEnquiry: string;
  demoModeNotice: string;
  demoDataDisclaimer: string;

  // Navigation
  navHome: string;
  navCalculator: string;
  navServices: string;
  navAbout: string;
  navContact: string;
  navAdmin: string;

  // Hero Section
  heroTitlePart1: string;
  heroTitleHighlightUs: string;
  heroTitleTo: string;
  heroTitleHighlightUae: string;
  heroSubtitle: string;
  heroBadgeLicensed: string;
  heroUsPortsTitle: string;

  // Trust Badges
  badgeSafeShipping: string;
  badgeSafeShippingDesc: string;
  badgeOnTime: string;
  badgeOnTimeDesc: string;
  badgeBestPrice: string;
  badgeBestPriceDesc: string;
  badgeSupport: string;
  badgeSupportDesc: string;
  badgeTrustpilot: string;

  // Why Choose Us
  whyChooseUsTitle: string;
  featureLicensed: string;
  featureWorldwide: string;
  featureDoorToPort: string;
  featureExportDocs: string;
  featureContainerLoading: string;
  featureCustomsClearance: string;
  featureVehicleInspection: string;
  featureSupport247: string;

  // Calculator Steps
  calcStep1Title: string;
  calcStep2Title: string;
  calcStep3Title: string;
  calcStep4Title: string;
  calcStep5Title: string;
  calcStep6Title: string;
  calcStep7Title: string;

  // Calculator Labels & Options
  vehicleTypeSedan: string;
  vehicleTypeSuv: string;
  vehicleTypeVan: string;
  vehicleTypePickup: string;
  vehicleTypeBike: string;

  powertrainPetrol: string;
  powertrainHybrid: string;
  powertrainElectric: string;

  sourceCopart: string;
  sourceIaai: string;
  sourceManheim: string;
  sourceAcv: string;
  sourceAdesa: string;
  sourceDealer: string;
  sourceOther: string;

  portNewark: string;
  portSavannah: string;
  portHouston: string;
  portLosAngeles: string;
  portBaltimore: string;

  portKhorfakkan: string;
  portJebelAli: string;

  buyingPriceLabel: string;
  buyingPricePlaceholder: string;
  towFromLabel: string;
  towFromPlaceholder: string;
  towChargeNotice: string;
  allChargesInUsd: string;

  customerNameLabel: string;
  customerPhoneLabel: string;
  customerEmailLabel: string;
  customerNotesLabel: string;

  btnBack: string;
  btnContinue: string;
  btnCalculateShipping: string;
  btnRecalculate: string;
  btnSendWhatsapp: string;
  btnDownloadQuote: string;

  // Results Page
  resultsTitle: string;
  resultsSubtitle: string;
  estimatedTransitTime: string;
  days: string;
  routeSummaryFrom: string;
  routeSummaryTo: string;
  vehicleAndShippingDetails: string;
  costBreakdown: string;
  oceanFreight: string;
  powertrainSurcharge: string;
  vehicleTypeSurcharge: string;
  oceanFreightTotal: string;
  customsClearanceTitle: string;
  customsClearanceFee: string;
  additionalPortCharges: string;
  governmentChargesTitle: string;
  customsDuty: string;
  vat: string;
  totalCharges: string;
  currencySwitch: string;

  // Admin Shell
  adminDashboardTitle: string;
  adminEnquiries: string;
  adminQuotations: string;
  adminCustomers: string;
  adminRoutes: string;
  adminPricing: string;
  adminContent: string;
  adminStaff: string;
  adminReports: string;
  adminSettings: string;
  adminActivity: string;
  adminLogout: string;
  adminRecentEnquiries: string;
  adminPricingEngineNote: string;
}

/**
 * Arabic translations provided as clear placeholders marked for professional review.
 */
export const dictionaries: Record<Language, Translations> = {
  en: {
    brandName: 'FAKHER ALAM',
    brandTagline: 'USED CARS SHIPPING',
    locationSharjah: 'Industrial Area 2, Sharjah, UAE',
    calculateShipping: 'CALCULATE SHIPPING',
    whatsappQuote: 'WHATSAPP QUOTE',
    callUs: 'Call Us',
    trackEnquiry: 'Track Enquiry',
    demoModeNotice:
      'Demo Mode: Running with local fixtures. Authoritative pricing calculated via backend functions in production.',
    demoDataDisclaimer:
      'This is an estimated quote for demonstration purposes. Final charges may vary based on physical vehicle inspection, actual auction invoice, port tariffs, exchange rates, and carrier surcharges.',

    navHome: 'Home',
    navCalculator: 'Shipping Calculator',
    navServices: 'Services',
    navAbout: 'About Us',
    navContact: 'Contact Us',
    navAdmin: 'Staff Portal',

    heroTitlePart1: 'SHIP YOUR VEHICLE',
    heroTitleHighlightUs: 'USA',
    heroTitleTo: 'TO',
    heroTitleHighlightUae: 'UAE',
    heroSubtitle: 'Fast • Reliable • Affordable\nLicensed & Insured Shipping Company',
    heroBadgeLicensed: 'Licensed Shipping Company',
    heroUsPortsTitle: 'We Ship Vehicles From Major USA Ports to the UAE',

    badgeSafeShipping: 'SAFE & SECURE',
    badgeSafeShippingDesc: 'SHIPPING',
    badgeOnTime: 'ON TIME',
    badgeOnTimeDesc: 'DELIVERY',
    badgeBestPrice: 'BEST PRICE',
    badgeBestPriceDesc: 'GUARANTEE',
    badgeSupport: '24/7 CUSTOMER',
    badgeSupportDesc: 'SUPPORT',
    badgeTrustpilot: 'Trustpilot 4.8/5 Rating',

    whyChooseUsTitle: 'WHY CHOOSE FAKHER ALAM USED CARS SHIPPING?',
    featureLicensed: 'Licensed & Registered',
    featureWorldwide: 'Worldwide Shipping',
    featureDoorToPort: 'Door to Port Service',
    featureExportDocs: 'Export Documentation',
    featureContainerLoading: 'Container Loading',
    featureCustomsClearance: 'Customs Clearance',
    featureVehicleInspection: 'Vehicle Inspection',
    featureSupport247: '24/7 Dedicated Support',

    calcStep1Title: 'VEHICLE TYPE',
    calcStep2Title: 'POWERTRAIN',
    calcStep3Title: 'PURCHASE SOURCE',
    calcStep4Title: 'LOADING PORT (USA)',
    calcStep5Title: 'DESTINATION PORT (UAE)',
    calcStep6Title: 'BUYING & TOWING DETAILS',
    calcStep7Title: 'CUSTOMER DETAILS & REVIEW',

    vehicleTypeSedan: 'Sedan',
    vehicleTypeSuv: 'SUV',
    vehicleTypeVan: 'Van',
    vehicleTypePickup: 'Pickup',
    vehicleTypeBike: 'Bike / Moto',

    powertrainPetrol: 'Petrol',
    powertrainHybrid: 'Hybrid',
    powertrainElectric: 'Electric',

    sourceCopart: 'Copart',
    sourceIaai: 'IAAI',
    sourceManheim: 'Manheim',
    sourceAcv: 'ACV Auctions',
    sourceAdesa: 'ADESA',
    sourceDealer: 'Car Dealer',
    sourceOther: 'Private / Other',

    portNewark: 'Newark, NJ',
    portSavannah: 'Savannah, GA',
    portHouston: 'Houston, TX',
    portLosAngeles: 'Los Angeles, CA',
    portBaltimore: 'Baltimore, MD',

    portKhorfakkan: 'Khorfakkan Port (Sharjah)',
    portJebelAli: 'Jebel Ali Port (Dubai)',

    buyingPriceLabel: 'Vehicle Buying Price (USD)',
    buyingPricePlaceholder: 'e.g. 5000',
    towFromLabel: 'Towing Pickup Location (Optional)',
    towFromPlaceholder: 'e.g. Houston, TX (Copart Houston)',
    towChargeNotice:
      'Inland tow charges will be calculated on request based on auction lot location.',
    allChargesInUsd: 'All estimated charges are in USD unless switched to AED',

    customerNameLabel: 'Full Name',
    customerPhoneLabel: 'WhatsApp / Phone Number',
    customerEmailLabel: 'Email Address (Optional)',
    customerNotesLabel: 'Additional Notes or Lot Number (Optional)',

    btnBack: 'Back',
    btnContinue: 'Continue',
    btnCalculateShipping: 'CALCULATE SHIPPING',
    btnRecalculate: 'CALCULATE AGAIN',
    btnSendWhatsapp: 'SEND QUOTE ON WHATSAPP',
    btnDownloadQuote: 'DOWNLOAD QUOTATION',

    resultsTitle: 'SHIPPING QUOTE RESULTS',
    resultsSubtitle: 'Your estimated shipping cost and transit time breakdown',
    estimatedTransitTime: 'ESTIMATED TRANSIT TIME',
    days: 'Days',
    routeSummaryFrom: 'FROM',
    routeSummaryTo: 'TO',
    vehicleAndShippingDetails: 'VEHICLE & SHIPPING DETAILS',
    costBreakdown: 'COST BREAKDOWN',
    oceanFreight: 'Ocean Freight',
    powertrainSurcharge: 'Powertrain Surcharge',
    vehicleTypeSurcharge: 'Vehicle Type Surcharge',
    oceanFreightTotal: 'Ocean Freight Total',
    customsClearanceTitle: 'CUSTOMS CLEARANCE AT DESTINATION',
    customsClearanceFee: 'Customs Clearance & Documentation',
    additionalPortCharges: 'Port & Terminal Handling Charges',
    governmentChargesTitle: 'GOVERNMENT CHARGES & DUTIES',
    customsDuty: 'Customs Duty (5% of declared value)',
    vat: 'UAE VAT (5% of value & duty)',
    totalCharges: 'TOTAL ESTIMATED CHARGES',
    currencySwitch: 'Currency View',

    adminDashboardTitle: 'Operations & Quotation Dashboard',
    adminEnquiries: 'Customer Enquiries',
    adminQuotations: 'Quotations & Revisions',
    adminCustomers: 'Customer Directory',
    adminRoutes: 'Countries, Ports & Routes',
    adminPricing: 'Freight & Towing Tariffs',
    adminContent: 'Website CMS',
    adminStaff: 'Staff & Roles',
    adminReports: 'KPIs & Reports',
    adminSettings: 'System Settings',
    adminActivity: 'Activity History',
    adminLogout: 'Sign Out',
    adminRecentEnquiries: 'Recent Leads & Quotation Requests',
    adminPricingEngineNote:
      'Notice: Authoritative pricing and surcharge matrix rules are validated in real time by the centralized rate engine.',
  },

  ar: {
    // [REVIEW PENDING]: Professional Arabic translations review pending
    brandName: 'فاخر علم',
    brandTagline: 'شحن السيارات المستعملة',
    locationSharjah: 'المنطقة الصناعية 2، الشارقة، الإمارات',
    calculateShipping: 'احسب تكلفة الشحن',
    whatsappQuote: 'عرض سعر عبر واتساب',
    callUs: 'اتصل بنا',
    trackEnquiry: 'متابعة الطلب',
    demoModeNotice:
      'وضع العرض التجريبي: يعمل ببيانات توضيحية. الحسابات النهائية تنفذ عبر خوادم قاعدة البيانات.',
    demoDataDisclaimer:
      'هذا عرض سعر تقديري لأغراض توضيحية. قد تتغير الأسعار النهائية بناءً على الفحص الفعلي، وفاتورة المزاد، ورسوم الميناء وسعر الصرف.',

    navHome: 'الرئيسية',
    navCalculator: 'حاسبة الشحن',
    navServices: 'خدماتنا',
    navAbout: 'من نحن',
    navContact: 'اتصل بنا',
    navAdmin: 'بوابة الموظفين',

    heroTitlePart1: 'اشحن سيارتك من',
    heroTitleHighlightUs: 'أمريكا',
    heroTitleTo: 'إلى',
    heroTitleHighlightUae: 'الإمارات',
    heroSubtitle: 'سريع • موثوق • أسعار منافسة\nشركة شحن مرخصة ومعتمدة',
    heroBadgeLicensed: 'شركة شحن مرخصة رسمياً',
    heroUsPortsTitle: 'نشحن المركبات من كافة موانئ الولايات المتحدة إلى الإمارات',

    badgeSafeShipping: 'شحن آمن',
    badgeSafeShippingDesc: 'ومضمون',
    badgeOnTime: 'التزام دقيق',
    badgeOnTimeDesc: 'بمواعيد التسليم',
    badgeBestPrice: 'أفضل الأسعار',
    badgeBestPriceDesc: 'المنافسة',
    badgeSupport: 'خدمة عملاء',
    badgeSupportDesc: 'على مدار الساعة',
    badgeTrustpilot: 'تقييم ترست بايلوت 4.8/5',

    whyChooseUsTitle: 'لماذا تختار شركة فاخر علم لشحن السيارات؟',
    featureLicensed: 'مرخصة ومسجلة رسمياً',
    featureWorldwide: 'شحن بحري دولي',
    featureDoorToPort: 'خدمة من الباب إلى الميناء',
    featureExportDocs: 'إجراء وتخليص وثائق التصدير',
    featureContainerLoading: 'تحميل احترافي للحاويات',
    featureCustomsClearance: 'تخليص جمركي شامل',
    featureVehicleInspection: 'فحص وتوثيق حالة المركبة',
    featureSupport247: 'دعم ومتابعة 24/7',

    calcStep1Title: 'نوع المركبة',
    calcStep2Title: 'نوع المحرك',
    calcStep3Title: 'مصدر الشراء',
    calcStep4Title: 'ميناء التحميل (أمريكا)',
    calcStep5Title: 'ميناء الوصول (الإمارات)',
    calcStep6Title: 'بيانات الشراء والسحب الداخلي',
    calcStep7Title: 'بيانات العميل والمراجعة',

    vehicleTypeSedan: 'سيدان (صالون)',
    vehicleTypeSuv: 'دفع رباعي (SUV)',
    vehicleTypeVan: 'فان',
    vehicleTypePickup: 'بيك آب',
    vehicleTypeBike: 'دراجة نارية',

    powertrainPetrol: 'بنزين',
    powertrainHybrid: 'هايبرد',
    powertrainElectric: 'كهربائي',

    sourceCopart: 'كوبارت (Copart)',
    sourceIaai: 'IAAI',
    sourceManheim: 'مانهايم (Manheim)',
    sourceAcv: 'ACV',
    sourceAdesa: 'أديسا (ADESA)',
    sourceDealer: 'معرض سيارات',
    sourceOther: 'شراء خاص / أخرى',

    portNewark: 'نيوارك، نيوجيرسي',
    portSavannah: 'سافانا، جورجيا',
    portHouston: 'هيوستن، تكساس',
    portLosAngeles: 'لوس أنجلوس، كاليفورنيا',
    portBaltimore: 'بالتيمور، ميريلاند',

    portKhorfakkan: 'ميناء خورفكان (الشارقة)',
    portJebelAli: 'ميناء جبل علي (دبي)',

    buyingPriceLabel: 'سعر شراء المركبة (بالدولار الأمريكي)',
    buyingPricePlaceholder: 'مثال: 5000',
    towFromLabel: 'موقع سحب السيارة (اختياري)',
    towFromPlaceholder: 'مثال: هيوستن، تكساس (كوبارت)',
    towChargeNotice: 'يتم احتساب رسوم النقل الداخلي عند الطلب بناءً على موقع المزاد الدقيق.',
    allChargesInUsd: 'جميع الأسعار التقديرية بالدولار الأمريكي ما لم يتم التحويل للدرهم',

    customerNameLabel: 'الاسم الكامل',
    customerPhoneLabel: 'رقم الهاتف / الواتساب',
    customerEmailLabel: 'البريد الإلكتروني (اختياري)',
    customerNotesLabel: 'ملاحظات إضافية أو رقم اللوت (اختياري)',

    btnBack: 'السابق',
    btnContinue: 'التالي',
    btnCalculateShipping: 'احسب تكلفة الشحن',
    btnRecalculate: 'إعادة الحساب',
    btnSendWhatsapp: 'إرسال عرض السعر عبر واتساب',
    btnDownloadQuote: 'تحميل عرض السعر',

    resultsTitle: 'نتيجة عرض سعر الشحن',
    resultsSubtitle: 'تفاصيل التكلفة التقديرية ووقت العبور المتوقع للمركبة',
    estimatedTransitTime: 'وقت العبور المتوقع',
    days: 'يوم',
    routeSummaryFrom: 'من',
    routeSummaryTo: 'إلى',
    vehicleAndShippingDetails: 'تفاصيل المركبة والشحن',
    costBreakdown: 'تفصيل التكاليف',
    oceanFreight: 'أجور الشحن البحري',
    powertrainSurcharge: 'رسوم نوع المحرك',
    vehicleTypeSurcharge: 'رسوم فئة المركبة',
    oceanFreightTotal: 'إجمالي الشحن البحري',
    customsClearanceTitle: 'التخليص الجمركي في ميناء الوصول',
    customsClearanceFee: 'رسوم التخليص الجمركي والوثائق',
    additionalPortCharges: 'رسوم الميناء والمناولة الإضافية',
    governmentChargesTitle: 'الرسوم والضرائب الحكومية',
    customsDuty: 'الرسوم الجمركية (5% من القيمة)',
    vat: 'ضريبة القيمة المضافة (5% للإمارات)',
    totalCharges: 'إجمالي التكاليف التقديرية',
    currencySwitch: 'عرض العملة',

    adminDashboardTitle: 'لوحة التحكم وإدارة عروض الأسعار',
    adminEnquiries: 'طلبات واستفسارات العملاء',
    adminQuotations: 'عروض الأسعار والتعديلات',
    adminCustomers: 'دليل العملاء',
    adminRoutes: 'الدول، الموانئ ومسارات الشحن',
    adminPricing: 'تعريفات الشحن والسطحة',
    adminContent: 'إدارة محتوى الموقع',
    adminStaff: 'فريق العمل والأدوار',
    adminReports: 'التقارير والمؤشرات (KPIs)',
    adminSettings: 'إعدادات النظام',
    adminActivity: 'سجل العمليات والنشاط',
    adminLogout: 'تسجيل الخروج',
    adminRecentEnquiries: 'أحدث الطلبات وعروض الأسعار المستلمة',
    adminPricingEngineNote:
      'ملاحظة: جداول وقواعد التسعير والتعريفات الرسمية معتمدة ومحدثة في الوقت الفعلي عبر محرك التسعير المركزي.',
  },
};
