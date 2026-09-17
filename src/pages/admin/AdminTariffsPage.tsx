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
} from 'lucide-react';

export const AdminTariffsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManagePricing = hasPermission('pricing.manage');

  const [activeTab, setActiveTab] = useState<'freight' | 'towing' | 'surcharges' | 'rules' | 'exchange'>('freight');
  const [freightRates, setFreightRates] = useState<AdminFreightRate[]>([]);
  const [towingRates, setTowingRates] = useState<AdminTowingRate[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [ports, setPorts] = useState<AdminPort[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<AdminVehicleCategory[]>([]);
  const [shippingMethods, setShippingMethods] = useState<AdminShippingMethod[]>([]);
  const [powertrains, setPowertrains] = useState<AdminPowertrain[]>([]);
  const [purchaseLocations, setPurchaseLocations] = useState<AdminPurchaseLocation[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdminAdditionalChargeRule[]>([]);

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

  // Surcharge / Charge Rule Modal
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [editingChargeRule, setEditingChargeRule] = useState<AdminAdditionalChargeRule | null>(null);
  const [chargeRuleAmount, setChargeRuleAmount] = useState('150');
  const [chargeRuleMandatory, setChargeRuleMandatory] = useState(true);
  const [chargeRuleVatBase, setChargeRuleVatBase] = useState(false);
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
      const [f, t, e, r, p, vc, sm, pt, pl, ac, qr] = await Promise.all([
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

  // Charge Rule Edit Handlers
  const handleOpenEditCharge = (rule: AdminAdditionalChargeRule) => {
    setEditingChargeRule(rule);
    setChargeRuleAmount(rule.amount.toString());
    setChargeRuleMandatory(rule.isMandatory);
    setChargeRuleVatBase(rule.isIncludedInVatBase);
    setIsChargeModalOpen(true);
  };

  const handleSaveChargeRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChargeRule) return;
    const amt = parseFloat(chargeRuleAmount);
    if (isNaN(amt) || amt < 0) {
      setActionError('Please specify a valid charge amount.');
      return;
    }

    setIsSavingCharge(true);
    setActionError(null);
    try {
      await adminService.updateAdditionalChargeRule(editingChargeRule.id, {
        amount: amt,
        isMandatory: chargeRuleMandatory,
        isIncludedInVatBase: chargeRuleVatBase,
      });
      setActionSuccess(`Updated ${editingChargeRule.name} tariff.`);
      setIsChargeModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update charge rule';
      setActionError(msg);
    } finally {
      setIsSavingCharge(false);
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

          {/* TAB 3: PORT SURCHARGES & RULES */}
          {activeTab === 'surcharges' && (
            <div className="space-y-6">
              <Card className="bg-white border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-brand-navy-950">UAE Port Handling & Statutory Surcharges</h3>
                    <p className="text-xs text-slate-500">
                      Standard terminal delivery order, port clearance, and customs handling tariffs automatically calculated into CIF quotations.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Charge Description</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Amount (USD)</th>
                        <th className="py-3 px-4">Mandatory</th>
                        <th className="py-3 px-4">Subject to UAE VAT</th>
                        <th className="py-3 px-4">Status</th>
                        {canManagePricing && <th className="py-3 px-4 text-end">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {additionalCharges.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-bold text-brand-navy-950">{rule.name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{rule.category}</td>
                          <td className="py-3.5 px-4 font-bold text-brand-orange-600 text-sm">
                            {formatCurrency(rule.amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            {rule.isMandatory ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                Mandatory
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                Optional
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {rule.isIncludedInVatBase ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                                In 5% VAT Base
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Separate / Non-VAT Base
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              Active
                            </span>
                          </td>
                          {canManagePricing && (
                            <td className="py-3.5 px-4 text-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditCharge(rule)}
                                className="text-[11px] py-1 px-2.5 font-bold"
                              >
                                Edit Tariff
                              </Button>
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
                    {vehicleCategories.map((c) => (
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
                    {powertrains.map((p) => (
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

      {/* Charge Rule Edit Modal */}
      <Modal
        isOpen={isChargeModalOpen}
        onClose={() => setIsChargeModalOpen(false)}
        title={editingChargeRule ? `Edit Tariff: ${editingChargeRule.name}` : 'Edit Charge Rule'}
      >
        <form onSubmit={handleSaveChargeRule} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Charge Name</label>
            <Input type="text" value={editingChargeRule?.name || ''} disabled className="bg-slate-100" />
          </div>

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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="chargeRuleMandatory"
              checked={chargeRuleMandatory}
              onChange={(e) => setChargeRuleMandatory(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="chargeRuleMandatory" className="font-bold text-slate-700">
              Mandatory Fee (Applied to all quotations)
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
            <label htmlFor="chargeRuleVatBase" className="font-bold text-slate-700">
              Subject to UAE 5% Statutory Import VAT
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
              {isSavingCharge ? 'Saving...' : 'Apply Tariff Change'}
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
