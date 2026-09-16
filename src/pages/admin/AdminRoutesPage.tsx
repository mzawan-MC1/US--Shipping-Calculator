import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { adminService, AdminRoute, AdminPort, AdminCountry } from '../../services/adminService';
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
} from 'lucide-react';

export const AdminRoutesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageRoutes = hasPermission('routes.manage');

  const [activeTab, setActiveTab] = useState<'routes' | 'ports' | 'countries'>('routes');
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [ports, setPorts] = useState<AdminPort[]>([]);
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [r, p, c] = await Promise.all([
        adminService.getRoutes(),
        adminService.getPorts(),
        adminService.getCountries(),
      ]);
      setRoutes(r);
      setPorts(p);
      setCountries(c);
    } catch (err) {
      console.warn('Failed to load routing data', err);
      setActionError('Unable to load route records.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    setActionError(null);
    loadData();
  };

  const handleToggleRoute = async (routeId: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.toggleRouteStatus(routeId, !currentStatus);
      setRoutes((prev) =>
        prev.map((r) => (r.id === routeId ? { ...r, isActive: !currentStatus } : r))
      );
      setActionSuccess('Route status updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update route';
      setActionError(msg);
    }
  };

  const handleTogglePort = async (portId: string, currentStatus: boolean) => {
    setActionError(null);
    try {
      await adminService.togglePortStatus(portId, !currentStatus);
      setPorts((prev) =>
        prev.map((p) => (p.id === portId ? { ...p, isActive: !currentStatus } : p))
      );
      setActionSuccess('Port status updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update port';
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
              Maritime Logistics
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
            Manage oceanic shipping routes, US departure terminals, and Arabian Gulf discharge
            ports.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'countries'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Supported Countries ({countries.length})</span>
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
                <table className="w-full text-start text-xs min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Origin Port</th>
                      <th className="py-3 px-4">Destination Port</th>
                      <th className="py-3 px-4">Transit Duration</th>
                      <th className="py-3 px-4">Status</th>
                      {canManageRoutes && <th className="py-3 px-4 text-end">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {routes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-brand-navy-950">
                          {r.originPortName}
                          <span className="block text-[10px] font-mono text-slate-400">
                            {r.originPortCode} (USA)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {r.destinationPortName}
                          <span className="block text-[10px] font-mono text-slate-400">
                            {r.destinationPortCode} (UAE)
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleRoute(r.id, r.isActive)}
                              className="text-[11px] py-1 px-2.5 font-bold"
                            >
                              {r.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
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
                <table className="w-full text-start text-xs min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Port Code & Name</th>
                      <th className="py-3 px-4">Country & Region</th>
                      <th className="py-3 px-4">Port Type</th>
                      <th className="py-3 px-4">Status</th>
                      {canManageRoutes && <th className="py-3 px-4 text-end">Action</th>}
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
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.stateOrCity ? `${p.stateOrCity}, ` : ''}
                          {p.countryCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTogglePort(p.id, p.isActive)}
                              className="text-[11px] py-1 px-2.5 font-bold"
                            >
                              {p.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
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
                <table className="w-full text-start text-xs min-w-[550px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Country Code</th>
                      <th className="py-3 px-4">Country Name</th>
                      <th className="py-3 px-4">Operating Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {countries.map((c) => (
                      <tr key={c.code} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-navy-950">
                          {c.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{c.name}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
