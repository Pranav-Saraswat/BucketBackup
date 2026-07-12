"use client";
import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Database, 
  ArrowRight, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  FileSpreadsheet,
  Clock
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';

interface StorageConfig {
  id: string;
  provider: 'aws' | 'gcp' | 'azure';
  bucketName: string;
}

interface BackupJob {
  id: string;
  name: string;
  destConfig: StorageConfig;
  sourceType: string;
  sourcePath: string;
}

interface RestoreJob {
  id: string;
  backupJobId: string;
  backupJob: { name: string };
  targetConfig: { provider: string; bucketName: string };
  targetPath: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  filesRestored: number;
  bytesRestored: string;
  errorMessage?: string;
}

export default function DisasterRecoveryPage() {
  const [restores, setRestores] = useState<RestoreJob[]>([]);
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [configs, setConfigs] = useState<StorageConfig[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [backupJobId, setBackupJobId] = useState('');
  const [targetConfigId, setTargetConfigId] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    fetchRestores();
    fetchBackupJobs();
    fetchConfigs();

    // Poll active restores status if any is running
    const timer = setInterval(() => {
      const isRunning = restores.some(r => r.status === 'running');
      if (isRunning) {
        pollRestores();
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [restores]);

  const fetchRestores = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/history/restores');
      if (res.ok) {
        const data = await res.json();
        setRestores(data);
      }
    } catch (err) {
      console.error('Failed to fetch restore jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const pollRestores = async () => {
    try {
      const res = await fetchWithAuth('/history/restores');
      if (res.ok) {
        const data = await res.json();
        setRestores(data);
      }
    } catch (err) {
      console.error('Polling failed:', err);
    }
  };

  const fetchBackupJobs = async () => {
    try {
      const res = await fetchWithAuth('/backups');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetchWithAuth('/storage');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!backupJobId || !targetConfigId) {
      return setFormError('Please select a backup job source and recovery target location.');
    }

    try {
      setActionLoading(true);
      const res = await fetchWithAuth('/history/restores', {
        method: 'POST',
        body: JSON.stringify({ backupJobId, targetConfigId, targetPath })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger recovery plan.');
      }

      setFormSuccess('Disaster recovery restore pipeline successfully initiated in the background!');
      setBackupJobId('');
      setTargetConfigId('');
      setTargetPath('');
      fetchRestores();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '0 B';
    const bytes = Number(bytesStr);
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Disaster Recovery (DR)</h1>
          <p className="text-zinc-500 mt-1">Initiate point-in-time restores and verify failover integrity.</p>
        </div>
      </div>

      {/* DR Critical Alert Warning */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex gap-3 items-start max-w-4xl">
        <ShieldAlert className="shrink-0 mt-0.5" size={20} />
        <div>
          <span className="font-bold">Cautionary Notice:</span> Initiating recovery plans will pull files from backup repositories and replicate them to the recovery destination. Be careful to check targets and directory folder suffixes to avoid overwriting production data sets.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* DR Form Trigger */}
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6 h-fit">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="text-blue-400" size={22} />
            <h3 className="text-lg font-bold text-white">Trigger Recovery</h3>
          </div>

          <form onSubmit={handleRestoreSubmit} className="flex flex-col gap-4">
            {formError && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                {formSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Select Backup Job Source</label>
              <select
                value={backupJobId}
                onChange={(e) => setBackupJobId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              >
                <option value="">-- Select Source Backup --</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.name} (Destination: {j.destConfig.provider.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Select Target Storage Target</label>
              <select
                value={targetConfigId}
                onChange={(e) => setTargetConfigId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              >
                <option value="">-- Select Recovery Target --</option>
                {configs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.provider.toUpperCase()} : {c.bucketName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Restore Path Prefix (Optional)</label>
              <input
                type="text"
                placeholder="e.g. restored-data-2026"
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="mt-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2 cursor-pointer"
            >
              {actionLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              Execute Failover Restore
            </button>
          </form>
        </div>

        {/* DR Execution History */}
        <div className="lg:col-span-2 glass-dark p-8 rounded-3xl flex flex-col gap-6">
          <div className="flex justify-between items-center pb-2">
            <h3 className="text-lg font-bold text-white">Failover History</h3>
            <button 
              onClick={pollRestores}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : restores.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              No recovery restore executions identified.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {restores.map((restore) => (
                <div 
                  key={restore.id} 
                  className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between gap-4 transition-all ${
                    restore.status === 'running' ? 'border-blue-500/30 bg-blue-500/[0.01]' :
                    restore.status === 'completed' ? 'border-emerald-500/10 bg-emerald-500/[0.01]' :
                    'border-rose-500/10 bg-rose-500/[0.01]'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      restore.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                      restore.status === 'running' ? 'bg-blue-500/10 text-blue-500 animate-pulse' :
                      'bg-rose-500/10 text-rose-500'
                    }`}>
                      {restore.status === 'completed' ? <CheckCircle2 size={16} /> :
                       restore.status === 'running' ? <Loader2 size={16} className="animate-spin" /> :
                       <AlertTriangle size={16} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {restore.backupJob?.name} Recovery
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono mt-1">
                        <span>BACKUP SOURCE</span>
                        <ArrowRight size={10} />
                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 uppercase">
                          {restore.targetConfig?.provider}:{restore.targetConfig?.bucketName}
                        </span>
                      </div>
                      {restore.errorMessage && (
                        <p className="mt-2 text-xs text-rose-400 font-medium">{restore.errorMessage}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-start md:items-end text-xs font-mono text-zinc-400 shrink-0 gap-2">
                    <span className="text-[10px] text-zinc-500 font-sans uppercase">
                      {new Date(restore.startedAt).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <span className="bg-zinc-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <FileSpreadsheet size={12} className="text-zinc-500" />
                        Files: {restore.filesRestored}
                      </span>
                      <span className="bg-zinc-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        Vol: {formatBytes(restore.bytesRestored)}
                      </span>
                      {restore.durationMs && (
                        <span className="bg-zinc-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Clock size={12} className="text-zinc-500" />
                          {(restore.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
