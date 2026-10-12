import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  value: number | string | null | undefined;
  suffix?: string;
  isPositiveGood?: boolean;
  label?: string;
  size?: 'xs' | 'sm';
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  suffix = '%',
  isPositiveGood = true,
  label,
  size = 'sm'
}) => {
  if (value === null || value === undefined) return null;
  const numVal = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numVal)) return null;

  if (numVal === 0) {
    return (
      <span 
        className="inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200" 
        title={label || "0% change vs prior reporting period"}
      >
        <Minus size={9} className="text-slate-400" />
        <span>0{suffix}</span>
      </span>
    );
  }

  const isUp = numVal > 0;
  const isGood = isPositiveGood ? isUp : !isUp;

  return (
    <span 
      className={`inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded border shadow-2xs ${
        isGood 
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
          : 'bg-rose-50 text-rose-800 border-rose-200'
      }`} 
      title={label || `${isUp ? '+' : ''}${numVal}${suffix} vs prior reporting period (${isGood ? 'Improved' : 'Deteriorated'})`}
    >
      {isUp ? (
        <TrendingUp size={10} className={isGood ? 'text-emerald-600' : 'text-rose-600'} />
      ) : (
        <TrendingDown size={10} className={isGood ? 'text-emerald-600' : 'text-rose-600'} />
      )}
      <span>{isUp ? '+' : ''}{numVal}{suffix}</span>
    </span>
  );
};
