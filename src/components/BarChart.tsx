import React from 'react';

interface HorizontalBarItemProps {
  label: string;
  value: number | string | null | undefined;
  percentage: number; // 0 to 100
  barColor?: string;
  unit?: string;
  underlineLabel?: boolean;
}

export const HorizontalBarItem = ({
  label,
  value,
  percentage,
  barColor = 'bg-[#3A6B88]',
  unit = '',
  underlineLabel = false
}: HorizontalBarItemProps) => {
  const displayVal = value !== null && value !== undefined ? `${value}${unit}` : 'N/A';
  const widthPct = Math.min(100, Math.max(2, percentage));

  return (
    <div 
      className="flex items-center gap-2 text-[11px] py-0.5 group/bar hover:bg-slate-50/80 px-1 rounded transition-colors"
      title={`${label}: ${displayVal} (${percentage.toFixed(1)}%)`}
    >
      <span className={`w-36 truncate shrink-0 ${
        underlineLabel 
          ? 'font-bold underline decoration-slate-400 decoration-1 underline-offset-2 hover:text-[#003876] hover:decoration-[#003876] text-gray-800' 
          : 'text-gray-700 font-medium group-hover/bar:text-[#003876]'
      }`}>
        {label}
      </span>
      <div className="flex-grow bg-gray-100 h-3.5 rounded-xs overflow-hidden relative">
        <div 
          className={`${barColor} h-full transition-all duration-300 rounded-xs group-hover/bar:brightness-110`} 
          style={{ width: value !== null && value !== undefined ? `${widthPct}%` : '0%' }}
        />
      </div>
      <span className="w-10 text-right font-bold text-gray-900 shrink-0 font-mono">{displayVal}</span>
    </div>
  );
};
