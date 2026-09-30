import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export const TrendIcon = ({ 
  wow, 
  type = 'good-up',
  size = 'md'
}: { 
  wow: number | null | undefined, 
  type?: 'good-up' | 'good-down' | 'neutral',
  size?: 'sm' | 'md'
}) => {
  if (wow === null || wow === undefined || isNaN(wow)) {
    return null;
  }
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  if (wow === 0) return <Minus className={`${iconSize} text-gray-400 inline`} />;

  let color = '';
  if (type === 'good-up') {
    color = wow > 0 ? 'text-green-600' : 'text-red-600';
  } else if (type === 'good-down') {
    color = wow < 0 ? 'text-green-600' : 'text-red-600';
  } else {
    color = wow > 0 ? 'text-amber-600' : 'text-green-600';
  }

  return wow > 0 ? (
    <ArrowUp className={`${iconSize} inline ${color}`} strokeWidth={2.5} />
  ) : (
    <ArrowDown className={`${iconSize} inline ${color}`} strokeWidth={2.5} />
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
