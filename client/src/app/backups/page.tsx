"use client";
import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Edit3, 
  Trash2, 
  Plus, 
  Calendar, 
  Clock,
  ArrowRight,
  Database,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Activity,
  FileText,
  ChevronDown
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
  description?: string;
  syncMode: 'one-way' | 'bidirectional';
  sourceType: 'local' | 'cloud';
  sourcePath: string;
  sourceConfigId?: string;
  sourceConfig?: StorageConfig;
  destConfigId: string;
  destConfig: StorageConfig;
  cronExpression?: string;
  status: 'idle' | 'running' | 'paused' | 'failed' | 'completed';
  lastRun?: string;
  nextRun?: string;
}

interface LogEntry {
  id: string;
  status: string;
  message: string;
  fileSize?: string;
  durationMs?: number;
  createdAt: string;
}

export default function BackupsPage() {
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [configs, setConfigs] = useState<StorageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [syncMode, setSyncMode] = useState<'one-way' | 'bidirectional'>('one-way');
  const [sourceType, setSourceType] = useState<'local' | 'cloud'>('cloud');
  const [sourcePath, setSourcePath] = useState('');
  const [sourceConfigId, setSourceConfigId] = useState('');
  const [destConfigId, setDestConfigId] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [formError, setFormError] = useState('');

  // Log viewer state
  const [activeJobForLogs, setActiveJobForLogs] = useState<BackupJob | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchConfigs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/backups');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Failed to fetch backup jobs:', err);
    } finally {
      setLoading(false);
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
      console.error('Failed to fetch storage configs:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name || !destConfigId) {
      return setFormError('Name and Destination configuration are required.');
    }

    if (sourceType === 'cloud' && !sourceConfigId) {
      return setFormError('Cloud source config must be selected.');
    }

    const payload = {
      name,
      description,
      syncMode,
      sourceType,
      sourcePath,
      sourceConfigId: sourceType === 'cloud' ? sourceConfigId : null,
      destConfigId,
      cronExpression: cronExpression || null
    };

    try {
      setActionLoading('form');
      const url = editingJobId ? `/backups/${editingJobId}` : '/backups';
      const method = editingJobId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit backup job config.');
      }

      setShowWizard(false);
      resetWizard();
      fetchJobs();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (job: BackupJob) => {
    setEditingJobId(job.id);
    setName(job.name);
    setDescription(job.description || '');
    setSyncMode(job.syncMode);
    setSourceType(job.sourceType);
    setSourcePath(job.sourcePath);
    setSourceConfigId(job.sourceConfigId || '');
    setDestConfigId(job.destConfigId);
    setCronExpression(job.cronExpression || '');
    setShowWizard(true);
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup sync job?')) return;
    try {
      setActionLoading(`delete-${id}`);
      const res = await fetchWithAuth(`/backups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs(jobs.filter(j => j.id !== id));
        if (activeJobForLogs?.id === id) setActiveJobForLogs(null);
      } else {
        alert('Failed to delete backup job.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const triggerJob = async (id: string) => {
    try {
      setActionLoading(`trigger-${id}`);
      const res = await fetchWithAuth(`/backups/${id}/trigger`, { method: 'POST' });
      if (res.ok) {
        // Poll status update
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const togglePause = async (job: BackupJob) => {
    try {
      setActionLoading(`pause-${job.id}`);
      const endpoint = job.status === 'paused' ? 'resume' : 'pause';
      const res = await fetchWithAuth(`/backups/${job.id}/${endpoint}`, { method: 'POST' });
      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const showLogs = async (job: BackupJob) => {
    setActiveJobForLogs(job);
    setLogsLoading(true);
    try {
      const res = await fetchWithAuth(`/backups/${job.id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const resetWizard = () => {
    setEditingJobId(null);
    setName('');
    setDescription('');
    setSyncMode('one-way');
    setSourceType('cloud');
    setSourcePath('');
    setSourceConfigId('');
    setDestConfigId('');
    setCronExpression('');
    setFormError('');
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Sync Jobs</h1>
          <p className="text-zinc-500 mt-1">Configure and manage multi-cloud replication rules.</p>
        </div>
        <button 
          onClick={() => { resetWizard(); setShowWizard(!showWizard); }}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus size={18} />
          {showWizard ? 'Hide Wizard' : 'Register New Job'}
        </button>
      </div>

      {/* Creation/Edit Wizard */}
      {showWizard && (
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold text-white">
            {editingJobId ? 'Edit Configuration Rule' : 'New Backup Job Registration'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formError && (
              <div className="md:col-span-2 p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Sync Job Name</label>
              <input
                type="text"
                placeholder="e.g. Sales_Assets_Mirror"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Description</label>
              <input
                type="text"
                placeholder="Synchronizes Sales assets folder to backup GCP bucket"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Sync Direction Mode</label>
              <select
                value={syncMode}
                onChange={(e) => setSyncMode(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              >
                <option value="one-way">One-Way Replication (Source ➔ Destination)</option>
                <option value="bidirectional">Bidirectional Sync (Source 🔄 Destination)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Source Type</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              >
                <option value="cloud">Cloud Storage Bucket</option>
                <option value="local">Local Runner Folder / File</option>
              </select>
            </div>

            {sourceType === 'cloud' ? (
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Source Cloud Account</label>
                <select
                  value={sourceConfigId}
                  onChange={(e) => setSourceConfigId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
                >
                  <option value="">-- Choose Storage Configuration --</option>
                  {configs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.provider.toUpperCase()} : {c.bucketName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Source Path Prefix / Local Directory
              </label>
              <input
                type="text"
                placeholder={sourceType === 'local' ? 'e.g. C:/data/media' : 'e.g. media/uploads (leave empty for entire bucket)'}
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Destination Backup Account</label>
              <select
                value={destConfigId}
                onChange={(e) => setDestConfigId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              >
                <option value="">-- Choose Storage Configuration --</option>
                {configs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.provider.toUpperCase()} : {c.bucketName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Cron Schedule Expression (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 0 0 * * * (Every day at midnight, leave empty for manual)"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setShowWizard(false); resetWizard(); }}
                className="px-5 py-2.5 rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'form'}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                {actionLoading === 'form' && <Loader2 size={16} className="animate-spin" />}
                {editingJobId ? 'Save Changes' : 'Register Replication Job'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs table list */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-dark p-12 rounded-3xl text-center flex flex-col items-center gap-4">
          <Database className="text-zinc-600 w-16 h-16" />
          <h3 className="text-lg font-bold text-white">No Registered Backup Jobs</h3>
          <p className="text-zinc-500 text-sm max-w-sm">Create and schedule synchronization tasks between cloud containers or local endpoints.</p>
          <button 
            onClick={() => setShowWizard(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium transition-all cursor-pointer shadow-lg shadow-blue-600/20"
          >
            Create Job Rule
          </button>
        </div>
      ) : (
        <div className="glass-dark rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 font-medium text-xs uppercase tracking-wider">
                  <th className="py-4 pl-6">Job Rule</th>
                  <th className="py-4">Sync Path</th>
                  <th className="py-4">Status</th>
                  <th className="py-4">Last Run</th>
                  <th className="py-4">Cron / Sync Mode</th>
                  <th className="py-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.map((job) => {
                  const isSyncing = job.status === 'running';
                  const isTesting = actionLoading === `trigger-${job.id}`;
                  const isPausing = actionLoading === `pause-${job.id}`;
                  const isDeleting = actionLoading === `delete-${job.id}`;

                  return (
                    <tr key={job.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="py-5 pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-sm">{job.name}</span>
                          <span className="text-xs text-zinc-500 max-w-[200px] truncate mt-0.5">{job.description || 'No description provided.'}</span>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                          {job.sourceType === 'local' ? (
                            <span className="bg-white/5 px-2 py-0.5 rounded text-zinc-300">LOCAL: {job.sourcePath || '/'}</span>
                          ) : (
                            <span className="bg-blue-500/10 px-2 py-0.5 rounded text-blue-400">
                              {job.sourceConfig?.provider?.toUpperCase()}:{job.sourceConfig?.bucketName}/{job.sourcePath}
                            </span>
                          )}
                          <ArrowRight size={12} className="text-zinc-500" />
                          <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400">
                            {job.destConfig.provider.toUpperCase()}:{job.destConfig.bucketName}
                          </span>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            job.status === 'completed' ? 'bg-emerald-500' :
                            job.status === 'running' ? 'bg-blue-500 animate-ping' :
                            job.status === 'failed' ? 'bg-rose-500' :
                            job.status === 'paused' ? 'bg-zinc-500' :
                            'bg-amber-500'
                          }`} />
                          <span className={`text-xs font-semibold capitalize ${
                            job.status === 'completed' ? 'text-emerald-400' :
                            job.status === 'running' ? 'text-blue-400' :
                            job.status === 'failed' ? 'text-rose-400' :
                            job.status === 'paused' ? 'text-zinc-400' :
                            'text-amber-400'
                          }`}>{job.status}</span>
                        </div>
                      </td>
                      <td className="py-5 text-xs text-zinc-400">
                        {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never run'}
                      </td>
                      <td className="py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-white flex items-center gap-1.5 capitalize">
                            <Clock size={12} className="text-zinc-500" />
                            {job.syncMode}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {job.cronExpression || 'Manual Only'}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => triggerJob(job.id)}
                            disabled={isSyncing || isTesting}
                            title="Run sync now"
                            className="p-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                          >
                            {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                          </button>

                          <button
                            onClick={() => togglePause(job)}
                            disabled={isPausing}
                            title={job.status === 'paused' ? 'Resume Schedule' : 'Pause Schedule'}
                            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                          >
                            {isPausing ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
                          </button>

                          <button
                            onClick={() => handleEdit(job)}
                            title="Edit settings"
                            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() => showLogs(job)}
                            title="View Executions logs"
                            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                          >
                            <FileText size={16} />
                          </button>

                          <button
                            onClick={() => deleteJob(job.id)}
                            disabled={isDeleting}
                            title="Delete rule"
                            className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log history details section */}
      {activeJobForLogs && (
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-white/5 pb-5">
            <div>
              <h3 className="text-lg font-bold text-white">Execution Logs: {activeJobForLogs.name}</h3>
              <p className="text-xs text-zinc-500">History of the last 50 backup runs</p>
            </div>
            <button 
              onClick={() => setActiveJobForLogs(null)}
              className="text-xs border border-white/5 hover:bg-white/5 py-2 px-3 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
            >
              Close Logs
            </button>
          </div>

          {logsLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-sm">
              No executions logged for this backup sync job yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((log) => (
                <div key={log.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex gap-3 items-start">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {log.status === 'completed' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{log.message}</p>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                    {log.fileSize && (
                      <span className="bg-zinc-800/50 px-2.5 py-1 rounded-lg">Vol: {formatBytes(log.fileSize)}</span>
                    )}
                    {log.durationMs && (
                      <span className="bg-zinc-800/50 px-2.5 py-1 rounded-lg">Time: {(log.durationMs / 1000).toFixed(2)}s</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
