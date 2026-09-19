import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  subtitle?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  subtitle = 'Chariow Gateway',
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7 rounded-lg', text: 'text-base', sub: 'text-[8px]' },
    md: { icon: 'w-9 h-9 rounded-xl', text: 'text-lg sm:text-xl', sub: 'text-[9px]' },
    lg: { icon: 'w-12 h-12 rounded-2xl', text: 'text-2xl', sub: 'text-[10px]' },
    xl: { icon: 'w-16 h-16 rounded-3xl', text: 'text-3xl', sub: 'text-xs' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      {/* Official ManuX Icon Emblem matching user's black card + yellow diffuse radial aura */}
      <div
        className={`${currentSize.icon} bg-black flex items-center justify-center overflow-hidden shrink-0 shadow-xs border border-neutral-800 transition-transform duration-200 group-hover:scale-105`}
      >
        <img
          src="/favicon.svg"
          alt="ManuX Logo"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-black text-slate-950 tracking-tight font-serif-heading leading-none ${currentSize.text}`}
          >
            Manu<span className="text-amber-500">X</span>
          </span>
          {subtitle && (
            <span
              className={`font-bold tracking-widest uppercase text-slate-400 leading-tight pt-0.5 ${currentSize.sub}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
