import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  trendUp: boolean;
}

export default function StatsCard({ title, value, icon: Icon, trend, trendUp }: StatsCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-dark p-6 rounded-2xl flex flex-col gap-4"
    >
      <div className="flex justify-between items-start">
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-zinc-400 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
    </motion.div>
  );
}
