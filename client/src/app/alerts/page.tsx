"use client";
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  Check, 
  Loader2, 
  FileText, 
  RefreshCw, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  resolved: boolean;
  createdAt: string;
  job: { name: string };
}

interface AuditEvent {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  details: string;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [audits, setAudits] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAlertsAndAudits();
  }, []);

  const fetchAlertsAndAudits = async () => {
    try {
      setLoading(true);
      const [alertsRes, auditsRes] = await Promise.all([
        fetchWithAuth('/monitoring/alerts'),
        fetchWithAuth('/monitoring/audits')
      ]);

      if (alertsRes.ok && auditsRes.ok) {
        const alertsData = await alertsRes.json();
        const auditsData = await auditsRes.json();
        setAlerts(alertsData);
        setAudits(auditsData);
      }
    } catch (err) {
      console.error('Failed to load alerts/audits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      setActionLoading(id);
      const res = await fetchWithAuth(`/monitoring/alerts/${id}/resolve`, {
        method: 'POST'
      });

      if (res.ok) {
        setAlerts(alerts.map(a => a.id === id ? { ...a, resolved: true } : a));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getAuditActionBadgeStyle = (action: string) => {
    if (action.includes('fail') || action.includes('error')) {
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
    if (action.includes('complete') || action.includes('verify') || action.includes('login')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    return 'bg-zinc-800 text-zinc-400 border border-white/5';
  };

  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Security & Alerts</h1>
          <p className="text-zinc-500 mt-1">Audit log records, threat anomalies, and incident controls.</p>
        </div>
        <button 
          onClick={fetchAlertsAndAudits}
          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw size={14} />
          Refresh Streams
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-40">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Incidents Panel */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell size={20} className="text-amber-500" />
              Active Incident Alerts
            </h3>

            {activeAlerts.length === 0 ? (
              <div className="glass-dark p-8 rounded-3xl text-center text-sm text-zinc-500 border border-white/5">
                No active threats or incidents detected. System is running healthy.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className={`p-5 rounded-2xl flex flex-col gap-4 ${getSeverityStyle(alert.severity)}`}>
                    <div className="flex gap-2.5 items-start">
                      <ShieldAlert className="shrink-0 mt-0.5" size={18} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          {alert.type} • {alert.job?.name}
                        </h4>
                        <p className="text-sm font-semibold text-white mt-1 leading-snug">{alert.message}</p>
                        <p className="text-[10px] text-zinc-400/80 mt-2">{new Date(alert.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      disabled={actionLoading === alert.id}
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {actionLoading === alert.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      Mark Resolved
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Resolved incidents brief */}
            {resolvedAlerts.length > 0 && (
              <div className="mt-2">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Recently Resolved</h4>
                <div className="flex flex-col gap-2.5">
                  {resolvedAlerts.slice(0, 5).map(alert => (
                    <div key={alert.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center text-xs">
                      <div className="truncate max-w-[200px]">
                        <p className="text-zinc-300 font-semibold truncate">{alert.message}</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">{alert.job?.name}</p>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg">RESOLVED</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Audit Logs Trail */}
          <div className="lg:col-span-2 glass-dark p-8 rounded-3xl flex flex-col gap-6 border border-white/5 h-fit">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={20} className="text-blue-500" />
              Administrative Audit Trail
            </h3>

            {audits.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                No administrative log actions identified.
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
                {audits.map((event) => (
                  <div key={event.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.08] transition-all">
                    <div className="flex gap-3 items-start min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0">
                        <UserCheck size={16} className="text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white leading-normal break-words pr-2">
                          {event.details}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Actor: <span className="font-semibold text-zinc-400">{event.userEmail || 'System Agent'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end gap-1.5 shrink-0">
                      <span className={`text-[9px] px-2 py-0.5 rounded-lg font-mono font-bold uppercase ${getAuditActionBadgeStyle(event.action)}`}>
                        {event.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {new Date(event.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
