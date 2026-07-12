"use client";
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  HardDrive, 
  Activity, 
  Clock, 
  Cloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Play
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { fetchWithAuth } from '@/utils/api';
import Link from 'next/link';

interface StatsCounters {
  totalJobs: number;
  activeJobs: number;
  completedRuns: number;
  failedRuns: number;
  storageConfigsCount: number;
  activeAlerts: number;
  successRate: number;
  bytesTransferred: string;
}

interface BackupRun {
  id: string;
  jobId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  bytesSynced: string;
  errorMessage?: string;
  job: {
    name: string;
    sourceType: string;
    syncMode: string;
  };
}

export default function Dashboard() {
  const [counters, setCounters] = useState<StatsCounters | null>(null);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsRes, runsRes] = await Promise.all([
        fetchWithAuth('/system/metrics'),
        fetchWithAuth('/history/runs')
      ]);

      if (metricsRes.ok && runsRes.ok) {
        const metricsData = await metricsRes.json();
        const runsData = await runsRes.json();
        setCounters(metricsData.counters);
        setRuns(runsData.slice(0, 5)); // Get recent 5 runs
      }
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '0 GB';
    const bytes = Number(bytesStr);
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1024) {
      return (gb / 1024).toFixed(2) + ' TB';
    }
    return gb.toFixed(2) + ' GB';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  // Visual trend chart data representing relative daily sync volumes
  const chartData = [
    { name: 'Mon', usage: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.4).toFixed(1) },
    { name: 'Tue', usage: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.65).toFixed(1) },
    { name: 'Wed', usage: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.8).toFixed(1) },
    { name: 'Thu', usage: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.88).toFixed(1) },
    { name: 'Fri', usage: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.92).toFixed(1) },
    { name: 'Sat', usage: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.95).toFixed(1) },
    { name: 'Sun', usage: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 1.0).toFixed(1) },
  ];

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-zinc-500 mt-1">Real-time backup performance and health monitoring.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2.5 rounded-xl glass-dark text-white text-sm font-medium hover:bg-white/5 transition-all cursor-pointer"
          >
            Refresh Metrics
          </button>
          <Link 
            href="/backups"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center gap-1 cursor-pointer"
          >
            Create Backup Job
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Data Synced" 
          value={formatBytes(counters?.bytesTransferred)} 
          icon={HardDrive} 
          trend="Cumulative" 
          trendUp={true} 
        />
        <StatsCard 
          title="Active Sync Jobs" 
          value={counters?.activeJobs.toString() || '0'} 
          icon={Activity} 
          trend={`Out of ${counters?.totalJobs}`} 
          trendUp={true} 
        />
        <StatsCard 
          title="Connected Storages" 
          value={counters?.storageConfigsCount.toString() || '0'} 
          icon={Cloud} 
          trend="Cloud Targets" 
          trendUp={true} 
        />
        <StatsCard 
          title="Recovery Health" 
          value={`${counters?.successRate}%`} 
          icon={Clock} 
          trend="Runs Success Rate" 
          trendUp={true} 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Chart */}
        <div className="lg:col-span-2 glass-dark p-8 rounded-3xl border border-white/5">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-white">Replicated Data Load (GB)</h3>
            <div className="flex gap-2 items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-zinc-400">Sync Accumulation Volume</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6 border border-white/5">
          <h3 className="text-lg font-bold text-white">Recent Sync Runs</h3>
          
          {runs.length === 0 ? (
            <div className="my-auto text-center text-zinc-500 text-sm py-10">
              No executions completed yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {runs.map((run) => (
                <div key={run.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group border border-white/0 hover:border-white/5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    run.status === 'running' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-rose-500/10 text-rose-500'
                  }`}>
                    {run.status === 'completed' ? <CheckCircle2 size={18} /> :
                     run.status === 'running' ? <Activity size={18} className="animate-spin" /> :
                     <AlertCircle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{run.job.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {run.job.syncMode} • {formatBytes(run.bytesSynced)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-zinc-500 font-mono font-medium">
                      {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Link 
            href="/backups"
            className="mt-auto w-full py-3 rounded-xl border border-white/5 text-center text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            View All Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
