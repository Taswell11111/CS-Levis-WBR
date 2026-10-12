import React, { useState } from 'react';

export interface DoughnutSlice {
  label: string;
  count: number;
  percentage: number;
  color: string;
  sublabel?: string;
}

export const DoughnutChart: React.FC<{
  slices: DoughnutSlice[];
  size?: number;
  thickness?: number;
  centerNumber: string | number;
  centerLabel: string;
}> = ({ slices, size = 110, thickness = 18, centerNumber, centerLabel }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div 
      className="relative inline-flex items-center justify-center shrink-0 group select-none"
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={thickness}
        />
        {slices.map((slice, idx) => {
          const strokeLength = (slice.percentage / 100) * circumference;
          const strokeDasharray = `${strokeLength} ${circumference}`;
          const rotateAngle = (cumulativePercent / 100) * 360;
          cumulativePercent += slice.percentage;
          const isHovered = hoveredIdx === idx;

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={isHovered ? thickness + 4 : thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={0}
              transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
              className="transition-all duration-200 cursor-pointer"
              opacity={hoveredIdx !== null && !isHovered ? 0.65 : 1}
              onMouseEnter={() => setHoveredIdx(idx)}
            >
              <title>{`${slice.label}: ${slice.count.toLocaleString()} (${slice.percentage.toFixed(1)}%)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none px-1">
        <span className={`font-black font-mono leading-none transition-all duration-150 ${
          activeSlice ? 'text-[14px] text-[#003876]' : 'text-[13px] text-gray-900'
        }`}>
          {activeSlice ? activeSlice.count.toLocaleString() : centerNumber}
        </span>
        <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-tight mt-0.5 truncate max-w-[70px]">
          {activeSlice ? `${activeSlice.percentage.toFixed(0)}% ${activeSlice.label}` : centerLabel}
        </span>
      </div>
    </div>
  );
};
