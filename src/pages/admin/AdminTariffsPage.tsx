import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import {
  adminService,
  AdminFreightRate,
  AdminTowingRate,
  AdminRoute,
  AdminPort,
  AdminVehicleCategory,
  AdminShippingMethod,
  AdminPowertrain,
  AdminPurchaseLocation,
  AdminAdditionalChargeRule,
  AdminQuotationRule,
  AdminVehicleAttribute,
  VehicleCategoryCompatibility,
  AttributePriceAdjustment,
} from '../../services/adminService';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../features/auth/AuthContext';
import {
  DollarSign,
  Ship,
  Truck,
  RefreshCw,
  Clock,
  TrendingUp,
  AlertCircle,
  Edit2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Sliders,
  FileText,
  ArrowUp,
  ArrowDown,
  Layers,
  Zap,
  Wrench,
} from 'lucide-react';

export const AdminTariffsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManagePricing = hasPermission('pricing.manage');

  const [activeTab, setActiveTab] = useState<'freight' | 'towing' | 'attributes' | 'surcharges' | 'rules' | 'exchange'>('freight');
  const [freightRates, setFreightRates] = useState<AdminFreightRate[]>([]);
  const [towingRates, setTowingRates] = useState<AdminTowingRate[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [ports, setPorts] = useState<AdminPort[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<AdminVehicleCategory[]>([]);
  const [shippingMethods, setShippingMethods] = useState<AdminShippingMethod[]>([]);
  const [powertrains, setPowertrains] = useState<AdminPowertrain[]>([]);
  const [purchaseLocations, setPurchaseLocations] = useState<AdminPurchaseLocation[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdminAdditionalChargeRule[]>([]);

  // Vehicle Attributes & Adjustments State
  const [attributeSubTab, setAttributeSubTab] = useState<'categories' | 'powertrains' | 'conditions' | 'adjustments' | 'compatibilities'>('categories');
  const [categoryAttributes, setCategoryAttributes] = useState<AdminVehicleAttribute[]>([]);
  const [powertrainAttributes, setPowertrainAttributes] = useState<AdminVehicleAttribute[]>([]);
  const [conditionAttributes, setConditionAttributes] = useState<AdminVehicleAttribute[]>([]);
  const [priceAdjustments, setPriceAdjustments] = useState<AttributePriceAdjustment[]>([]);
  const [compatibilities, setCompatibilities] = useState<VehicleCategoryCompatibility[]>([]);
  const [selectedCategoryForCompat, setSelectedCategoryForCompat] = useState<string>('sedan');
  const [compatPowertrains, setCompatPowertrains] = useState<string[]>([]);
  const [compatConditions, setCompatConditions] = useState<string[]>([]);
  const [isSavingCompat, setIsSavingCompat] = useState(false);

  // Attribute Modal State
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [attributeModalMode, setAttributeModalMode] = useState<'create' | 'edit'>('create');
  const [attributeModalType, setAttributeModalType] = useState<'category' | 'powertrain' | 'condition'>('category');
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);
  const [attributeFormId, setAttributeFormId] = useState('');
  const [attributeFormName, setAttributeFormName] = useState('');
  const [attributeFormNameAr, setAttributeFormNameAr] = useState('');
  const [attributeFormDesc, setAttributeFormDesc] = useState('');
  const [attributeFormDescAr, setAttributeFormDescAr] = useState('');
  const [attributeFormIcon, setAttributeFormIcon] = useState('');
  const [attributeFormOrder, setAttributeFormOrder] = useState('1');
  const [attributeFormIsActive, setAttributeFormIsActive] = useState(true);
  const [isSavingAttribute, setIsSavingAttribute] = useState(false);

  // Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentModalMode, setAdjustmentModalMode] = useState<'create' | 'edit'>('create');
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null);
  const [adjFormContext, setAdjFormContext] = useState<'towing' | 'shipping'>('towing');
  const [adjFormType, setAdjFormType] = useState<'vehicle_category' | 'powertrain' | 'vehicle_condition'>('vehicle_condition');
  const [adjFormAttributeId, setAdjFormAttributeId] = useState('non_runner');
  const [adjFormAmount, setAdjFormAmount] = useState('150');
  const [adjFormReasonEn, setAdjFormReasonEn] = useState('');
  const [adjFormReasonAr, setAdjFormReasonAr] = useState('');
  const [adjFormDisplayOrder, setAdjFormDisplayOrder] = useState('1');
  const [adjFormEffectiveFrom, setAdjFormEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [adjFormEffectiveTo, setAdjFormEffectiveTo] = useState('');
  const [adjFormIsActive, setAdjFormIsActive] = useState(true);
  const [adjFormAdminNotes, setAdjFormAdminNotes] = useState('');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);

  const [exchangeRate, setExchangeRate] = useState<{ rate: number; updatedAt: string }>({
    rate: 3.6725,
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Search & Filters
  const [freightSearch, setFreightSearch] = useState('');
  const [freightCategoryFilter, setFreightCategoryFilter] = useState('ALL');
  const [towingSearch, setTowingSearch] = useState('');

  // Exchange rate modal
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [newExchangeRate, setNewExchangeRate] = useState('3.6725');
  const [isUpdatingExchange, setIsUpdatingExchange] = useState(false);

  // Freight Rate Modal
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);
  const [freightModalMode, setFreightModalMode] = useState<'create' | 'edit'>('create');
  const [editingFreightId, setEditingFreightId] = useState<string | null>(null);
  const [freightFormRouteId, setFreightFormRouteId] = useState('');
  const [freightFormCategoryId, setFreightFormCategoryId] = useState('sedan');
  const [freightFormMethodId, setFreightFormMethodId] = useState('consolidated_container');
  const [freightFormPowertrainId, setFreightFormPowertrainId] = useState('petrol');
  const [freightFormAmount, setFreightFormAmount] = useState('1250');
  const [freightFormEffectiveFrom, setFreightFormEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [freightFormEffectiveTo, setFreightFormEffectiveTo] = useState('');
  const [freightFormIsActive, setFreightFormIsActive] = useState(true);
  const [isSavingFreight, setIsSavingFreight] = useState(false);

  // Towing Rate Modal
  const [isTowingModalOpen, setIsTowingModalOpen] = useState(false);
  const [towingModalMode, setTowingModalMode] = useState<'create' | 'edit'>('create');
  const [editingTowingId, setEditingTowingId] = useState<string | null>(null);
  const [towingFormLocationId, setTowingFormLocationId] = useState('');
  const [towingFormPortId, setTowingFormPortId] = useState('');
  const [towingFormCategoryId, setTowingFormCategoryId] = useState<string>('sedan');
  const [towingFormRateType, setTowingFormRateType] = useState<'fixed' | 'range'>('range');
  const [towingFormFixedAmount, setTowingFormFixedAmount] = useState('450');
  const [towingFormMinAmount, setTowingFormMinAmount] = useState('350');
  const [towingFormMaxAmount, setTowingFormMaxAmount] = useState('550');
  const [towingFormEffectiveFrom, setTowingFormEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [towingFormEffectiveTo, setTowingFormEffectiveTo] = useState('');
  const [towingFormIsActive, setTowingFormIsActive] = useState(true);
  const [isSavingTowing, setIsSavingTowing] = useState(false);

  // Extended Surcharge / Charge Rule Modal
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeModalMode, setChargeModalMode] = useState<'create' | 'edit'>('create');
  const [editingChargeRule, setEditingChargeRule] = useState<AdminAdditionalChargeRule | null>(null);
  const [chargeRuleCode, setChargeRuleCode] = useState('');
  const [chargeRuleName, setChargeRuleName] = useState('');
  const [chargeRuleNameAr, setChargeRuleNameAr] = useState('');
  const [chargeRuleDescEn, setChargeRuleDescEn] = useState('');
  const [chargeRuleDescAr, setChargeRuleDescAr] = useState('');
  const [chargeRuleCategory, setChargeRuleCategory] = useState('customs_clearance');
  const [chargeRuleType, setChargeRuleType] = useState('fixed');
  const [chargeRuleAmount, setChargeRuleAmount] = useState('150');
  const [chargeRuleMandatory, setChargeRuleMandatory] = useState(true);
  const [chargeRuleIncludedInCif, setChargeRuleIncludedInCif] = useState(false);
  const [chargeRuleVatBase, setChargeRuleVatBase] = useState(false);
  const [chargeRuleDestinationPortId, setChargeRuleDestinationPortId] = useState('');
  const [chargeRuleShippingMethodId, setChargeRuleShippingMethodId] = useState('');
  const [chargeRuleVehicleCategoryId, setChargeRuleVehicleCategoryId] = useState('');
  const [chargeRulePowertrainId, setChargeRulePowertrainId] = useState('');
  const [chargeRuleConditionId, setChargeRuleConditionId] = useState('');
  const [chargeRuleDisplayOrder, setChargeRuleDisplayOrder] = useState('1');
  const [chargeRuleEffectiveFrom, setChargeRuleEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [chargeRuleEffectiveTo, setChargeRuleEffectiveTo] = useState('');
  const [chargeRuleIsActive, setChargeRuleIsActive] = useState(true);
  const [isSavingCharge, setIsSavingCharge] = useState(false);

  // Quotation Rules State
  const [quotationRules, setQuotationRules] = useState<AdminQuotationRule[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleModalMode, setRuleModalMode] = useState<'create' | 'edit'>('create');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleFormTitleEn, setRuleFormTitleEn] = useState('');
  const [ruleFormTitleAr, setRuleFormTitleAr] = useState('');
  const [ruleFormContentEn, setRuleFormContentEn] = useState('');
  const [ruleFormContentAr, setRuleFormContentAr] = useState('');
  const [ruleFormDisplayOrder, setRuleFormDisplayOrder] = useState('1');
  const [ruleFormEffectiveFrom, setRuleFormEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [ruleFormEffectiveUntil, setRuleFormEffectiveUntil] = useState('');
  const [ruleFormIsActive, setRuleFormIsActive] = useState(true);
  const [ruleFormCurrentVersion, setRuleFormCurrentVersion] = useState(1);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isRuleFormDirty, setIsRuleFormDirty] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [f, t, e, r, p, vc, sm, pt, pl, ac, qr, cats, pts, conds, adjs, comps] = await Promise.all([
        adminService.getFreightRates(),
        adminService.getTowingRates(),
        adminService.getExchangeRate(),
        adminService.getRoutes(),
        adminService.getPorts(),
        adminService.getVehicleCategories(),
        adminService.getShippingMethods(),
        adminService.getPowertrains(),
        adminService.getPurchaseLocations(),
        adminService.getAdditionalChargeRules(),
        adminService.getQuotationRules(),
        adminService.getVehicleAttributes('category'),
        adminService.getVehicleAttributes('powertrain'),
        adminService.getVehicleAttributes('condition'),
        adminService.getAttributePriceAdjustments(),
        adminService.getCategoryCompatibilities(),
      ]);
      setFreightRates(f);
      setTowingRates(t);
      setExchangeRate(e);
      setNewExchangeRate(e.rate.toString());
      setRoutes(r);
      setPorts(p);
      setVehicleCategories(vc);
      setShippingMethods(sm);
      setPowertrains(pt);
      setPurchaseLocations(pl);
      setAdditionalCharges(ac);
      setQuotationRules(qr);
      setCategoryAttributes(cats);
      setPowertrainAttributes(pts);
      setConditionAttributes(conds);
      setPriceAdjustments(adjs);
      setCompatibilities(comps);

      if (r.length > 0 && !freightFormRouteId) {
        setFreightFormRouteId(r[0].id);
      }
      if (pl.length > 0 && !towingFormLocationId) {
        setTowingFormLocationId(pl[0].id);
      }
      const loadingPorts = p.filter((x) => x.isLoadingPort);
      if (loadingPorts.length > 0 && !towingFormPortId) {
        setTowingFormPortId(loadingPorts[0].id);
      }
    } catch (err) {
      console.warn('Failed to load tariffs', err);
      setActionError('Unable to load pricing tariffs from live database.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [freightFormRouteId, towingFormLocationId, towingFormPortId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    loadData();
  };

  // Filtered freight rates
  const filteredFreightRates = useMemo(() => {
    return freightRates.filter((f) => {
      const matchesSearch =
        f.routeDesc.toLowerCase().includes(freightSearch.toLowerCase()) ||
        f.shippingMethod.toLowerCase().includes(freightSearch.toLowerCase()) ||
        f.category.toLowerCase().includes(freightSearch.toLowerCase());
      const matchesCategory =
        freightCategoryFilter === 'ALL' || f.vehicleCategoryId === freightCategoryFilter.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [freightRates, freightSearch, freightCategoryFilter]);

  // Filtered towing rates
  const filteredTowingRates = useMemo(() => {
    return towingRates.filter((t) => {
      return (
        t.originLocation.toLowerCase().includes(towingSearch.toLowerCase()) ||
        t.loadingPort.toLowerCase().includes(towingSearch.toLowerCase()) ||
        t.vehicleCategory.toLowerCase().includes(towingSearch.toLowerCase())
      );
    });
  }, [towingRates, towingSearch]);

  // Freight Rate CRUD Handlers
  const handleOpenCreateFreight = () => {
    setFreightModalMode('create');
    setEditingFreightId(null);
    if (routes.length > 0) setFreightFormRouteId(routes[0].id);
    if (vehicleCategories.length > 0) setFreightFormCategoryId(vehicleCategories[0].id);
    if (shippingMethods.length > 0) setFreightFormMethodId(shippingMethods[0].id);
    if (powertrains.length > 0) setFreightFormPowertrainId(powertrains[0].id);
    setFreightFormAmount('1250');
    setFreightFormEffectiveFrom(new Date().toISOString().split('T')[0]);
    setFreightFormEffectiveTo('');
    setFreightFormIsActive(true);
    setIsFreightModalOpen(true);
  };

  const handleOpenEditFreight = (f: AdminFreightRate) => {
    setFreightModalMode('edit');
    setEditingFreightId(f.id);
    setFreightFormRouteId(f.routeId);
    setFreightFormCategoryId(f.vehicleCategoryId);
    setFreightFormMethodId(f.shippingMethodId);
    setFreightFormPowertrainId(f.powertrainId);
    setFreightFormAmount(f.amountUsd.toString());
    setFreightFormEffectiveFrom(f.effectiveFrom);
    setFreightFormEffectiveTo(f.effectiveTo || '');
    setFreightFormIsActive(f.isActive);
    setIsFreightModalOpen(true);
  };

  const handleSaveFreight = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(freightFormAmount);
    if (isNaN(amount) || amount <= 0) {
      setActionError('Freight rate amount must be a positive number.');
      return;
    }

    setIsSavingFreight(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (freightModalMode === 'create') {
        await adminService.createFreightRate({
          routeId: freightFormRouteId,
          vehicleCategoryId: freightFormCategoryId,
          powertrainId: freightFormPowertrainId,
          shippingMethodId: freightFormMethodId,
          baseAmount: amount,
          effectiveFrom: freightFormEffectiveFrom,
          effectiveTo: freightFormEffectiveTo || undefined,
          isActive: freightFormIsActive,
        });
        setActionSuccess('Ocean freight tariff created successfully.');
      } else if (editingFreightId) {
        await adminService.updateFreightRate(editingFreightId, {
          baseAmount: amount,
          shippingMethodId: freightFormMethodId,
          vehicleCategoryId: freightFormCategoryId,
          powertrainId: freightFormPowertrainId,
          effectiveFrom: freightFormEffectiveFrom,
          effectiveTo: freightFormEffectiveTo || null,
          isActive: freightFormIsActive,
        });
        setActionSuccess('Ocean freight tariff updated successfully.');
      }
      setIsFreightModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save freight tariff';
      setActionError(msg);
    } finally {
      setIsSavingFreight(false);
    }
  };

  const handleToggleFreightStatus = async (id: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.toggleFreightRateStatus(id, !currentStatus);
      setActionSuccess(`Freight tariff ${!currentStatus ? 'activated' : 'deactivated'}.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update tariff status';
      setActionError(msg);
    }
  };

  const handleDeleteFreight = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this freight rate tariff?')) return;
    setActionError(null);
    try {
      await adminService.deleteFreightRate(id);
      setActionSuccess('Freight rate tariff deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete freight tariff';
      setActionError(msg);
    }
  };

  // Towing Rate CRUD Handlers
  const handleOpenCreateTowing = () => {
    setTowingModalMode('create');
    setEditingTowingId(null);
    if (purchaseLocations.length > 0) setTowingFormLocationId(purchaseLocations[0].id);
    const loadingPorts = ports.filter((x) => x.isLoadingPort);
    if (loadingPorts.length > 0) setTowingFormPortId(loadingPorts[0].id);
    setTowingFormCategoryId('sedan');
    setTowingFormRateType('range');
    setTowingFormFixedAmount('450');
    setTowingFormMinAmount('350');
    setTowingFormMaxAmount('550');
    setTowingFormEffectiveFrom(new Date().toISOString().split('T')[0]);
    setTowingFormEffectiveTo('');
    setTowingFormIsActive(true);
    setIsTowingModalOpen(true);
  };

  const handleOpenEditTowing = (t: AdminTowingRate) => {
    setTowingModalMode('edit');
    setEditingTowingId(t.id);
    setTowingFormLocationId(t.purchaseLocationId);
    setTowingFormPortId(t.loadingPortId);
    setTowingFormCategoryId(t.vehicleCategoryId || 'sedan');
    setTowingFormRateType(t.rateType);
    setTowingFormFixedAmount(t.fixedAmount ? t.fixedAmount.toString() : '450');
    setTowingFormMinAmount(t.minAmount ? t.minAmount.toString() : '350');
    setTowingFormMaxAmount(t.maxAmount ? t.maxAmount.toString() : '550');
    setTowingFormEffectiveFrom(t.effectiveFrom);
    setTowingFormEffectiveTo(t.effectiveTo || '');
    setTowingFormIsActive(t.isActive);
    setIsTowingModalOpen(true);
  };

  const handleSaveTowing = async (e: React.FormEvent) => {
    e.preventDefault();
    const fixedAmt = parseFloat(towingFormFixedAmount);
    const minAmt = parseFloat(towingFormMinAmount);
    const maxAmt = parseFloat(towingFormMaxAmount);

    if (towingFormRateType === 'fixed') {
      if (isNaN(fixedAmt) || fixedAmt <= 0) {
        setActionError('Please specify a positive fixed towing fee.');
        return;
      }
    } else {
      if (isNaN(minAmt) || minAmt <= 0) {
        setActionError('Please specify a valid positive minimum towing rate.');
        return;
      }
      if (isNaN(maxAmt) || maxAmt < minAmt) {
        setActionError('Maximum towing rate must be greater than or equal to minimum rate.');
        return;
      }
    }

    setIsSavingTowing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (towingModalMode === 'create') {
        await adminService.createTowingRate({
          purchaseLocationId: towingFormLocationId,
          loadingPortId: towingFormPortId,
          vehicleCategoryId: towingFormCategoryId || null,
          rateType: towingFormRateType,
          fixedAmount: towingFormRateType === 'fixed' ? fixedAmt : undefined,
          minAmount: towingFormRateType === 'range' ? minAmt : undefined,
          maxAmount: towingFormRateType === 'range' ? maxAmt : undefined,
          effectiveFrom: towingFormEffectiveFrom,
          effectiveTo: towingFormEffectiveTo || undefined,
          isActive: towingFormIsActive,
        });
        setActionSuccess('Inland towing bracket created successfully.');
      } else if (editingTowingId) {
        await adminService.updateTowingRate(editingTowingId, {
          purchaseLocationId: towingFormLocationId,
          loadingPortId: towingFormPortId,
          vehicleCategoryId: towingFormCategoryId || null,
          rateType: towingFormRateType,
          fixedAmount: towingFormRateType === 'fixed' ? fixedAmt : null,
          minAmount: towingFormRateType === 'range' ? minAmt : null,
          maxAmount: towingFormRateType === 'range' ? maxAmt : null,
          effectiveFrom: towingFormEffectiveFrom,
          effectiveTo: towingFormEffectiveTo || null,
          isActive: towingFormIsActive,
        });
        setActionSuccess('Inland towing bracket updated successfully.');
      }
      setIsTowingModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save towing rate';
      setActionError(msg);
    } finally {
      setIsSavingTowing(false);
    }
  };

  const handleToggleTowingStatus = async (id: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.toggleTowingRateStatus(id, !currentStatus);
      setActionSuccess(`Towing rate ${!currentStatus ? 'activated' : 'deactivated'}.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update towing rate status';
      setActionError(msg);
    }
  };

  const handleDeleteTowing = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this inland towing bracket?')) return;
    setActionError(null);
    try {
      await adminService.deleteTowingRate(id);
      setActionSuccess('Towing bracket deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete towing bracket';
      setActionError(msg);
    }
  };

  // -----------------------------------------------------------
  // Surcharge (Additional Charge Rule) Handlers
  // -----------------------------------------------------------
  const handleOpenCreateCharge = () => {
    setChargeModalMode('create');
    setEditingChargeRule(null);
    setChargeRuleCode('');
    setChargeRuleName('');
    setChargeRuleNameAr('');
    setChargeRuleDescEn('');
    setChargeRuleDescAr('');
    setChargeRuleCategory('customs_clearance');
    setChargeRuleType('fixed');
    setChargeRuleAmount('150');
    setChargeRuleMandatory(true);
    setChargeRuleIncludedInCif(false);
    setChargeRuleVatBase(false);
    setChargeRuleDestinationPortId('');
    setChargeRuleShippingMethodId('');
    setChargeRuleVehicleCategoryId('');
    setChargeRulePowertrainId('');
    setChargeRuleConditionId('');
    setChargeRuleDisplayOrder((additionalCharges.length + 1).toString());
    setChargeRuleEffectiveFrom(new Date().toISOString().split('T')[0]);
    setChargeRuleEffectiveTo('');
    setChargeRuleIsActive(true);
    setIsChargeModalOpen(true);
  };

  const handleOpenEditCharge = (rule: AdminAdditionalChargeRule) => {
    setChargeModalMode('edit');
    setEditingChargeRule(rule);
    setChargeRuleCode(rule.code || '');
    setChargeRuleName(rule.name);
    setChargeRuleNameAr(rule.nameAr || '');
    setChargeRuleDescEn(rule.descriptionEn || '');
    setChargeRuleDescAr(rule.descriptionAr || '');
    setChargeRuleCategory(rule.category);
    setChargeRuleType(rule.chargeType);
    setChargeRuleAmount(rule.amount.toString());
    setChargeRuleMandatory(rule.isMandatory);
    setChargeRuleIncludedInCif(Boolean(rule.isIncludedInCif));
    setChargeRuleVatBase(rule.isIncludedInVatBase);
    setChargeRuleDestinationPortId(rule.destinationPortId || '');
    setChargeRuleShippingMethodId(rule.shippingMethodId || '');
    setChargeRuleVehicleCategoryId(rule.vehicleCategoryId || '');
    setChargeRulePowertrainId(rule.powertrainId || '');
    setChargeRuleConditionId(rule.conditionId || '');
    setChargeRuleDisplayOrder((rule.displayOrder || 1).toString());
    setChargeRuleEffectiveFrom(rule.effectiveFrom || new Date().toISOString().split('T')[0]);
    setChargeRuleEffectiveTo(rule.effectiveTo || '');
    setChargeRuleIsActive(rule.isActive);
    setIsChargeModalOpen(true);
  };

  const handleSaveChargeRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(chargeRuleAmount);
    if (isNaN(amt) || amt < 0) {
      setActionError('Please specify a valid charge amount.');
      return;
    }
    if (!chargeRuleName.trim()) {
      setActionError('Charge rule name is required.');
      return;
    }

    setIsSavingCharge(true);
    setActionError(null);
    try {
      const payload = {
        name: chargeRuleName.trim(),
        nameAr: chargeRuleNameAr.trim() || null,
        code: chargeRuleCode.trim() ? chargeRuleCode.trim().toUpperCase() : null,
        descriptionEn: chargeRuleDescEn.trim() || null,
        descriptionAr: chargeRuleDescAr.trim() || null,
        category: chargeRuleCategory,
        chargeType: chargeRuleType,
        amount: amt,
        currency: 'USD',
        isMandatory: chargeRuleMandatory,
        isIncludedInCif: chargeRuleIncludedInCif,
        isIncludedInVatBase: chargeRuleVatBase,
        destinationPortId: chargeRuleDestinationPortId || null,
        shippingMethodId: chargeRuleShippingMethodId || null,
        vehicleCategoryId: chargeRuleVehicleCategoryId || null,
        powertrainId: chargeRulePowertrainId || null,
        conditionId: chargeRuleConditionId || null,
        displayOrder: parseInt(chargeRuleDisplayOrder, 10) || 1,
        effectiveFrom: chargeRuleEffectiveFrom || new Date().toISOString().split('T')[0],
        effectiveTo: chargeRuleEffectiveTo || null,
        isActive: chargeRuleIsActive,
      };

      if (chargeModalMode === 'create') {
        await adminService.createAdditionalChargeRule(payload);
        setActionSuccess('Surcharge rule created successfully.');
      } else if (editingChargeRule) {
        await adminService.updateAdditionalChargeRule(editingChargeRule.id, payload);
        setActionSuccess(`Updated ${chargeRuleName} tariff.`);
      }
      setIsChargeModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save surcharge rule';
      setActionError(msg);
    } finally {
      setIsSavingCharge(false);
    }
  };

  const handleDeleteChargeRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this surcharge rule? Quotation snapshots already generated will remain unaffected.')) return;
    setActionError(null);
    try {
      await adminService.deleteAdditionalChargeRule(id);
      setActionSuccess('Surcharge rule deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete surcharge rule';
      setActionError(msg);
    }
  };

  const handleToggleChargeStatus = async (rule: AdminAdditionalChargeRule) => {
    setActionError(null);
    try {
      await adminService.updateAdditionalChargeRule(rule.id, { isActive: !rule.isActive });
      setActionSuccess(`Surcharge rule ${!rule.isActive ? 'activated' : 'deactivated'}.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update surcharge status';
      setActionError(msg);
    }
  };

  const handleMoveCharge = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= additionalCharges.length) return;

    const currentItem = additionalCharges[index];
    const targetItem = additionalCharges[targetIndex];

    try {
      await adminService.reorderAdditionalChargeRules([
        { id: currentItem.id, displayOrder: targetItem.displayOrder || targetIndex + 1 },
        { id: targetItem.id, displayOrder: currentItem.displayOrder || index + 1 },
      ]);
      await loadData();
    } catch (err) {
      console.error('Failed to reorder surcharges:', err);
    }
  };

  // -----------------------------------------------------------
  // Vehicle Attributes Handlers
  // -----------------------------------------------------------
  const handleOpenCreateAttribute = (type: 'category' | 'powertrain' | 'condition') => {
    setAttributeModalMode('create');
    setAttributeModalType(type);
    setEditingAttributeId(null);
    setAttributeFormId('');
    setAttributeFormName('');
    setAttributeFormNameAr('');
    setAttributeFormDesc('');
    setAttributeFormDescAr('');
    setAttributeFormIcon('');
    setAttributeFormOrder('1');
    setAttributeFormIsActive(true);
    setIsAttributeModalOpen(true);
  };

  const handleOpenEditAttribute = (attr: AdminVehicleAttribute) => {
    setAttributeModalMode('edit');
    setAttributeModalType(attr.type);
    setEditingAttributeId(attr.id);
    setAttributeFormId(attr.id);
    setAttributeFormName(attr.name);
    setAttributeFormNameAr(attr.nameAr || '');
    setAttributeFormDesc(attr.description || '');
    setAttributeFormDescAr(attr.descriptionAr || '');
    setAttributeFormIcon(attr.icon || '');
    setAttributeFormOrder((attr.displayOrder || 1).toString());
    setAttributeFormIsActive(attr.isActive);
    setIsAttributeModalOpen(true);
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attributeFormName.trim()) {
      setActionError('Attribute name is required.');
      return;
    }
    if (attributeModalMode === 'create' && !attributeFormId.trim()) {
      setActionError('Attribute code/identifier is required.');
      return;
    }

    setIsSavingAttribute(true);
    setActionError(null);
    try {
      if (attributeModalMode === 'create') {
        await adminService.createVehicleAttribute(attributeModalType, {
          id: attributeFormId,
          name: attributeFormName,
          nameAr: attributeFormNameAr || null,
          description: attributeFormDesc || null,
          descriptionAr: attributeFormDescAr || null,
          icon: attributeFormIcon || null,
          displayOrder: parseInt(attributeFormOrder, 10) || 1,
          isActive: attributeFormIsActive,
        });
        setActionSuccess(`Created ${attributeModalType}: ${attributeFormName}.`);
      } else if (editingAttributeId) {
        await adminService.updateVehicleAttribute(attributeModalType, editingAttributeId, {
          name: attributeFormName,
          nameAr: attributeFormNameAr || null,
          description: attributeFormDesc || null,
          descriptionAr: attributeFormDescAr || null,
          icon: attributeFormIcon || null,
          displayOrder: parseInt(attributeFormOrder, 10) || 1,
          isActive: attributeFormIsActive,
        });
        setActionSuccess(`Updated ${attributeModalType}: ${attributeFormName}.`);
      }
      setIsAttributeModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save attribute');
    } finally {
      setIsSavingAttribute(false);
    }
  };

  const handleDeleteAttribute = async (type: 'category' | 'powertrain' | 'condition', id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete or archive ${type} "${name}"? Active tariffs and quotations referencing this attribute will prevent hard deletion and safely archive it.`)) return;
    setActionError(null);
    try {
      await adminService.deleteVehicleAttribute(type, id);
      setActionSuccess(`Attribute "${name}" removed/archived.`);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete attribute.');
    }
  };

  const handleToggleAttributeStatus = async (attr: AdminVehicleAttribute) => {
    setActionError(null);
    try {
      await adminService.updateVehicleAttribute(attr.type, attr.id, { isActive: !attr.isActive });
      setActionSuccess(`Attribute "${attr.name}" ${!attr.isActive ? 'activated' : 'deactivated'}.`);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update attribute status.');
    }
  };

  // -----------------------------------------------------------
  // Price Adjustments Handlers
  // -----------------------------------------------------------
  const handleOpenCreateAdjustment = () => {
    setAdjustmentModalMode('create');
    setEditingAdjustmentId(null);
    setAdjFormContext('towing');
    setAdjFormType('vehicle_condition');
    setAdjFormAttributeId(conditionAttributes[0]?.id || 'non_runner');
    setAdjFormAmount('150');
    setAdjFormReasonEn('Non-Runner / Inoperable Winching Surcharge');
    setAdjFormReasonAr('رسوم ونش للسيارات المعطلة');
    setAdjFormDisplayOrder((priceAdjustments.length + 1).toString());
    setAdjFormEffectiveFrom(new Date().toISOString().split('T')[0]);
    setAdjFormEffectiveTo('');
    setAdjFormIsActive(true);
    setAdjFormAdminNotes('');
    setIsAdjustmentModalOpen(true);
  };

  const handleOpenEditAdjustment = (adj: AttributePriceAdjustment) => {
    setAdjustmentModalMode('edit');
    setEditingAdjustmentId(adj.id);
    setAdjFormContext(adj.context);
    setAdjFormType(adj.attribute_type);
    setAdjFormAttributeId(adj.attribute_id);
    setAdjFormAmount(adj.amount_usd.toString());
    setAdjFormReasonEn(adj.reason_en);
    setAdjFormReasonAr(adj.reason_ar || '');
    setAdjFormDisplayOrder(adj.display_order.toString());
    setAdjFormEffectiveFrom(adj.effective_from);
    setAdjFormEffectiveTo(adj.effective_to || '');
    setAdjFormIsActive(adj.is_active);
    setAdjFormAdminNotes(adj.admin_notes || '');
    setIsAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(adjFormAmount);
    if (isNaN(amt)) {
      setActionError('Adjustment amount must be a number.');
      return;
    }
    if (!adjFormReasonEn.trim()) {
      setActionError('Customer-facing reason in English is required.');
      return;
    }

    setIsSavingAdjustment(true);
    setActionError(null);
    try {
      const payload = {
        attribute_type: adjFormType,
        attribute_id: adjFormAttributeId,
        context: adjFormContext,
        amount_usd: amt,
        reason_en: adjFormReasonEn.trim(),
        reason_ar: adjFormReasonAr.trim() || null,
        display_order: parseInt(adjFormDisplayOrder, 10) || 1,
        effective_from: adjFormEffectiveFrom || new Date().toISOString().split('T')[0],
        effective_to: adjFormEffectiveTo || null,
        is_active: adjFormIsActive,
        admin_notes: adjFormAdminNotes.trim() || null,
      };

      if (adjustmentModalMode === 'create') {
        await adminService.createAttributePriceAdjustment(payload);
        setActionSuccess('Price adjustment created successfully.');
      } else if (editingAdjustmentId) {
        await adminService.updateAttributePriceAdjustment(editingAdjustmentId, payload);
        setActionSuccess('Price adjustment updated successfully.');
      }
      setIsAdjustmentModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save price adjustment.');
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this price adjustment?')) return;
    setActionError(null);
    try {
      await adminService.deleteAttributePriceAdjustment(id);
      setActionSuccess('Price adjustment deleted.');
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete price adjustment.');
    }
  };

  const handleToggleAdjustmentStatus = async (adj: AttributePriceAdjustment) => {
    setActionError(null);
    try {
      await adminService.updateAttributePriceAdjustment(adj.id, { is_active: !adj.is_active });
      setActionSuccess(`Price adjustment ${!adj.is_active ? 'activated' : 'deactivated'}.`);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle adjustment status.');
    }
  };

  // Compatibility helper
  useEffect(() => {
    const pIds = compatibilities
      .filter((c) => c.vehicle_category_id === selectedCategoryForCompat && c.target_type === 'powertrain')
      .map((c) => c.target_id);
    const cIds = compatibilities
      .filter((c) => c.vehicle_category_id === selectedCategoryForCompat && (c.target_type === 'vehicle_condition' || c.target_type === 'condition'))
      .map((c) => c.target_id);
    setCompatPowertrains(pIds);
    setCompatConditions(cIds);
  }, [selectedCategoryForCompat, compatibilities]);

  const handleSaveCompatibilities = async () => {
    setIsSavingCompat(true);
    setActionError(null);
    try {
      await adminService.setCategoryCompatibilities(selectedCategoryForCompat, 'powertrain', compatPowertrains);
      await adminService.setCategoryCompatibilities(selectedCategoryForCompat, 'vehicle_condition', compatConditions);
      setActionSuccess(`Compatibility rules saved for ${selectedCategoryForCompat}.`);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save compatibility rules.');
    } finally {
      setIsSavingCompat(false);
    }
  };

  // Exchange rate update
  const handleUpdateExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newExchangeRate);
    if (isNaN(val) || val <= 0) {
      setActionError('Please enter a valid positive exchange rate.');
      return;
    }

    setIsUpdatingExchange(true);
    setActionError(null);
    try {
      await adminService.updateExchangeRate(val);
      setActionSuccess(`Currency exchange rate updated to 1 USD = ${val} AED.`);
      setIsExchangeModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update rate';
      setActionError(msg);
    } finally {
      setIsUpdatingExchange(false);
    }
  };

  // Quotation Rules Handlers
  const handleOpenCreateRule = () => {
    setRuleModalMode('create');
    setEditingRuleId(null);
    setRuleFormTitleEn('');
    setRuleFormTitleAr('');
    setRuleFormContentEn('');
    setRuleFormContentAr('');
    setRuleFormDisplayOrder((quotationRules.length + 1).toString());
    setRuleFormEffectiveFrom(new Date().toISOString().split('T')[0]);
    setRuleFormEffectiveUntil('');
    setRuleFormIsActive(true);
    setRuleFormCurrentVersion(1);
    setIsRuleFormDirty(false);
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (r: AdminQuotationRule) => {
    setRuleModalMode('edit');
    setEditingRuleId(r.id);
    setRuleFormTitleEn(r.titleEn);
    setRuleFormTitleAr(r.titleAr || '');
    setRuleFormContentEn(r.contentEn);
    setRuleFormContentAr(r.contentAr || '');
    setRuleFormDisplayOrder(r.displayOrder.toString());
    setRuleFormEffectiveFrom(r.effectiveFrom || new Date().toISOString().split('T')[0]);
    setRuleFormEffectiveUntil(r.effectiveUntil || '');
    setRuleFormIsActive(r.isActive);
    setRuleFormCurrentVersion(r.version || 1);
    setIsRuleFormDirty(false);
    setIsRuleModalOpen(true);
  };

  const handleCloseRuleModal = () => {
    if (isRuleFormDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in this quotation rule. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) return;
    }
    setIsRuleModalOpen(false);
    setIsRuleFormDirty(false);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormTitleEn.trim() || !ruleFormContentEn.trim()) {
      setActionError('Rule title and content in English are required.');
      return;
    }
    const order = parseInt(ruleFormDisplayOrder, 10) || 1;

    setIsSavingRule(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (ruleModalMode === 'create') {
        await adminService.createQuotationRule({
          titleEn: ruleFormTitleEn.trim(),
          titleAr: ruleFormTitleAr.trim() || null,
          contentEn: ruleFormContentEn.trim(),
          contentAr: ruleFormContentAr.trim() || null,
          displayOrder: order,
          effectiveFrom: ruleFormEffectiveFrom || new Date().toISOString().split('T')[0],
          effectiveUntil: ruleFormEffectiveUntil.trim() || null,
          isActive: ruleFormIsActive,
        });
        setActionSuccess('Quotation rule created successfully.');
      } else if (editingRuleId) {
        await adminService.updateQuotationRule(editingRuleId, {
          titleEn: ruleFormTitleEn.trim(),
          titleAr: ruleFormTitleAr.trim() || null,
          contentEn: ruleFormContentEn.trim(),
          contentAr: ruleFormContentAr.trim() || null,
          displayOrder: order,
          effectiveFrom: ruleFormEffectiveFrom || new Date().toISOString().split('T')[0],
          effectiveUntil: ruleFormEffectiveUntil.trim() || null,
          isActive: ruleFormIsActive,
          currentVersion: ruleFormCurrentVersion,
        });
        setActionSuccess('Quotation rule updated successfully (version incremented).');
      }
      setIsRuleFormDirty(false);
      setIsRuleModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save quotation rule';
      setActionError(msg);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleToggleRuleStatus = async (id: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.toggleQuotationRuleStatus(id, !currentStatus);
      setActionSuccess(`Rule ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle rule status';
      setActionError(msg);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this quotation rule?')) return;
    setActionError(null);
    try {
      await adminService.deleteQuotationRule(id);
      setActionSuccess('Quotation rule deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete rule';
      setActionError(msg);
    }
  };

  const handleMoveRule = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= quotationRules.length) return;

    const currentItem = quotationRules[index];
    const targetItem = quotationRules[targetIndex];

    try {
      await adminService.reorderQuotationRules([
        { id: currentItem.id, displayOrder: targetItem.displayOrder },
        { id: targetItem.id, displayOrder: currentItem.displayOrder },
      ]);
      await loadData();
    } catch (err) {
      console.error('Failed to reorder rules:', err);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Pricing & Tariffs Matrix
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Authoritative Live Pricing
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-orange-500" />
            Freight, Towing & Port Surcharges
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage oceanic shipping rates, US inland towing brackets, destination port handling charges, and statutory tax conversion rules.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            startIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="text-xs font-bold whitespace-nowrap"
          >
            Refresh
          </Button>

          {canManagePricing && activeTab === 'freight' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateFreight}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Ocean Freight Rate
            </Button>
          )}

          {canManagePricing && activeTab === 'towing' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateTowing}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Towing Bracket
            </Button>
          )}

          {canManagePricing && activeTab === 'attributes' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleOpenCreateAttribute(
                    attributeSubTab === 'conditions'
                      ? 'condition'
                      : attributeSubTab === 'powertrains'
                      ? 'powertrain'
                      : 'category'
                  )
                }
                className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Attribute
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenCreateAdjustment}
                className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Price Adjustment
              </Button>
            </div>
          )}

          {canManagePricing && activeTab === 'surcharges' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateCharge}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Surcharge
            </Button>
          )}

          {canManagePricing && activeTab === 'rules' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateRule}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Quotation Rule
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <Alert variant="error" title="Notice">
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('freight')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'freight'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>Ocean Freight Tariffs ({freightRates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('towing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'towing'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Inland Towing Brackets ({towingRates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attributes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'attributes'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Vehicle Attributes & Adjustments</span>
        </button>

        <button
          onClick={() => setActiveTab('surcharges')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'surcharges'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Port Surcharges & Rules ({additionalCharges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'rules'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Rules & Regulations ({quotationRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('exchange')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'exchange'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>USD/AED Currency Rate</span>
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading tariff schedules from database...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OCEAN FREIGHT RATES */}
          {activeTab === 'freight' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search route, port, or method..."
                    value={freightSearch}
                    onChange={(e) => setFreightSearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">Category:</span>
                  <select
                    value={freightCategoryFilter}
                    onChange={(e) => setFreightCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange-500"
                  >
                    <option value="ALL">All Vehicle Categories</option>
                    {vehicleCategories.map((c) => (
                      <option key={c.id} value={c.id.toUpperCase()}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Card className="bg-white border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Route</th>
                        <th className="py-3 px-4">Vehicle Category</th>
                        <th className="py-3 px-4">Shipping Method</th>
                        <th className="py-3 px-4">Powertrain</th>
                        <th className="py-3 px-4">Base Rate (USD)</th>
                        <th className="py-3 px-4">Effective Dates</th>
                        <th className="py-3 px-4">Status</th>
                        {canManagePricing && <th className="py-3 px-4 text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredFreightRates.length === 0 ? (
                        <tr>
                          <td colSpan={canManagePricing ? 8 : 7} className="py-8 text-center text-slate-400 text-xs">
                            No ocean freight tariffs found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredFreightRates.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-bold text-brand-navy-950">
                              {f.routeDesc}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant="navy">{f.category}</Badge>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-700">
                              {f.shippingMethod}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-slate-600 uppercase font-mono text-[11px]">{f.powertrain}</span>
                            </td>
                            <td className="py-3.5 px-4 font-black text-brand-orange-600 text-sm">
                              {formatCurrency(f.amountUsd)}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {new Date(f.effectiveFrom).toLocaleDateString()}
                              {f.effectiveTo
                                ? ` – ${new Date(f.effectiveTo).toLocaleDateString()}`
                                : ' (Ongoing)'}
                            </td>
                            <td className="py-3.5 px-4">
                              {f.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                                </span>
                              )}
                            </td>
                            {canManagePricing && (
                              <td className="py-3.5 px-4 text-end">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleFreightStatus(f.id, f.isActive)}
                                    className="text-[10px] py-1 px-2 font-bold"
                                  >
                                    {f.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditFreight(f)}
                                    className="p-1 text-slate-600 hover:text-slate-900"
                                    title="Edit Tariff"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteFreight(f.id)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                    title="Delete Tariff"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: INLAND TOWING */}
          {activeTab === 'towing' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Inland Towing Tariff Notice:</strong>
                  <span>
                    Locations designated as <em>Range</em> indicate variable inland carrier rates.
                    On customer quotes and invoices, these indicate that the final towing amount is
                    subject to carrier confirmation upon vehicle pickup.
                  </span>
                </div>
              </div>

              {/* Towing search */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search auction, state, or loading port..."
                    value={towingSearch}
                    onChange={(e) => setTowingSearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <Card className="bg-white border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Origin State / Auction</th>
                        <th className="py-3 px-4">Loading Port</th>
                        <th className="py-3 px-4">Vehicle Category</th>
                        <th className="py-3 px-4">Pricing Mode</th>
                        <th className="py-3 px-4">Towing Amount (USD)</th>
                        <th className="py-3 px-4">Status</th>
                        {canManagePricing && <th className="py-3 px-4 text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredTowingRates.length === 0 ? (
                        <tr>
                          <td colSpan={canManagePricing ? 7 : 6} className="py-8 text-center text-slate-400 text-xs">
                            No inland towing brackets found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTowingRates.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-bold text-brand-navy-950">
                              {t.originLocation}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-800">
                              {t.loadingPort}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant="orange">{t.vehicleCategory}</Badge>
                            </td>
                            <td className="py-3.5 px-4">
                              {t.isRange ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Estimated Range
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  Fixed Amount
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {t.isRange ? (
                                <div>
                                  <span className="font-bold text-brand-navy-950">
                                    {formatCurrency(t.minAmount)} – {formatCurrency(t.maxAmount)}
                                  </span>
                                  <span className="text-[10px] text-amber-700 block font-normal">
                                    Subject to confirmation
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-brand-navy-950">{formatCurrency(t.fixedAmount)}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {t.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                                </span>
                              )}
                            </td>
                            {canManagePricing && (
                              <td className="py-3.5 px-4 text-end">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleTowingStatus(t.id, t.isActive)}
                                    className="text-[10px] py-1 px-2 font-bold"
                                  >
                                    {t.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditTowing(t)}
                                    className="p-1 text-slate-600 hover:text-slate-900"
                                    title="Edit Towing Bracket"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTowing(t.id)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                    title="Delete Towing Bracket"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: VEHICLE ATTRIBUTES & ADJUSTMENTS */}
          {activeTab === 'attributes' && (
            <div className="space-y-6">
              {/* Sub-tabs header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setAttributeSubTab('categories')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      attributeSubTab === 'categories'
                        ? 'bg-brand-navy-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Vehicle Categories ({categoryAttributes.length})
                  </button>
                  <button
                    onClick={() => setAttributeSubTab('powertrains')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      attributeSubTab === 'powertrains'
                        ? 'bg-brand-navy-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Powertrains ({powertrainAttributes.length})
                  </button>
                  <button
                    onClick={() => setAttributeSubTab('conditions')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      attributeSubTab === 'conditions'
                        ? 'bg-brand-navy-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Operational Conditions ({conditionAttributes.length})
                  </button>
                  <button
                    onClick={() => setAttributeSubTab('adjustments')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      attributeSubTab === 'adjustments'
                        ? 'bg-brand-orange-500 text-white shadow-sm'
                        : 'bg-orange-50 text-brand-orange-700 hover:bg-orange-100'
                    }`}
                  >
                    Price Adjustments ({priceAdjustments.length})
                  </button>
                  <button
                    onClick={() => setAttributeSubTab('compatibilities')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      attributeSubTab === 'compatibilities'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    Compatibility Rules
                  </button>
                </div>

                {canManagePricing && attributeSubTab !== 'compatibilities' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (attributeSubTab === 'adjustments') {
                        handleOpenCreateAdjustment();
                      } else {
                        handleOpenCreateAttribute(
                          attributeSubTab === 'conditions'
                            ? 'condition'
                            : attributeSubTab === 'powertrains'
                            ? 'powertrain'
                            : 'category'
                        );
                      }
                    }}
                    className="text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {attributeSubTab === 'adjustments' ? 'Add Adjustment' : 'Add Attribute'}
                  </Button>
                )}
              </div>

              {/* Sub-tab 1: Categories / Powertrains / Conditions Table */}
              {(attributeSubTab === 'categories' ||
                attributeSubTab === 'powertrains' ||
                attributeSubTab === 'conditions') && (
                <Card className="bg-white border border-slate-200 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-brand-navy-950 capitalize">
                        {attributeSubTab === 'categories'
                          ? 'Vehicle Categories Master Data'
                          : attributeSubTab === 'powertrains'
                          ? 'Powertrain & Fuel Classifications'
                          : 'Operational & Mechanical Conditions'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Authoritative database attributes controlling quotation options and tariff lookups.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Identifier / Code</th>
                          <th className="py-3 px-4">Name (English)</th>
                          <th className="py-3 px-4">Name (Arabic)</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4 text-center">Display Order</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          {canManagePricing && <th className="py-3 px-4 text-end">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {(attributeSubTab === 'categories'
                          ? categoryAttributes
                          : attributeSubTab === 'powertrains'
                          ? powertrainAttributes
                          : conditionAttributes
                        ).map((attr) => (
                          <tr key={attr.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{attr.id}</td>
                            <td className="py-3.5 px-4 font-bold text-brand-navy-950 flex items-center gap-1.5">
                              {attr.icon && <span className="text-sm">{attr.icon}</span>}
                              <span>{attr.name}</span>
                            </td>
                            <td className="py-3.5 px-4 font-arabic text-slate-700">{attr.nameAr || '—'}</td>
                            <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                              {attr.description || '—'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                              {attr.displayOrder}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {attr.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                                </span>
                              )}
                            </td>
                            {canManagePricing && (
                              <td className="py-3.5 px-4 text-end">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleAttributeStatus(attr)}
                                    className="text-[10px] py-1 px-2 font-bold"
                                  >
                                    {attr.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditAttribute(attr)}
                                    className="p-1 text-slate-600 hover:text-slate-900"
                                    title="Edit Attribute"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteAttribute(attr.type, attr.id, attr.name)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                    title="Delete / Archive Attribute"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Sub-tab 2: Price Adjustments Table */}
              {attributeSubTab === 'adjustments' && (
                <Card className="bg-white border border-slate-200 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-brand-navy-950">
                        Granular Towing & Ocean Freight Price Adjustments
                      </h3>
                      <p className="text-xs text-slate-500">
                        Configurable surcharges and discounts applied based on vehicle attributes with bilingual customer explanations.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs min-w-[750px]">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Context</th>
                          <th className="py-3 px-4">Trigger Attribute</th>
                          <th className="py-3 px-4">Adjustment Amount</th>
                          <th className="py-3 px-4">Customer Reason (EN)</th>
                          <th className="py-3 px-4">Customer Reason (AR)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          {canManagePricing && <th className="py-3 px-4 text-end">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {priceAdjustments.length === 0 ? (
                          <tr>
                            <td colSpan={canManagePricing ? 7 : 6} className="py-8 text-center text-slate-400 text-xs">
                              No price adjustments configured. Click "Add Price Adjustment" to create one.
                            </td>
                          </tr>
                        ) : (
                          priceAdjustments.map((adj) => (
                            <tr key={adj.id} className="hover:bg-slate-50/50">
                              <td className="py-3.5 px-4">
                                {adj.context === 'towing' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Truck className="w-3 h-3" /> Inland Towing
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    <Ship className="w-3 h-3" /> Ocean Shipping
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-slate-700 capitalize">
                                  {adj.attribute_type.replace('_', ' ')}: {adj.attribute_id}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-brand-orange-600 text-sm">
                                {adj.amount_usd >= 0 ? `+${formatCurrency(adj.amount_usd)}` : `-${formatCurrency(Math.abs(adj.amount_usd))}`}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate">
                                {adj.reason_en}
                              </td>
                              <td className="py-3.5 px-4 font-arabic text-slate-700 max-w-xs truncate">
                                {adj.reason_ar || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {adj.is_active ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                                  </span>
                                )}
                              </td>
                              {canManagePricing && (
                                <td className="py-3.5 px-4 text-end">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleToggleAdjustmentStatus(adj)}
                                      className="text-[10px] py-1 px-2 font-bold"
                                    >
                                      {adj.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenEditAdjustment(adj)}
                                      className="p-1 text-slate-600 hover:text-slate-900"
                                      title="Edit Adjustment"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteAdjustment(adj.id)}
                                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                      title="Delete Adjustment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Sub-tab 3: Category Compatibility Rules */}
              {attributeSubTab === 'compatibilities' && (
                <Card className="p-5 bg-white border border-slate-200 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-brand-navy-950">
                        Vehicle Category Attribute Compatibility Rules
                      </h3>
                      <p className="text-xs text-slate-500">
                        Restrict which powertrains and operational conditions are selectable for each vehicle category in the calculator.
                      </p>
                    </div>
                    {canManagePricing && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveCompatibilities}
                        disabled={isSavingCompat}
                        className="text-xs font-bold"
                      >
                        {isSavingCompat ? 'Saving Rules...' : 'Save Compatibility Rules'}
                      </Button>
                    )}
                  </div>

                  <div className="max-w-xs">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Vehicle Category</label>
                    <select
                      value={selectedCategoryForCompat}
                      onChange={(e) => setSelectedCategoryForCompat(e.target.value)}
                      className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {categoryAttributes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Powertrain compatibility */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-brand-navy-950 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-500" />
                          Eligible Powertrains for "{selectedCategoryForCompat}"
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {compatPowertrains.length} of {powertrainAttributes.length} selected
                        </span>
                      </div>
                      <div className="space-y-2 pt-1">
                        {powertrainAttributes.map((pt) => {
                          const isChecked = compatPowertrains.includes(pt.id);
                          return (
                            <label
                              key={pt.id}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCompatPowertrains([...compatPowertrains, pt.id]);
                                  } else {
                                    setCompatPowertrains(compatPowertrains.filter((x) => x !== pt.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
                              />
                              <span className="text-xs font-bold">{pt.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">({pt.id})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Condition compatibility */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-brand-navy-950 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-slate-600" />
                          Eligible Conditions for "{selectedCategoryForCompat}"
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {compatConditions.length} of {conditionAttributes.length} selected
                        </span>
                      </div>
                      <div className="space-y-2 pt-1">
                        {conditionAttributes.map((cond) => {
                          const isChecked = compatConditions.includes(cond.id);
                          return (
                            <label
                              key={cond.id}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCompatConditions([...compatConditions, cond.id]);
                                  } else {
                                    setCompatConditions(compatConditions.filter((x) => x !== cond.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
                              />
                              <span className="text-xs font-bold">{cond.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">({cond.id})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: PORT SURCHARGES & RULES (UPGRADED FULL CRUD) */}
          {activeTab === 'surcharges' && (
            <div className="space-y-6">
              <Card className="bg-white border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-brand-navy-950">UAE Port Handling & Additional Surcharges</h3>
                    <p className="text-xs text-slate-500">
                      Standard terminal delivery orders, port clearance, documentation fees, and applicable CIF/VAT rules.
                    </p>
                  </div>
                  {canManagePricing && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenCreateCharge}
                      className="text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Surcharge
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs min-w-[850px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Charge Description</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Applicability</th>
                        <th className="py-3 px-4">Amount (USD)</th>
                        <th className="py-3 px-4 text-center">In CIF</th>
                        <th className="py-3 px-4 text-center">In VAT Base</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        {canManagePricing && <th className="py-3 px-4 text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {additionalCharges.map((rule, idx) => (
                        <tr key={rule.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-navy-950 text-[11px]">
                            {rule.code || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-brand-navy-950">
                            <div>{rule.name}</div>
                            {rule.nameAr && <div className="text-[10px] font-normal text-slate-500 font-arabic">{rule.nameAr}</div>}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 capitalize">
                            {rule.category.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-600">
                            {rule.destinationPortId ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] mr-1">
                                Port: {ports.find((p) => p.id === rule.destinationPortId)?.name || rule.destinationPortId}
                              </span>
                            ) : null}
                            {rule.shippingMethodId ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] mr-1">
                                Method: {rule.shippingMethodId}
                              </span>
                            ) : null}
                            {rule.vehicleCategoryId ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] mr-1">
                                Cat: {rule.vehicleCategoryId}
                              </span>
                            ) : null}
                            {!rule.destinationPortId && !rule.shippingMethodId && !rule.vehicleCategoryId && (
                              <span className="text-slate-400 text-[10px] italic">Universal / All</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-brand-orange-600 text-sm">
                            {formatCurrency(rule.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {rule.isIncludedInCif ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Yes
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {rule.isIncludedInVatBase ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Yes (5%)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {rule.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                              </span>
                            )}
                          </td>
                          {canManagePricing && (
                            <td className="py-3.5 px-4 text-end">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveCharge(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveCharge(idx, 'down')}
                                  disabled={idx === additionalCharges.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleChargeStatus(rule)}
                                  className="text-[10px] py-1 px-2 font-bold"
                                >
                                  {rule.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditCharge(rule)}
                                  className="p-1 text-slate-600 hover:text-slate-900"
                                  title="Edit Surcharge"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteChargeRule(rule.id)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  title="Delete Surcharge"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Supporting reference lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-white border border-slate-200">
                  <h4 className="text-sm font-bold text-brand-navy-950 mb-2">Configured Vehicle Categories</h4>
                  <p className="text-xs text-slate-500 mb-3">Live vehicle categories available in quotations:</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryAttributes.map((c) => (
                      <Badge key={c.id} variant="navy">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 bg-white border border-slate-200">
                  <h4 className="text-sm font-bold text-brand-navy-950 mb-2">Supported Powertrains</h4>
                  <p className="text-xs text-slate-500 mb-3">Powertrains and environmental classifications:</p>
                  <div className="flex flex-wrap gap-2">
                    {powertrainAttributes.map((p) => (
                      <Badge key={p.id} variant="orange">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: RULES & REGULATIONS */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-brand-navy-950">
                    Official Quotation Terms, Conditions & Rules
                  </h3>
                  <p className="text-xs text-slate-500">
                    Terms defined here are automatically snapshotted onto every generated quotation and shown in PDF exports and results.
                  </p>
                </div>
                {canManagePricing && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenCreateRule}
                    className="flex items-center gap-1.5 text-xs font-bold shadow-sm whitespace-nowrap self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Quotation Rule
                  </Button>
                )}
              </div>

              <Card className="bg-white border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 text-center w-16">Order</th>
                        <th className="py-3 px-4">Rule Content (Bilingual)</th>
                        <th className="py-3 px-4 w-36">Effective Dates</th>
                        <th className="py-3 px-4 text-center w-20">Version</th>
                        <th className="py-3 px-4 text-center w-24">Status</th>
                        {canManagePricing && <th className="py-3 px-4 text-end w-28">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {quotationRules.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No quotation rules configured. Click "Add Quotation Rule" to create one.
                          </td>
                        </tr>
                      ) : (
                        quotationRules.map((r, idx) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-bold text-slate-600 w-4 text-center">
                                  {r.displayOrder}
                                </span>
                                {canManagePricing && (
                                  <div className="flex flex-col">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveRule(idx, 'up')}
                                      className="p-0.5 text-slate-400 hover:text-brand-orange-500 disabled:opacity-20"
                                      title="Move up"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === quotationRules.length - 1}
                                      onClick={() => handleMoveRule(idx, 'down')}
                                      className="p-0.5 text-slate-400 hover:text-brand-orange-500 disabled:opacity-20"
                                      title="Move down"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 max-w-lg space-y-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase">
                                    EN
                                  </span>
                                  <strong className="text-slate-900 font-bold">{r.titleEn}</strong>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                  {r.contentEn}
                                </p>
                              </div>
                              {r.titleAr || r.contentAr ? (
                                <div className="border-t border-slate-100 pt-1.5" dir="rtl">
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                      عربي
                                    </span>
                                    <strong className="text-slate-900 font-bold">{r.titleAr || 'بدون عنوان'}</strong>
                                  </div>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                    {r.contentAr}
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-block text-[10px] text-slate-400 italic">
                                  No Arabic translation configured
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[11px]">
                              <div className="text-slate-700 font-medium">
                                <span className="text-slate-400">From:</span> {r.effectiveFrom || 'Immediate'}
                              </div>
                              <div className="text-slate-500 mt-0.5">
                                <span className="text-slate-400">Until:</span> {r.effectiveUntil || 'Ongoing'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                v{r.version || 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                disabled={!canManagePricing}
                                onClick={() => handleToggleRuleStatus(r.id, r.isActive)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                  r.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                              >
                                {r.isActive ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                                  </>
                                )}
                              </button>
                            </td>
                            {canManagePricing && (
                              <td className="py-3.5 px-4 text-end whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditRule(r)}
                                    className="text-[11px] py-1 px-2.5 font-bold"
                                  >
                                    <Edit2 className="w-3 h-3 me-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteRule(r.id)}
                                    className="text-[11px] py-1 px-2 font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                                    title="Delete rule"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: EXCHANGE RATE */}
          {activeTab === 'exchange' && (
            <Card className="p-6 bg-white border border-slate-200 max-w-xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-brand-navy-950">
                    USD / AED Operational Exchange Rate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Governs all real-time AED settlement conversions in quotations and invoices.
                  </p>
                </div>
                {canManagePricing && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsExchangeModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Update Rate
                  </Button>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Current Rate
                  </span>
                  <div className="text-3xl font-black text-brand-navy-950 mt-1">
                    1 USD = <span className="text-brand-orange-600">{exchangeRate.rate}</span> AED
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last updated: {new Date(exchangeRate.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500 leading-relaxed">
                Standard UAE Central Bank peg is maintained at 3.6725. Adjustments here immediately
                update the calculator and all issued customer proposals.
              </div>
            </Card>
          )}
        </>
      )}

      {/* Ocean Freight Rate Modal */}
      <Modal
        isOpen={isFreightModalOpen}
        onClose={() => setIsFreightModalOpen(false)}
        title={freightModalMode === 'create' ? 'Add Ocean Freight Rate' : 'Edit Ocean Freight Rate'}
      >
        <form onSubmit={handleSaveFreight} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Shipping Route <span className="text-rose-500">*</span>
            </label>
            <select
              value={freightFormRouteId}
              onChange={(e) => setFreightFormRouteId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              required
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.originPortName} ({r.originPortCode}) -&gt; {r.destinationPortName} ({r.destinationPortCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Vehicle Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={freightFormCategoryId}
                onChange={(e) => setFreightFormCategoryId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                {vehicleCategories.map((vc) => (
                  <option key={vc.id} value={vc.id}>
                    {vc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Shipping Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={freightFormMethodId}
                onChange={(e) => setFreightFormMethodId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                {shippingMethods.map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Powertrain <span className="text-rose-500">*</span>
              </label>
              <select
                value={freightFormPowertrainId}
                onChange={(e) => setFreightFormPowertrainId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                {powertrains.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Base Freight (USD) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={freightFormAmount}
                onChange={(e) => setFreightFormAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective From</label>
              <Input
                type="date"
                value={freightFormEffectiveFrom}
                onChange={(e) => setFreightFormEffectiveFrom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective To (Optional)</label>
              <Input
                type="date"
                value={freightFormEffectiveTo}
                onChange={(e) => setFreightFormEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="freightFormIsActive"
              checked={freightFormIsActive}
              onChange={(e) => setFreightFormIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="freightFormIsActive" className="font-bold text-slate-700">
              Active Tariff
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFreightModalOpen(false)}
              disabled={isSavingFreight}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingFreight}
              className="font-bold"
            >
              {isSavingFreight ? 'Saving...' : 'Save Ocean Freight Tariff'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Towing Rate Modal */}
      <Modal
        isOpen={isTowingModalOpen}
        onClose={() => setIsTowingModalOpen(false)}
        title={towingModalMode === 'create' ? 'Add Inland Towing Bracket' : 'Edit Inland Towing Bracket'}
      >
        <form onSubmit={handleSaveTowing} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Origin Location (Auction / City) <span className="text-rose-500">*</span>
            </label>
            <select
              value={towingFormLocationId}
              onChange={(e) => setTowingFormLocationId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              required
            >
              {purchaseLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.stateCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                US Loading Port <span className="text-rose-500">*</span>
              </label>
              <select
                value={towingFormPortId}
                onChange={(e) => setTowingFormPortId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                {ports
                  .filter((p) => p.isLoadingPort)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Vehicle Category</label>
              <select
                value={towingFormCategoryId}
                onChange={(e) => setTowingFormCategoryId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              >
                <option value="">All Vehicle Categories</option>
                {vehicleCategories.map((vc) => (
                  <option key={vc.id} value={vc.id}>
                    {vc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Pricing Mode <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="towingRateType"
                  value="range"
                  checked={towingFormRateType === 'range'}
                  onChange={() => setTowingFormRateType('range')}
                  className="text-brand-orange-600 focus:ring-brand-orange-500"
                />
                <span className="font-semibold text-slate-700">Estimated Range (Min – Max)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="towingRateType"
                  value="fixed"
                  checked={towingFormRateType === 'fixed'}
                  onChange={() => setTowingFormRateType('fixed')}
                  className="text-brand-orange-600 focus:ring-brand-orange-500"
                />
                <span className="font-semibold text-slate-700">Fixed Flat Rate</span>
              </label>
            </div>
          </div>

          {towingFormRateType === 'fixed' ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fixed Towing Fee (USD) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={towingFormFixedAmount}
                onChange={(e) => setTowingFormFixedAmount(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Min Towing Fee (USD) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={towingFormMinAmount}
                  onChange={(e) => setTowingFormMinAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Max Towing Fee (USD) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={towingFormMaxAmount}
                  onChange={(e) => setTowingFormMaxAmount(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective From</label>
              <Input
                type="date"
                value={towingFormEffectiveFrom}
                onChange={(e) => setTowingFormEffectiveFrom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective To (Optional)</label>
              <Input
                type="date"
                value={towingFormEffectiveTo}
                onChange={(e) => setTowingFormEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="towingFormIsActive"
              checked={towingFormIsActive}
              onChange={(e) => setTowingFormIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="towingFormIsActive" className="font-bold text-slate-700">
              Active Towing Bracket
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTowingModalOpen(false)}
              disabled={isSavingTowing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingTowing}
              className="font-bold"
            >
              {isSavingTowing ? 'Saving...' : 'Save Towing Bracket'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Surcharge Create/Edit Modal */}
      <Modal
        isOpen={isChargeModalOpen}
        onClose={() => setIsChargeModalOpen(false)}
        size="xl"
        title={
          chargeModalMode === 'create'
            ? 'Add Port / Additional Surcharge Rule'
            : `Edit Surcharge: ${editingChargeRule?.name || ''}`
        }
      >
        <form onSubmit={handleSaveChargeRule} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Surcharge Code (Unique Identifier)
              </label>
              <Input
                type="text"
                placeholder="e.g. DXB_PORT_HANDLING"
                value={chargeRuleCode}
                onChange={(e) => setChargeRuleCode(e.target.value.toUpperCase())}
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Uppercase identifier for tracking/audit.</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={chargeRuleCategory}
                onChange={(e) => setChargeRuleCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                <option value="customs_clearance">Customs Clearance</option>
                <option value="port_surcharge">Port Surcharge</option>
                <option value="documentation">Documentation / BL</option>
                <option value="inspection">Inspection / Security</option>
                <option value="other">Other Surcharge</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fee Name (English) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Jebel Ali Port Handling & Terminal Service"
                value={chargeRuleName}
                onChange={(e) => setChargeRuleName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fee Name (Arabic)
              </label>
              <Input
                type="text"
                dir="rtl"
                placeholder="مثال: رسوم مناولة الميناء ومحطة الحاويات جبل علي"
                value={chargeRuleNameAr}
                onChange={(e) => setChargeRuleNameAr(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Customer Description (English)
              </label>
              <Input
                type="text"
                placeholder="Explanation displayed on customer quotation..."
                value={chargeRuleDescEn}
                onChange={(e) => setChargeRuleDescEn(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Customer Description (Arabic)
              </label>
              <Input
                type="text"
                dir="rtl"
                placeholder="شرح يظهر للعميل في تفاصيل عرض الأسعار..."
                value={chargeRuleDescAr}
                onChange={(e) => setChargeRuleDescAr(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Charge Amount (USD) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={chargeRuleAmount}
                onChange={(e) => setChargeRuleAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Charge Type</label>
              <select
                value={chargeRuleType}
                onChange={(e) => setChargeRuleType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              >
                <option value="fixed">Fixed Amount (USD)</option>
              </select>
            </div>
          </div>

          {/* Applicability Filters */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Applicability Conditions (Leave blank / all to apply universally)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Destination Port
                </label>
                <select
                  value={chargeRuleDestinationPortId}
                  onChange={(e) => setChargeRuleDestinationPortId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                >
                  <option value="">All Destination Ports</option>
                  {ports
                    .filter((p) => !p.isLoadingPort)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Shipping Method
                </label>
                <select
                  value={chargeRuleShippingMethodId}
                  onChange={(e) => setChargeRuleShippingMethodId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                >
                  <option value="">All Shipping Methods</option>
                  {shippingMethods.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Vehicle Category
                </label>
                <select
                  value={chargeRuleVehicleCategoryId}
                  onChange={(e) => setChargeRuleVehicleCategoryId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                >
                  <option value="">All Vehicle Categories</option>
                  {categoryAttributes.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Powertrain
                </label>
                <select
                  value={chargeRulePowertrainId}
                  onChange={(e) => setChargeRulePowertrainId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                >
                  <option value="">All Powertrains</option>
                  {powertrainAttributes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Operational Condition
                </label>
                <select
                  value={chargeRuleConditionId}
                  onChange={(e) => setChargeRuleConditionId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                >
                  <option value="">All Operational Conditions</option>
                  {conditionAttributes.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Financial Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chargeRuleMandatory"
                checked={chargeRuleMandatory}
                onChange={(e) => setChargeRuleMandatory(e.target.checked)}
                className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
              />
              <label htmlFor="chargeRuleMandatory" className="font-semibold text-slate-700">
                Mandatory Surcharge
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chargeRuleIncludedInCif"
                checked={chargeRuleIncludedInCif}
                onChange={(e) => setChargeRuleIncludedInCif(e.target.checked)}
                className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
              />
              <label htmlFor="chargeRuleIncludedInCif" className="font-semibold text-slate-700">
                Include in CIF Base
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chargeRuleVatBase"
                checked={chargeRuleVatBase}
                onChange={(e) => setChargeRuleVatBase(e.target.checked)}
                className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
              />
              <label htmlFor="chargeRuleVatBase" className="font-semibold text-slate-700">
                Subject to UAE 5% VAT
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Order</label>
              <Input
                type="number"
                min="1"
                value={chargeRuleDisplayOrder}
                onChange={(e) => setChargeRuleDisplayOrder(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective From</label>
              <Input
                type="date"
                value={chargeRuleEffectiveFrom}
                onChange={(e) => setChargeRuleEffectiveFrom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective To (Optional)</label>
              <Input
                type="date"
                value={chargeRuleEffectiveTo}
                onChange={(e) => setChargeRuleEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="chargeRuleIsActive"
              checked={chargeRuleIsActive}
              onChange={(e) => setChargeRuleIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="chargeRuleIsActive" className="font-bold text-slate-700">
              Active Surcharge Rule (Immediately eligible for new quotes)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsChargeModalOpen(false)}
              disabled={isSavingCharge}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingCharge}
              className="font-bold"
            >
              {isSavingCharge ? 'Saving...' : chargeModalMode === 'create' ? 'Create Surcharge' : 'Save Surcharge'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vehicle Attribute Modal */}
      <Modal
        isOpen={isAttributeModalOpen}
        onClose={() => setIsAttributeModalOpen(false)}
        title={
          attributeModalMode === 'create'
            ? `Add Vehicle ${attributeModalType === 'category' ? 'Category' : attributeModalType === 'powertrain' ? 'Powertrain' : 'Condition'}`
            : `Edit Vehicle ${attributeModalType === 'category' ? 'Category' : attributeModalType === 'powertrain' ? 'Powertrain' : 'Condition'}: ${attributeFormName}`
        }
      >
        <form onSubmit={handleSaveAttribute} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Identifier Code <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. suv or hybrid"
                value={attributeFormId}
                onChange={(e) => setAttributeFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                disabled={attributeModalMode === 'edit'}
                className={attributeModalMode === 'edit' ? 'bg-slate-100' : ''}
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Unique slug (lowercase, underscores).</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Icon / Emoji (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. 🚗, ⚡, 🔧"
                value={attributeFormIcon}
                onChange={(e) => setAttributeFormIcon(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Display Name (English) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Sport Utility Vehicle (SUV)"
                value={attributeFormName}
                onChange={(e) => setAttributeFormName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Display Name (Arabic)
              </label>
              <Input
                type="text"
                dir="rtl"
                placeholder="مثال: سيارة رياضية متعددة الاستخدامات"
                value={attributeFormNameAr}
                onChange={(e) => setAttributeFormNameAr(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Description (English)
              </label>
              <Input
                type="text"
                placeholder="Operational definition..."
                value={attributeFormDesc}
                onChange={(e) => setAttributeFormDesc(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Description (Arabic)
              </label>
              <Input
                type="text"
                dir="rtl"
                placeholder="الوصف بالعربية..."
                value={attributeFormDescAr}
                onChange={(e) => setAttributeFormDescAr(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Order</label>
              <Input
                type="number"
                min="1"
                value={attributeFormOrder}
                onChange={(e) => setAttributeFormOrder(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="attributeFormIsActive"
                checked={attributeFormIsActive}
                onChange={(e) => setAttributeFormIsActive(e.target.checked)}
                className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
              />
              <label htmlFor="attributeFormIsActive" className="font-bold text-slate-700">
                Active in Public Calculator
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAttributeModalOpen(false)}
              disabled={isSavingAttribute}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingAttribute}
              className="font-bold"
            >
              {isSavingAttribute ? 'Saving...' : attributeModalMode === 'create' ? 'Create Attribute' : 'Save Attribute'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Attribute Price Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        size="lg"
        title={
          adjustmentModalMode === 'create'
            ? 'Add Attribute Price Adjustment'
            : 'Edit Price Adjustment'
        }
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Operational Context <span className="text-rose-500">*</span>
              </label>
              <select
                value={adjFormContext}
                onChange={(e) => setAdjFormContext(e.target.value as 'towing' | 'shipping')}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                <option value="towing">Inland Towing Adjustment</option>
                <option value="shipping">Ocean Freight Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Target Attribute Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={adjFormType}
                onChange={(e) => {
                  const newType = e.target.value as 'vehicle_category' | 'powertrain' | 'vehicle_condition';
                  setAdjFormType(newType);
                  if (newType === 'vehicle_category') {
                    setAdjFormAttributeId(categoryAttributes[0]?.id || '');
                  } else if (newType === 'powertrain') {
                    setAdjFormAttributeId(powertrainAttributes[0]?.id || '');
                  } else {
                    setAdjFormAttributeId(conditionAttributes[0]?.id || '');
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                <option value="vehicle_condition">Vehicle Condition</option>
                <option value="powertrain">Powertrain</option>
                <option value="vehicle_category">Vehicle Category</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Target Attribute <span className="text-rose-500">*</span>
              </label>
              <select
                value={adjFormAttributeId}
                onChange={(e) => setAdjFormAttributeId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                {adjFormType === 'vehicle_category' &&
                  categoryAttributes.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.id})
                    </option>
                  ))}
                {adjFormType === 'powertrain' &&
                  powertrainAttributes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.id})
                    </option>
                  ))}
                {adjFormType === 'vehicle_condition' &&
                  conditionAttributes.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.name} ({cond.id})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Adjustment Amount (USD) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={adjFormAmount}
                onChange={(e) => setAdjFormAmount(e.target.value)}
                placeholder="e.g. 150.00"
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Positive to add cost, negative for discount.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Customer Reason (English) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Non-Runner / Inoperable Winching Surcharge"
                value={adjFormReasonEn}
                onChange={(e) => setAdjFormReasonEn(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Customer Reason (Arabic)
              </label>
              <Input
                type="text"
                dir="rtl"
                placeholder="مثال: رسوم سحب وونش للسيارات المعطلة"
                value={adjFormReasonAr}
                onChange={(e) => setAdjFormReasonAr(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Internal Admin Notes (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Standard dispatch winch surcharge agreed with carriers"
              value={adjFormAdminNotes}
              onChange={(e) => setAdjFormAdminNotes(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Order</label>
              <Input
                type="number"
                min="1"
                value={adjFormDisplayOrder}
                onChange={(e) => setAdjFormDisplayOrder(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective From</label>
              <Input
                type="date"
                value={adjFormEffectiveFrom}
                onChange={(e) => setAdjFormEffectiveFrom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective To (Optional)</label>
              <Input
                type="date"
                value={adjFormEffectiveTo}
                onChange={(e) => setAdjFormEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="adjFormIsActive"
              checked={adjFormIsActive}
              onChange={(e) => setAdjFormIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="adjFormIsActive" className="font-bold text-slate-700">
              Active Adjustment (Automatically included in quotation calculations)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdjustmentModalOpen(false)}
              disabled={isSavingAdjustment}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingAdjustment}
              className="font-bold"
            >
              {isSavingAdjustment ? 'Saving...' : adjustmentModalMode === 'create' ? 'Create Adjustment' : 'Save Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Exchange Rate Modal */}
      <Modal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        title="Update USD to AED Exchange Rate"
      >
        <form onSubmit={handleUpdateExchange} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              New Exchange Rate (AED per 1 USD) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              step="0.0001"
              value={newExchangeRate}
              onChange={(e) => setNewExchangeRate(e.target.value)}
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Standard operational benchmark is 3.6725.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExchangeModalOpen(false)}
              disabled={isUpdatingExchange}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUpdatingExchange}
              className="font-bold"
            >
              {isUpdatingExchange ? 'Saving...' : 'Apply New Rate'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quotation Rule Create/Edit Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={handleCloseRuleModal}
        size="rule-editor"
        title={
          ruleModalMode === 'create'
            ? 'Add Quotation Rule'
            : `Edit Quotation Rule (Current: v${ruleFormCurrentVersion})`
        }
      >
        <form onSubmit={handleSaveRule} className="space-y-4 pt-2 text-xs">
          {ruleModalMode === 'edit' && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              <strong>Revision Notice:</strong> Saving changes will atomically archive this version, create <strong>v{ruleFormCurrentVersion + 1}</strong>, and log your staff user audit ID. Historical customer quotation snapshots remain permanently unchanged.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Rule Title (English) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Quotation Validity Period"
                value={ruleFormTitleEn}
                onChange={(e) => {
                  setRuleFormTitleEn(e.target.value);
                  setIsRuleFormDirty(true);
                }}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Rule Title (Arabic)
              </label>
              <Input
                type="text"
                dir="rtl"
                placeholder="مثال: صلاحية عرض الأسعار"
                value={ruleFormTitleAr}
                onChange={(e) => {
                  setRuleFormTitleAr(e.target.value);
                  setIsRuleFormDirty(true);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <RichTextEditor
                label="Official Rule Text (English)"
                direction="ltr"
                value={ruleFormContentEn}
                onChange={(val) => {
                  setRuleFormContentEn(val);
                  setIsRuleFormDirty(true);
                }}
                placeholder="Full description and conditions in English to appear on customer quotations..."
                minHeight="140px"
              />
            </div>

            <div>
              <RichTextEditor
                label="Official Rule Text (Arabic)"
                direction="rtl"
                value={ruleFormContentAr}
                onChange={(val) => {
                  setRuleFormContentAr(val);
                  setIsRuleFormDirty(true);
                }}
                placeholder="الشروط والأحكام باللغة العربية لعرضها في عروض الأسعار وملفات PDF..."
                minHeight="140px"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Order</label>
              <Input
                type="number"
                min="1"
                value={ruleFormDisplayOrder}
                onChange={(e) => {
                  setRuleFormDisplayOrder(e.target.value);
                  setIsRuleFormDirty(true);
                }}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective From</label>
              <Input
                type="date"
                value={ruleFormEffectiveFrom}
                onChange={(e) => {
                  setRuleFormEffectiveFrom(e.target.value);
                  setIsRuleFormDirty(true);
                }}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective Until (Optional)</label>
              <Input
                type="date"
                value={ruleFormEffectiveUntil}
                onChange={(e) => {
                  setRuleFormEffectiveUntil(e.target.value);
                  setIsRuleFormDirty(true);
                }}
                placeholder="Ongoing if blank"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="ruleFormIsActive"
              checked={ruleFormIsActive}
              onChange={(e) => {
                setRuleFormIsActive(e.target.checked);
                setIsRuleFormDirty(true);
              }}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="ruleFormIsActive" className="font-bold text-slate-700">
              Active Rule (Immediately eligible for new quotation snapshots)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseRuleModal}
              disabled={isSavingRule}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingRule}
              className="font-bold"
            >
              {isSavingRule ? 'Saving...' : ruleModalMode === 'create' ? 'Create Rule' : 'Save Revision'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
