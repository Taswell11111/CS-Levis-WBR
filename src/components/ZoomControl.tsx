import React from 'react';
import { Minus, Plus, RotateCcw, Hand, MousePointer } from 'lucide-react';

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({ 
  zoom, 
  onZoomChange
}) => {
  const handleZoomIn = () => onZoomChange(Math.min(+(zoom + 0.1).toFixed(2), 1.6));
  const handleZoomOut = () => onZoomChange(Math.max(+(zoom - 0.1).toFixed(2), 0.5));
  const handleToggleZoom = () => onZoomChange(Math.abs(zoom - 1.35) < 0.05 ? 1.0 : 1.35);
  const handleReset = () => onZoomChange(1.0);

  return (
    <div className="fixed bottom-3 right-3 z-[9999] flex items-center gap-1 bg-white/70 backdrop-blur-md px-2 py-1 rounded-full shadow-sm border border-gray-200/80 print:hidden transition-all opacity-60 hover:opacity-100 scale-85 origin-bottom-right">

      <div className="flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600 cursor-pointer"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus size={13} />
        </button>
        
        <input
          type="range"
          min="0.5"
          max="1.6"
          step="0.05"
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="w-16 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#003876]"
          title={`Zoom: ${Math.round(zoom * 100)}%`}
        />
        
        <button
          onClick={handleZoomIn}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600 cursor-pointer"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* 135% Quick Toggle */}
      <button
        onClick={handleToggleZoom}
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
          Math.abs(zoom - 1.35) < 0.05
            ? 'bg-[#C41230] text-white shadow-xs'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
        title="Quick Zoom to 135% (or double-click open area on canvas)"
      >
        135%
      </button>

      {/* Reset button if not 100% */}
      {Math.abs(zoom - 1.0) >= 0.05 && (
        <button
          onClick={handleReset}
          className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-full transition-colors cursor-pointer"
          title="Reset to 100%"
        >
          <RotateCcw size={11} />
        </button>
      )}

      <span className="text-[10.5px] font-bold text-gray-800 min-w-8 text-center font-mono select-none">
        {Math.round(zoom * 100)}%
      </span>

      {zoom > 1 && (
        <span className="text-[9px] text-[#003876] font-medium pl-1 border-l border-gray-200 hidden sm:inline select-none">
          Select text or drag margins
        </span>
      )}
    </div>
  );
};

