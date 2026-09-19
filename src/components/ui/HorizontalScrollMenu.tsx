import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollMenuProps {
  children: React.ReactNode;
  className?: string;
}

export const HorizontalScrollMenu: React.FC<HorizontalScrollMenuProps> = ({
  children,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);

    // Observer for child changes (e.g. categories loaded dynamically)
    const observer = new ResizeObserver(() => checkScrollability());
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
      observer.disconnect();
    };
  }, [checkScrollability]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(200, el.clientWidth * 0.7);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={`relative flex items-center group min-w-0 ${className}`}>
      {/* Left Scroll Arrow Button & Gradient Fade */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pr-4 bg-gradient-to-r from-white via-white/90 to-transparent">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Défiler vers la gauche"
            className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 text-slate-800 hover:text-slate-950 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1 min-w-0 flex-1 scroll-smooth"
      >
        {children}
      </div>

      {/* Right Scroll Arrow Button & Gradient Fade */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pl-4 bg-gradient-to-l from-white via-white/90 to-transparent">
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Défiler vers la droite"
            className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 text-slate-800 hover:text-slate-950 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      )}
    </div>
  );
};
