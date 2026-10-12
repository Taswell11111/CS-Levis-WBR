import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export const TrendIcon = ({ 
  wow, 
  type = 'good-up',
  size = 'md',
  className = '',
  withBackground = false,
  title
}: { 
  wow: number | null | undefined, 
  type?: 'good-up' | 'good-down' | 'neutral',
  size?: 'xs' | 'sm' | 'md',
  className?: string,
  withBackground?: boolean,
  title?: string
}) => {
  if (wow === null || wow === undefined || isNaN(wow)) {
    return null;
  }
  const iconSize = size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  
  let color = '';
  let bgColor = '';
  let isImproved = false;
  if (type === 'good-up') {
    color = wow > 0 ? 'text-emerald-600' : 'text-rose-600';
    bgColor = wow > 0 ? 'bg-emerald-50 border-emerald-200/70 text-emerald-700' : 'bg-rose-50 border-rose-200/70 text-rose-700';
    isImproved = wow > 0;
  } else if (type === 'good-down') {
    color = wow < 0 ? 'text-emerald-600' : 'text-rose-600';
    bgColor = wow < 0 ? 'bg-emerald-50 border-emerald-200/70 text-emerald-700' : 'bg-rose-50 border-rose-200/70 text-rose-700';
    isImproved = wow < 0;
  } else {
    color = wow > 0 ? 'text-amber-600' : 'text-emerald-600';
    bgColor = wow > 0 ? 'bg-amber-50 border-amber-200/70 text-amber-700' : 'bg-emerald-50 border-emerald-200/70 text-emerald-700';
    isImproved = wow <= 0;
  }

  const sign = wow > 0 ? '+' : '';
  const defaultTitle = wow === 0 
    ? '0% change vs prior week (Stable)' 
    : `${sign}${wow}% vs prior week (${isImproved ? 'Improved' : 'Decline'})`;

  if (wow === 0) {
    if (withBackground) {
      return (
        <span className={`inline-flex items-center justify-center rounded-xs px-0.5 py-0.5 border bg-slate-50 border-slate-200 text-slate-400 shrink-0 ${className}`} title={title ?? defaultTitle}>
          <Minus className={`${iconSize} inline shrink-0`} />
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center shrink-0 ${className}`} title={title ?? defaultTitle}>
        <Minus className={`${iconSize} text-gray-400 inline shrink-0`} />
      </span>
    );
  }

  if (withBackground) {
    return (
      <span className={`inline-flex items-center justify-center rounded-xs px-0.5 py-0.5 border ${bgColor} shrink-0 ${className}`} title={title ?? defaultTitle}>
        {wow > 0 ? (
          <ArrowUp className={`${iconSize} inline shrink-0`} strokeWidth={3} />
        ) : (
          <ArrowDown className={`${iconSize} inline shrink-0`} strokeWidth={3} />
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${color} shrink-0 ${className}`} title={title ?? defaultTitle}>
      {wow > 0 ? (
        <ArrowUp className={`${iconSize} inline shrink-0`} strokeWidth={2.75} />
      ) : (
        <ArrowDown className={`${iconSize} inline shrink-0`} strokeWidth={2.75} />
      )}
    </span>
  );
};

export const TrendText = ({ 
  wow, 
  suffix = '', 
  type = 'good-up',
  diffFormat = false,
  size = 'md'
}: { 
  wow: number | null | undefined, 
  suffix?: string, 
  type?: 'good-up' | 'good-down' | 'neutral',
  diffFormat?: boolean,
  size?: 'sm' | 'md'
}) => {
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-xs';
  const iconMinusSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  if (wow === null || wow === undefined || isNaN(wow)) {
    return <span className={`text-gray-400 font-medium ${textSize}`}>N/A</span>;
  }
  if (wow === 0) {
    return <span className={`text-gray-400 font-medium ${textSize} inline-flex items-center gap-0.5`}><Minus className={`${iconMinusSize} text-gray-400 inline`} /> 0{suffix}</span>;
  }
  
  let colorClass = '';
  if (type === 'good-up') {
    colorClass = wow > 0 ? 'text-green-700' : 'text-red-700';
  } else if (type === 'good-down') {
    colorClass = wow < 0 ? 'text-green-700' : 'text-red-700';
  } else {
    colorClass = wow > 0 ? 'text-amber-700' : 'text-green-700';
  }

  const sign = wow > 0 ? '+' : '';
  return (
    <span className={`${colorClass} font-semibold ${textSize} inline-flex items-center gap-0.5 font-mono whitespace-nowrap`}>
      <TrendIcon wow={wow} type={type} size={size} /> {sign}{wow}{suffix}
    </span>
  );
};
