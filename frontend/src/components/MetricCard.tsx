import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'success';
}

export const MetricCard: React.FC<Props> = ({ title, value, subtitle, icon: Icon, variant = 'default' }) => {
  const getColors = () => {
    switch (variant) {
      case 'danger':
        return 'text-rose-400 border-rose-900/40 bg-rose-950/20';
      case 'warning':
        return 'text-amber-400 border-amber-900/40 bg-amber-950/20';
      case 'success':
        return 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20';
      default:
        return 'text-sky-400 border-sky-900/30 bg-sky-950/10';
    }
  };

  return (
    <div className={`p-4 rounded-xl border glass-panel transition-all duration-200 hover:border-slate-700 ${getColors()}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">{title}</span>
        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-100 tracking-tight">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
