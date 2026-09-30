import React from 'react';

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
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={thickness}
        />
        {slices.map((slice, idx) => {
          const strokeLength = (slice.percentage / 100) * circumference;
          const strokeDasharray = `${strokeLength} ${circumference}`;
          const rotateAngle = (cumulativePercent / 100) * 360;
          cumulativePercent += slice.percentage;

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={0}
              transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-[13px] font-black text-gray-900 leading-none font-mono">
          {centerNumber}
        </span>
        <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-tight mt-0.5">
          {centerLabel}
        </span>
      </div>
    </div>
  );
};
