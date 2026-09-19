import React from 'react';
import { Info } from 'lucide-react';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  infoText?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  infoText,
  className = '',
}) => {
  return (
    <Card className={`p-5 flex flex-col justify-between relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-3 text-slate-500">
        {icon && <div className="p-2 rounded-xl bg-slate-100 text-slate-700">{icon}</div>}
        {infoText && (
          <div className="text-slate-400 hover:text-slate-600 transition-colors cursor-help ml-auto" title={infoText}>
            <Info className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mb-1">
          {value}
        </div>
        <div className="text-xs lg:text-sm text-slate-500 font-medium">
          {label}
        </div>
      </div>
    </Card>
  );
};
