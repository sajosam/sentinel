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
    <div className="p-4 rounded-lg border border-[#232B38] bg-[#141A24] transition-colors hover:border-[#2E394B]">
      <div className="flex items-center justify-between text-xs font-medium text-[#8A97AC]">
        <span>{title}</span>
        {Icon && <Icon className="w-4 h-4 text-[#3B82F6]" />}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#E6EBF2] tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-[#8A97AC]">{subtitle}</p>
      )}
    </div>
  );
};
