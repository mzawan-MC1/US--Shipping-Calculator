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

  // Calculator Steps (Legacy)
  calcStep1Title: string;
  calcStep2Title: string;
  calcStep3Title: string;
  calcStep4Title: string;
  calcStep5Title: string;
  calcStep6Title: string;
  calcStep7Title: string;

  // 4-Phase Operational Sequence Titles
  calcPhase1Title: string;
  calcPhase2Title: string;
  calcPhase3Title: string;
  calcPhase4Title: string;

  // Vehicle Condition Labels & Descriptions
  conditionOperable: string;
  conditionOperableDesc: string;
  conditionNonRunner: string;
  conditionNonRunnerDesc: string;
  conditionSalvage: string;
  conditionSalvageDesc: string;

  // Towing & Shipping
  towingModeInlandTitle: string;
  towingModeInlandSubtitle: string;
  towingModeDirectTitle: string;
  towingModeDirectSubtitle: string;
  towingAutoSelectedNotice: string;
  towingNoPortsAvailable: string;
  vehicleDetailsChangedNotice: string;
  shippingMethodConsolidatedDesc: string;
  shippingMethodDedicatedDesc: string;

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
      'System Notice: Live shipping rates are calculated directly from verified system tariffs.',
    demoDataDisclaimer:
      'This is an estimated quote. Final charges may vary based on physical vehicle inspection, actual auction invoice, port tariffs, exchange rates, and carrier surcharges.',

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

    calcPhase1Title: 'VEHICLE SPECIFICATIONS',
    calcPhase2Title: 'INLAND TOWING & PICKUP',
    calcPhase3Title: 'OCEAN SHIPPING & ROUTE',
    calcPhase4Title: 'CALCULATION & REVIEW',

    conditionOperable: 'Operable / Running',
    conditionOperableDesc: 'Starts, drives and steers independently under its own power.',
    conditionNonRunner: 'Non-Runner / Rolling',
    conditionNonRunnerDesc: 'Does not start or run, but tires roll and steering functions for winch loading.',
    conditionSalvage: 'Salvage / Damaged',
    conditionSalvageDesc: 'Severe structural damage, locked wheels, or forklift loading required.',

    towingModeInlandTitle: 'Include Inland Towing / Vehicle Pickup',
    towingModeInlandSubtitle: 'We dispatch a licensed carrier to pick up the vehicle from the auction yard or seller and transport it to the port warehouse.',
    towingModeDirectTitle: 'Direct Port Delivery',
    towingModeDirectSubtitle: 'You or your dealer deliver the vehicle directly to the loading port terminal. Inland towing fee will be $0.00.',
    towingAutoSelectedNotice: 'Designated loading port automatically assigned based on your pickup location.',
    towingNoPortsAvailable: 'No active shipping ports configured for this pickup location.',
    vehicleDetailsChangedNotice: 'Vehicle specifications updated. Dependent towing and shipping options have been refreshed.',
    shippingMethodConsolidatedDesc: 'Your vehicle is securely lashed in a 40ft/45ft High Cube container with other vehicles. Most economical and safe.',
    shippingMethodDedicatedDesc: 'Dedicated 20ft or 40ft exclusive container for luxury, exotic, or high-value vehicles with direct loading.',

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
      'Notice: Pricing and surcharge rates are updated in real time from system tariffs.',
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
    demoModeNotice: 'إشعار النظام: يتم استرداد أسعار الشحن مباشرة من قاعدة بيانات النظام المعتمدة.',
    demoDataDisclaimer:
      'هذا عرض سعر تقديري. قد تتغير الأسعار النهائية بناءً على الفحص الفعلي للمركبة، وفاتورة المزاد، ورسوم الميناء وسعر الصرف.',

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

    calcPhase1Title: 'مواصفات وحالة المركبة',
    calcPhase2Title: 'النقل البري والسحب الداخلي',
    calcPhase3Title: 'الشحن البحري ومسار الرحلة',
    calcPhase4Title: 'الاحتساب ومراجعة العرض',

    conditionOperable: 'تعمل وقابلة للقيادة (Operable)',
    conditionOperableDesc: 'المركبة تدور وتتحرك وتنعطف بشكل سليم بقوتها الذاتية.',
    conditionNonRunner: 'لا تعمل ولكن تتدحرج (Non-Runner)',
    conditionNonRunnerDesc: 'المحرك لا يعمل، ولكن العجلات تتدحرج والمقود يوجه لسحبها بالونش بأمان.',
    conditionSalvage: 'حوادث بالغة / أضرار هيكلية (Salvage)',
    conditionSalvageDesc: 'أضرار تصادم بالغة، أو عجلات مقفلة تتطلب تحميل رافعة شوكية (Forklift).',

    towingModeInlandTitle: 'تضمين النقل البري الداخلي / سحب السيارة',
    towingModeInlandSubtitle: 'نقوم بإرسال ناقلة مرخصة لاستلام السيارة من ساحة المزاد أو المعرض ونقلها مباشرة لمستودع ميناء الشحن.',
    towingModeDirectTitle: 'تسليم مباشر إلى الميناء',
    towingModeDirectSubtitle: 'تقوم أنت أو البائع بتسليم السيارة مباشرة إلى مستودع الميناء المعتمد. رسوم السحب الداخلي $0.00.',
    towingAutoSelectedNotice: 'تم تحديد ميناء الشحن المعتمد تلقائياً بناءً على موقع السحب المختار.',
    towingNoPortsAvailable: 'لا تتوفر موانئ شحن نشطة مرتبطة بموقع السحب المحدد حالياً.',
    vehicleDetailsChangedNotice: 'تم تحديث مواصفات المركبة وتحديث خيارات السحب والشحن المتوافقة تلقائياً.',
    shippingMethodConsolidatedDesc: 'تحميل سيارتك وتثبيتها بأمان داخل حاوية مشتركة (40/45 قدم عالية السقف) مع سيارات أخرى. الخيار الأكثر اقتصادية وأماناً.',
    shippingMethodDedicatedDesc: 'حاوية خاصة مستقلة (20 أو 40 قدم) مخصصة لسياراتك فقط، ملائمة للسيارات الفارهة والكلاسيكية.',

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
      'ملاحظة: يتم تحديث أسعار الشحن ورسوم الخدمة في الوقت الفعلي من قاعدة بيانات النظام.',
  },
};
