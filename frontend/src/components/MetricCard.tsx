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
    <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] transition-colors hover:border-[#3A4565]">
      <div className="flex items-center justify-between text-xs font-medium text-[#9AA6BF]">
        <span>{title}</span>
        {Icon && <Icon className="w-4 h-4 text-[#8B7CFF]" />}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#E8ECF5] tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-[#9AA6BF]">{subtitle}</p>
      )}
    </div>
  );
};
