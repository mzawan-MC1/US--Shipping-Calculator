import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useI18n } from '../../i18n/I18nContext';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { quotationService } from '../../services/quotationService';
import {
  US_LOADING_PORTS,
  UAE_DESTINATION_PORTS,
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
} from 'lucide-react';
import { CalculatorFormData, UsLoadingPort, UaeDestinationPort } from '../../types/calculator';

const calculatorSchema = z.object({
  vehicleType: z.enum(['sedan', 'suv', 'van', 'pickup', 'bike']),
  powertrain: z.enum(['petrol', 'hybrid', 'electric']),
  purchaseSource: z.enum(['copart', 'iaai', 'manheim', 'acv', 'adesa', 'dealer', 'other']),
  loadingPort: z.enum(['newark', 'savannah', 'houston', 'los_angeles', 'baltimore']),
  destinationPort: z.enum(['khorfakkan', 'jebel_ali']),
  shippingMethod: z
    .enum(['consolidated_container', 'dedicated_container'])
    .default('consolidated_container'),
  buyingPrice: z.number().min(100, 'Please enter a valid vehicle purchase price ($100 minimum)'),
  towFromLocation: z.string().optional(),
  customerName: z.string().min(2, 'Name is required (minimum 2 characters)'),
  customerPhone: z.string().min(7, 'Valid phone / WhatsApp number is required'),
  customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  notes: z.string().optional(),
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
  const { t, direction } = useI18n();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      towFromLocation: 'Houston, TX (Copart Houston)',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      notes: '',
    },
    mode: 'onTouched',
  });

  const formData = watch();

  const handleNext = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await trigger(['vehicleType', 'powertrain']);
    } else if (currentStep === 2) {
      isValid = await trigger(['purchaseSource']);
    } else if (currentStep === 3) {
      isValid = await trigger(['loadingPort', 'destinationPort']);
    } else if (currentStep === 4) {
      isValid = await trigger(['shippingMethod']);
    } else if (currentStep === 5) {
      isValid = await trigger(['buyingPrice']);
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
    try {
      const idempotencyKey = `quote-client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const calcData: CalculatorFormData = {
        vehicleType: data.vehicleType,
        powertrain: data.powertrain,
        purchaseSource: data.purchaseSource,
        loadingPort: data.loadingPort,
        destinationPort: data.destinationPort,
        shippingMethod: data.shippingMethod,
        buyingPrice: data.buyingPrice,
        towFromLocation: data.towFromLocation,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        notes: data.notes,
        idempotencyKey,
      };

      await quotationService.calculateQuote(calcData);
      navigate('/results');
    } catch (err) {
      console.error('Calculation error:', err);
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
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {progressPercentage}% Completed
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
            {currentStep === 4 && 'SHIPPING METHOD'}
            {currentStep === 5 && t.calcStep6Title}
            {currentStep === 6 && t.calcStep7Title}
            {currentStep === 7 && 'REVIEW YOUR SHIPPING QUOTE'}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* STEP 1: Vehicle & Powertrain */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Select Vehicle Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {VEHICLE_TYPES_CONFIG.map((vt) => {
                    const isSelected = formData.vehicleType === vt.id;
                    return (
                      <Card
                        key={vt.id}
                        selected={isSelected}
                        interactive
                        onClick={() => setValue('vehicleType', vt.id, { shouldValidate: true })}
                        className="p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[96px]"
                      >
                        <Car
                          className={`w-7 h-7 ${isSelected ? 'text-brand-orange-500' : 'text-slate-600'}`}
                        />
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {t[vt.labelKey as keyof typeof t] || vt.id}
                        </span>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Powertrain / Fuel Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {POWERTRAINS_CONFIG.map((pt) => {
                    const isSelected = formData.powertrain === pt.id;
                    const Icon = pt.id === 'electric' ? Zap : pt.id === 'hybrid' ? Fuel : Flame;
                    return (
                      <Card
                        key={pt.id}
                        selected={isSelected}
                        interactive
                        onClick={() => setValue('powertrain', pt.id, { shouldValidate: true })}
                        className="p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[96px]"
                      >
                        <Icon
                          className={`w-6 h-6 ${isSelected ? 'text-brand-orange-500' : 'text-slate-600'}`}
                        />
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {t[pt.labelKey as keyof typeof t] || pt.id}
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
                Where did you purchase or plan to buy the vehicle?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PURCHASE_SOURCES_CONFIG.map((src) => {
                  const isSelected = formData.purchaseSource === src.id;
                  return (
                    <Card
                      key={src.id}
                      selected={isSelected}
                      interactive
                      onClick={() => setValue('purchaseSource', src.id, { shouldValidate: true })}
                      className="p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[90px]"
                    >
                      <ShoppingBag
                        className={`w-5 h-5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-500'}`}
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {t[src.labelKey as keyof typeof t] || src.id}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Route Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  USA Loading Port
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {US_LOADING_PORTS.map((port) => {
                    const isSelected = formData.loadingPort === port.id;
                    return (
                      <Card
                        key={port.id}
                        selected={isSelected}
                        interactive
                        onClick={() =>
                          setValue('loadingPort', port.id as UsLoadingPort, {
                            shouldValidate: true,
                          })
                        }
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Anchor
                            className={`w-5 h-5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-400'}`}
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {port.name}, {port.stateOrCity}
                            </h4>
                            <p className="text-xs text-slate-500 font-mono">{port.code}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  UAE Destination Port
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {UAE_DESTINATION_PORTS.map((port) => {
                    const isSelected = formData.destinationPort === port.id;
                    return (
                      <Card
                        key={port.id}
                        selected={isSelected}
                        interactive
                        onClick={() =>
                          setValue('destinationPort', port.id as UaeDestinationPort, {
                            shouldValidate: true,
                          })
                        }
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Anchor
                            className={`w-5 h-5 ${isSelected ? 'text-brand-orange-500' : 'text-slate-400'}`}
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{port.name}</h4>
                            <p className="text-xs text-emerald-600 font-semibold">
                              {port.stateOrCity}, UAE
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Shipping Method */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Choose Transport Container Mode
              </label>
              <div className="grid grid-cols-1 gap-4">
                <Card
                  selected={formData.shippingMethod === 'consolidated_container'}
                  interactive
                  onClick={() =>
                    setValue('shippingMethod', 'consolidated_container', { shouldValidate: true })
                  }
                  className="p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-brand-orange-600 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        Consolidated Shared Container (Recommended)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Your vehicle is securely lashed and loaded in a 40ft/45ft High Cube
                        container with other vehicles. Most economical and safe.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  selected={formData.shippingMethod === 'dedicated_container'}
                  interactive
                  onClick={() =>
                    setValue('shippingMethod', 'dedicated_container', { shouldValidate: true })
                  }
                  className="p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Anchor className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        Dedicated Exclusive Container
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Dedicated 20ft or 40ft private container for luxury, exotic, or high-value
                        vehicles with customized direct loading.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* STEP 5: Buying Price & Towing */}
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
                    helperText="Used to estimate destination Customs Duty (5%) and UAE VAT (5.2%)."
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />

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

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t.allChargesInUsd}</span>
              </div>
            </div>
          )}

          {/* STEP 6: Customer Details */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <Controller
                control={control}
                name="customerName"
                render={({ field }) => (
                  <Input
                    label={t.customerNameLabel}
                    placeholder="e.g. Mohammed Al Hashimi"
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
                    helperText="We will send your quote directly to WhatsApp."
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
                  <h3 className="text-base font-bold text-slate-900 mb-1">Quote Summary Review</h3>
                  <p className="text-xs text-slate-500">
                    Please review your shipping selections before generating your comprehensive
                    quotation.
                  </p>
                </div>

                <div className="py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">Vehicle Category:</span>
                    <strong className="text-slate-800 uppercase">
                      {formData.vehicleType} ({formData.powertrain})
                    </strong>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">Purchase Source:</span>
                    <strong className="text-slate-800 uppercase">{formData.purchaseSource}</strong>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">US Loading Port:</span>
                    <strong className="text-slate-800 uppercase">{formData.loadingPort}</strong>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">UAE Destination:</span>
                    <strong className="text-slate-800 uppercase">{formData.destinationPort}</strong>
                  </div>
                  <div className="flex justify-between sm:block border-b sm:border-b-0 pb-1 sm:pb-0">
                    <span className="text-slate-500 block">Declared Value:</span>
                    <strong className="text-slate-800">
                      ${formData.buyingPrice?.toLocaleString()} USD
                    </strong>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-slate-500 block">Towing Origin:</span>
                    <strong className="text-slate-800 break-words">
                      {formData.towFromLocation || 'Not specified'}
                    </strong>
                  </div>
                </div>

                <div className="pt-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Customer: {formData.customerName || 'Inquirer'} (
                      {formData.customerPhone || 'WhatsApp'})
                    </span>
                  </div>
                </div>
              </Card>

              <Alert variant="info" title="Transparent Tariffs">
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

          {/* Sticky Mobile Bottom Navigation Area with Safe-Area support */}
          <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-2xl z-30 flex items-center justify-between gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="shrink-0"
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
                className="flex-1 font-extrabold"
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
                className="flex-1 font-extrabold"
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
