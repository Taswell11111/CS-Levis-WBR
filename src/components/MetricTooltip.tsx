import React, { useState } from 'react';
import { Info } from 'lucide-react';

export interface MetricTooltipProps {
  children: React.ReactNode;
  title: string;
  calculation: string;
  source?: string;
  benchmark?: string;
  position?: 'top' | 'bottom';
  align?: 'left' | 'center' | 'right';
  showIcon?: boolean;
  className?: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  children,
  title,
  calculation,
  source,
  benchmark,
  position = 'top',
  align = 'center',
  showIcon = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Position styles
  const positionClasses = position === 'bottom'
    ? 'top-full mt-2'
    : 'bottom-full mb-2';

  // Alignment styles
  let alignClasses = 'left-1/2 -translate-x-1/2';
  let arrowClasses = 'left-1/2 -translate-x-1/2';
  if (align === 'left') {
    alignClasses = 'left-0 translate-x-0';
    arrowClasses = 'left-4 translate-x-0';
  } else if (align === 'right') {
    alignClasses = 'right-0 translate-x-0';
    arrowClasses = 'right-4 translate-x-0';
  }

  // Caret arrow position
  const arrowPositionClasses = position === 'bottom'
    ? 'bottom-full border-b-[#0A192F] border-b-[6px] border-x-[6px] border-x-transparent border-t-0'
    : 'top-full border-t-[#0A192F] border-t-[6px] border-x-[6px] border-x-transparent border-b-0';

  return (
    <span
      className={`relative inline-flex items-center group cursor-help ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(!isOpen)}
      role="tooltip"
      tabIndex={0}
      aria-label={`${title}: ${calculation}`}
    >
      {children}
      {showIcon && (
        <Info className="w-2.5 h-2.5 ml-1 text-gray-400 group-hover:text-[#003876] inline transition-colors opacity-70 group-hover:opacity-100" />
      )}

      {/* Floating Tooltip Bubble */}
      <div
        className={`absolute ${positionClasses} ${alignClasses} pointer-events-none transition-all duration-150 z-50 ${
          isOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'
        }`}
        style={{ width: 'max-content', maxWidth: '280px' }}
      >
        <div className="bg-[#0A192F] text-slate-100 text-[11px] p-2.5 rounded-sm shadow-2xl border border-blue-900/60 leading-relaxed text-left">
          {/* Caret */}
          <div className={`absolute ${arrowClasses} ${arrowPositionClasses} w-0 h-0`} />

          {/* Header */}
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-700/60">
            <span className="font-bold text-white tracking-wide text-[11px] uppercase">
              {title}
            </span>
            {source && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-200 border border-blue-800/60">
                {source}
              </span>
            )}
          </div>

          {/* Calculation Definition */}
          <div className="text-[10px] text-slate-200 mb-1 leading-snug">
            <span className="font-semibold text-blue-300">Calculation: </span>
            {calculation}
          </div>

          {/* Benchmark / Operational Note */}
          {benchmark && (
            <div className="text-[9.5px] text-slate-400 mt-1 pt-1 border-t border-slate-800 flex items-center gap-1">
              <span className="text-amber-400 font-bold">&bull;</span>
              <span>{benchmark}</span>
            </div>
          )}
        </div>
      </div>
    </span>
  );
};
