"use client";
import { motion } from 'framer-motion';
import { 
  Database, 
  ArrowUpRight, 
  ArrowDownRight, 
  HardDrive, 
  Activity, 
  Clock, 
  Cloud,
  CheckCircle2,
  AlertCircle
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

const data = [
  { name: 'Mon', usage: 4.2 },
  { name: 'Tue', usage: 4.8 },
  { name: 'Wed', usage: 5.1 },
  { name: 'Thu', usage: 5.9 },
  { name: 'Fri', usage: 6.4 },
  { name: 'Sat', usage: 7.1 },
  { name: 'Sun', usage: 7.5 },
];

const recentBackups = [
  { id: '1', name: 'UserDB_Prod', provider: 'AWS S3', status: 'Completed', size: '1.2 GB', time: '2 hours ago' },
  { id: '2', name: 'AssetStore_Static', provider: 'GCP GCS', status: 'Running', size: '450 MB', time: 'Running...' },
  { id: '3', name: 'Legacy_Logs_2025', provider: 'Azure Blob', status: 'Completed', size: '15.8 GB', time: 'Yesterday' },
  { id: '4', name: 'CRM_Media_Backup', provider: 'AWS S3', status: 'Failed', size: '2.1 GB', time: '5 hours ago' },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-zinc-500 mt-1">Real-time backup performance and health monitoring.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl glass-dark text-white text-sm font-medium hover:bg-white/5 transition-all">
            Export Report
          </button>
          <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
            Manual Backup
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Storage" 
          value="7.52 TB" 
          icon={HardDrive} 
          trend="+12%" 
          trendUp={true} 
        />
        <StatsCard 
          title="Active Jobs" 
          value="24" 
          icon={Activity} 
          trend="Steady" 
          trendUp={true} 
        />
        <StatsCard 
          title="Avg. Sync Speed" 
          value="1.2 GB/s" 
          icon={Clock} 
          trend="+5%" 
          trendUp={true} 
        />
        <StatsCard 
          title="Sync Health" 
          value="99.9%" 
          icon={Cloud} 
          trend="-0.1%" 
          trendUp={false} 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Chart */}
        <div className="lg:col-span-2 glass-dark p-8 rounded-3xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-white">Storage Growth (TB)</h3>
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-zinc-400">Projected Usage</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
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
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white">Recent Backups</h3>
          <div className="flex flex-col gap-4">
            {recentBackups.map((backup) => (
              <div key={backup.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  backup.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                  backup.status === 'Running' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-rose-500/10 text-rose-500'
                }`}>
                  {backup.status === 'Completed' ? <CheckCircle2 size={20} /> :
                   backup.status === 'Running' ? <Activity size={20} className="animate-pulse" /> :
                   <AlertCircle size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{backup.name}</p>
                  <p className="text-xs text-zinc-500">{backup.provider} • {backup.size}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 font-medium uppercase">{backup.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-auto w-full py-3 rounded-xl border border-white/5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
            View All Jobs
          </button>
        </div>
      </div>
    </div>
  );
}
