import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { adminService, AdminAuditEvent } from '../../services/adminService';
import {
  History,
  Search,
  RefreshCw,
  Clock,
  User,
  Shield,
  FileSpreadsheet,
  Mail,
  Sliders,
} from 'lucide-react';

export const AdminActivityPage: React.FC = () => {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      const data = await adminService.getAuditEvents();
      setEvents(data);
    } catch (err) {
      console.warn('Failed to load audit events', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEvents();
  };

  const getActionBadge = (action: string) => {
    if (action.includes('INVIT')) return <Badge variant="orange">Invitation</Badge>;
    if (action.includes('ROLE')) return <Badge variant="navy">Role Update</Badge>;
    if (action.includes('STATUS')) return <Badge variant="info">Status Toggle</Badge>;
    if (action.includes('QUOTE')) return <Badge variant="success">Quotation</Badge>;
    return <Badge variant="default">{action}</Badge>;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('INVIT')) return <Mail className="w-4 h-4 text-brand-orange-500" />;
    if (action.includes('ROLE')) return <Shield className="w-4 h-4 text-brand-navy-950" />;
    if (action.includes('STATUS')) return <Sliders className="w-4 h-4 text-blue-500" />;
    if (action.includes('QUOTE')) return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    return <History className="w-4 h-4 text-slate-400" />;
  };

  const formatActionDescription = (ev: AdminAuditEvent) => {
    switch (ev.action) {
      case 'INVITATION_CREATED':
        return `Invited new staff member (${String(ev.newData?.email || ev.entityId)})`;
      case 'INVITATION_ACCEPTED':
        return `Staff invitation accepted by ${String(ev.newData?.email || 'user')}`;
      case 'INVITATION_REVOKED':
        return `Revoked pending staff invitation (${ev.entityId})`;
      case 'ROLE_UPDATED':
        return `Updated staff role assignment to "${String(ev.newData?.role_id || '')}"`;
      case 'STATUS_TOGGLED':
        return `Account status toggled: ${ev.newData?.is_active ? 'Activated' : 'Deactivated'}`;
      case 'CREATE_ROLE':
        return `Created security role "${String(ev.newData?.name || ev.entityId)}"`;
      case 'UPDATE_ROLE':
        return `Modified permissions/status for role "${String(ev.newData?.name || ev.entityId)}"`;
      case 'DELETE_ROLE':
        return `Deleted role "${ev.entityId}"`;
      case 'CLONE_ROLE':
        return `Cloned security role "${String(ev.newData?.name || ev.entityId)}"`;
      default:
        return `${ev.action.replace(/_/g, ' ')} on ${ev.entityTable}`;
    }
  };

  const filteredEvents = events.filter((ev) => {
    const q = search.toLowerCase();
    const desc = formatActionDescription(ev).toLowerCase();
    return (
      desc.includes(q) ||
      (ev.performedByName && ev.performedByName.toLowerCase().includes(q)) ||
      (ev.performedByEmail && ev.performedByEmail.toLowerCase().includes(q)) ||
      ev.action.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Audit Trail
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Immutable Log
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <History className="w-6 h-6 text-brand-orange-500" />
            Activity History & Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of administrative actions, staff invitations, role modifications, and
            system operations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
        </div>
      </div>

      {/* Main Card */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200 overflow-hidden w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <Input
            placeholder="Search activity by actor, action description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<Search className="w-4 h-4" />}
            className="w-full sm:w-80 min-h-[38px] text-xs"
          />
          <span className="text-xs text-slate-400 font-semibold self-end sm:self-auto">
            Showing {filteredEvents.length} of {events.length} events
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-400 font-medium">Loading audit trail...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              title="No activity events found"
              description={
                search
                  ? 'No events match your active search terms.'
                  : 'Administrative modifications, invitations, and role updates will be logged here in real time.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3 text-start">Timestamp</th>
                  <th className="pb-3 px-3 text-start">Operational Event</th>
                  <th className="pb-3 px-3 text-start">Category</th>
                  <th className="pb-3 px-3 text-start">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(ev.performedAt).toLocaleString()}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-100">
                          {getActionIcon(ev.action)}
                        </div>
                        <span className="font-bold text-slate-900">
                          {formatActionDescription(ev)}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">{getActionBadge(ev.action)}</td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.performedByName || ev.performedByEmail || 'System'}</span>
                      </div>
                      {ev.performedByEmail && ev.performedByEmail !== ev.performedByName && (
                        <span className="text-[10px] text-slate-400 font-mono block ps-5">
                          {ev.performedByEmail}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
