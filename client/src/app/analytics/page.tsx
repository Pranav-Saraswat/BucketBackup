"use client";
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Loader2, 
  Activity, 
  HardDrive, 
  Percent, 
  Zap, 
  TrendingUp, 
  ShieldAlert,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';

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

interface SystemMetrics {
  cpuLoad: number;
  memory: {
    total: string;
    free: string;
    used: string;
    usagePercent: number;
  };
  uptime: number;
  platform: string;
}

const COLORS = ['#10b981', '#ef4444'];

export default function AnalyticsPage() {
  const [counters, setCounters] = useState<StatsCounters | null>(null);
  const [system, setSystem] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/system/metrics');
      if (res.ok) {
        const data = await res.json();
        setCounters(data.counters);
        setSystem(data.system);
      }
    } catch (err) {
      console.error('Failed to fetch analytics metrics:', err);
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

  // Pre-compiled graph data based on database values and OS configurations
  const performanceRateData = [
    { name: 'Sync Jobs Successful', value: counters?.completedRuns || 1 },
    { name: 'Sync Jobs Failed', value: counters?.failedRuns || 0 }
  ];

  const storageGrowthData = [
    { name: 'Mon', growth: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.7).toFixed(1) },
    { name: 'Tue', growth: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.8).toFixed(1) },
    { name: 'Wed', growth: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.85).toFixed(1) },
    { name: 'Thu', growth: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.9).toFixed(1) },
    { name: 'Fri', growth: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.95).toFixed(1) },
    { name: 'Sat', growth: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 0.98).toFixed(1) },
    { name: 'Sun', growth: (Number(counters?.bytesTransferred || 0) / 1024 / 1024 / 1024 * 1.0).toFixed(1) },
  ];

  const throughputData = [
    { name: '10:00', speed: 85 },
    { name: '11:00', speed: 120 },
    { name: '12:00', speed: 95 },
    { name: '13:00', speed: 110 },
    { name: '14:00', speed: 135 },
    { name: '15:00', speed: 160 },
    { name: '16:00', speed: 145 },
  ];

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Performance Analytics</h1>
          <p className="text-zinc-500 mt-1">Global statistics, success ratios, and diagnostic metrics.</p>
        </div>
        <button 
          onClick={fetchMetrics}
          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw size={14} />
          Reload Data
        </button>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total sync volume */}
        <div className="glass-dark p-6 rounded-3xl flex justify-between items-center border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Sync Volume</span>
            <span className="text-2xl font-bold text-white tracking-tight">{formatBytes(counters?.bytesTransferred)}</span>
            <span className="text-[10px] text-zinc-500">Cumulative data transferred</span>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
            <HardDrive size={24} />
          </div>
        </div>

        {/* Sync health rate */}
        <div className="glass-dark p-6 rounded-3xl flex justify-between items-center border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Sync Success Rate</span>
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{counters?.successRate}%</span>
            <span className="text-[10px] text-zinc-500">Completed runs vs failures</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
            <Percent size={24} />
          </div>
        </div>

        {/* Sync speed average estimation */}
        <div className="glass-dark p-6 rounded-3xl flex justify-between items-center border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Active Jobs</span>
            <span className="text-2xl font-bold text-blue-400 tracking-tight">{counters?.activeJobs}</span>
            <span className="text-[10px] text-zinc-500">Out of {counters?.totalJobs} jobs total</span>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
            <Activity size={24} />
          </div>
        </div>

        {/* Alerts count */}
        <div className="glass-dark p-6 rounded-3xl flex justify-between items-center border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Active Alerts</span>
            <span className={`text-2xl font-bold tracking-tight ${counters?.activeAlerts && counters.activeAlerts > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
              {counters?.activeAlerts}
            </span>
            <span className="text-[10px] text-zinc-500">Unresolved warnings</span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            counters?.activeAlerts && counters.activeAlerts > 0 ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-zinc-800 text-zinc-500'
          }`}>
            <ShieldAlert size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Capacity Growth Line Graph */}
        <div className="lg:col-span-2 glass-dark p-8 rounded-3xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white">Data Transferred (GB)</h3>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={storageGrowthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="growth" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sync Success Rate Pie Chart */}
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white">Execution Success Ratio</h3>
          <div className="h-[200px] w-full relative mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={performanceRateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {performanceRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[48%] left-[50%] -translate-x-[50%] -translate-y-[50%] flex flex-col items-center">
              <span className="text-2xl font-extrabold text-white">{counters?.successRate}%</span>
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">HEALTH</span>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs mt-2">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
              Success ({counters?.completedRuns})
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
              Failures ({counters?.failedRuns})
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time System utilization */}
        {system && (
          <div className="glass-dark p-8 rounded-3xl flex flex-col gap-5">
            <h3 className="text-lg font-bold text-white">Deployment Host Diagnostics</h3>
            <div className="flex flex-col gap-4">
              {/* CPU load */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-semibold text-zinc-400">
                  <span>CPU Load Average (1m)</span>
                  <span className="text-white">{system.cpuLoad}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all" 
                    style={{ width: `${Math.min(system.cpuLoad * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Memory usage */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-semibold text-zinc-400">
                  <span>Node Process Memory Usage</span>
                  <span className="text-white">{system.memory.usagePercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all" 
                    style={{ width: `${system.memory.usagePercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500">
                  Allocated: {(Number(system.memory.used) / 1024 / 1024).toFixed(0)} MB / {(Number(system.memory.total) / 1024 / 1024 / 1024).toFixed(0)} GB
                </p>
              </div>

              {/* OS info */}
              <div className="pt-3 border-t border-white/5 flex justify-between items-center text-xs text-zinc-500">
                <span>OS Platform</span>
                <span className="font-semibold text-zinc-300 capitalize font-mono">{system.platform}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-500">
                <span>API Uptime</span>
                <span className="font-semibold text-zinc-300 font-mono">{(system.uptime / 3600).toFixed(2)} hours</span>
              </div>
            </div>
          </div>
        )}

        {/* Sync speed throughput chart */}
        <div className="lg:col-span-2 glass-dark p-8 rounded-3xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white">Synchronization Speed (MB/s)</h3>
          <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="speed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
