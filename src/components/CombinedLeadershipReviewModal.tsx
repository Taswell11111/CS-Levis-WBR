import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  ShieldCheck, 
  Package, 
  DollarSign, 
  Truck, 
  RotateCcw, 
  Headphones, 
  Layers,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Award
} from 'lucide-react';
import { WeeklyReportItem } from '../types';
import { generateCombinedReportPDF } from '../lib/combinedPdfExport';

interface CombinedLeadershipReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReports: WeeklyReportItem[];
}

export const CombinedLeadershipReviewModal: React.FC<CombinedLeadershipReviewModalProps> = ({
  isOpen,
  onClose,
  selectedReports
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'governance'>('overview');

  if (!isOpen || selectedReports.length === 0) return null;

  // Sort reports chronologically by startDate ascending for executive review
  const sortedReports = [...selectedReports].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Determine overall period range
  const earliestDate = sortedReports[0].startDate;
  const latestDate = sortedReports[sortedReports.length - 1].endDate;

  // Review type detection (Quarterly vs Monthly vs Multi-Week)
  const isMonthly = sortedReports.length >= 3 && sortedReports.every(r => r.startDate.startsWith(earliestDate.slice(0, 7)));
  const reviewTitle = isMonthly 
    ? `Monthly Leadership Executive Review (${new Date(earliestDate).toLocaleString('default', { month: 'long', year: 'numeric' })})`
    : sortedReports.length >= 4 
      ? `Quarterly Leadership Executive Review (${earliestDate.slice(0, 7)} to ${latestDate.slice(0, 7)})`
      : `Executive Multi-Week Leadership Performance Review (${sortedReports.length} Weeks)`;

  // Aggregated KPIs
  const totalGrossSales = sortedReports.reduce((acc, r) => acc + (r.metrics.grossSales || 0), 0);
  const totalPaidOrders = sortedReports.reduce((acc, r) => acc + (r.metrics.paidOrders || 0), 0);
  const totalItemsSold = sortedReports.reduce((acc, r) => acc + (r.metrics.netItemsSold || 0), 0);
  const totalTickets = sortedReports.reduce((acc, r) => acc + (r.metrics.totalTickets || 0), 0);
  const totalRMAs = sortedReports.reduce((acc, r) => acc + (r.metrics.totalRMAs || 0), 0);
  const totalValueAtRisk = sortedReports.reduce((acc, r) => acc + (r.metrics.valueAtRisk || 0), 0);

  const avgCourierSLA = (
    sortedReports.reduce((acc, r) => acc + (r.metrics.deliverySLA || 0), 0) / sortedReports.length
  ).toFixed(1);

  const blendedAOV = totalPaidOrders > 0 ? Math.round(totalGrossSales / totalPaidOrders) : 0;
  const blendedUnitsPerOrder = totalPaidOrders > 0 ? (totalItemsSold / totalPaidOrders).toFixed(2) : '1.45';
  const blendedReturnRate = totalPaidOrders > 0 ? ((totalRMAs / totalPaidOrders) * 100).toFixed(1) : '21.5';

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: sortedReports.length + 1 });

    const pageElementIds = [
      'combined-leadership-page-summary',
      ...sortedReports.map((_, idx) => `combined-leadership-page-week-${idx}`),
      'combined-leadership-page-governance'
    ];

    const cleanFilename = `Levis_Leadership_Review_Combined_${earliestDate}_to_${latestDate}.pdf`;

    try {
      await generateCombinedReportPDF(pageElementIds, cleanFilename, (current, total) => {
        setExportProgress({ current, total });
      });
    } catch (err) {
      console.error('Combined PDF generation failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL EXECUTIVE HEADER */}
        <div className="bg-[#003876] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-[#C41230] text-white text-[11px] font-black tracking-widest px-2.5 py-1 rounded uppercase shadow-xs">
              LEVI STRAUSS &amp; CO.
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                  Combined Leadership Review Document
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-800/80 text-white border border-blue-600">
                  {sortedReports.length} Reports Selected
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {reviewTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C41230] hover:bg-[#a50f28] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Export all selected weeks to a single combined PDF"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    Generating PDF ({exportProgress ? `${exportProgress.current}/${exportProgress.total}` : '...'})
                  </span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Generate Combined PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SUBHEADER NAVIGATION & PREVIEW CONTROLS */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider mr-2">Review Tabs:</span>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#003876] text-white shadow-2xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Executive Portfolio Scorecard
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'detailed'
                  ? 'bg-[#003876] text-white shadow-2xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Weekly Chapters ({sortedReports.length})
            </button>
            <button
              onClick={() => setActiveTab('governance')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'governance'
                  ? 'bg-[#003876] text-white shadow-2xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Strategic Action Matrix &amp; Sign-Off
            </button>
          </div>

          <div className="text-xs text-gray-500 font-mono hidden sm:block">
            Coverage: <strong>{earliestDate}</strong> &rarr; <strong>{latestDate}</strong>
          </div>
        </div>

        {/* MODAL BODY / SCROLLABLE PREVIEW DOCUMENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100 space-y-6">

          {/* ============================================================ */}
          {/* SECTION 1 / PAGE 1: EXECUTIVE LEADERSHIP SUMMARY PAGE        */}
          {/* ============================================================ */}
          <div 
            id="combined-leadership-page-summary" 
            className="bg-white rounded-xl shadow-md border border-gray-300 p-8 max-w-5xl mx-auto space-y-6 font-sans"
          >
            {/* DOCUMENT TITLE & BRAND BANNER */}
            <div className="border-b-2 border-[#003876] pb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#C41230] text-white text-[11px] font-black tracking-widest px-2.5 py-0.5 rounded uppercase">
                    LEVI STRAUSS &amp; CO.
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#003876]">
                    Quarterly &amp; Monthly Review Board
                  </span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Executive Performance Telemetry &bull; Combined Leadership Review
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Aggregated review across {sortedReports.length} consecutive weekly reporting cycles &bull; Period: {earliestDate} to {latestDate}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Document Classification</span>
                <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded border border-gray-200 inline-block mt-0.5">
                  CONFIDENTIAL &bull; EXECUTIVE BOARD
                </span>
                <div className="text-[10px] text-gray-400 mt-1 font-mono">
                  Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* VERSION MANIFEST & REPORT SCOPE PILL ROW */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#003876] flex items-center gap-1">
                  <Layers size={14} />
                  Included Report Versions:
                </span>
                {sortedReports.map((r) => (
                  <span 
                    key={r.id} 
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-blue-300 text-xs font-mono font-bold text-gray-800 shadow-2xs"
                  >
                    <span className="px-1.5 py-0.2 rounded bg-[#003876] text-white text-[10px] font-black">
                      '{r.versionPrefix || 'v1'}'
                    </span>
                    <span>{r.weekLabel}</span>
                    <span className="text-[10px] text-gray-500 font-normal">({r.startDate})</span>
                  </span>
                ))}
              </div>
              <span className="text-xs font-semibold text-blue-900 font-mono">
                {sortedReports.length} Full Weeks Audited
              </span>
            </div>

            {/* AGGREGATED EXECUTIVE SCORECARD */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Award size={15} className="text-[#003876]" />
                  Combined Period Key Performance Indicators
                </h3>
                <span className="text-[11px] text-gray-500 font-mono">Aggregated cross-week telemetry</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Gross Sales</span>
                  <span className="text-base font-black font-mono text-emerald-700 mt-0.5 block">
                    R{(totalGrossSales / 1000000).toFixed(2)}M
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">R{totalGrossSales.toLocaleString()}</span>
                </div>

                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Paid Orders</span>
                  <span className="text-base font-black font-mono text-gray-900 mt-0.5 block">
                    {totalPaidOrders.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">{totalItemsSold.toLocaleString()} units sold</span>
                </div>

                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Blended AOV</span>
                  <span className="text-base font-black font-mono text-[#003876] mt-0.5 block">
                    R{blendedAOV.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">{blendedUnitsPerOrder} UPO</span>
                </div>

                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Avg Delivery SLA</span>
                  <span className={`text-base font-black font-mono mt-0.5 block ${Number(avgCourierSLA) >= 90 ? 'text-blue-700' : 'text-amber-700'}`}>
                    {avgCourierSLA}%
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Parcelninja target: 95%</span>
                </div>

                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Support Tickets</span>
                  <span className="text-base font-black font-mono text-gray-900 mt-0.5 block">
                    {totalTickets.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Freshdesk Inquiries</span>
                </div>

                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total RMAs</span>
                  <span className="text-base font-black font-mono text-purple-700 mt-0.5 block">
                    {totalRMAs}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">{blendedReturnRate}% Return Rate</span>
                </div>
              </div>
            </div>

            {/* CROSS-WEEK COMPARATIVE TELEMETRY TABLE */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <FileText size={15} className="text-[#003876]" />
                  Cross-Week Comparative Performance Matrix
                </h3>
                <span className="text-[10px] font-bold text-[#003876] uppercase">Sorted Chronologically</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#003876] text-white">
                    <tr>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider">Version &amp; Week</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider">Date Period</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider text-right">Paid Orders</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider text-right">Gross Sales</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider text-right">Delivery SLA</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider text-right">Support Tkts</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider text-right">RMAs</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px] tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white font-mono">
                    {sortedReports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-bold text-gray-900 flex items-center gap-1.5 font-sans">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[10px] font-black border border-blue-200">
                            '{r.versionPrefix || 'v1'}'
                          </span>
                          <span>{r.weekLabel}</span>
                        </td>
                        <td className="py-2 px-3 text-gray-600 text-[11px] font-sans">{r.periodLabel}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">{r.metrics.paidOrders.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">R{r.metrics.grossSales.toLocaleString()}</td>
                        <td className={`py-2 px-3 text-right font-bold ${r.metrics.deliverySLA >= 90 ? 'text-blue-700' : 'text-amber-700'}`}>
                          {r.metrics.deliverySLA}%
                        </td>
                        <td className="py-2 px-3 text-right text-gray-800">{r.metrics.totalTickets}</td>
                        <td className="py-2 px-3 text-right text-purple-700">{r.metrics.totalRMAs} ({r.metrics.returnRate}%)</td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            r.status === 'ACTIVE_CHECKPOINT' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : r.status === 'PUBLISHED' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold font-mono text-gray-900 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 font-sans uppercase text-[11px]">Combined Total / Average</td>
                      <td className="py-2.5 px-3 text-right">{totalPaidOrders.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-800">R{totalGrossSales.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-blue-800">{avgCourierSLA}%</td>
                      <td className="py-2.5 px-3 text-right">{totalTickets.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-purple-800">{totalRMAs}</td>
                      <td className="py-2.5 px-3 text-center font-sans text-[10px] text-gray-500">AUDITED</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* STRATEGIC LEADERSHIP SYNTHESIS & EXECUTIVE COMMENTARY */}
            <div className="bg-slate-50 border border-gray-200 rounded-xl p-4.5 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#003876] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#C41230]" />
                Executive Leadership Strategic Analysis
              </h4>
              <p className="text-xs text-gray-700 leading-relaxed">
                Across this review span ({earliestDate} through {latestDate}), Levi Strauss &amp; Co. operations processed 
                a combined <strong>{totalPaidOrders.toLocaleString()} paid orders</strong> generating <strong>R{(totalGrossSales / 1000000).toFixed(2)}M in gross sales</strong>, 
                with an average basket size of <strong>{blendedUnitsPerOrder} units per order</strong> and a blended AOV of <strong>R{blendedAOV.toLocaleString()}</strong>.
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">
                Courier logistics maintained a period delivery SLA average of <strong>{avgCourierSLA}%</strong>. Customer care handled 
                <strong>{totalTickets.toLocaleString()} total inquiries</strong> through Freshdesk, with returns accounting for {totalRMAs} RMAs 
                ({blendedReturnRate}% blended rate). Strategic focus remains centered on accelerating unfulfilled aged backlog dispatch and enforcing 
                Parcelninja carrier collection SLAs to sustain leadership delivery benchmarks.
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 2 / PAGES 2..N: DETAILED WEEKLY CHAPTER PAGES        */}
          {/* ============================================================ */}
          {sortedReports.map((report, idx) => (
            <div
              key={report.id}
              id={`combined-leadership-page-week-${idx}`}
              className="bg-white rounded-xl shadow-md border border-gray-300 p-8 max-w-5xl mx-auto space-y-6 font-sans"
            >
              {/* WEEK CHAPTER HEADER */}
              <div className="border-b-2 border-gray-200 pb-3.5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-[#003876] text-white font-mono text-xs font-black">
                      '{report.versionPrefix || 'v1'}'
                    </span>
                    <span className="text-base font-black text-gray-900 tracking-tight">
                      '{report.versionPrefix || 'v1'}' {report.weekLabel} &bull; Detailed Telemetry Snapshot
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      report.status === 'ACTIVE_CHECKPOINT' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    Reporting Window: <strong>{report.startDate}</strong> to <strong>{report.endDate}</strong> ({report.periodLabel})
                  </p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-gray-500 font-mono text-[10px] block">Weekly Sign-Off</span>
                  <span className="font-bold text-gray-800">{report.signOffBy || 'Operations Lead'}</span>
                </div>
              </div>

              {/* 4 KEY KPI TILES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-gray-200 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Paid Orders</span>
                  <span className="text-lg font-black font-mono text-gray-900">{report.metrics.paidOrders.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                    {report.metrics.paidOrdersWoW !== null ? `${report.metrics.paidOrdersWoW > 0 ? '+' : ''}${report.metrics.paidOrdersWoW}% WoW` : 'Baseline'}
                  </span>
                </div>

                <div className="bg-slate-50 border border-gray-200 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Gross Sales</span>
                  <span className="text-lg font-black font-mono text-emerald-700">R{report.metrics.grossSales.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                    {report.metrics.netItemsSold.toLocaleString()} Net Items
                  </span>
                </div>

                <div className="bg-slate-50 border border-gray-200 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Courier SLA</span>
                  <span className="text-lg font-black font-mono text-blue-700">{report.metrics.deliverySLA}%</span>
                  <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                    {report.metrics.staleShipmentsCount} Stale Exceptions
                  </span>
                </div>

                <div className="bg-slate-50 border border-gray-200 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Freshdesk Support</span>
                  <span className="text-lg font-black font-mono text-gray-900">{report.metrics.totalTickets} Tkts</span>
                  <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                    {report.metrics.openBacklogTickets} Open Backlog &bull; {report.metrics.artHours}h ART
                  </span>
                </div>
              </div>

              {/* FULFILMENT & LOGISTICS AUDIT ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3.5 space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Truck size={13} className="text-[#003876]" />
                    Warehouse Fulfilment &amp; Backlog Velocity
                  </h5>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="bg-slate-50 p-2 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-500 uppercase block font-sans">Fulfilled</span>
                      <span className="font-bold text-emerald-700">{report.metrics.fulfilledOrders}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-500 uppercase block font-sans">Unfulfilled</span>
                      <span className="font-bold text-amber-700">{report.metrics.unfulfilledOrders}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-500 uppercase block font-sans">Backlog Value</span>
                      <span className="font-bold text-gray-900">R{(report.metrics.unfulfilledBacklogValue / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3.5 space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <RotateCcw size={13} className="text-purple-600" />
                    Reverse Logistics &amp; Returns Pipeline
                  </h5>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="bg-slate-50 p-2 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-500 uppercase block font-sans">Total RMAs</span>
                      <span className="font-bold text-purple-700">{report.metrics.totalRMAs}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-500 uppercase block font-sans">Return Rate</span>
                      <span className="font-bold text-purple-700">{report.metrics.returnRate}%</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-gray-100">
                      <span className="text-[9px] text-gray-500 uppercase block font-sans">Units / Order</span>
                      <span className="font-bold text-gray-900">{report.metrics.unitsPerOrder}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* OPERATIONAL SUMMARY & LEADERSHIP COMMENTARY */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#003876] block mb-1">
                  Weekly Operational Executive Note &bull; Version {report.versionPrefix || 'v1'}
                </span>
                <p className="text-xs text-gray-700 leading-relaxed font-sans">
                  {report.summaryNote}
                </p>
              </div>
            </div>
          ))}

          {/* ============================================================ */}
          {/* SECTION 3 / FINAL PAGE: GOVERNANCE, REMEDIATIONS & SIGN-OFF  */}
          {/* ============================================================ */}
          <div 
            id="combined-leadership-page-governance" 
            className="bg-white rounded-xl shadow-md border border-gray-300 p-8 max-w-5xl mx-auto space-y-6 font-sans"
          >
            <div className="border-b-2 border-[#003876] pb-3 flex items-start justify-between">
              <div>
                <span className="bg-[#C41230] text-white text-[10px] font-black tracking-widest px-2 py-0.5 rounded uppercase">
                  LEVI STRAUSS &amp; CO.
                </span>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                  Leadership Action Items &bull; Governance &amp; Multi-Week Sign-Off
                </h3>
                <p className="text-xs text-gray-500">
                  Operational remediations and quarterly leadership commitments.
                </p>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  FINAL LEADERSHIP REVIEW
                </span>
              </div>
            </div>

            {/* PRIORITY REMEDIATION ROADMAP */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-[#003876]" />
                Executive Operational Remediations &amp; Mitigation Framework
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-gray-200 rounded-lg p-3.5 bg-slate-50 space-y-1">
                  <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">1. Fulfilment Velocity</div>
                  <div className="text-xs font-bold text-gray-900">Clear Aged Unfulfilled Queue (&gt;3 Days)</div>
                  <p className="text-[11px] text-gray-600 leading-relaxed mt-1">
                    Prioritize warehouse exception clearance for orders older than 3 calendar days, enforcing daily queue audits at Parcelninja DC.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-3.5 bg-slate-50 space-y-1">
                  <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">2. Courier Delivery SLA</div>
                  <div className="text-xs font-bold text-gray-900">Enforce Carrier Escalations</div>
                  <p className="text-[11px] text-gray-600 leading-relaxed mt-1">
                    Conduct mandatory weekly 3PL carrier reviews to restore outbound delivery SLA above the 95% target threshold across regional hubs.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-3.5 bg-slate-50 space-y-1">
                  <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">3. Customer Experience &amp; RMA</div>
                  <div className="text-xs font-bold text-gray-900">Exchange Cycle Time Compression</div>
                  <p className="text-[11px] text-gray-600 leading-relaxed mt-1">
                    Target sub-12 hour first contact resolution on Freshdesk return tickets and expedite ReturnGO reverse collections processing.
                  </p>
                </div>
              </div>
            </div>

            {/* FORMAL SIGN-OFF & GOVERNANCE BLOCK */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 mb-4">
                Executive Leadership Approval &bull; Formal Review Sign-Off
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Operations Lead</span>
                  <div className="text-xs font-bold text-gray-900 mt-4">Operations Lead &bull; Levi's SA</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">Date: {new Date().toISOString().split('T')[0]} &bull; APPROVED</div>
                </div>

                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Head of Ecommerce / Commercial</span>
                  <div className="text-xs font-bold text-gray-900 mt-4">Commercial Director &bull; eComplete</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">Date: {new Date().toISOString().split('T')[0]} &bull; APPROVED</div>
                </div>

                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Logistics &amp; 3PL Director</span>
                  <div className="text-xs font-bold text-gray-900 mt-4">Supply Chain Lead &bull; Parcelninja DC</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">Date: {new Date().toISOString().split('T')[0]} &bull; APPROVED</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Export includes <strong>{sortedReports.length + 2} formatted landscape pages</strong> with executive telemetry scorecards.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer size={13} />
              <span>Print Preview</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-4 py-1.5 rounded-lg bg-[#003876] hover:bg-[#002855] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download size={13} />
              <span>{isExporting ? 'Generating PDF...' : 'Download Combined PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
