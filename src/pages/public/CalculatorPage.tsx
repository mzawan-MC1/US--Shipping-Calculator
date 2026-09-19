import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Badge } from '../../components/ui/Badge';
import { quotationService } from '../../services/quotationService';
import { vinService } from '../../services/vinService';
import {
  referenceDataService,
  CountryOption,
  ManagedPortOption,
  RouteOption,
  VehicleCategoryOption,
  PowertrainOption,
  VehicleConditionOption,
  PurchaseSourceOption,
  StateOption,
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
  ShieldAlert,
  Wrench,
  Search,
  Check,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  CalculatorFormData,
  CalculatorAvailabilityResponse,
  EligibleOriginPort,
} from '../../types/calculator';

const calculatorSchema = z
  .object({
    // Step 1: Vehicle Specifications
    vehicleType: z.string().min(1, 'Vehicle category is required'),
    powertrain: z.string().min(1, 'Powertrain is required'),
    conditionId: z.string().min(1, 'Vehicle condition is required'),
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.preprocess(
      (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
      z.number().optional()
    ),
    vin: z.string().optional(),
    lotNumber: z.string().optional(),

    // Step 2: Towing Details
    includeInlandTowing: z.boolean().default(true),
    purchaseSource: z.string().min(1, 'Purchase source is required'),
    stateCode: z.string().optional(),
    purchaseLocationId: z.string().optional(),
    towFromLocation: z.string().optional(),

    // Step 3: Maritime Shipping Route & Method
    loadingPort: z.string().min(1, 'Loading port is required'),
    destinationPort: z.string().min(1, 'Destination port is required'),
    shippingMethod: z.string().min(1, 'Shipping method is required'),

    // Step 4: Value, Contact & Calculation
    buyingPrice: z.number().min(100, 'Please enter a valid vehicle purchase price ($100 minimum)'),
    customerName: z.string().min(2, 'Name is required (minimum 2 characters)'),
    customerPhone: z.string().min(7, 'Valid phone / WhatsApp number is required'),
    customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.includeInlandTowing) {
      if (!data.stateCode || data.stateCode.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select a US state for inland towing',
          path: ['stateCode'],
        });
      }
      if (!data.purchaseLocationId || !data.towFromLocation || data.towFromLocation.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select an authorized pickup location for inland towing',
          path: ['purchaseLocationId'],
        });
      }
    }
  });

type FormData = z.infer<typeof calculatorSchema>;

const STEPS = [
  { id: 1, titleKey: 'calcPhase1Title', short: 'Vehicle' },
  { id: 2, titleKey: 'calcPhase2Title', short: 'Towing' },
  { id: 3, titleKey: 'calcPhase3Title', short: 'Shipping' },
  { id: 4, titleKey: 'calcPhase4Title', short: 'Calculation' },
];

export const CalculatorPage: React.FC = () => {
  const { t, language, direction } = useI18n();
  const { branding, getWhatsAppLink } = useWebsiteSettings();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [dependencyNotice, setDependencyNotice] = useState<string | null>(null);

  // Managed Reference Data State
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [allLoadingPorts, setAllLoadingPorts] = useState<ManagedPortOption[]>([]);
  const [allDestPorts, setAllDestPorts] = useState<ManagedPortOption[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategoryOption[]>([]);
  const [powertrains, setPowertrains] = useState<PowertrainOption[]>([]);
  const [vehicleConditions, setVehicleConditions] = useState<VehicleConditionOption[]>([]);
  const [purchaseSources, setPurchaseSources] = useState<PurchaseSourceOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);

  const [selectedDestCountry, setSelectedDestCountry] = useState<string>('ARE');
  const [isLoadingRefData, setIsLoadingRefData] = useState<boolean>(true);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // Dynamic Availability State
  const [availability, setAvailability] = useState<CalculatorAvailabilityResponse>({
    eligible_pickup_locations: [],
    eligible_origin_ports: [],
    eligible_destination_ports: [],
    eligible_shipping_methods: [],
  });
  const [isLoadingAvailability, setIsLoadingAvailability] = useState<boolean>(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>('');
  const [autoSelectedPort, setAutoSelectedPort] = useState<EligibleOriginPort | null>(null);

  const prevVehicleRef = useRef<{ category: string; condition: string; powertrain: string }>({
    category: 'sedan',
    condition: 'operable',
    powertrain: 'petrol',
  });

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
      conditionId: 'operable',
      make: '',
      model: '',
      year: undefined,
      vin: '',
      lotNumber: '',
      includeInlandTowing: true,
      purchaseSource: 'copart',
      stateCode: '',
      purchaseLocationId: '',
      towFromLocation: '',
      loadingPort: '10000000-0000-0000-0000-000000000003', // Houston Port
      destinationPort: '20000000-0000-0000-0000-000000000001', // Khorfakkan
      shippingMethod: 'consolidated_container',
      buyingPrice: 5000,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      notes: '',
    },
    mode: 'onTouched',
  });

  const formData = watch();

  // VIN Decoding State
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinDecodeSuccess, setVinDecodeSuccess] = useState<string | null>(null);
  const [vinDecodeError, setVinDecodeError] = useState<string | null>(null);
  const [pendingVinOverwrite, setPendingVinOverwrite] = useState<{
    year?: number;
    make?: string;
    model?: string;
  } | null>(null);
  const [vinSuggestion, setVinSuggestion] = useState<{
    categoryId?: string;
    categoryName?: string;
    powertrainId?: string;
    powertrainName?: string;
  } | null>(null);

  const vinAbortRef = useRef<AbortController | null>(null);
  const activeDecodingVinRef = useRef<string>('');

  const applyDecodedVehicleDetails = (decoded: {
    year?: number;
    make?: string;
    model?: string;
  }) => {
    if (decoded.year) setValue('year', decoded.year, { shouldValidate: true });
    if (decoded.make) setValue('make', decoded.make, { shouldValidate: true });
    if (decoded.model) setValue('model', decoded.model, { shouldValidate: true });

    const summary = [decoded.year, decoded.make, decoded.model].filter(Boolean).join(' ');
    setVinDecodeSuccess(
      isAr
        ? `تم فك الشفرة بنجاح: ${summary}`
        : `Decoded successfully: ${summary}`
    );
    setPendingVinOverwrite(null);
  };

  const handleDecodeVin = async (overrideVin?: string) => {
    const rawVin = overrideVin !== undefined ? overrideVin : (formData.vin || '');
    const cleanVin = vinService.sanitizeVin(rawVin);
    if (!cleanVin || cleanVin.length !== 17) {
      setVinDecodeError(
        isAr
          ? 'يرجى إدخال رقم شاصي (VIN) صحيح مكون من 17 حرفاً ورقم (بدون أحرف I, O, Q).'
          : 'Please enter a valid 17-character VIN (excluding I, O, Q).'
      );
      setVinDecodeSuccess(null);
      return;
    }

    // Cancel any in-flight decode request
    if (vinAbortRef.current) {
      vinAbortRef.current.abort();
    }
    const controller = new AbortController();
    vinAbortRef.current = controller;
    activeDecodingVinRef.current = cleanVin;

    setIsDecodingVin(true);
    setVinDecodeError(null);
    setVinDecodeSuccess(null);

    try {
      const res = await vinService.decodeVin(cleanVin, controller.signal);

      // Discard stale responses if active VIN has changed or request was aborted
      if (controller.signal.aborted || activeDecodingVinRef.current !== cleanVin) {
        return;
      }

      if (res.success && (res.year || res.make || res.model)) {
        // Check if user already manually entered year, make, or model
        const hasExisting = Boolean(formData.year || formData.make || formData.model);
        if (hasExisting) {
          const isDifferent =
            (res.year && formData.year && res.year !== formData.year) ||
            (res.make && formData.make && res.make.toLowerCase() !== formData.make.toLowerCase()) ||
            (res.model && formData.model && res.model.toLowerCase() !== formData.model.toLowerCase());

          if (isDifferent) {
            setPendingVinOverwrite({
              year: res.year,
              make: res.make,
              model: res.model,
            });
          } else {
            applyDecodedVehicleDetails(res);
          }
        } else {
          applyDecodedVehicleDetails(res);
        }

        // Handle category & powertrain strictly as suggestions requiring confirmation
        // Verify against active database records; if no active match, leave current selection unchanged
        const matchedCategory = res.suggestedCategoryId
          ? vehicleCategories.find(
              (c) => c.id === res.suggestedCategoryId && c.isActive
            )
          : undefined;

        const matchedPowertrain = res.suggestedPowertrainId
          ? powertrains.find(
              (p) => p.id === res.suggestedPowertrainId && p.isActive
            )
          : undefined;

        const catNeedsSuggestion = Boolean(matchedCategory && matchedCategory.id !== formData.vehicleType);
        const ptNeedsSuggestion = Boolean(matchedPowertrain && matchedPowertrain.id !== formData.powertrain);

        if (catNeedsSuggestion || ptNeedsSuggestion) {
          setVinSuggestion({
            categoryId: catNeedsSuggestion && matchedCategory ? matchedCategory.id : undefined,
            categoryName: catNeedsSuggestion && matchedCategory ? matchedCategory.name : undefined,
            powertrainId: ptNeedsSuggestion && matchedPowertrain ? matchedPowertrain.id : undefined,
            powertrainName: ptNeedsSuggestion && matchedPowertrain ? matchedPowertrain.name : undefined,
          });
        } else {
          setVinSuggestion(null);
        }
      } else {
        setVinDecodeError(
          res.errorMessage ||
            (isAr
              ? 'لم يتم التعرف على تفاصيل المركبة تلقائياً. يمكنك إدخال البيانات يدوياً.'
              : 'Vehicle details could not be decoded. You can enter them manually.')
        );
      }
    } catch {
      if (controller.signal.aborted || activeDecodingVinRef.current !== cleanVin) {
        return;
      }
      setVinDecodeError(
        isAr
          ? 'تعذر الاتصال بقاعدة بيانات VIN. يرجى إدخال البيانات يدوياً.'
          : 'Unable to connect to VIN database. Please enter details manually.'
      );
    } finally {
      if (activeDecodingVinRef.current === cleanVin) {
        setIsDecodingVin(false);
      }
    }
  };

  // Debounced auto-decode when 17 valid characters are typed, with cancellation of stale inputs
  const vinValue = formData.vin;
  useEffect(() => {
    const clean = vinService.sanitizeVin(vinValue || '');
    if (activeDecodingVinRef.current && clean !== activeDecodingVinRef.current) {
      if (vinAbortRef.current) {
        vinAbortRef.current.abort();
        vinAbortRef.current = null;
      }
      activeDecodingVinRef.current = '';
      setIsDecodingVin(false);
      setVinDecodeSuccess(null);
      setVinDecodeError(null);
    }

    if (!vinValue) {
      setVinDecodeSuccess(null);
      setVinDecodeError(null);
      setPendingVinOverwrite(null);
      setVinSuggestion(null);
      return;
    }

    if (clean.length === 17 && vinService.isValidVin(clean)) {
      const timer = setTimeout(() => {
        handleDecodeVin(clean);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [vinValue]);

  // 1. Initial Load of Master Reference Data
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
          fetchedCategories,
          fetchedPowertrains,
          fetchedConditions,
          fetchedSources,
          fetchedStates,
        ] = await Promise.all([
          referenceDataService.getCountries(),
          referenceDataService.getLoadingPorts(),
          referenceDataService.getDestinationPorts(),
          referenceDataService.getActiveRoutes(),
          referenceDataService.getVehicleCategories(),
          referenceDataService.getPowertrains(),
          referenceDataService.getVehicleConditions(),
          referenceDataService.getPurchaseSources(),
          referenceDataService.getStates(),
        ]);

        if (isMounted) {
          setCountries(fetchedCountries);
          setAllLoadingPorts(fetchedLoadingPorts);
          setAllDestPorts(fetchedDestPorts);
          setRoutes(fetchedRoutes);
          setVehicleCategories(fetchedCategories);
          setPowertrains(fetchedPowertrains);
          setVehicleConditions(fetchedConditions);
          setPurchaseSources(fetchedSources);
          setStates(fetchedStates);
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
  }, []);

  // Helper to normalize UUID or slug
  const isUUID = (val?: string) =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  // 2. Query Dynamic Availability Whenever Dependencies Change
  useEffect(() => {
    let isMounted = true;
    async function fetchAvailability() {
      setIsLoadingAvailability(true);
      try {
        const originPortId = isUUID(formData.loadingPort)
          ? formData.loadingPort
          : PORT_SLUG_TO_UUID[formData.loadingPort];
        const destPortId = isUUID(formData.destinationPort)
          ? formData.destinationPort
          : PORT_SLUG_TO_UUID[formData.destinationPort];

        const normalizedCategory =
          formData.vehicleType === 'bike' ? 'motorcycle' : formData.vehicleType;

        const res = await quotationService.getCalculatorAvailability({
          vehicleCategoryId: normalizedCategory,
          conditionId: formData.conditionId || 'operable',
          powertrainId: formData.powertrain || 'petrol',
          purchaseLocationId:
            formData.includeInlandTowing && formData.purchaseLocationId
              ? formData.purchaseLocationId
              : undefined,
          originPortId: originPortId,
          destinationPortId: destPortId,
          includeInlandTowing: formData.includeInlandTowing,
        });

        if (!isMounted) return;

        setAvailability(res);

        // Auto-reselect compatible powertrain & condition if current selection is not eligible
        if (res.eligible_powertrains && res.eligible_powertrains.length > 0) {
          const isPtValid = res.eligible_powertrains.some((p) => p.id === formData.powertrain);
          if (!isPtValid) {
            setValue('powertrain', res.eligible_powertrains[0].id, { shouldValidate: true });
          }
        }
        if (res.eligible_conditions && res.eligible_conditions.length > 0) {
          const isCondValid = res.eligible_conditions.some((c) => c.id === formData.conditionId);
          if (!isCondValid) {
            setValue('conditionId', res.eligible_conditions[0].id, { shouldValidate: true });
          }
        }

        // Check if vehicle specs changed and invalidated downstream selections
        const prev = prevVehicleRef.current;
        const vehicleChanged =
          prev.category !== formData.vehicleType ||
          prev.condition !== formData.conditionId ||
          prev.powertrain !== formData.powertrain;

        if (vehicleChanged) {
          prevVehicleRef.current = {
            category: formData.vehicleType,
            condition: formData.conditionId || 'operable',
            powertrain: formData.powertrain || 'petrol',
          };

          // Revalidate selected pickup location against new eligible locations
          if (
            formData.includeInlandTowing &&
            formData.purchaseLocationId &&
            !res.eligible_pickup_locations.some((l) => l.id === formData.purchaseLocationId)
          ) {
            setValue('purchaseLocationId', '', { shouldValidate: false });
            setValue('towFromLocation', '', { shouldValidate: false });
            setDependencyNotice(
              isAr
                ? 'تم تحديث مواصفات المركبة. يرجى اختيار موقع سحب يتطابق مع المواصفات الجديدة.'
                : 'Vehicle specifications updated. Please select an eligible pickup location for the new vehicle type.'
            );
          }
        }

        // Automatic Origin Port Assignment & Validation
        if (formData.includeInlandTowing && formData.purchaseLocationId) {
          if (res.eligible_origin_ports.length === 1) {
            // Exactly 1 eligible port -> AUTO-SELECT IT!
            const singlePort = res.eligible_origin_ports[0];
            setValue('loadingPort', singlePort.id, { shouldValidate: true });
            setAutoSelectedPort(singlePort);
          } else if (res.eligible_origin_ports.length > 1) {
            setAutoSelectedPort(null);
            const isCurrentlySelectedValid = res.eligible_origin_ports.some(
              (p) =>
                p.id === formData.loadingPort ||
                p.code === formData.loadingPort ||
                PORT_SLUG_TO_UUID[formData.loadingPort] === p.id
            );
            if (!isCurrentlySelectedValid) {
              setValue('loadingPort', res.eligible_origin_ports[0].id, { shouldValidate: true });
            }
          } else {
            // No origin ports have towing rates for this location!
            setAutoSelectedPort(null);
            setValue('loadingPort', '', { shouldValidate: false });
          }
        } else if (!formData.includeInlandTowing) {
          setAutoSelectedPort(null);
          // When towing is excluded, ensure loading port is one of the active route ports
          if (res.eligible_origin_ports.length > 0) {
            const isValid = res.eligible_origin_ports.some(
              (p) =>
                p.id === formData.loadingPort ||
                p.code === formData.loadingPort ||
                PORT_SLUG_TO_UUID[formData.loadingPort] === p.id
            );
            if (!isValid) {
              setValue('loadingPort', res.eligible_origin_ports[0].id, { shouldValidate: true });
            }
          }
        }

        // Revalidate Destination Port
        if (res.eligible_destination_ports.length > 0) {
          const isDestValid = res.eligible_destination_ports.some(
            (p) =>
              p.id === formData.destinationPort ||
              p.code === formData.destinationPort ||
              PORT_SLUG_TO_UUID[formData.destinationPort] === p.id
          );
          if (!isDestValid) {
            const preferred =
              res.eligible_destination_ports.find(
                (p) => p.code === 'AEKLF' || p.code === 'AEKHL'
              ) || res.eligible_destination_ports[0];
            setValue('destinationPort', preferred.id, { shouldValidate: true });
          }
        } else {
          setValue('destinationPort', '', { shouldValidate: false });
        }

        // Revalidate Shipping Method
        const validMethods = (res.eligible_shipping_methods || []).filter(
          (m) => typeof m.base_amount === 'number' && !isNaN(m.base_amount) && m.base_amount > 0
        );
        if (validMethods.length > 0) {
          const isMethodValid = validMethods.some(
            (m) => m.id === formData.shippingMethod
          );
          if (!isMethodValid) {
            const hasConsolidated = validMethods.some(
              (m) => m.id === 'consolidated_container'
            );
            setValue(
              'shippingMethod',
              hasConsolidated ? 'consolidated_container' : validMethods[0].id,
              { shouldValidate: true }
            );
          }
        } else {
          setValue('shippingMethod', '', { shouldValidate: false });
        }
      } catch (err) {
        console.error('[Calculator] Availability error:', err);
      } finally {
        if (isMounted) {
          setIsLoadingAvailability(false);
        }
      }
    }

    fetchAvailability();
    return () => {
      isMounted = false;
    };
  }, [
    formData.vehicleType,
    formData.conditionId,
    formData.powertrain,
    formData.purchaseLocationId,
    formData.includeInlandTowing,
    formData.loadingPort,
    formData.destinationPort,
    setValue,
    isAr,
  ]);

  // Lookup currently selected port and method objects
  const selectedOriginPort = useMemo(() => {
    const fromEligible = availability.eligible_origin_ports.find(
      (p) =>
        p.id === formData.loadingPort ||
        p.code === formData.loadingPort ||
        p.id === PORT_SLUG_TO_UUID[formData.loadingPort]
    );
    if (fromEligible) return fromEligible;

    const found = allLoadingPorts.find(
      (p) =>
        p.id === formData.loadingPort ||
        p.code === formData.loadingPort ||
        p.id === PORT_SLUG_TO_UUID[formData.loadingPort]
    );
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      name_ar: found.nameAr,
      code: found.code,
      state_or_city: found.stateOrCity,
      country_code: found.countryCode,
      towing_rate_type: 'none' as const,
      towing_fixed_amount: 0,
      towing_min_amount: 0,
      towing_max_amount: 0,
    };
  }, [availability.eligible_origin_ports, allLoadingPorts, formData.loadingPort]);

  const selectedDestPort = useMemo(() => {
    const fromEligible = availability.eligible_destination_ports.find(
      (p) =>
        p.id === formData.destinationPort ||
        p.code === formData.destinationPort ||
        p.id === PORT_SLUG_TO_UUID[formData.destinationPort]
    );
    if (fromEligible) return fromEligible;

    const found = allDestPorts.find(
      (p) =>
        p.id === formData.destinationPort ||
        p.code === formData.destinationPort ||
        p.id === PORT_SLUG_TO_UUID[formData.destinationPort]
    );
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      name_ar: found.nameAr,
      code: found.code,
      state_or_city: found.stateOrCity,
      country_code: found.countryCode,
      route_id: '',
      transit_days_min: 28,
      transit_days_max: 35,
    };
  }, [availability.eligible_destination_ports, allDestPorts, formData.destinationPort]);

  const validShippingMethods = useMemo(() => {
    return (availability.eligible_shipping_methods || []).filter(
      (m) => typeof m.base_amount === 'number' && !isNaN(m.base_amount) && m.base_amount > 0
    );
  }, [availability.eligible_shipping_methods]);

  const selectedShippingMethod = useMemo(() => {
    return (
      validShippingMethods.find((m) => m.id === formData.shippingMethod) || null
    );
  }, [validShippingMethods, formData.shippingMethod]);


  // Check active route existence
  const activeRoute = useMemo(() => {
    if (!selectedOriginPort || !selectedDestPort) return null;
    return (
      routes.find(
        (r) =>
          (r.originPortId === selectedOriginPort.id ||
            r.originPortId === PORT_SLUG_TO_UUID[selectedOriginPort.code.toLowerCase()]) &&
          (r.destinationPortId === selectedDestPort.id ||
            r.destinationPortId === PORT_SLUG_TO_UUID[selectedDestPort.code.toLowerCase()]) &&
          r.isActive
      ) || null
    );
  }, [selectedOriginPort, selectedDestPort, routes]);

  const originPortDisplayName = selectedOriginPort
    ? isAr && selectedOriginPort.name_ar
      ? selectedOriginPort.name_ar
      : selectedOriginPort.name
    : formData.loadingPort;

  const destPortDisplayName = selectedDestPort
    ? isAr && selectedDestPort.name_ar
      ? selectedDestPort.name_ar
      : selectedDestPort.name
    : formData.destinationPort;

  // Vehicle Category Extra Charge Notice Helper
  const selectedCategoryObj = useMemo(() => {
    return vehicleCategories.find((c) => c.id === formData.vehicleType);
  }, [vehicleCategories, formData.vehicleType]);

  const categoryNotice = useMemo(() => {
    if (!selectedCategoryObj) return null;
    const tow = selectedCategoryObj.extraTowingCharge || 0;
    const ship = selectedCategoryObj.extraShippingCharge || 0;
    if (tow <= 0 && ship <= 0) return null;

    const catName = isAr && selectedCategoryObj.nameAr ? selectedCategoryObj.nameAr : selectedCategoryObj.name;

    if (isAr) {
      if (tow > 0 && ship > 0) {
        return `مناولة ${catName}: +$${tow} للنقل البري و +$${ship} للشحن البحري.`;
      } else if (tow > 0) {
        return `مناولة ${catName}: +$${tow} للنقل البري.`;
      } else {
        return `مناولة ${catName}: +$${ship} للشحن البحري.`;
      }
    } else {
      if (tow > 0 && ship > 0) {
        return `${catName} handling: +$${tow} towing and +$${ship} shipping.`;
      } else if (tow > 0) {
        return `${catName} handling: +$${tow} towing.`;
      } else {
        return `${catName} handling: +$${ship} shipping.`;
      }
    }
  }, [selectedCategoryObj, isAr]);

  // Powertrain Extra Charge Notice Helper
  const selectedPowertrainObj = useMemo(() => {
    return powertrains.find((p) => p.id === formData.powertrain);
  }, [powertrains, formData.powertrain]);

  const powertrainNotice = useMemo(() => {
    if (!selectedPowertrainObj) return null;
    const tow = selectedPowertrainObj.extraTowingCharge || 0;
    const ship = selectedPowertrainObj.extraShippingCharge || 0;
    if (tow <= 0 && ship <= 0) return null;

    const ptName = isAr && selectedPowertrainObj.nameAr ? selectedPowertrainObj.nameAr : selectedPowertrainObj.name;

    if (isAr) {
      if (tow > 0 && ship > 0) {
        return `مناولة ${ptName}: +$${tow} للنقل البري و +$${ship} للشحن البحري.`;
      } else if (tow > 0) {
        return `مناولة ${ptName}: +$${tow} للنقل البري.`;
      } else {
        return `مناولة ${ptName}: +$${ship} للشحن البحري.`;
      }
    } else {
      if (tow > 0 && ship > 0) {
        return `${ptName} handling: +$${tow} towing and +$${ship} shipping.`;
      } else if (tow > 0) {
        return `${ptName} handling: +$${tow} towing.`;
      } else {
        return `${ptName} handling: +$${ship} shipping.`;
      }
    }
  }, [selectedPowertrainObj, isAr]);

  // Vehicle Condition Extra Charge Notice Helper
  const selectedConditionObj = useMemo(() => {
    return vehicleConditions.find((c) => c.id === formData.conditionId);
  }, [vehicleConditions, formData.conditionId]);

  const conditionNotice = useMemo(() => {
    if (!selectedConditionObj) return null;
    const tow = selectedConditionObj.extraTowingCharge || 0;
    const ship = selectedConditionObj.extraShippingCharge || 0;
    if (tow <= 0 && ship <= 0) return null;

    const condName = isAr && selectedConditionObj.nameAr ? selectedConditionObj.nameAr : selectedConditionObj.name;

    if (isAr) {
      if (tow > 0 && ship > 0) {
        return `حالة المركبة (${condName}): +$${tow} للنقل البري و +$${ship} للشحن البحري.`;
      } else if (tow > 0) {
        return `حالة المركبة (${condName}): +$${tow} للنقل البري.`;
      } else {
        return `حالة المركبة (${condName}): +$${ship} للشحن البحري.`;
      }
    } else {
      if (tow > 0 && ship > 0) {
        return `${condName} condition: +$${tow} towing and +$${ship} shipping.`;
      } else if (tow > 0) {
        return `${condName} condition: +$${tow} towing.`;
      } else {
        return `${condName} condition: +$${ship} shipping.`;
      }
    }
  }, [selectedConditionObj, isAr]);

  // Dynamically eligible Powertrains and Conditions based on Category compatibility
  const displayPowertrains = useMemo(() => {
    if (availability.eligible_powertrains && availability.eligible_powertrains.length > 0) {
      return availability.eligible_powertrains.map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar || undefined,
        isActive: true,
      }));
    }
    return powertrains.map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: undefined as string | undefined,
      isActive: p.isActive,
    }));
  }, [availability.eligible_powertrains, powertrains]);

  const displayConditions = useMemo(() => {
    if (availability.eligible_conditions && availability.eligible_conditions.length > 0) {
      return availability.eligible_conditions.map((c) => ({
        id: c.id,
        title: isAr && c.name_ar ? c.name_ar : c.name,
        desc: c.description || '',
        icon: c.id === 'non_runner' ? Wrench : c.id === 'salvage_damaged' ? ShieldAlert : CheckCircle2,
      }));
    }
    return [
      {
        id: 'operable',
        title: t.conditionOperable,
        desc: t.conditionOperableDesc,
        icon: CheckCircle2,
      },
      {
        id: 'non_runner',
        title: t.conditionNonRunner,
        desc: t.conditionNonRunnerDesc,
        icon: Wrench,
      },
      {
        id: 'salvage_damaged',
        title: t.conditionSalvage,
        desc: t.conditionSalvageDesc,
        icon: ShieldAlert,
      },
    ];
  }, [availability.eligible_conditions, isAr, t]);

  // Available states for selection
  const availableStates = useMemo(() => {
    if (availability.eligible_states && availability.eligible_states.length > 0) {
      return availability.eligible_states;
    }
    return states.map((s) => ({
      code: s.code,
      name: s.name,
      display_order: s.displayOrder,
      locations_count: availability.eligible_pickup_locations.filter((l) => l.state_code === s.code).length,
    }));
  }, [availability.eligible_states, availability.eligible_pickup_locations, states]);

  // Filtered pickup locations based on state and search query
  const filteredPickupLocations = useMemo(() => {
    let locs = availability.eligible_pickup_locations;
    const stCode = formData.stateCode;
    if (stCode) {
      locs = locs.filter((l) => l.state_code.toUpperCase() === stCode.toUpperCase());
    }
    if (locationSearchQuery.trim()) {
      const q = locationSearchQuery.toLowerCase();
      locs = locs.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.state_code.toLowerCase().includes(q) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.location_code && l.location_code.toLowerCase().includes(q)) ||
          (l.auction_company && l.auction_company.toLowerCase().includes(q))
      );
    }
    return locs;
  }, [availability.eligible_pickup_locations, formData.stateCode, locationSearchQuery]);

  // WhatsApp Inquiry Link
  const whatsappInquiryLink = getWhatsAppLink(
    isAr
      ? `مرحباً ${branding.companyNameAr}، أود الاستفسار عن خط شحن بحري ونقل بري لسيارة من ${originPortDisplayName || 'أمريكا'} إلى ${destPortDisplayName || 'الإمارات'}.`
      : `Hello ${branding.companyName}, I would like an inquiry for shipping and towing from ${originPortDisplayName || 'USA'} to ${destPortDisplayName || 'UAE'}.`
  );

  // Navigation handlers
  const handleNext = async () => {
    setDependencyNotice(null);
    setSubmissionError(null);
    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger(['vehicleType', 'powertrain', 'conditionId']);
    } else if (currentStep === 2) {
      if (formData.includeInlandTowing) {
        isValid = await trigger(['stateCode', 'purchaseLocationId']);
        if (!formData.stateCode) {
          setValue('stateCode', '', { shouldValidate: true });
          isValid = false;
        }
        if (!formData.purchaseLocationId) {
          setValue('purchaseLocationId', '', { shouldValidate: true });
          isValid = false;
        }
      } else {
        isValid = true;
      }
    } else if (currentStep === 3) {
      isValid = await trigger(['loadingPort', 'destinationPort', 'shippingMethod']);
      if (isValid && !activeRoute && availability.eligible_destination_ports.length > 0) {
        return;
      }
    } else {
      isValid = true;
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setDependencyNotice(null);
    setSubmissionError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Form Submission (Step 4 -> Results)
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setDependencyNotice(null);

    try {
      const idempotencyKey = `quote-client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const calcData: CalculatorFormData = {
        vehicleType: data.vehicleType,
        powertrain: data.powertrain,
        conditionId: data.conditionId,
        make: data.make,
        model: data.model,
        year: data.year,
        vin: data.vin,
        lotNumber: data.lotNumber,
        purchaseSource: data.purchaseSource,
        stateCode: data.includeInlandTowing ? data.stateCode : undefined,
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
      const errMsg = err instanceof Error ? err.message : '';

      // Controlled error handling: catch business errors and guide user back without DB codes
      if (errMsg.includes('inland towing tariff') || errMsg.includes('pickup location')) {
        setCurrentStep(2);
        setValue('purchaseLocationId', undefined);
        setValue('towFromLocation', '');
        setSubmissionError(
          isAr
            ? 'لم يتم العثور على تعرفة سحب داخلي نشطة لموقع الاستلام المختار وميناء الشحن. يرجى اختيار موقع آخر أو التواصل معنا عبر واتساب للحصول على تسعير خاص.'
            : 'No inland towing tariff is configured for the selected pickup location and loading port. Please select another location or contact us on WhatsApp.'
        );
      } else if (errMsg.includes('ocean freight tariff') || errMsg.includes('shipping route')) {
        setCurrentStep(3);
        setSubmissionError(
          isAr
            ? 'لا تتوفر تعرفة شحن بحري قياسية نشطة لهذا المسار ونوع الحاوية ومواصفات المركبة. يرجى تعديل خيارات الشحن أو التواصل معنا عبر واتساب.'
            : 'No active ocean freight tariff is configured for this route, vehicle specifications and shipping method. Please adjust your selection or contact us on WhatsApp.'
        );
      } else if (
        errMsg.includes('Customer full name is required') ||
        errMsg.includes('Customer phone number is required')
      ) {
        setSubmissionError(errMsg);
      } else {
        setSubmissionError(
          isAr
            ? 'تعذر إتمام احتساب عرض السعر في الوقت الحالي. يرجى التأكد من البيانات أو التواصل معنا عبر واتساب.'
            : 'We could not complete your quotation right now. Please verify your selections or contact us on WhatsApp.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = Math.round((currentStep / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 pb-44 sm:pb-16 w-full overflow-x-hidden">
      <Container className="max-w-3xl px-4 sm:px-6">
        {/* Progress & Operational Phase Header */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              {isAr
                ? `المرحلة ${currentStep} من ${STEPS.length}`
                : `Phase ${currentStep} of ${STEPS.length}`}
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

          <div className="flex items-center justify-between pt-1">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-navy-950">
              {currentStep === 1 && t.calcPhase1Title}
              {currentStep === 2 && t.calcPhase2Title}
              {currentStep === 3 && t.calcPhase3Title}
              {currentStep === 4 && t.calcPhase4Title}
            </h1>

            {isLoadingAvailability && (
              <div className="flex items-center gap-1.5 text-xs text-brand-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="font-semibold">
                  {isAr ? 'تحديث التعرفة...' : 'Syncing tariffs...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Global Notifications & Alerts */}
        {isLoadingRefData && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-xs text-blue-800 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            <span>
              {isAr
                ? 'جاري تحميل أحدث التعرفة والموانئ النشطة...'
                : 'Loading verified maritime ports and route tariffs...'}
            </span>
          </div>
        )}

        {refDataError && (
          <div className="mb-6">
            <Alert variant="warning" title={isAr ? 'تنبيه الاتصال' : 'Database Connection Note'}>
              {refDataError}
            </Alert>
          </div>
        )}

        {dependencyNotice && (
          <div className="mb-6">
            <Alert variant="info" title={isAr ? 'تحديث خيارات الشحن' : 'Shipping Options Refreshed'}>
              {dependencyNotice}
            </Alert>
          </div>
        )}

        {submissionError && (
          <div className="mb-6">
            <Alert variant="error" title={isAr ? 'تعذر احتساب السعر' : 'Tariff Notice'}>
              <div className="space-y-3">
                <p>{submissionError}</p>
                {whatsappInquiryLink && (
                  <div>
                    <a href={whatsappInquiryLink} target="_blank" rel="noopener noreferrer">
                      <Button
                        type="button"
                        variant="whatsapp"
                        size="sm"
                        startIcon={<MessageCircle className="w-4 h-4" />}
                      >
                        {isAr ? 'طلب تسعير خاص عبر واتساب' : 'Inquire on WhatsApp'}
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ======================================================== */}
          {/* PHASE 1: VEHICLE SPECIFICATIONS                          */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* VIN Attribute Suggestions Banner (Explicit Confirmation Required) */}
              {vinSuggestion && (vinSuggestion.categoryId || vinSuggestion.powertrainId) && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-2.5 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-teal-950 text-sm">
                        {isAr ? 'اقتراح مستند إلى رقم الشاصي (VIN)' : 'VIN Specification Suggestion'}
                      </h4>
                      <p className="text-teal-800 text-xs mt-1">
                        {isAr
                          ? `بناءً على رقم الشاصي المدخل، هل ترغب في تطبيق: ${[
                              vinSuggestion.categoryName && `الفئة: ${vinSuggestion.categoryName}`,
                              vinSuggestion.powertrainName && `المحرك: ${vinSuggestion.powertrainName}`,
                            ]
                              .filter(Boolean)
                              .join(' • ')}؟`
                          : `Based on your decoded VIN, would you like to update: ${[
                              vinSuggestion.categoryName && `Category: ${vinSuggestion.categoryName}`,
                              vinSuggestion.powertrainName && `Fuel: ${vinSuggestion.powertrainName}`,
                            ]
                              .filter(Boolean)
                              .join(' • ')}?`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (vinSuggestion.categoryId) {
                          setValue('vehicleType', vinSuggestion.categoryId, { shouldValidate: true });
                        }
                        if (vinSuggestion.powertrainId) {
                          setValue('powertrain', vinSuggestion.powertrainId, { shouldValidate: true });
                        }
                        setVinSuggestion(null);
                      }}
                      className="bg-teal-700 hover:bg-teal-800 text-white"
                    >
                      {isAr ? 'تطبيق الاقتراح' : 'Apply Suggestion'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVinSuggestion(null)}
                    >
                      {isAr ? 'تجاهل والاحتفاظ باختياري' : 'Keep Current Selection'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Vehicle Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  {isAr ? '1. اختر فئة المركبة' : '1. Select Vehicle Category'}
                </label>
                <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                  {(vehicleCategories.length > 0
                    ? vehicleCategories
                    : VEHICLE_TYPES_CONFIG.map((v) => ({ id: v.id, name: v.id, isActive: true }))
                  ).map((vt) => {
                    const isSelected = formData.vehicleType === vt.id;
                    const configMatch = VEHICLE_TYPES_CONFIG.find((c) => c.id === vt.id);
                    const label = configMatch
                      ? t[configMatch.labelKey as keyof typeof t] || vt.name
                      : vt.name;

                    return (
                      <Card
                        key={vt.id}
                        selected={isSelected}
                        interactive
                        compact
                        onClick={() => setValue('vehicleType', vt.id, { shouldValidate: true })}
                        className="p-3 flex flex-col items-center justify-center text-center gap-1.5 min-h-[80px]"
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

                {categoryNotice && (
                  <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold">{categoryNotice}</span>
                  </div>
                )}
              </div>

              {/* Powertrain / Fuel Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {isAr ? '2. نوع المحرك والوقود' : '2. Powertrain / Fuel Type'}
                </label>
                <div className="grid grid-cols-2 min-[380px]:grid-cols-3 gap-2 sm:gap-3">
                  {displayPowertrains.map((pt) => {
                    const isSelected = formData.powertrain === pt.id;
                    const Icon = pt.id === 'electric' ? Zap : pt.id === 'hybrid' ? Fuel : Flame;
                    const configMatch = POWERTRAINS_CONFIG.find((c) => c.id === pt.id);
                    const label = isAr && pt.nameAr ? pt.nameAr : configMatch ? t[configMatch.labelKey as keyof typeof t] || pt.name : pt.name;

                    return (
                      <Card
                        key={pt.id}
                        selected={isSelected}
                        interactive
                        compact
                        onClick={() => setValue('powertrain', pt.id, { shouldValidate: true })}
                        className="p-3 flex flex-col items-center justify-center text-center gap-1.5 min-h-[76px]"
                      >
                        <Icon
                          className={`w-5 h-5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-600'}`}
                        />
                        <span className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-tight px-1">
                          {label}
                        </span>
                      </Card>
                    );
                  })}
                </div>

                {powertrainNotice && (
                  <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold">{powertrainNotice}</span>
                  </div>
                )}
              </div>

              {/* Vehicle Operational Condition */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {isAr ? '3. حالة تشغيل المركبة' : '3. Vehicle Operational Condition'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {displayConditions.map((cond) => {
                    const isSelected = formData.conditionId === cond.id;
                    const Icon = cond.icon;

                    return (
                      <Card
                        key={cond.id}
                        selected={isSelected}
                        interactive
                        onClick={() => setValue('conditionId', cond.id, { shouldValidate: true })}
                        className="p-4 flex flex-col justify-between text-start gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <Icon
                            className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-400'}`}
                          />
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {cond.title}
                            </h4>
                            {cond.desc && (
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                {cond.desc}
                              </p>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="self-end">
                            <Badge variant="orange" size="sm">
                              {isAr ? 'محدد' : 'Selected'}
                            </Badge>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {conditionNotice && (
                  <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold">{conditionNotice}</span>
                  </div>
                )}
              </div>

              {/* Optional Vehicle Details with VIN-First Decoder */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    {isAr
                      ? 'بيانات المركبة التلقائية برقم الشاصي (اختياري)'
                      : 'Vehicle Identification & Specifications (Optional)'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isAr ? 'فك الشفرة التلقائي عبر NHTSA' : 'Instant NHTSA Auto-Decoding'}
                  </span>
                </div>

                {/* Overwrite Confirmation Alert */}
                {pendingVinOverwrite && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-amber-900">
                      {isAr
                        ? `قامت قاعدة بيانات NHTSA بتحديد المركبة كـ: ${[pendingVinOverwrite.year, pendingVinOverwrite.make, pendingVinOverwrite.model].filter(Boolean).join(' ')}. هل تريد استبدال الحقول التي قمت بإدخالها؟`
                        : `NHTSA decoder identified: ${[pendingVinOverwrite.year, pendingVinOverwrite.make, pendingVinOverwrite.model].filter(Boolean).join(' ')}. Overwrite your manually entered fields?`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => applyDecodedVehicleDetails(pendingVinOverwrite)}
                      >
                        {isAr ? 'نعم، استبدل البيانات' : 'Yes, Overwrite'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingVinOverwrite(null)}
                      >
                        {isAr ? 'إلغاء والاحتفاظ بما كتبت' : 'Keep Current Values'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 1. VIN Input & Decoder */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? '1. رقم الشاصي (VIN)' : '1. Vehicle Identification Number (VIN)'}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Controller
                        control={control}
                        name="vin"
                        render={({ field }) => (
                          <Input
                            placeholder="e.g. 1HGCR2F83HA123456"
                            maxLength={17}
                            value={field.value || ''}
                            onChange={(e) => {
                              const sanitized = vinService.sanitizeVin(e.target.value);
                              field.onChange(sanitized);
                            }}
                            className="font-mono uppercase tracking-wider"
                          />
                        )}
                      />
                      {isDecodingVin && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-brand-orange-600 bg-white/90 px-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-[11px] font-semibold">{isAr ? 'فك الشفرة...' : 'Decoding...'}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      disabled={isDecodingVin || !formData.vin || formData.vin.length !== 17}
                      onClick={() => handleDecodeVin()}
                      className="shrink-0 font-bold"
                    >
                      {isAr ? 'فك الشفرة' : 'Decode VIN'}
                    </Button>
                  </div>

                  {vinDecodeSuccess && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{vinDecodeSuccess}</span>
                    </div>
                  )}

                  {vinDecodeError && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{vinDecodeError}</span>
                    </div>
                  )}
                </div>

                {/* 2. Year, 3. Make, 4. Model */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Controller
                    control={control}
                    name="year"
                    render={({ field }) => (
                      <Input
                        label={isAr ? '2. سنة الصنع' : '2. Year'}
                        placeholder="e.g. 2022"
                        type="number"
                        min={1950}
                        max={new Date().getFullYear() + 2}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
                        }
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="make"
                    render={({ field }) => (
                      <Input
                        label={isAr ? '3. الشركة المصنعة' : '3. Make'}
                        placeholder="e.g. Toyota"
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="model"
                    render={({ field }) => (
                      <Input
                        label={isAr ? '4. الموديل' : '4. Model'}
                        placeholder="e.g. Camry"
                        {...field}
                      />
                    )}
                  />
                </div>

                {/* 5. Lot Number (distinct, separate from VIN) */}
                <div>
                  <Controller
                    control={control}
                    name="lotNumber"
                    render={({ field }) => (
                      <Input
                        label={isAr ? '5. رقم اللوت بالمزاد (اختياري، منفصل عن الشاصي)' : '5. Auction Lot Number (Optional, distinct from VIN)'}
                        placeholder="e.g. 54321098"
                        {...field}
                      />
                    )}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isAr
                      ? 'رقم اللوت الصادر من المزاد (Copart / IAAI / Manheim) منفصل عن رقم الشاصي.'
                      : 'Auction-assigned stock or lot number (Copart / IAAI / Manheim), separate from the vehicle VIN.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PHASE 2: INLAND TOWING & PICKUP                          */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Towing Choice Cards */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isAr ? '1. طريقة استلام ونقل المركبة' : '1. Inland Transportation Mode'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Include Inland Towing */}
                  <Card
                    selected={formData.includeInlandTowing}
                    interactive
                    onClick={() => {
                      setValue('includeInlandTowing', true, { shouldValidate: true });
                    }}
                    className="p-4 flex items-start gap-3"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${formData.includeInlandTowing ? 'bg-orange-100 text-brand-orange-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {t.towingModeInlandTitle}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {t.towingModeInlandSubtitle}
                      </p>
                    </div>
                  </Card>

                  {/* Option B: Direct Port Delivery */}
                  <Card
                    selected={!formData.includeInlandTowing}
                    interactive
                    onClick={() => {
                      setValue('includeInlandTowing', false, { shouldValidate: true });
                      setValue('purchaseLocationId', undefined, { shouldValidate: true });
                      setValue('towFromLocation', '', { shouldValidate: true });
                    }}
                    className="p-4 flex items-start gap-3"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!formData.includeInlandTowing ? 'bg-orange-100 text-brand-orange-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                      <Anchor className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {t.towingModeDirectTitle}
                        </h4>
                        <Badge variant="success" size="sm">
                          $0.00
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {t.towingModeDirectSubtitle}
                      </p>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Towing Included: Purchase Source & Active Pickup Locations */}
              {formData.includeInlandTowing ? (
                <div className="space-y-5 pt-2">
                  {/* Purchase Source Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      {isAr ? '2. مصدر شراء المركبة' : '2. Vehicle Purchase Source / Auction'}
                    </label>
                    <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-4 gap-2">
                      {(purchaseSources.length > 0
                        ? purchaseSources
                        : PURCHASE_SOURCES_CONFIG.map((s) => ({ id: s.id, name: s.id, isActive: true }))
                      ).map((src) => {
                        const isSelected = formData.purchaseSource === src.id;
                        const configMatch = PURCHASE_SOURCES_CONFIG.find((c) => c.id === src.id);
                        const label = configMatch
                          ? t[configMatch.labelKey as keyof typeof t] || src.name
                          : src.name;

                        return (
                          <Card
                            key={src.id}
                            selected={isSelected}
                            interactive
                            compact
                            onClick={() => {
                              setValue('purchaseSource', src.id, { shouldValidate: true });
                            }}
                            className="p-2.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[68px]"
                          >
                            <ShoppingBag
                              className={`w-4 h-4 ${isSelected ? 'text-brand-orange-500' : 'text-slate-500'}`}
                            />
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">
                              {label}
                            </span>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2B: US State Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        {isAr ? '3. اختر الولاية الأمريكية' : '3. Select US State'} <span className="text-rose-500">*</span>
                      </label>
                      {formData.stateCode && (
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {formData.stateCode}
                        </span>
                      )}
                    </div>
                    <select
                      value={formData.stateCode || ''}
                      onChange={(e) => {
                        const newSt = e.target.value;
                        setValue('stateCode', newSt, { shouldValidate: true });
                        setValue('purchaseLocationId', '', { shouldValidate: false });
                        setValue('towFromLocation', '', { shouldValidate: false });
                        setAutoSelectedPort(null);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange-500"
                    >
                      <option value="">{isAr ? 'اختر الولاية...' : 'Select US State...'}</option>
                      {availableStates.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.name} ({st.code}){st.locations_count > 0 ? ` • ${st.locations_count} ${isAr ? 'مواقع' : 'locations'}` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.stateCode && (
                      <p className="text-xs font-semibold text-red-600 mt-1">
                        {errors.stateCode.message}
                      </p>
                    )}
                  </div>

                  {/* Step 2C: Pickup Location Selection (Database-driven active towing brackets) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        {isAr ? '4. ساحة أو فرع الاستلام (الموقع المعتمد)' : '4. Pickup Location / Branch'} <span className="text-rose-500">*</span>
                      </label>
                      {formData.stateCode && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {filteredPickupLocations.length}{' '}
                          {isAr ? 'موقع نشط بالتعرفة' : 'active locations'} in {formData.stateCode}
                        </span>
                      )}
                    </div>

                    {!formData.stateCode ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium">
                        {isAr ? 'يرجى اختيار الولاية أعلاه لعرض ساحات وفروع الاستلام المتاحة.' : 'Please select a US State above to view available pickup locations.'}
                      </div>
                    ) : (
                      <>
                        {/* Search / Filter Input */}
                        {filteredPickupLocations.length > 3 && (
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={locationSearchQuery}
                              onChange={(e) => setLocationSearchQuery(e.target.value)}
                              placeholder={
                                isAr
                                  ? 'ابحث باسم المدينة أو الفرع...'
                                  : 'Filter by city, branch name, or auction...'
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-9 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange-500"
                            />
                            {locationSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setLocationSearchQuery('')}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}

                        {/* Location Selection Grid */}
                        {filteredPickupLocations.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                            {filteredPickupLocations.map((loc) => {
                              const isSelected = formData.purchaseLocationId === loc.id;

                              return (
                                <Card
                                  key={loc.id}
                                  selected={isSelected}
                                  interactive
                                  onClick={() => {
                                    setValue('purchaseLocationId', loc.id, { shouldValidate: true });
                                    setValue('towFromLocation', `${loc.name}, ${loc.city || loc.state_code}`, {
                                      shouldValidate: true,
                                    });
                                  }}
                                  className="p-3 flex items-center justify-between text-start"
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <MapPin
                                      className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-400'}`}
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                                          {loc.name}
                                        </h4>
                                        {loc.auction_company && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                            {loc.auction_company}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                        {loc.city && <span>{loc.city}, </span>}
                                        <span>{loc.state_code}</span>
                                        <span>•</span>
                                        <span className="text-brand-orange-600 font-semibold">
                                          {loc.available_ports_count} {isAr ? 'ميناء متصل' : 'connected port'}{loc.available_ports_count > 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-brand-orange-500 shrink-0 ml-2" />}
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-bold">
                                  {isAr
                                    ? `لا تتوفر ساحات استلام نشطة في ${formData.stateCode}`
                                    : `No Active Pickup Locations in ${formData.stateCode}`}
                                </h4>
                                <p className="mt-1 text-amber-800 leading-relaxed">
                                  {isAr
                                    ? 'لا تتوفر أسعار سحب نشطة حالياً لهذه الولاية. يرجى اختيار ولاية أخرى أو طلب تسعير مخصص.'
                                    : 'No active towing rates are currently configured for this state. Please choose another state or request a custom quote.'}
                                </p>
                              </div>
                            </div>
                            {whatsappInquiryLink && (
                              <div className="pt-1">
                                <a href={whatsappInquiryLink} target="_blank" rel="noopener noreferrer">
                                  <Button
                                    type="button"
                                    variant="whatsapp"
                                    size="sm"
                                    startIcon={<MessageCircle className="w-3.5 h-3.5" />}
                                  >
                                    {isAr ? 'طلب تسعير سحب خاص عبر واتساب' : 'Request Custom Towing Quote'}
                                  </Button>
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {errors.purchaseLocationId && (
                          <p className="text-xs font-semibold text-red-600 pt-1">
                            {errors.purchaseLocationId.message}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Step 2D: Connected US Loading Port & Towing Fee Badges */}
                  {formData.purchaseLocationId && (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          {isAr ? '5. ميناء التحميل الأمريكي المتصل ورسوم السحب' : '5. Connected Loading Port & Towing Fee'} <span className="text-rose-500">*</span>
                        </label>
                        {availability.eligible_origin_ports.length === 1 && (
                          <Badge variant="orange" size="sm">
                            {isAr ? 'ميناء مخصص تلقائياً' : 'Auto-Assigned Port'}
                          </Badge>
                        )}
                      </div>

                      {availability.eligible_origin_ports.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {availability.eligible_origin_ports.map((port) => {
                            const isSelected =
                              formData.loadingPort === port.id ||
                              formData.loadingPort === port.code ||
                              PORT_SLUG_TO_UUID[formData.loadingPort] === port.id;
                            const displayName = isAr && port.name_ar ? port.name_ar : port.name;

                            return (
                              <Card
                                key={port.id}
                                selected={isSelected}
                                interactive
                                onClick={() => setValue('loadingPort', port.id, { shouldValidate: true })}
                                className="p-3.5 flex items-center justify-between text-start"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <Anchor className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-400'}`} />
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                                      {displayName}
                                    </h4>
                                    <span className="text-[11px] text-slate-500 font-mono">
                                      {port.code} • {port.state_or_city || 'USA'}
                                    </span>
                                    <div className="pt-1.5">
                                      {port.towing_rate_type === 'range' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                          Est. Towing: ${port.towing_min_amount} – ${port.towing_max_amount}
                                        </span>
                                      ) : port.towing_rate_type === 'fixed' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          Towing: ${port.towing_fixed_amount}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                          Direct Port Delivery ($0.00)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-brand-orange-500 shrink-0 ml-2" />}
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                          {isAr
                            ? 'لا توجد موانئ تحميل برسم سحب نشط لهذا الموقع وفئة المركبة. يرجى اختيار موقع آخر.'
                            : 'No loading ports with active towing brackets are configured for this pickup location. Please choose another location or contact us.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">
                      {isAr
                        ? 'تم اختيار التسليم المباشر للميناء'
                        : 'Direct Port Delivery Confirmed'}
                    </h4>
                    <p className="text-emerald-700 mt-1 leading-relaxed">
                      {isAr
                        ? 'ستقوم أنت أو البائع بتسليم المركبة مباشرة إلى مستودع الميناء المعتمد. لن يتم احتساب أي رسوم سحب داخلي ($0.00).'
                        : 'You or your dealer will deliver the vehicle directly to the loading port terminal. Inland towing fee is $0.00.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* PHASE 3: MARITIME SHIPPING & ROUTE                       */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Origin Loading Port Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isAr ? '1. ميناء التحميل (أمريكا)' : '1. Origin Loading Port (USA)'}
                  </label>
                  {autoSelectedPort && (
                    <Badge variant="orange" size="sm">
                      {isAr ? 'ميناء محدد تلقائياً بناءً على موقع السحب' : 'Assigned from Towing Location'}
                    </Badge>
                  )}
                </div>

                {/* Single Designated Port Auto-Selection Notice */}
                {autoSelectedPort && (
                  <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2.5 text-xs text-orange-950">
                    <Info className="w-4 h-4 text-brand-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold">
                        {isAr
                          ? `ميناء الشحن المعتمد: ${originPortDisplayName}`
                          : `Designated Loading Port: ${originPortDisplayName}`}
                      </h5>
                      <p className="text-orange-800 mt-0.5">
                        {isAr
                          ? 'تم اختيار هذا الميناء تلقائياً لأنه الميناء المعتمد في تعرفة النقل البري لموقع السحب المختار.'
                          : 'Automatically assigned based on the active towing bracket configured for your pickup location.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Available Ports Grid with Towing Fee Badges */}
                {availability.eligible_origin_ports.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availability.eligible_origin_ports.map((port) => {
                      const isSelected =
                        formData.loadingPort === port.id ||
                        formData.loadingPort === port.code ||
                        PORT_SLUG_TO_UUID[formData.loadingPort] === port.id;
                      const displayName = isAr && port.name_ar ? port.name_ar : port.name;

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
                              <h4 className="text-sm font-bold text-slate-900">{displayName}</h4>
                              <p className="text-xs text-slate-500 font-medium">
                                {port.state_or_city ? `${port.state_or_city} • ` : ''}
                                <span className="font-mono">{port.code}</span>
                              </p>
                            </div>
                          </div>

                          {/* Towing Rate Badge for this port */}
                          {formData.includeInlandTowing ? (
                            <div className="text-end">
                              {port.towing_rate_type === 'fixed' ? (
                                <Badge variant="navy" size="sm">
                                  {typeof port.towing_fixed_amount === 'number' && !isNaN(port.towing_fixed_amount)
                                    ? `$${port.towing_fixed_amount.toLocaleString()} USD`
                                    : '—'}
                                </Badge>
                              ) : (
                                <Badge variant="navy" size="sm">
                                  ${port.towing_min_amount} – ${port.towing_max_amount} USD
                                </Badge>
                              )}
                              <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                                {port.towing_rate_type === 'fixed'
                                  ? isAr
                                    ? 'سحب ثابت'
                                    : 'Fixed Tow'
                                  : isAr
                                    ? 'سحب تقريبي'
                                    : 'Tow Range'}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="success" size="sm">
                              {isAr ? 'تسليم مباشر ($0)' : 'Direct Delivery ($0)'}
                            </Badge>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold">
                          {isAr
                            ? 'لا توجد موانئ تحميل مرتبطة بهذا الموقع'
                            : 'No Connected Loading Ports'}
                        </h4>
                        <p className="mt-1 text-amber-800 leading-relaxed">
                          {isAr
                            ? 'لا تتوفر تعرفة سحب ملاحية نشطة من هذا الموقع لموانئ الشحن. يرجى الرجوع واختيار موقع آخر أو التواصل مع خبرائنا.'
                            : 'No active towing tariffs are linked from this pickup location to any US loading ports. Please select another location or contact our logistics team.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep(2)}
                      >
                        {isAr ? 'تغيير موقع السحب' : 'Change Pickup Location'}
                      </Button>
                      {whatsappInquiryLink && (
                        <a href={whatsappInquiryLink} target="_blank" rel="noopener noreferrer">
                          <Button
                            type="button"
                            variant="whatsapp"
                            size="sm"
                            startIcon={<MessageCircle className="w-3.5 h-3.5" />}
                          >
                            {isAr ? 'استفسار عبر واتساب' : 'Inquire on WhatsApp'}
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Destination Port Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isAr ? '2. ميناء الوصول (الإمارات)' : '2. Destination Port (UAE)'}
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
                  {availability.eligible_destination_ports.map((port) => {
                    const isSelected =
                      formData.destinationPort === port.id ||
                      formData.destinationPort === port.code ||
                      PORT_SLUG_TO_UUID[formData.destinationPort] === port.id;
                    const displayName = isAr && port.name_ar ? port.name_ar : port.name;

                    return (
                      <Card
                        key={port.id}
                        selected={isSelected}
                        interactive
                        onClick={() =>
                          setValue('destinationPort', port.id, { shouldValidate: true })
                        }
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Anchor
                            className={`w-5 h-5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-400'}`}
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{displayName}</h4>
                            <p className="text-xs text-emerald-600 font-semibold">
                              {port.state_or_city ? `${port.state_or_city} • ` : ''}
                              <span className="font-mono">{port.code}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-xs">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>
                            {port.transit_days_min} – {port.transit_days_max} {isAr ? 'يوم' : 'Days'}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Shipping Method Section (with active freight rates) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isAr ? '3. نظام الشحن ونوع الحاوية' : '3. Shipping Method & Container Mode'}
                </label>
                {validShippingMethods.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {validShippingMethods.map((method) => {
                      const isSelected = formData.shippingMethod === method.id;
                      const isDedicated = method.id === 'dedicated_container';
                      const formattedRate =
                        typeof method.base_amount === 'number' && !isNaN(method.base_amount) && method.base_amount > 0
                          ? `$${method.base_amount.toLocaleString()} ${method.currency || 'USD'}`
                          : null;

                      return (
                        <Card
                          key={method.id}
                          selected={isSelected}
                          interactive
                          onClick={() =>
                            setValue('shippingMethod', method.id, { shouldValidate: true })
                          }
                          className="p-4 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3.5">
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
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                                    {method.name}
                                  </h4>
                                  {!isDedicated && (
                                    <Badge variant="orange" size="sm">
                                      {isAr ? 'الأكثر توفيراً وموصى به' : 'Recommended'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                  {isDedicated
                                    ? t.shippingMethodDedicatedDesc
                                    : t.shippingMethodConsolidatedDesc}
                                </p>
                              </div>
                            </div>

                            <div className="text-end shrink-0">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                {isAr ? 'الشحن البحري يبدأ من:' : 'Freight Tariff:'}
                              </span>
                              <strong className="text-sm sm:text-base font-black text-brand-navy-950">
                                {formattedRate || (isAr ? 'تسعير مخصص' : 'Custom Quote')}
                              </strong>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold">
                          {isAr ? 'لا تتوفر أسعار شحن نشطة لهذا المسار' : 'No Active Freight Rates for this Route'}
                        </h4>
                        <p className="mt-1 text-amber-800 leading-relaxed">
                          {isAr
                            ? 'لا تتوفر تعرفة شحن نشطة حالياً بين المينائين المحددين. يمكنك تغيير الميناء أو طلب تسعير شحن مخصص.'
                            : 'No active shipping freight rates are currently configured for this route. You can choose another port or request a custom quote.'}
                        </p>
                      </div>
                    </div>
                    {whatsappInquiryLink && (
                      <div className="pt-1">
                        <a href={whatsappInquiryLink} target="_blank" rel="noopener noreferrer">
                          <Button
                            type="button"
                            variant="whatsapp"
                            size="sm"
                            startIcon={<MessageCircle className="w-3.5 h-3.5" />}
                          >
                            {isAr ? 'طلب تسعير شحن خاص عبر واتساب' : 'Request Custom Freight Quote'}
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PHASE 4: CALCULATION & COMPREHENSIVE REVIEW              */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Financial Inputs (Declared Price) */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
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
              </div>

              {/* Customer Contact Details */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  {isAr ? 'بيانات التواصل لإرسال عرض السعر' : 'Customer Contact Details'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            ? 'سنقوم بإرسال نسخة عرض السعر فوراً عبر واتساب.'
                            : 'We will send your quote breakdown directly to WhatsApp.'
                        }
                        {...field}
                      />
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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

                  <Controller
                    control={control}
                    name="notes"
                    render={({ field }) => (
                      <Input
                        label={isAr ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                        placeholder={isAr ? 'أي متطلبات خاصة...' : 'Any special instructions...'}
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Authoritative 4-Section Review Card */}
              <Card className="p-5 sm:p-6 divide-y divide-slate-100 bg-white border border-slate-200">
                <div className="pb-4">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {isAr ? 'ملخص ومراجعة تفاصيل الشحن قبل الاحتساب' : 'Quotation Details Review'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'مراجعة شاملة لكافة الخيارات التشغيلية والموانئ قبل توليد عرض السعر الموثق.'
                      : 'Comprehensive review of your vehicle, towing, and maritime selections before calculation.'}
                  </p>
                </div>

                {/* Section 1: Vehicle Specifications */}
                <div className="py-3.5 space-y-1 text-xs">
                  <span className="text-[11px] font-bold text-brand-orange-600 uppercase tracking-wider block">
                    {isAr ? '1. مواصفات وحالة المركبة' : '1. Vehicle Specifications'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-slate-800">
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'الفئة:' : 'Category:'}</span>
                      <strong className="uppercase">{formData.vehicleType}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'المحرك:' : 'Powertrain:'}</span>
                      <strong className="uppercase">{formData.powertrain}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'الحالة التشغيلية:' : 'Condition:'}</span>
                      <strong className="capitalize">
                        {formData.conditionId === 'operable'
                          ? t.conditionOperable
                          : formData.conditionId === 'non_runner'
                            ? t.conditionNonRunner
                            : t.conditionSalvage}
                      </strong>
                    </div>
                    {(formData.make || formData.model || formData.year) && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">{isAr ? 'المركبة:' : 'Vehicle:'}</span>
                        <strong>
                          {[formData.year, formData.make, formData.model].filter(Boolean).join(' ')}
                        </strong>
                      </div>
                    )}
                    {categoryNotice && (
                      <div className="col-span-2 sm:col-span-3 mt-1.5 p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-center gap-2 text-xs text-amber-900 shadow-sm">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-semibold">{categoryNotice}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Inland Logistics & Towing */}
                <div className="py-3.5 space-y-1 text-xs">
                  <span className="text-[11px] font-bold text-brand-orange-600 uppercase tracking-wider block">
                    {isAr ? '2. النقل البري والسحب الداخلي' : '2. Inland Logistics & Pickup'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-800">
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'طريقة الاستلام:' : 'Service:'}</span>
                      <strong>
                        {formData.includeInlandTowing
                          ? isAr
                            ? 'نقل بري داخلي معتمد'
                            : 'Inland Towing Included'
                          : isAr
                            ? 'تسليم مباشر لمستودع الميناء ($0.00)'
                            : 'Direct Port Delivery ($0.00)'}
                      </strong>
                    </div>
                    {formData.includeInlandTowing && (
                      <div>
                        <span className="text-slate-500 block">{isAr ? 'المصدر والساحة:' : 'Source & Location:'}</span>
                        <strong className="uppercase">
                          {formData.purchaseSource} • {formData.towFromLocation || 'Selected Location'}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Maritime Shipping Route */}
                <div className="py-3.5 space-y-1 text-xs">
                  <span className="text-[11px] font-bold text-brand-orange-600 uppercase tracking-wider block">
                    {isAr ? '3. الشحن البحري والمسار' : '3. Ocean Freight & Maritime Route'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-800">
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'ميناء التحميل (المنشأ):' : 'Loading Port:'}</span>
                      <strong>{originPortDisplayName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'ميناء الوصول (الوجهة):' : 'Destination Port:'}</span>
                      <strong>{destPortDisplayName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'نظام الحاوية:' : 'Method:'}</span>
                      <strong>
                        {selectedShippingMethod?.name || formData.shippingMethod}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Section 4: Valuation & Customer */}
                <div className="pt-3.5 space-y-1 text-xs">
                  <span className="text-[11px] font-bold text-brand-orange-600 uppercase tracking-wider block">
                    {isAr ? '4. القيمة المصرحة والمستفسر' : '4. Valuation & Inquirer'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-800">
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'القيمة المصرح بها للمركبة:' : 'Declared Value:'}</span>
                      <strong className="text-emerald-700 font-black">
                        {typeof formData.buyingPrice === 'number' && !isNaN(formData.buyingPrice)
                          ? `$${formData.buyingPrice.toLocaleString()} USD`
                          : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isAr ? 'مقدم الطلب:' : 'Contact:'}</span>
                      <strong>
                        {formData.customerName || 'Inquirer'} ({formData.customerPhone || 'Phone'})
                      </strong>
                    </div>
                  </div>
                </div>
              </Card>

              <Alert variant="info" title={isAr ? 'تعرفة نظامية وشفافة' : 'Transparent Authoritative Tariffs'}>
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
                  direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />
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
                disabled={
                  (currentStep === 2 && formData.includeInlandTowing && !formData.purchaseLocationId) ||
                  (currentStep === 3 && Boolean(selectedOriginPort && selectedDestPort && !activeRoute))
                }
                endIcon={
                  direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />
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
                  direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />
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
                  direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />
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
                disabled={
                  (currentStep === 2 && formData.includeInlandTowing && !formData.purchaseLocationId) ||
                  (currentStep === 3 && Boolean(selectedOriginPort && selectedDestPort && !activeRoute))
                }
                className="flex-1 font-extrabold whitespace-nowrap"
                endIcon={
                  direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />
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
                  direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />
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
