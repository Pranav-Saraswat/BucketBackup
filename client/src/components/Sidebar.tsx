"use client";
import { LayoutDashboard, Database, ShieldCheck, Settings, Bell, BarChart3, Cloud } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Database, label: 'Backup Jobs', href: '/backups' },
  { icon: Cloud, label: 'Storage', href: '/storage' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: ShieldCheck, label: 'DR Planning', href: '/disaster-recovery' },
  { icon: Bell, label: 'Alerts', href: '/alerts' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-dark border-r border-white/5 h-screen sticky top-0 p-6 flex flex-col gap-8">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <Database className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">BucketBackup</span>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Plan</p>
          <p className="text-sm text-white font-bold mt-1">Enterprise Pro</p>
          <div className="w-full h-1.5 bg-zinc-700 rounded-full mt-3 overflow-hidden">
            <div className="w-[75%] h-full bg-blue-500 rounded-full" />
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">7.5 TB / 10 TB used</p>
        </div>
      </div>
    </aside>
  );
}
