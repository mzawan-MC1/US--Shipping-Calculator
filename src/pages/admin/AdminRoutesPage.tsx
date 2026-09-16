import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import {
  adminService,
  AdminRoute,
  AdminPort,
  AdminCountry,
  AdminShippingMethod,
} from '../../services/adminService';
import { useAuth } from '../../features/auth/AuthContext';
import {
  Compass,
  Ship,
  Anchor,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Box,
} from 'lucide-react';

export const AdminRoutesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageRoutes = hasPermission('routes.manage');

  const [activeTab, setActiveTab] = useState<'routes' | 'ports' | 'countries' | 'methods'>('routes');
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [ports, setPorts] = useState<AdminPort[]>([]);
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [shippingMethods, setShippingMethods] = useState<AdminShippingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Route Modal State
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeModalMode, setRouteModalMode] = useState<'create' | 'edit'>('create');
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeFormOriginId, setRouteFormOriginId] = useState('');
  const [routeFormDestId, setRouteFormDestId] = useState('');
  const [routeFormMinDays, setRouteFormMinDays] = useState('30');
  const [routeFormMaxDays, setRouteFormMaxDays] = useState('45');
  const [routeFormIsActive, setRouteFormIsActive] = useState(true);
  const [isSavingRoute, setIsSavingRoute] = useState(false);

  // Port Modal State
  const [isPortModalOpen, setIsPortModalOpen] = useState(false);
  const [portModalMode, setPortModalMode] = useState<'create' | 'edit'>('create');
  const [editingPortId, setEditingPortId] = useState<string | null>(null);
  const [portFormCode, setPortFormCode] = useState('');
  const [portFormName, setPortFormName] = useState('');
  const [portFormNameAr, setPortFormNameAr] = useState('');
  const [portFormCountryCode, setPortFormCountryCode] = useState('USA');
  const [portFormStateOrCity, setPortFormStateOrCity] = useState('');
  const [portFormIsLoading, setPortFormIsLoading] = useState(true);
  const [portFormIsDestination, setPortFormIsDestination] = useState(false);
  const [portFormIsActive, setPortFormIsActive] = useState(true);
  const [isSavingPort, setIsSavingPort] = useState(false);

  // Country Modal State
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countryModalMode, setCountryModalMode] = useState<'create' | 'edit'>('create');
  const [countryFormCode, setCountryFormCode] = useState('');
  const [countryFormName, setCountryFormName] = useState('');
  const [countryFormNameAr, setCountryFormNameAr] = useState('');
  const [countryFormIsActive, setCountryFormIsActive] = useState(true);
  const [isSavingCountry, setIsSavingCountry] = useState(false);

  // Shipping Method Modal State
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [methodModalMode, setMethodModalMode] = useState<'create' | 'edit'>('create');
  const [methodFormId, setMethodFormId] = useState('');
  const [methodFormName, setMethodFormName] = useState('');
  const [methodFormDesc, setMethodFormDesc] = useState('');
  const [methodFormIsActive, setMethodFormIsActive] = useState(true);
  const [isSavingMethod, setIsSavingMethod] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [r, p, c, sm] = await Promise.all([
        adminService.getRoutes(),
        adminService.getPorts(),
        adminService.getCountries(),
        adminService.getShippingMethods(),
      ]);
      setRoutes(r);
      setPorts(p);
      setCountries(c);
      setShippingMethods(sm);

      const loading = p.filter((x) => x.isLoadingPort);
      const dest = p.filter((x) => x.isDestinationPort);
      if (loading.length > 0 && !routeFormOriginId) setRouteFormOriginId(loading[0].id);
      if (dest.length > 0 && !routeFormDestId) setRouteFormDestId(dest[0].id);
      if (c.length > 0 && !portFormCountryCode) setPortFormCountryCode(c[0].code);
    } catch (err) {
      console.warn('Failed to load routing data', err);
      setActionError('Unable to load route records.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [routeFormOriginId, routeFormDestId, portFormCountryCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    loadData();
  };

  // Route CRUD
  const handleOpenCreateRoute = () => {
    setRouteModalMode('create');
    setEditingRouteId(null);
    const loading = ports.filter((x) => x.isLoadingPort);
    const dest = ports.filter((x) => x.isDestinationPort);
    if (loading.length > 0) setRouteFormOriginId(loading[0].id);
    if (dest.length > 0) setRouteFormDestId(dest[0].id);
    setRouteFormMinDays('30');
    setRouteFormMaxDays('45');
    setRouteFormIsActive(true);
    setIsRouteModalOpen(true);
  };

  const handleOpenEditRoute = (r: AdminRoute) => {
    setRouteModalMode('edit');
    setEditingRouteId(r.id);
    setRouteFormOriginId(r.originPortId);
    setRouteFormDestId(r.destinationPortId);
    setRouteFormMinDays(r.transitDaysMin.toString());
    setRouteFormMaxDays(r.transitDaysMax.toString());
    setRouteFormIsActive(r.isActive);
    setIsRouteModalOpen(true);
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const minDays = parseInt(routeFormMinDays, 10);
    const maxDays = parseInt(routeFormMaxDays, 10);

    if (isNaN(minDays) || minDays <= 0) {
      setActionError('Minimum transit days must be greater than 0.');
      return;
    }
    if (isNaN(maxDays) || maxDays < minDays) {
      setActionError('Maximum transit days must be greater than or equal to minimum transit days.');
      return;
    }
    if (routeFormOriginId === routeFormDestId) {
      setActionError('Origin port and destination port must be different.');
      return;
    }

    setIsSavingRoute(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (routeModalMode === 'create') {
        await adminService.createRoute({
          originPortId: routeFormOriginId,
          destinationPortId: routeFormDestId,
          transitDaysMin: minDays,
          transitDaysMax: maxDays,
          isActive: routeFormIsActive,
        });
        setActionSuccess('Shipping route established successfully.');
      } else if (editingRouteId) {
        await adminService.updateRoute(editingRouteId, {
          originPortId: routeFormOriginId,
          destinationPortId: routeFormDestId,
          transitDaysMin: minDays,
          transitDaysMax: maxDays,
          isActive: routeFormIsActive,
        });
        setActionSuccess('Shipping route updated successfully.');
      }
      setIsRouteModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save route';
      setActionError(msg);
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleToggleRoute = async (routeId: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.toggleRouteStatus(routeId, !currentStatus);
      setActionSuccess('Route status updated successfully.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update route';
      setActionError(msg);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!window.confirm('Are you sure you want to delete this shipping route?')) return;
    setActionError(null);
    try {
      await adminService.deleteRoute(routeId);
      setActionSuccess('Shipping route deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete route';
      setActionError(msg);
    }
  };

  // Port CRUD
  const handleOpenCreatePort = () => {
    setPortModalMode('create');
    setEditingPortId(null);
    setPortFormCode('');
    setPortFormName('');
    setPortFormNameAr('');
    if (countries.length > 0) setPortFormCountryCode(countries[0].code);
    setPortFormStateOrCity('');
    setPortFormIsLoading(true);
    setPortFormIsDestination(false);
    setPortFormIsActive(true);
    setIsPortModalOpen(true);
  };

  const handleOpenEditPort = (p: AdminPort) => {
    setPortModalMode('edit');
    setEditingPortId(p.id);
    setPortFormCode(p.code);
    setPortFormName(p.name);
    setPortFormNameAr(p.nameAr || '');
    setPortFormCountryCode(p.countryCode);
    setPortFormStateOrCity(p.stateOrCity || '');
    setPortFormIsLoading(p.isLoadingPort);
    setPortFormIsDestination(p.isDestinationPort);
    setPortFormIsActive(p.isActive);
    setIsPortModalOpen(true);
  };

  const handleSavePort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portFormCode.trim() || !portFormName.trim()) {
      setActionError('Port code and port name are required.');
      return;
    }
    if (!portFormIsLoading && !portFormIsDestination) {
      setActionError('A port must be designated as a Loading Port, Destination Port, or both.');
      return;
    }

    setIsSavingPort(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (portModalMode === 'create') {
        await adminService.createPort({
          code: portFormCode,
          name: portFormName,
          nameAr: portFormNameAr || undefined,
          countryCode: portFormCountryCode,
          stateOrCity: portFormStateOrCity || undefined,
          isLoadingPort: portFormIsLoading,
          isDestinationPort: portFormIsDestination,
          isActive: portFormIsActive,
        });
        setActionSuccess('Maritime port registered successfully.');
      } else if (editingPortId) {
        await adminService.updatePort(editingPortId, {
          code: portFormCode,
          name: portFormName,
          nameAr: portFormNameAr || undefined,
          countryCode: portFormCountryCode,
          stateOrCity: portFormStateOrCity || undefined,
          isLoadingPort: portFormIsLoading,
          isDestinationPort: portFormIsDestination,
          isActive: portFormIsActive,
        });
        setActionSuccess('Maritime port updated successfully.');
      }
      setIsPortModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save port';
      setActionError(msg);
    } finally {
      setIsSavingPort(false);
    }
  };

  const handleTogglePort = async (portId: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.togglePortStatus(portId, !currentStatus);
      setActionSuccess('Port status updated successfully.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update port';
      setActionError(msg);
    }
  };

  const handleDeletePort = async (portId: string) => {
    if (!window.confirm('Are you sure you want to delete this port?')) return;
    setActionError(null);
    try {
      await adminService.deletePort(portId);
      setActionSuccess('Port deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete port';
      setActionError(msg);
    }
  };

  // Country CRUD
  const handleOpenCreateCountry = () => {
    setCountryModalMode('create');
    setCountryFormCode('');
    setCountryFormName('');
    setCountryFormNameAr('');
    setCountryFormIsActive(true);
    setIsCountryModalOpen(true);
  };

  const handleOpenEditCountry = (c: AdminCountry) => {
    setCountryModalMode('edit');
    setCountryFormCode(c.code);
    setCountryFormName(c.name);
    setCountryFormNameAr(c.nameAr || '');
    setCountryFormIsActive(c.isActive);
    setIsCountryModalOpen(true);
  };

  const handleSaveCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryFormCode.trim() || !countryFormName.trim()) {
      setActionError('Country code and country name are required.');
      return;
    }

    setIsSavingCountry(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (countryModalMode === 'create') {
        await adminService.createCountry({
          code: countryFormCode,
          name: countryFormName,
          nameAr: countryFormNameAr || undefined,
          isActive: countryFormIsActive,
        });
        setActionSuccess('Country registered successfully.');
      } else {
        await adminService.updateCountry(countryFormCode, {
          name: countryFormName,
          nameAr: countryFormNameAr || undefined,
          isActive: countryFormIsActive,
        });
        setActionSuccess('Country updated successfully.');
      }
      setIsCountryModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save country';
      setActionError(msg);
    } finally {
      setIsSavingCountry(false);
    }
  };

  const handleToggleCountry = async (code: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.toggleCountryStatus(code, !currentStatus);
      setActionSuccess('Country status updated successfully.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update country';
      setActionError(msg);
    }
  };

  const handleDeleteCountry = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete country ${code}?`)) return;
    setActionError(null);
    try {
      await adminService.deleteCountry(code);
      setActionSuccess('Country deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete country';
      setActionError(msg);
    }
  };

  // Shipping Method CRUD
  const handleOpenCreateMethod = () => {
    setMethodModalMode('create');
    setMethodFormId('');
    setMethodFormName('');
    setMethodFormDesc('');
    setMethodFormIsActive(true);
    setIsMethodModalOpen(true);
  };

  const handleOpenEditMethod = (m: AdminShippingMethod) => {
    setMethodModalMode('edit');
    setMethodFormId(m.id);
    setMethodFormName(m.name);
    setMethodFormDesc(m.description || '');
    setMethodFormIsActive(m.isActive);
    setIsMethodModalOpen(true);
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodFormName.trim()) {
      setActionError('Method name is required.');
      return;
    }

    setIsSavingMethod(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (methodModalMode === 'create') {
        if (!methodFormId.trim()) {
          setActionError('Method ID/identifier is required.');
          setIsSavingMethod(false);
          return;
        }
        await adminService.createShippingMethod({
          id: methodFormId,
          name: methodFormName,
          description: methodFormDesc || undefined,
          isActive: methodFormIsActive,
        });
        setActionSuccess('Shipping method registered.');
      } else {
        await adminService.updateShippingMethod(methodFormId, {
          name: methodFormName,
          description: methodFormDesc || undefined,
          isActive: methodFormIsActive,
        });
        setActionSuccess('Shipping method updated.');
      }
      setIsMethodModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save shipping method';
      setActionError(msg);
    } finally {
      setIsSavingMethod(false);
    }
  };

  const handleToggleMethod = async (id: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.toggleShippingMethodStatus(id, !currentStatus);
      setActionSuccess('Shipping method status updated.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update shipping method';
      setActionError(msg);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shipping method?')) return;
    setActionError(null);
    try {
      await adminService.deleteShippingMethod(id);
      setActionSuccess('Shipping method deleted.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete shipping method';
      setActionError(msg);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Maritime Logistics Network
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Active Network
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <Compass className="w-6 h-6 text-brand-orange-500" />
            Shipping Routes, Ports & Countries
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage oceanic shipping routes, US departure terminals, and Arabian Gulf discharge ports.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canManageRoutes && activeTab === 'routes' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateRoute}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Shipping Route
            </Button>
          )}

          {canManageRoutes && activeTab === 'ports' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreatePort}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Port
            </Button>
          )}

          {canManageRoutes && activeTab === 'countries' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateCountry}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Country
            </Button>
          )}

          {canManageRoutes && activeTab === 'methods' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateMethod}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Shipping Method
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
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'routes'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>Active Routes ({routes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ports')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'ports'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Anchor className="w-4 h-4" />
          <span>Ports Directory ({ports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('countries')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'countries'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Supported Countries ({countries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('methods')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'methods'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Shipping Methods ({shippingMethods.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-medium">Loading logistics network...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: SHIPPING ROUTES */}
          {activeTab === 'routes' && (
            <Card className="bg-white border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Origin Port</th>
                      <th className="py-3 px-4">Destination Port</th>
                      <th className="py-3 px-4">Transit Duration</th>
                      <th className="py-3 px-4">Status</th>
                      {canManageRoutes && <th className="py-3 px-4 text-end">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {routes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-brand-navy-950">
                          {r.originPortName}
                          <span className="block text-[10px] font-mono text-slate-400">
                            {r.originPortCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {r.destinationPortName}
                          <span className="block text-[10px] font-mono text-slate-400">
                            {r.destinationPortCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-brand-orange-500" />
                            <span>
                              {r.transitDaysMin} – {r.transitDaysMax} days
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {r.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                            </span>
                          )}
                        </td>
                        {canManageRoutes && (
                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleRoute(r.id, r.isActive)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                {r.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditRoute(r)}
                                className="p-1 text-slate-600 hover:text-slate-900"
                                title="Edit Route"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRoute(r.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete Route"
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

          {/* TAB 2: PORTS DIRECTORY */}
          {activeTab === 'ports' && (
            <Card className="bg-white border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Port Code & Name</th>
                      <th className="py-3 px-4">الاسم بالعربي</th>
                      <th className="py-3 px-4">Country & Region</th>
                      <th className="py-3 px-4">Port Type</th>
                      <th className="py-3 px-4">Status</th>
                      {canManageRoutes && <th className="py-3 px-4 text-end">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {ports.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-brand-navy-950">
                          {p.name}
                          <span className="block text-[10px] font-mono text-slate-400">
                            {p.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800" dir="rtl">
                          {p.nameAr || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.stateOrCity ? `${p.stateOrCity}, ` : ''}
                          <span className="font-bold">{p.countryCode}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.isLoadingPort && <Badge variant="orange">Loading Terminal</Badge>}
                            {p.isDestinationPort && (
                              <Badge variant="navy">Discharge Terminal</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" /> Inactive
                            </span>
                          )}
                        </td>
                        {canManageRoutes && (
                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTogglePort(p.id, p.isActive)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                {p.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditPort(p)}
                                className="p-1 text-slate-600 hover:text-slate-900"
                                title="Edit Port"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePort(p.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete Port"
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

          {/* TAB 3: COUNTRIES */}
          {activeTab === 'countries' && (
            <Card className="bg-white border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Country Code</th>
                      <th className="py-3 px-4">Country Name</th>
                      <th className="py-3 px-4">الاسم بالعربي</th>
                      <th className="py-3 px-4">Operating Status</th>
                      {canManageRoutes && <th className="py-3 px-4 text-end">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {countries.map((c) => (
                      <tr key={c.code} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-navy-950">
                          {c.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800" dir="rtl">
                          {c.nameAr || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          {c.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Operational
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </td>
                        {canManageRoutes && (
                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleCountry(c.code, c.isActive)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                {c.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditCountry(c)}
                                className="p-1 text-slate-600 hover:text-slate-900"
                                title="Edit Country"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCountry(c.code)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete Country"
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

          {/* TAB 4: SHIPPING METHODS */}
          {activeTab === 'methods' && (
            <Card className="bg-white border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Method ID</th>
                      <th className="py-3 px-4">Method Name</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Status</th>
                      {canManageRoutes && <th className="py-3 px-4 text-end">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {shippingMethods.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-navy-950">{m.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{m.name}</td>
                        <td className="py-3.5 px-4 text-slate-500">{m.description || '—'}</td>
                        <td className="py-3.5 px-4">
                          {m.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </td>
                        {canManageRoutes && (
                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleMethod(m.id, m.isActive)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                {m.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditMethod(m)}
                                className="p-1 text-slate-600 hover:text-slate-900"
                                title="Edit Method"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMethod(m.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete Method"
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
        </>
      )}

      {/* Route Modal */}
      <Modal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        title={routeModalMode === 'create' ? 'Establish Shipping Route' : 'Edit Shipping Route'}
      >
        <form onSubmit={handleSaveRoute} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Origin Loading Port <span className="text-rose-500">*</span>
            </label>
            <select
              value={routeFormOriginId}
              onChange={(e) => setRouteFormOriginId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              required
            >
              {ports
                .filter((p) => p.isLoadingPort)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — {p.countryCode}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Destination Discharge Port <span className="text-rose-500">*</span>
            </label>
            <select
              value={routeFormDestId}
              onChange={(e) => setRouteFormDestId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              required
            >
              {ports
                .filter((p) => p.isDestinationPort)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — {p.countryCode}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Min Transit (Days) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={routeFormMinDays}
                onChange={(e) => setRouteFormMinDays(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Max Transit (Days) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={routeFormMaxDays}
                onChange={(e) => setRouteFormMaxDays(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="routeFormIsActive"
              checked={routeFormIsActive}
              onChange={(e) => setRouteFormIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="routeFormIsActive" className="font-bold text-slate-700">
              Active Operational Route
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRouteModalOpen(false)}
              disabled={isSavingRoute}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingRoute}
              className="font-bold"
            >
              {isSavingRoute ? 'Saving...' : 'Save Shipping Route'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Port Modal */}
      <Modal
        isOpen={isPortModalOpen}
        onClose={() => setIsPortModalOpen(false)}
        title={portModalMode === 'create' ? 'Register Maritime Port' : 'Edit Port'}
      >
        <form onSubmit={handleSavePort} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Port Code (UN/LOCODE) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={portFormCode}
                onChange={(e) => setPortFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. USNWK"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Country <span className="text-rose-500">*</span>
              </label>
              <select
                value={portFormCountryCode}
                onChange={(e) => setPortFormCountryCode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                required
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Port Name (English) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={portFormName}
                onChange={(e) => setPortFormName(e.target.value)}
                placeholder="e.g. Port of Newark"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم الميناء (عربي)</label>
              <Input
                type="text"
                dir="rtl"
                value={portFormNameAr}
                onChange={(e) => setPortFormNameAr(e.target.value)}
                placeholder="مثال: ميناء نيوارك"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">State / City</label>
            <Input
              type="text"
              value={portFormStateOrCity}
              onChange={(e) => setPortFormStateOrCity(e.target.value)}
              placeholder="e.g. New Jersey"
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="block font-bold text-slate-700 mb-1">Port Capabilities:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={portFormIsLoading}
                onChange={(e) => setPortFormIsLoading(e.target.checked)}
                className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
              />
              <span className="font-semibold text-slate-800">Loading Terminal (US Origin Port)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={portFormIsDestination}
                onChange={(e) => setPortFormIsDestination(e.target.checked)}
                className="rounded border-slate-300 text-brand-navy-950 focus:ring-brand-navy-900"
              />
              <span className="font-semibold text-slate-800">
                Discharge Terminal (UAE Destination Port)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={portFormIsActive}
                onChange={(e) => setPortFormIsActive(e.target.checked)}
                className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
              />
              <span className="font-semibold text-slate-800">Active Operational Status</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPortModalOpen(false)}
              disabled={isSavingPort}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingPort}
              className="font-bold"
            >
              {isSavingPort ? 'Saving...' : 'Save Port'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Country Modal */}
      <Modal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        title={countryModalMode === 'create' ? 'Register Country' : 'Edit Country'}
      >
        <form onSubmit={handleSaveCountry} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              ISO Country Code (3 letters) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              maxLength={3}
              value={countryFormCode}
              onChange={(e) => setCountryFormCode(e.target.value.toUpperCase())}
              placeholder="e.g. USA, ARE, SAU"
              disabled={countryModalMode === 'edit'}
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Country Name (English) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={countryFormName}
              onChange={(e) => setCountryFormName(e.target.value)}
              placeholder="e.g. United States of America"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">اسم الدولة (عربي)</label>
            <Input
              type="text"
              dir="rtl"
              value={countryFormNameAr}
              onChange={(e) => setCountryFormNameAr(e.target.value)}
              placeholder="مثال: الإمارات العربية المتحدة"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="countryFormIsActive"
              checked={countryFormIsActive}
              onChange={(e) => setCountryFormIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="countryFormIsActive" className="font-bold text-slate-700">
              Active / Supported Country
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCountryModalOpen(false)}
              disabled={isSavingCountry}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingCountry}
              className="font-bold"
            >
              {isSavingCountry ? 'Saving...' : 'Save Country'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shipping Method Modal */}
      <Modal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
        title={methodModalMode === 'create' ? 'Add Shipping Method' : 'Edit Shipping Method'}
      >
        <form onSubmit={handleSaveMethod} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Method Identifier / Code <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={methodFormId}
              onChange={(e) => setMethodFormId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="e.g. consolidated_container, roro"
              disabled={methodModalMode === 'edit'}
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Method Name (Public Display) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={methodFormName}
              onChange={(e) => setMethodFormName(e.target.value)}
              placeholder="e.g. Consolidated Container (LCL)"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={methodFormDesc}
              onChange={(e) => setMethodFormDesc(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-brand-orange-500"
              placeholder="Explain method suitability..."
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="methodFormIsActive"
              checked={methodFormIsActive}
              onChange={(e) => setMethodFormIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-orange-600 focus:ring-brand-orange-500"
            />
            <label htmlFor="methodFormIsActive" className="font-bold text-slate-700">
              Active / Offered in Calculator
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMethodModalOpen(false)}
              disabled={isSavingMethod}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingMethod}
              className="font-bold"
            >
              {isSavingMethod ? 'Saving...' : 'Save Shipping Method'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
