import React from 'react';
import { Compass, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StrategicCommentarySectionProps {
  pageNumber: number;
  goodPerformance: string;
  watchpoint: string;
}

export const StrategicCommentarySection: React.FC<StrategicCommentarySectionProps> = ({
  pageNumber,
  goodPerformance,
  watchpoint
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-[#00264d] to-[#001833] text-white rounded-lg p-3 sm:p-3.5 mb-4 shadow-sm border border-slate-700/80">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <Compass size={13} className="text-amber-400" />
          <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-300">
            Strategic Performance Commentary &bull; Page {pageNumber}
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-300 uppercase tracking-widest">
          Executive Synthesis
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
        {/* GOOD PERFORMANCE */}
        <div className="flex items-start gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded p-2 text-emerald-100">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-300 uppercase tracking-wide text-[9.5px] block mb-0.5">
              Strong Performance Driver
            </span>
            <span>{goodPerformance}</span>
          </div>
        </div>

        {/* NOT-SO-GOOD / OPERATIONAL WATCHPOINT */}
        <div className="flex items-start gap-2 bg-rose-950/40 border border-rose-500/30 rounded p-2 text-rose-100">
          <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-rose-300 uppercase tracking-wide text-[9.5px] block mb-0.5">
              Operational Watchpoint / Friction Area
            </span>
            <span>{watchpoint}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
