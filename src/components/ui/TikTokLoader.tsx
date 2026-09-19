import React from 'react';

interface TikTokLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  message?: string;
  className?: string;
}

export const TikTokLoader: React.FC<TikTokLoaderProps> = ({
  size = 'md',
  fullPage = false,
  message,
  className = '',
}) => {
  const sizeMap = {
    sm: { dot: 'w-3 h-3', distance: 16 },
    md: { dot: 'w-4 h-4', distance: 22 },
    lg: { dot: 'w-6 h-6', distance: 30 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* TikTok-inspired dual dancing dots: Yellow & Cyan-Blue */}
      <div className="relative flex items-center justify-center w-16 h-8 select-none">
        <style>{`
          @keyframes tiktok-left {
            0% {
              transform: translateX(-${currentSize.distance / 2}px) scale(1);
              z-index: 10;
            }
            25% {
              transform: translateX(0px) scale(1.15);
              z-index: 20;
            }
            50% {
              transform: translateX(${currentSize.distance / 2}px) scale(0.85);
              z-index: 5;
            }
            75% {
              transform: translateX(0px) scale(0.9);
              z-index: 5;
            }
            100% {
              transform: translateX(-${currentSize.distance / 2}px) scale(1);
              z-index: 10;
            }
          }

          @keyframes tiktok-right {
            0% {
              transform: translateX(${currentSize.distance / 2}px) scale(0.85);
              z-index: 5;
            }
            25% {
              transform: translateX(0px) scale(0.9);
              z-index: 5;
            }
            50% {
              transform: translateX(-${currentSize.distance / 2}px) scale(1);
              z-index: 10;
            }
            75% {
              transform: translateX(0px) scale(1.15);
              z-index: 20;
            }
            100% {
              transform: translateX(${currentSize.distance / 2}px) scale(0.85);
              z-index: 5;
            }
          }

          .animate-tiktok-yellow {
            animation: tiktok-left 0.85s cubic-bezier(0.65, 0, 0.35, 1) infinite;
          }

          .animate-tiktok-blue {
            animation: tiktok-right 0.85s cubic-bezier(0.65, 0, 0.35, 1) infinite;
          }
        `}</style>

        {/* Yellow Dot (Left / Orbit 1) */}
        <div
          className={`absolute rounded-full bg-amber-400 shadow-sm animate-tiktok-yellow ${currentSize.dot}`}
          style={{ willChange: 'transform' }}
        />

        {/* Blue / Cyan Dot (Right / Orbit 2) */}
        <div
          className={`absolute rounded-full bg-blue-500 shadow-sm animate-tiktok-blue ${currentSize.dot}`}
          style={{ willChange: 'transform' }}
        />
      </div>

      {message && (
        <p className="text-xs font-semibold text-slate-500 tracking-wide animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="w-full min-h-[50vh] flex-1 flex items-center justify-center p-8">
        {content}
      </div>
    );
  }

  return content;
};

/**
 * NavigationRefreshListener
 * Triggers the TikTok dual-dot animation at the top right / screen during page navigation
 */
export const NavigationRefreshListener: React.FC = () => {
  const [navigating, setNavigating] = React.useState(false);

  React.useEffect(() => {
    // Listen to history changes via popstate and pushstate hooks
    const handleStart = () => {
      setNavigating(true);
      const timer = setTimeout(() => setNavigating(false), 450);
      return () => clearTimeout(timer);
    };

    window.addEventListener('popstate', handleStart);
    return () => {
      window.removeEventListener('popstate', handleStart);
    };
  }, []);

  if (!navigating) return null;

  return (
    <div className="fixed top-2 right-4 z-50 pointer-events-none bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-700/50 flex items-center gap-2 animate-in fade-in zoom-in-90 duration-150">
      <TikTokLoader size="sm" />
      <span className="text-[10px] font-bold text-slate-200">Chargement...</span>
    </div>
  );
};

