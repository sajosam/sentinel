import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'success';
}

export const MetricCard: React.FC<Props> = ({ title, value, subtitle, icon: Icon }) => {
  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{title}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
};
