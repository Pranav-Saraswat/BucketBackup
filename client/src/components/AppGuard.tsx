"use client";
import React, { useState, useEffect } from 'react';
import { Database, Lock, Mail, User as UserIcon, Building } from 'lucide-react';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

import Sidebar from './Sidebar';

export default function AppGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    const payload = isRegistering 
      ? { email, password, name, orgName }
      : { email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="text-zinc-500 text-sm animate-pulse">Loading BucketBackup Secure Platform...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-black to-zinc-950 p-6">
        <div className="w-full max-w-md p-8 glass-dark rounded-3xl flex flex-col gap-6 shadow-2xl relative overflow-hidden">
          {/* Neon gradient orb background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />

          {/* Logo Header */}
          <div className="flex flex-col items-center gap-3 text-center font-sans">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-2">
              {isRegistering ? 'Create Console Account' : 'Sign In to Console'}
            </h2>
            <p className="text-zinc-500 text-sm">
              {isRegistering ? 'Onboard your multi-cloud environment' : 'Manage your secure multi-cloud backup platform'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4 font-sans">
            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                {error}
              </div>
            )}

            {isRegistering && (
              <>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm placeholder:text-zinc-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <Building className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Workspace / Company Name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm placeholder:text-zinc-500 transition-all"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm placeholder:text-zinc-500 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none text-white text-sm placeholder:text-zinc-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 flex justify-center items-center cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isRegistering ? (
                'Onboard Workspace'
              ) : (
                'Authenticate'
              )}
            </button>
          </form>

          <div className="text-center text-xs text-zinc-500 font-sans">
            {isRegistering ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-blue-400 hover:underline font-medium ml-1 cursor-pointer"
            >
              {isRegistering ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-black to-zinc-950 p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
