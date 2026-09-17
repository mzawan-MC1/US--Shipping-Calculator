import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useI18n } from '../../i18n/I18nContext';
import { useWebsiteSettings } from '../../features/cms/WebsiteSettingsContext';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { quotationService } from '../../services/quotationService';
import {
  referenceDataService,
  CountryOption,
  ManagedPortOption,
  RouteOption,
  ShippingMethodOption,
  VehicleCategoryOption,
  PowertrainOption,
  PurchaseSourceOption,
  PurchaseLocationOption,
  PORT_SLUG_TO_UUID,
} from '../../services/referenceDataService';
import {
  VEHICLE_TYPES_CONFIG,
  POWERTRAINS_CONFIG,
  PURCHASE_SOURCES_CONFIG,
} from '../../config/calculatorConfig';
import {
  Car,
  Fuel,
  Zap,
  Flame,
  ShoppingBag,
  Anchor,
  DollarSign,
  Truck,
  User,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Info,
  AlertTriangle,
  MessageCircle,
  Clock,
  Loader2,
  Globe2,
} from 'lucide-react';
import { CalculatorFormData } from '../../types/calculator';

const calculatorSchema = z
  .object({
    vehicleType: z.string().min(1, 'Vehicle category is required'),
    powertrain: z.string().min(1, 'Powertrain is required'),
    purchaseSource: z.string().min(1, 'Purchase source is required'),
    loadingPort: z.string().min(1, 'Loading port is required'),
    destinationPort: z.string().min(1, 'Destination port is required'),
    shippingMethod: z.string().default('consolidated_container'),
    buyingPrice: z.number().min(100, 'Please enter a valid vehicle purchase price ($100 minimum)'),
    includeInlandTowing: z.boolean().default(true),
    towFromLocation: z.string().optional(),
    purchaseLocationId: z.string().optional(),
    customerName: z.string().min(2, 'Name is required (minimum 2 characters)'),
    customerPhone: z.string().min(7, 'Valid phone / WhatsApp number is required'),
    customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.includeInlandTowing && (!data.towFromLocation || data.towFromLocation.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pickup location is required when inland towing is included',
        path: ['towFromLocation'],
      });
    }
  });

type FormData = z.infer<typeof calculatorSchema>;

const STEPS = [
  { id: 1, titleKey: 'calcStep1Title', short: 'Vehicle' },
  { id: 2, titleKey: 'calcStep3Title', short: 'Source' },
  { id: 3, titleKey: 'calcStep4Title', short: 'Route' },
  { id: 4, titleKey: 'Shipping Method', short: 'Method' },
  { id: 5, titleKey: 'calcStep6Title', short: 'Buying & Tow' },
  { id: 6, titleKey: 'calcStep7Title', short: 'Contact' },
  { id: 7, titleKey: 'Review & Estimate', short: 'Review' },
];

export const CalculatorPage: React.FC = () => {
  const { t, language, direction } = useI18n();
  const { branding, getWhatsAppLink, getPhoneTel } = useWebsiteSettings();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Managed Reference Data State
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadingPorts, setLoadingPorts] = useState<ManagedPortOption[]>([]);
  const [destinationPorts, setDestinationPorts] = useState<ManagedPortOption[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodOption[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategoryOption[]>([]);
  const [powertrains, setPowertrains] = useState<PowertrainOption[]>([]);
  const [purchaseSources, setPurchaseSources] = useState<PurchaseSourceOption[]>([]);
  const [purchaseLocations, setPurchaseLocations] = useState<PurchaseLocationOption[]>([]);

  const [selectedOriginCountry, setSelectedOriginCountry] = useState<string>('USA');
  const [selectedDestCountry, setSelectedDestCountry] = useState<string>('ARE');
  const [isLoadingRefData, setIsLoadingRefData] = useState<boolean>(true);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      vehicleType: 'sedan',
      powertrain: 'petrol',
      purchaseSource: 'copart',
      loadingPort: 'savannah',
      destinationPort: 'khorfakkan',
      shippingMethod: 'consolidated_container',
      buyingPrice: 5000,
      includeInlandTowing: true,
      towFromLocation: 'Houston, TX (Copart Houston)',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      notes: '',
    },
    mode: 'onTouched',
  });

  const formData = watch();

  // Load Managed Reference Data from live database on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingRefData(true);
      setRefDataError(null);
      try {
        const [
          fetchedCountries,
          fetchedLoadingPorts,
          fetchedDestPorts,
          fetchedRoutes,
          fetchedMethods,
          fetchedCategories,
          fetchedPowertrains,
          fetchedSources,
          fetchedLocations,
        ] = await Promise.all([
          referenceDataService.getCountries(),
          referenceDataService.getLoadingPorts(),
          referenceDataService.getDestinationPorts(),
          referenceDataService.getActiveRoutes(),
          referenceDataService.getShippingMethods(),
          referenceDataService.getVehicleCategories(),
          referenceDataService.getPowertrains(),
          referenceDataService.getPurchaseSources(),
          referenceDataService.getPurchaseLocations(),
        ]);

        if (isMounted) {
          setCountries(fetchedCountries);
          setLoadingPorts(fetchedLoadingPorts);
          setDestinationPorts(fetchedDestPorts);
          setRoutes(fetchedRoutes);
          setShippingMethods(fetchedMethods);
          setVehicleCategories(fetchedCategories);
          setPowertrains(fetchedPowertrains);
          setPurchaseSources(fetchedSources);
          setPurchaseLocations(fetchedLocations);

          // If default ports exist, align form selection
          if (fetchedLoadingPorts.length > 0 && !formData.loadingPort) {
            setValue('loadingPort', fetchedLoadingPorts[0].id);
          }
          if (fetchedDestPorts.length > 0 && !formData.destinationPort) {
            setValue('destinationPort', fetchedDestPorts[0].id);
          }
        }
      } catch (err: unknown) {
        console.error('[Calculator] Failed to load reference data:', err);
        if (isMounted) {
          setRefDataError(
            err instanceof Error ? err.message : 'Unable to connect to live tariff database.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingRefData(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [formData.loadingPort, formData.destinationPort, setValue]);

  // Filter ports by selected country
  const filteredLoadingPorts = useMemo(() => {
    if (!selectedOriginCountry) return loadingPorts;
    return loadingPorts.filter((p) => p.countryCode === selectedOriginCountry);
  }, [loadingPorts, selectedOriginCountry]);

  const filteredDestPorts = useMemo(() => {
    if (!selectedDestCountry) return destinationPorts;
    return destinationPorts.filter((p) => p.countryCode === selectedDestCountry);
  }, [destinationPorts, selectedDestCountry]);

  // Identify currently selected port objects
  const selectedOriginPort = useMemo(() => {
    return loadingPorts.find(
      (p) =>
        p.id === formData.loadingPort ||
        p.code === formData.loadingPort ||
        p.id === PORT_SLUG_TO_UUID[formData.loadingPort]
    );
  }, [loadingPorts, formData.loadingPort]);

  const selectedDestPort = useMemo(() => {
    return destinationPorts.find(
      (p) =>
        p.id === formData.destinationPort ||
        p.code === formData.destinationPort ||
        p.id === PORT_SLUG_TO_UUID[formData.destinationPort]
    );
  }, [destinationPorts, formData.destinationPort]);

  // Check active route existence
  const activeRoute = useMemo(() => {
    if (!selectedOriginPort || !selectedDestPort) return null;
    return (
      routes.find(
        (r) =>
          r.originPortId === selectedOriginPort.id &&
          r.destinationPortId === selectedDestPort.id &&
          r.isActive
      ) || null
    );
  }, [selectedOriginPort, selectedDestPort, routes]);

  const originPortDisplayName = selectedOriginPort
    ? isAr && selectedOriginPort.nameAr
      ? selectedOriginPort.nameAr
      : selectedOriginPort.name
    : formData.loadingPort;

  const destPortDisplayName = selectedDestPort
    ? isAr && selectedDestPort.nameAr
      ? selectedDestPort.nameAr
      : selectedDestPort.name
    : formData.destinationPort;

  // Generate customized WhatsApp link for unavailable routes or inquiries
  const whatsappInquiryLink = getWhatsAppLink(
    isAr
      ? `مرحباً ${branding.companyNameAr}، أود الاستفسار عن خط شحن بحري مخصص من ${originPortDisplayName} إلى ${destPortDisplayName}.`
      : `Hello ${branding.companyName}, I would like an inquiry for a custom shipping route from ${originPortDisplayName} to ${destPortDisplayName}.`
  );

  const handleNext = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await trigger(['vehicleType', 'powertrain']);
    } else if (currentStep === 2) {
      isValid = await trigger(['purchaseSource']);
    } else if (currentStep === 3) {
      isValid = await trigger(['loadingPort', 'destinationPort']);
      if (isValid && !activeRoute) {
        // Prevent advancing on inactive route
        return;
      }
    } else if (currentStep === 4) {
      isValid = await trigger(['shippingMethod']);
    } else if (currentStep === 5) {
      const fieldsToValidate: ('buyingPrice' | 'towFromLocation')[] = ['buyingPrice'];
      if (formData.includeInlandTowing) {
        fieldsToValidate.push('towFromLocation');
      }
      isValid = await trigger(fieldsToValidate);
    } else if (currentStep === 6) {
      isValid = await trigger(['customerName', 'customerPhone', 'customerEmail']);
    } else {
      isValid = true;
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const idempotencyKey = `quote-client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const calcData: CalculatorFormData = {
        vehicleType: data.vehicleType,
        powertrain: data.powertrain,
        purchaseSource: data.purchaseSource,
        loadingPort: selectedOriginPort ? selectedOriginPort.id : data.loadingPort,
        destinationPort: selectedDestPort ? selectedDestPort.id : data.destinationPort,
        shippingMethod: data.shippingMethod,
        buyingPrice: data.buyingPrice,
        includeInlandTowing: data.includeInlandTowing,
        towFromLocation: data.includeInlandTowing ? data.towFromLocation : undefined,
        purchaseLocationId: data.includeInlandTowing ? data.purchaseLocationId : undefined,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        notes: data.notes,
        idempotencyKey,
      };

      await quotationService.calculateQuote(calcData);
      navigate('/results');
    } catch (err: unknown) {
      console.error('[CalculatorPage] Submission error:', err);
      setSubmissionError(
        isAr
          ? 'تعذر إتمام احتساب عرض السعر في الوقت الحالي. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.'
          : 'We could not complete your quotation right now. Please try again or contact us on WhatsApp.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = Math.round((currentStep / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 pb-44 sm:pb-16 w-full overflow-x-hidden">
      <Container className="max-w-3xl px-4 sm:px-6">
        {/* Progress & Header */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              {isAr ? `الخطوة ${currentStep} من ${STEPS.length}` : `Step ${currentStep} of ${STEPS.length}`}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {progressPercentage}% {isAr ? 'مكتمل' : 'Completed'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-orange-500 to-brand-orange-600 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-brand-navy-950 pt-2">
            {currentStep === 1 && t.calcStep1Title}
            {currentStep === 2 && t.calcStep3Title}
            {currentStep === 3 && `${t.calcStep4Title} & ${t.calcStep5Title}`}
            {currentStep === 4 && (isAr ? 'طريقة الشحن بالحاويات' : 'SHIPPING METHOD')}
            {currentStep === 5 && t.calcStep6Title}
            {currentStep === 6 && t.calcStep7Title}
            {currentStep === 7 && (isAr ? 'مراجعة وتأكيد عرض السعر' : 'REVIEW YOUR SHIPPING QUOTE')}
          </h1>
        </div>

        {/* Reference Data Loading Notice */}
        {isLoadingRefData && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-xs text-blue-800 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            <span>{isAr ? 'جاري تحميل أحدث التعرفة والموانئ النشطة...' : 'Loading verified maritime ports and route tariffs...'}</span>
          </div>
        )}

        {refDataError && (
          <div className="mb-6">
            <Alert variant="warning" title={isAr ? 'تنبيه الاتصال' : 'Database Connection Note'}>
              {refDataError}
            </Alert>
          </div>
        )}

        {submissionError && (
          <div className="mb-6">
            <Alert variant="error" title={isAr ? 'خطأ في احتساب السعر' : 'Calculation Error'}>
              {submissionError}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* STEP 1: Vehicle & Powertrain */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  {isAr ? 'اختر فئة المركبة' : 'Select Vehicle Category'}
                </label>
                <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                  {(vehicleCategories.length > 0
                    ? vehicleCategories
                    : VEHICLE_TYPES_CONFIG.map((v) => ({ id: v.id, name: v.id, isActive: true }))
                  ).map((vt) => {
                    const isSelected = formData.vehicleType === vt.id;
                    const configMatch = VEHICLE_TYPES_CONFIG.find((c) => c.id === vt.id);
                    const label = configMatch ? t[configMatch.labelKey as keyof typeof t] || vt.name : vt.name;

                    return (
                      <Card
                        key={vt.id}
                        selected={isSelected}
                        interactive
                        compact
                        onClick={() => setValue('vehicleType', vt.id, { shouldValidate: true })}
                        className="p-2.5 sm:p-3 flex flex-col items-center justify-center text-center gap-1.5 min-h-[76px] sm:min-h-[86px]"
                      >
                        <Car
                          className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? 'text-brand-orange-500' : 'text-slate-600'}`}
                        />
                        <span className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-tight px-1">
                          {label}
                        </span>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {isAr ? 'نوع المحرك والوقود' : 'Powertrain / Fuel Type'}
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(powertrains.length > 0
                    ? powertrains
                    : POWERTRAINS_CONFIG.map((p) => ({ id: p.id, name: p.id, isActive: true }))
                  ).map((pt) => {
                    const isSelected = formData.powertrain === pt.id;
                    const Icon = pt.id === 'electric' ? Zap : pt.id === 'hybrid' ? Fuel : Flame;
                    const configMatch = POWERTRAINS_CONFIG.find((c) => c.id === pt.id);
                    const label = configMatch ? t[configMatch.labelKey as keyof typeof t] || pt.name : pt.name;

                    return (
                      <Card
                        key={pt.id}
                        selected={isSelected}
                        interactive
                        compact
                        onClick={() => setValue('powertrain', pt.id, { shouldValidate: true })}
                        className="p-2.5 sm:p-3 flex flex-col items-center justify-center text-center gap-1.5 min-h-[76px] sm:min-h-[86px]"
                      >
                        <Icon
                          className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? 'text-brand-orange-500' : 'text-slate-600'}`}
                        />
                        <span className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-tight px-1">
                          {label}
                        </span>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Purchase Source */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {isAr ? 'من أين قمت بشراء المركبة أو تخطط لشرائها؟' : 'Where did you purchase or plan to buy the vehicle?'}
              </label>
              <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {(purchaseSources.length > 0
                  ? purchaseSources
                  : PURCHASE_SOURCES_CONFIG.map((s) => ({ id: s.id, name: s.id, isActive: true }))
                ).map((src) => {
                  const isSelected = formData.purchaseSource === src.id;
                  const configMatch = PURCHASE_SOURCES_CONFIG.find((c) => c.id === src.id);
                  const label = configMatch ? t[configMatch.labelKey as keyof typeof t] || src.name : src.name;

                  return (
                    <Card
                      key={src.id}
                      selected={isSelected}
                      interactive
                      compact
                      onClick={() => setValue('purchaseSource', src.id, { shouldValidate: true })}
                      className="p-2.5 sm:p-3 flex flex-col items-center justify-center text-center gap-1.5 min-h-[76px] sm:min-h-[86px]"
                    >
                      <ShoppingBag
                        className={`w-5 h-5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-500'}`}
                      />
                      <span className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-tight px-1">
                        {label}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Route Selection (Origin Country & Port -> Destination Country & Port) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Origin Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isAr ? 'ميناء التحميل في بلد المنشأ' : 'Origin Loading Port'}
                  </label>
                  {countries.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Globe2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'الدولة:' : 'Country:'}</span>
                      <select
                        aria-label={isAr ? 'دولة المنشأ' : 'Origin Country'}
                        value={selectedOriginCountry}
                        onChange={(e) => setSelectedOriginCountry(e.target.value)}
                        className="text-xs font-bold text-brand-navy-900 border border-slate-200 rounded-lg px-2 py-0.5 bg-white"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {isAr && c.nameAr ? c.nameAr : c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredLoadingPorts.map((port) => {
                    const isSelected =
                      formData.loadingPort === port.id ||
                      formData.loadingPort === port.code ||
                      PORT_SLUG_TO_UUID[formData.loadingPort] === port.id;
                    const displayName = isAr && port.nameAr ? port.nameAr : port.name;

                    return (
                      <Card
                        key={port.id}
                        selected={isSelected}
                        interactive
                        onClick={() => setValue('loadingPort', port.id, { shouldValidate: true })}
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Anchor
                            className={`w-5 h-5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-400'}`}
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {displayName}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                              {port.stateOrCity ? `${port.stateOrCity} • ` : ''}
                              <span className="font-mono">{port.code}</span>
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Destination Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isAr ? 'ميناء الوصول في بلد الوجهة' : 'Destination Port'}
                  </label>
                  {countries.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Globe2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'الدولة:' : 'Country:'}</span>
                      <select
                        aria-label={isAr ? 'دولة الوجهة' : 'Destination Country'}
                        value={selectedDestCountry}
                        onChange={(e) => setSelectedDestCountry(e.target.value)}
                        className="text-xs font-bold text-brand-navy-900 border border-slate-200 rounded-lg px-2 py-0.5 bg-white"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {isAr && c.nameAr ? c.nameAr : c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredDestPorts.map((port) => {
                    const isSelected =
                      formData.destinationPort === port.id ||
                      formData.destinationPort === port.code ||
                      PORT_SLUG_TO_UUID[formData.destinationPort] === port.id;
                    const displayName = isAr && port.nameAr ? port.nameAr : port.name;

                    return (
                      <Card
                        key={port.id}
                        selected={isSelected}
                        interactive
                        onClick={() => setValue('destinationPort', port.id, { shouldValidate: true })}
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Anchor
                            className={`w-5 h-5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-400'}`}
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{displayName}</h4>
                            <p className="text-xs text-emerald-600 font-semibold">
                              {port.stateOrCity ? `${port.stateOrCity} • ` : ''}
                              <span className="font-mono">{port.code}</span>
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Active Route Status & Transit Time Display */}
              {selectedOriginPort && selectedDestPort && (
                <div>
                  {activeRoute ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <strong className="block font-bold">
                            {isAr ? 'خط ملاحي منتظم ومؤكد' : 'Active Direct Ocean Route Confirmed'}
                          </strong>
                          <span className="text-emerald-700">
                            {originPortDisplayName} → {destPortDisplayName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {activeRoute.transitDaysMin} – {activeRoute.transitDaysMax} {isAr ? 'يوم' : 'Days'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold">
                            {isAr
                              ? 'لا يوجد خط شحن بحري مباشر نشط بين هذين المينائين حالياً'
                              : 'No Scheduled Active Direct Route Between Selected Ports'}
                          </h4>
                          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                            {isAr
                              ? `لا تتوفر رحلات بحرية قياسية مجدولة حالياً بين ${originPortDisplayName} و ${destPortDisplayName}. يرجى اختيار ميناء آخر أو التواصل المباشر مع خبرائنا للحصول على تسعير خاص وحجز حاوية مخصصة.`
                              : `There is currently no standard ocean sailing between ${originPortDisplayName} and ${destPortDisplayName}. Please select another port or contact our logistics desk for custom vessel charters or dedicated bookings.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {whatsappInquiryLink && (
                          <a
                            href={whatsappInquiryLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              type="button"
                              variant="whatsapp"
                              size="sm"
                              startIcon={<MessageCircle className="w-4 h-4" />}
                            >
                              {isAr ? 'طلب تسعير مخصص عبر واتساب' : 'Inquire on WhatsApp'}
                            </Button>
                          </a>
                        )}
                        {branding.supportPhone && (
                          <a href={`tel:${getPhoneTel()}`}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              startIcon={<Phone className="w-4 h-4" />}
                            >
                              {branding.supportPhone}
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Shipping Method */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {isAr ? 'اختر نظام الشحن ونوع الحاوية' : 'Choose Transport Container Mode'}
              </label>
              <div className="grid grid-cols-1 gap-4">
                {(shippingMethods.length > 0
                  ? shippingMethods
                  : [
                      { id: 'consolidated_container', name: 'Consolidated Shared Container (LCL)' },
                      { id: 'dedicated_container', name: 'Dedicated Exclusive Container (FCL)' },
                    ]
                ).map((method) => {
                  const isSelected = formData.shippingMethod === method.id;
                  const isDedicated = method.id === 'dedicated_container';

                  return (
                    <Card
                      key={method.id}
                      selected={isSelected}
                      interactive
                      onClick={() =>
                        setValue('shippingMethod', method.id, { shouldValidate: true })
                      }
                      className="p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isDedicated
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-orange-100 text-brand-orange-600'
                          }`}
                        >
                          {isDedicated ? <Anchor className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900">
                            {method.name}
                            {!isDedicated && ` (${isAr ? 'الأكثر توفيراً وموصى به' : 'Recommended'})`}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {isDedicated
                              ? isAr
                                ? 'حاوية خاصة مستقلة (20 أو 40 قدم) مخصصة لسياراتك فقط، ملائمة للسيارات الفارهة والكلاسيكية.'
                                : 'Dedicated 20ft or 40ft private container for luxury, exotic, or high-value vehicles with direct loading.'
                              : isAr
                                ? 'تحميل سيارتك وتثبيتها بأمان داخل حاوية مشتركة (40/45 قدم عالية السقف) مع سيارات أخرى. الخيار الأكثر اقتصادية وأماناً.'
                                : 'Your vehicle is securely lashed and loaded in a 40ft/45ft High Cube container with other vehicles. Most economical and safe.'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Buying Price & Towing Details */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <Controller
                control={control}
                name="buyingPrice"
                render={({ field }) => (
                  <Input
                    label={t.buyingPriceLabel}
                    type="number"
                    min={100}
                    step={100}
                    startIcon={<DollarSign className="w-4 h-4" />}
                    error={errors.buyingPrice?.message}
                    helperText={
                      isAr
                        ? 'تُستخدم لحساب القيمة المقدرة للرسوم الجمركية (5%) وضريبة القيمة المضافة بدولة الإمارات.'
                        : 'Used to estimate destination Customs Duty (5%) and UAE Import VAT (5%).'
                    }
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />

              {/* Inland Towing Checkbox Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-orange-300 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded text-brand-orange-600 focus:ring-brand-orange-500 border-slate-300 transition-colors"
                    checked={formData.includeInlandTowing}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setValue('includeInlandTowing', checked, { shouldValidate: true });
                      if (!checked) {
                        setValue('towFromLocation', '');
                        setValue('purchaseLocationId', undefined);
                      }
                    }}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-slate-900 block">
                      {isAr
                        ? 'تضمين النقل البري الداخلي / سحب السيارة'
                        : 'Include Inland Towing / Vehicle Pickup'}
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      {isAr
                        ? 'قم بإلغاء التحديد إذا كنت ستقوم بتسليم السيارة مباشرة إلى الميناء بنفسك، ولن يتم احتساب أي رسوم سحب.'
                        : 'Uncheck this if you or your dealer will deliver the vehicle directly to the port warehouse. Towing charge will be $0.00.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Towing Pickup Location with Managed Locations quick suggestions */}
              {formData.includeInlandTowing && (
                <div className="space-y-2 pl-1">
                  <Controller
                    control={control}
                    name="towFromLocation"
                    render={({ field }) => (
                      <Input
                        label={t.towFromLabel}
                        placeholder={t.towFromPlaceholder}
                        startIcon={<Truck className="w-4 h-4" />}
                        error={errors.towFromLocation?.message}
                        helperText={t.towChargeNotice}
                        {...field}
                      />
                    )}
                  />

                  {/* Managed purchase locations helper chips */}
                  {purchaseLocations.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        {isAr ? 'ساحات مزادات شهيرة مدعومة بالتعرفة:' : 'Supported auction branches:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {purchaseLocations.slice(0, 6).map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => {
                              setValue('towFromLocation', `${loc.name}, ${loc.stateCode}`, {
                                shouldValidate: true,
                              });
                              setValue('purchaseLocationId', loc.id);
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-brand-orange-600 border border-slate-200 transition-colors text-slate-700"
                          >
                            {loc.name} ({loc.stateCode})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t.allChargesInUsd}</span>
              </div>
            </div>
          )}

          {/* STEP 6: Customer Contact Details */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <Controller
                control={control}
                name="customerName"
                render={({ field }) => (
                  <Input
                    label={t.customerNameLabel}
                    placeholder={isAr ? 'مثال: محمد الهاشمي' : 'e.g. Mohammed Al Hashimi'}
                    startIcon={<User className="w-4 h-4" />}
                    error={errors.customerName?.message}
                    {...field}
                  />
                )}
              />

              <Controller
                control={control}
                name="customerPhone"
                render={({ field }) => (
                  <Input
                    label={t.customerPhoneLabel}
                    placeholder="+971 50 123 4567"
                    startIcon={<Phone className="w-4 h-4" />}
                    error={errors.customerPhone?.message}
                    helperText={
                      isAr
                        ? 'سنقوم بإرسال نسخة عرض السعر مباشرة عبر واتساب.'
                        : 'We will send your quote breakdown directly to WhatsApp.'
                    }
                    {...field}
                  />
                )}
              />

              <Controller
                control={control}
                name="customerEmail"
                render={({ field }) => (
                  <Input
                    label={t.customerEmailLabel}
                    type="email"
                    placeholder="name@example.com"
                    startIcon={<Mail className="w-4 h-4" />}
                    error={errors.customerEmail?.message}
                    {...field}
                  />
                )}
              />
            </div>
          )}

          {/* STEP 7: Review & Submit */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <Card className="p-5 sm:p-6 divide-y divide-slate-100">
                <div className="pb-4">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {isAr ? 'ملخص خيارات الشحن قبل الاحتساب' : 'Quote Summary Review'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'يرجى مراجعة تفاصيل الشحن قبل توليد عرض السعر الشامل والموثق.'
                      : 'Please review your shipping selections before generating your comprehensive quotation.'}
                  </p>
                </div>

                <div className="py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">
                      {isAr ? 'فئة المركبة والمحرك:' : 'Vehicle Category:'}
                    </span>
                    <strong className="text-slate-800 uppercase">
                      {formData.vehicleType} ({formData.powertrain})
                    </strong>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">
                      {isAr ? 'مصدر الشراء:' : 'Purchase Source:'}
                    </span>
                    <strong className="text-slate-800 uppercase">{formData.purchaseSource}</strong>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">
                      {isAr ? 'ميناء التحميل (المنشأ):' : 'Loading Port:'}
                    </span>
                    <strong className="text-slate-800 uppercase">{originPortDisplayName}</strong>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">
                      {isAr ? 'ميناء الوصول (الوجهة):' : 'Destination Port:'}
                    </span>
                    <strong className="text-slate-800 uppercase">{destPortDisplayName}</strong>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">
                      {isAr ? 'القيمة المصرح بها للمركبة:' : 'Declared Value:'}
                    </span>
                    <strong className="text-slate-800">
                      ${formData.buyingPrice?.toLocaleString()} USD
                    </strong>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-slate-500 block">
                      {isAr ? 'حالة وموقع النقل الداخلي:' : 'Inland Towing:'}
                    </span>
                    <strong className="text-slate-800 break-words">
                      {formData.includeInlandTowing
                        ? formData.towFromLocation || (isAr ? 'مطلوب (الموقع قيد التحديد)' : 'Requested')
                        : (isAr ? 'غير مطلوب - تسليم مباشر للميناء ($0.00)' : 'Not requested - Direct port delivery ($0.00)')}
                    </strong>
                  </div>
                </div>

                <div className="pt-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {isAr ? 'العميل:' : 'Customer:'} {formData.customerName || 'Inquirer'} (
                      {formData.customerPhone || 'WhatsApp'})
                    </span>
                  </div>
                </div>
              </Card>

              <Alert variant="info" title={isAr ? 'تعرفة نظامية وشفافة' : 'Transparent Tariffs'}>
                {t.demoDataDisclaimer}
              </Alert>
            </div>
          )}

          {/* Desktop/Tablet Navigation buttons */}
          <div className="hidden sm:flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                startIcon={
                  direction === 'rtl' ? (
                    <ArrowRight className="w-4 h-4" />
                  ) : (
                    <ArrowLeft className="w-4 h-4" />
                  )
                }
              >
                {t.btnBack}
              </Button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleNext}
                disabled={currentStep === 3 && Boolean(selectedOriginPort && selectedDestPort && !activeRoute)}
                endIcon={
                  direction === 'rtl' ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )
                }
              >
                {t.btnContinue}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                endIcon={
                  direction === 'rtl' ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )
                }
              >
                {t.btnCalculateShipping}
              </Button>
            )}
          </div>

          {/* Mobile Sticky Navigation Bottom Area */}
          <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-2xl z-30 flex items-center justify-between gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="shrink-0 whitespace-nowrap font-bold"
                startIcon={
                  direction === 'rtl' ? (
                    <ArrowRight className="w-4 h-4" />
                  ) : (
                    <ArrowLeft className="w-4 h-4" />
                  )
                }
              >
                {t.btnBack}
              </Button>
            )}

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                disabled={currentStep === 3 && Boolean(selectedOriginPort && selectedDestPort && !activeRoute)}
                className="flex-1 font-extrabold whitespace-nowrap"
                endIcon={
                  direction === 'rtl' ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )
                }
              >
                {t.btnContinue}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="flex-1 font-extrabold whitespace-nowrap"
                endIcon={
                  direction === 'rtl' ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )
                }
              >
                {t.btnCalculateShipping}
              </Button>
            )}
          </div>
        </form>
      </Container>
    </div>
  );
};
