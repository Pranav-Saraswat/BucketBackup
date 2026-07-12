"use client";
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Send, 
  Key, 
  Users, 
  ShieldCheck, 
  HelpCircle,
  Database,
  Check,
  Building
} from 'lucide-react';

interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [slackUrl, setSlackUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (err) {
        console.error(err);
      }
    }

    const savedSlack = localStorage.getItem('slack_webhook_url');
    if (savedSlack) {
      setSlackUrl(savedSlack);
    }
  }, []);

  const handleSaveSlack = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('slack_webhook_url', slackUrl);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-zinc-500 mt-1">Configure global notification pipelines, role policies, and keys.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card & Info */}
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6">
          <div className="flex items-center gap-2.5">
            <Building className="text-blue-400" size={22} />
            <h3 className="text-lg font-bold text-white">Console Session</h3>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Account Name</span>
              <span className="text-sm font-bold text-white">{user?.name || 'Administrator'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Email Address</span>
              <span className="text-sm font-semibold text-zinc-300 font-mono">{user?.email || 'admin@bucketbackup.internal'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Workspace ID</span>
              <span className="text-xs text-zinc-500 font-mono truncate">{user?.organizationId || 'N/A'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Privilege Group</span>
              <span className="text-xs w-fit bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-lg">
                {user?.role || 'Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Webhooks Notifications settings */}
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6">
          <div className="flex items-center gap-2.5">
            <Send className="text-blue-400" size={22} />
            <h3 className="text-lg font-bold text-white">Slack Notifications</h3>
          </div>
          <p className="text-xs text-zinc-500">Enable notification events for backup task updates (failures, successes, duration spikes, anomalies) pushed to a Slack channel.</p>

          <form onSubmit={handleSaveSlack} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Incoming Webhook URL</label>
              <input
                type="text"
                placeholder="https://hooks.slack.com/services/..."
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-xs transition-all font-mono"
              />
            </div>
            
            <button
              type="submit"
              className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2 cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check size={14} />
                  Webhook Channel Saved
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </form>
        </div>

        {/* Security & Cryptography keys info */}
        <div className="glass-dark p-8 rounded-3xl flex flex-col gap-6">
          <div className="flex items-center gap-2.5">
            <Key className="text-blue-400" size={22} />
            <h3 className="text-lg font-bold text-white">Encryption Keys</h3>
          </div>
          <p className="text-xs text-zinc-500">BucketBackup enforces envelope encryption for all credentials saved in database stores.</p>

          <div className="flex flex-col gap-4 pt-1">
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Cipher</span>
              <span className="text-xs font-mono font-bold text-white">AES_256_GCM</span>
              <span className="text-[10px] text-zinc-500">Authenticated decryption with GCM authentication tags.</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">KMS Key Status</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck size={14} />
                Environment Bind Active
              </span>
              <span className="text-[10px] text-zinc-500">Salt string: <span className="font-semibold text-zinc-400 font-mono">bucketbackup-salt</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
