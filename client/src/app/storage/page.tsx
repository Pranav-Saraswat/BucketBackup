"use client";
import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2, 
  FolderOpen, 
  RefreshCw, 
  FileText,
  Search
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';

interface StorageConfig {
  id: string;
  provider: 'aws' | 'gcp' | 'azure';
  bucketName: string;
  region?: string;
  createdAt: string;
}

interface CloudObject {
  key: string;
  size: number;
  lastModified: string;
  checksum: string;
}

export default function StoragePage() {
  const [configs, setConfigs] = useState<StorageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [provider, setProvider] = useState<'aws' | 'gcp' | 'azure'>('aws');
  const [bucketName, setBucketName] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [gcpKeyFile, setGcpKeyFile] = useState('');
  const [formError, setFormError] = useState('');

  // Status map for connection verification outcomes
  const [connectionStatus, setConnectionStatus] = useState<Record<string, { ok: boolean; message: string }>>({});

  // Live file explorer states
  const [activeConfig, setActiveConfig] = useState<StorageConfig | null>(null);
  const [objects, setObjects] = useState<CloudObject[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/storage');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (err) {
      console.error('Failed to fetch storage configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const payload: any = { provider, bucketName };
    if (provider === 'aws') {
      payload.region = region;
      payload.accessKey = accessKey;
      payload.secretKey = secretKey;
    } else if (provider === 'azure') {
      payload.connectionString = connectionString;
    } else if (provider === 'gcp') {
      payload.gcpKeyFile = gcpKeyFile;
    }

    try {
      setActionLoading('adding');
      const res = await fetchWithAuth('/storage', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to onboarding storage provider.');
      }

      setShowAddForm(false);
      resetForm();
      fetchConfigs();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const verifyConfig = async (id: string) => {
    try {
      setActionLoading(`verify-${id}`);
      const res = await fetchWithAuth(`/storage/${id}/verify`, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setConnectionStatus(prev => ({ ...prev, [id]: { ok: true, message: 'Verified' } }));
      } else {
        setConnectionStatus(prev => ({ ...prev, [id]: { ok: false, message: data.error || 'Verification Failed' } }));
      }
    } catch (err: any) {
      setConnectionStatus(prev => ({ ...prev, [id]: { ok: false, message: 'Failed to reach API server.' } }));
    } finally {
      setActionLoading(null);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this storage config?')) return;
    try {
      setActionLoading(`delete-${id}`);
      const res = await fetchWithAuth(`/storage/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfigs(configs.filter(c => c.id !== id));
        if (activeConfig?.id === id) setActiveConfig(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete config.');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const browseObjects = async (config: StorageConfig) => {
    setActiveConfig(config);
    setObjectsLoading(true);
    try {
      const res = await fetchWithAuth(`/storage/${config.id}/inventory`);
      if (res.ok) {
        const data = await res.json();
        setObjects(data);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to load container inventory.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setObjectsLoading(false);
    }
  };

  const resetForm = () => {
    setBucketName('');
    setRegion('us-east-1');
    setAccessKey('');
    setSecretKey('');
    setConnectionString('');
    setGcpKeyFile('');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredObjects = objects.filter(obj => 
    obj.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Storage Providers</h1>
          <p className="text-zinc-500 mt-1">Onboard and inspect secure cloud storage locations.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus size={18} />
          {showAddForm ? 'Cancel Onboarding' : 'Onboard Provider'}
        </button>
      </div>

      {/* Onboarding Form */}
      {showAddForm && (
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold text-white">New Provider Connection</h2>
          
          <div className="flex gap-2 p-1.5 bg-white/5 rounded-xl max-w-sm">
            {(['aws', 'gcp', 'azure'] as const).map((prov) => (
              <button
                key={prov}
                onClick={() => { setProvider(prov); setFormError(''); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  provider === prov 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formError && (
              <div className="md:col-span-2 p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Bucket or Container Name</label>
              <input
                type="text"
                placeholder="e.g. backup-prod-storage"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
              />
            </div>

            {provider === 'aws' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">AWS Region</label>
                  <input
                    type="text"
                    placeholder="e.g. us-east-1"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Access Key ID</label>
                  <input
                    type="text"
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Secret Access Key</label>
                  <input
                    type="password"
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
                  />
                </div>
              </>
            )}

            {provider === 'azure' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Azure Connection String</label>
                <input
                  type="password"
                  placeholder="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm transition-all"
                />
              </div>
            )}

            {provider === 'gcp' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">GCP Service Account Key JSON</label>
                <textarea
                  placeholder='{ "type": "service_account", "project_id": "...", "private_key_id": "...", "private_key": "...", "client_email": "..." }'
                  value={gcpKeyFile}
                  onChange={(e) => setGcpKeyFile(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm font-mono transition-all"
                />
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); resetForm(); }}
                className="px-5 py-2.5 rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'adding'}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                {actionLoading === 'adding' && <Loader2 size={16} className="animate-spin" />}
                Authorize Connection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of existing storage configurations */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : configs.length === 0 ? (
        <div className="glass-dark p-12 rounded-3xl text-center flex flex-col items-center gap-4">
          <Cloud className="text-zinc-600 w-16 h-16" />
          <h3 className="text-lg font-bold text-white">No Connected Storage Accounts</h3>
          <p className="text-zinc-500 text-sm max-w-sm">Onboard AWS S3 buckets, GCP Storage, or Azure Blob accounts to register replication locations.</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium transition-all cursor-pointer shadow-lg shadow-blue-600/20"
          >
            Connect First Storage
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => {
            const status = connectionStatus[config.id];
            const isTesting = actionLoading === `verify-${config.id}`;
            const isDeleting = actionLoading === `delete-${config.id}`;

            return (
              <div 
                key={config.id} 
                className={`glass-dark p-6 rounded-3xl flex flex-col justify-between gap-5 relative overflow-hidden transition-all duration-300 border ${
                  activeConfig?.id === config.id ? 'border-blue-500/40 bg-blue-500/[0.02]' : 'border-white/5'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs ${
                      config.provider === 'aws' ? 'bg-amber-500/10 text-amber-500' :
                      config.provider === 'gcp' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-sky-500/10 text-sky-500'
                    }`}>
                      {config.provider.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white truncate max-w-[150px]">{config.bucketName}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{config.region || 'global'}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => deleteConfig(config.id)}
                    disabled={isDeleting}
                    className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>

                {status && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    status.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}>
                    {status.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span className="truncate">{status.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    onClick={() => verifyConfig(config.id)}
                    disabled={isTesting}
                    className="py-2.5 px-3 rounded-xl border border-white/5 text-zinc-300 hover:text-white hover:bg-white/5 text-xs font-semibold flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isTesting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Test Connection
                  </button>

                  <button
                    onClick={() => browseObjects(config)}
                    className="py-2.5 px-3 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 hover:text-blue-300 text-xs font-semibold flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FolderOpen size={14} />
                    Browse Objects
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live File Inventory Explorer */}
      {activeConfig && (
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-white/5 pb-5">
            <div className="flex items-center gap-3">
              <FolderOpen className="text-blue-400" size={24} />
              <div>
                <h3 className="text-lg font-bold text-white">Live Inventory Browser</h3>
                <p className="text-xs text-zinc-500">Connected bucket: <span className="font-semibold text-zinc-300 font-mono">{activeConfig.bucketName}</span></p>
              </div>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files by key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-xs transition-all"
              />
            </div>
          </div>

          {objectsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : filteredObjects.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              No files or folders found matching filters inside bucket.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 font-medium text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-4">Object Key</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Last Modified</th>
                    <th className="pb-3 pr-4">Checksum (MD5/ETag)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredObjects.map((obj, index) => (
                    <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3.5 pl-4 font-mono text-xs text-white flex items-center gap-2">
                        <FileText className="text-zinc-500 w-4 h-4 shrink-0" />
                        <span className="truncate max-w-[400px]">{obj.key}</span>
                      </td>
                      <td className="py-3.5 text-zinc-400 text-xs">{formatBytes(obj.size)}</td>
                      <td className="py-3.5 text-zinc-400 text-xs">{new Date(obj.lastModified).toLocaleString()}</td>
                      <td className="py-3.5 pr-4 text-zinc-500 font-mono text-[10px] uppercase truncate max-w-[200px]">
                        {obj.checksum || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
