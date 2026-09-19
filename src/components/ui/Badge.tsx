import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'published' | 'draft' | 'verified' | 'category' | 'chariow' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 font-medium rounded-full',
    md: 'text-xs px-3 py-1 font-medium rounded-full',
  };

  const variantStyles = {
    // Like Chariow's "● Publié" pill
    published: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1.5',
    // Like Chariow's "● Brouillon"
    draft: 'bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5',
    // Verified creator badge
    verified: 'bg-blue-50 text-blue-700 border border-blue-200/80 inline-flex items-center gap-1',
    // Category pill
    category: 'bg-emerald-50/70 text-emerald-800 border border-emerald-100/80 hover:bg-emerald-100/60 transition-colors',
    // Chariow connection badge
    chariow: 'bg-amber-50 text-amber-900 border border-amber-200/90 font-medium inline-flex items-center gap-1',
    // Neutral pill
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/60',
  };

  return (
    <span className={`inline-flex items-center ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {variant === 'published' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>}
      {variant === 'draft' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>}
      {variant === 'verified' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
      {children}
    </span>
  );
};
