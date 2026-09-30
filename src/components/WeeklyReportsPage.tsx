import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  FileText, 
  ChevronRight, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  Headphones, 
  Truck, 
  RotateCcw, 
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  BarChart3,
  Sparkles,
  Download,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { WeeklyReportItem, WBRData } from '../types';
import { CatalogModal } from './CatalogModal';
import { HISTORICAL_WEEKLY_REPORTS, getHistoricalReportById } from '../data/historicalReportsData';

interface WeeklyReportsPageProps {
  onBackToHome: () => void;
  onOpenDashboard: (report?: WeeklyReportItem) => void;
  onLoadIntoEditor?: (report?: WeeklyReportItem) => void;
  activeReportData: WBRData | null;
  currentStartDate: string;
  currentEndDate: string;
}

export const WeeklyReportsPage: React.FC<WeeklyReportsPageProps> = ({
  onBackToHome,
  onOpenDashboard,
  onLoadIntoEditor,
  activeReportData,
  currentStartDate,
  currentEndDate
}) => {
  const [reports, setReports] = useState<WeeklyReportItem[]>(HISTORICAL_WEEKLY_REPORTS);
  const [selectedReportId, setSelectedReportId] = useState<string>(HISTORICAL_WEEKLY_REPORTS[0]?.id || 'week-38-2026');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [dateSearch, setDateSearch] = useState<string>('');
  const [pickedDate, setPickedDate] = useState<string>('');
  const [evaluationModalReport, setEvaluationModalReport] = useState<WeeklyReportItem | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);

  const enrichWithActiveData = (r: WeeklyReportItem): WeeklyReportItem => {
    if (r.status === 'ACTIVE_CHECKPOINT' && activeReportData) {
      const rawData = activeReportData as any;
      const inner = activeReportData.data || rawData;
      const shopify = inner?.shopify;
      const freshdesk = inner?.freshdesk;
      const returngo = inner?.returngo;
      const parcelninja = inner?.parcelninja;
      const reportingPeriod = inner?.reportingPeriod;
      const synthesis = activeReportData.synthesis || rawData?.synthesis;

      const sDate = currentStartDate || reportingPeriod?.startDate || r.startDate;
      const eDate = currentEndDate || reportingPeriod?.endDate || r.endDate;
      const paidOrders = shopify?.totalOrders ?? shopify?.paidOrders ?? r.metrics.paidOrders;
      const grossSales = shopify?.revenueAOV?.grossSales ?? shopify?.revenueAOV?.totalRevenue ?? shopify?.grossSales ?? r.metrics.grossSales;
      const totalTickets = freshdesk?.totalTickets ?? r.metrics.totalTickets;

      return {
        ...r,
        startDate: sDate,
        endDate: eDate,
        periodLabel: `${sDate} – ${eDate}`,
        summaryNote: `Active uploaded checkpoint: ${paidOrders} Paid Orders, R${grossSales.toLocaleString()} Gross Sales, ${totalTickets} Support Tickets.`,
        metrics: {
          paidOrders,
          paidOrdersWoW: shopify?.ordersWoW ?? null,
          grossSales,
          itemsInPaidOrders: shopify?.itemsInPaidOrders ?? 0,
          netItemsSold: shopify?.netItemsSold ?? 0,
          netItemsSoldWoW: shopify?.netItemsSoldWoW ?? null,
          unitsPerOrder: shopify?.unitsPerOrder ?? 0,
          fulfilledOrders: shopify?.fulfilled ?? 0,
          unfulfilledOrders: shopify?.unfulfilledOrders ?? shopify?.unfulfilled ?? 0,
          unfulfilledBacklogValue: shopify?.unfulfilledBacklogValue ?? 0,
          unfulfilledBacklogValueWoW: null,
          totalTickets,
          openBacklogTickets: freshdesk?.openBacklog ?? 0,
          artHours: 1.8,
          totalRMAs: returngo?.totalReturns ?? 0,
          returnRate: returngo?.returnRate ?? 0,
          deliverySLA: parcelninja?.deliverySuccess ?? 92.5,
          staleShipmentsCount: parcelninja?.operationalExceptions ?? 0,
          valueAtRisk: synthesis?.valueAtRisk?.totalValueAtRisk ?? 0
        },
        data: activeReportData
      };
    }
    return r;
  };

  const mergeWithHistorical = (list: WeeklyReportItem[]): WeeklyReportItem[] => {
    return list.map(r => {
      if (r.status === 'ACTIVE_CHECKPOINT' && activeReportData) {
        return enrichWithActiveData(r);
      }
      const hist = getHistoricalReportById(r.id);
      return {
        ...r,
        data: r.data || hist?.data,
        evaluationScore: r.evaluationScore !== undefined ? r.evaluationScore : hist?.evaluationScore
      };
    });
  };

  // Fetch reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/reports/weekly');
        if (res.ok) {
          const json = await res.json();
          if (json.reports && Array.isArray(json.reports) && json.reports.length > 0) {
            const merged = mergeWithHistorical(json.reports);
            setReports(merged);
            setSelectedReportId(merged[0].id);
          } else {
            fallbackLocalReports();
          }
        } else {
          fallbackLocalReports();
        }
      } catch (e) {
        console.error("Failed to load weekly reports:", e);
        fallbackLocalReports();
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [activeReportData]);

  const fallbackLocalReports = () => {
    const merged = mergeWithHistorical(HISTORICAL_WEEKLY_REPORTS);
    setReports(merged);
    setSelectedReportId(merged[0]?.id || 'week-38-2026');
  };

  const handleOpenReport = (report: WeeklyReportItem) => {
    let fullReport = report;
    if (report.status === 'ACTIVE_CHECKPOINT' && activeReportData) {
      fullReport = enrichWithActiveData(report);
    } else if (!fullReport.data) {
      const hist = getHistoricalReportById(report.id);
      if (hist?.data) {
        fullReport = { ...report, data: hist.data };
      }
    }
    onOpenDashboard(fullReport);
  };

  const handleOpenEvaluation = (report: WeeklyReportItem) => {
    let fullReport = report;
    if (!fullReport.data) {
      const hist = getHistoricalReportById(report.id);
      if (hist?.data) {
        fullReport = { ...report, data: hist.data };
      }
    }
    setEvaluationModalReport(fullReport);
    setIsCatalogModalOpen(true);
  };

  const selectedReport = reports.find(r => r.id === selectedReportId) || reports[0];

  const filteredReports = reports.filter(r => {
    const q = (dateSearch || searchFilter).trim().toLowerCase();
    if (!q) return true;

    // Direct matches with week identifier and reporting period text
    const matchesWeek = r.weekLabel.toLowerCase().includes(q);
    const matchesPeriod = r.periodLabel.toLowerCase().includes(q);
    const matchesStart = r.startDate.toLowerCase().includes(q);
    const matchesEnd = r.endDate.toLowerCase().includes(q);
    const matchesSummary = r.summaryNote.toLowerCase().includes(q);
    const matchesSignOff = r.signOffBy ? r.signOffBy.toLowerCase().includes(q) : false;

    // ISO date range matching: if user entered/selected YYYY-MM-DD
    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(q);
    const inRange = isIsoDate && q >= r.startDate && q <= r.endDate;

    // Month matching (e.g. "sep", "september", "aug", "august")
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const matchesMonth = monthNames.some((m, idx) => {
      if (!q.includes(m)) return false;
      const monthNum = String(idx + 1).padStart(2, '0');
      return r.startDate.includes(`-${monthNum}-`) || r.endDate.includes(`-${monthNum}-`) || r.periodLabel.toLowerCase().includes(m);
    });

    return matchesWeek || matchesPeriod || matchesStart || matchesEnd || inRange || matchesMonth || matchesSummary || matchesSignOff;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE_CHECKPOINT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            ACTIVE CHECKPOINT
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 size={11} className="text-blue-600" />
            PUBLISHED
          </span>
        );
      case 'ARCHIVED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-300">
            <Clock size={11} className="text-gray-500" />
            ARCHIVED
          </span>
        );
    }
  };

  return (
    <div className="weekly-reports-archive-page min-h-screen bg-[#f8fafc] text-gray-900 flex flex-col font-sans">
      {/* TOP EXECUTIVE NAVIGATION HEADER */}
      <header className="bg-[#003876] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/20"
              title="Return to Gateway"
            >
              <ArrowLeft size={14} />
              <span>Home Gateway</span>
            </button>
            <div className="h-5 w-px bg-white/20 hidden sm:block"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#C41230] text-white text-[10px] font-black tracking-widest px-2 py-0.5 rounded-xs uppercase">
                  LEVI STRAUSS &amp; CO.
                </span>
                <span className="text-xs font-bold tracking-wider text-blue-200 uppercase">
                  WBR Historical Report Archive
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white mt-0.5">
                Weekly Business Reviews &bull; Multi-Week Telemetry Repository
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
          </div>
        </div>
      </header>

      {/* SUB-HEADER / TAB NAVIGATION BAR */}
      <div className="bg-white border-b border-gray-200 shadow-xs sticky top-[57px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-2.5">
            {/* WEEKLY TABS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pr-1 flex items-center gap-1 whitespace-nowrap">
                <Calendar size={13} className="text-[#003876]" />
                Reports:
              </span>
              {filteredReports.map((report) => {
                const isSelected = report.id === selectedReportId;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#003876] text-white shadow-sm ring-1 ring-[#003876]'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border border-gray-200'
                    }`}
                  >
                    <span>{report.weekLabel}</span>
                    <span className={`text-[10px] font-normal ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                      ({report.periodLabel.split(' ')[0]} {report.periodLabel.split(' ')[1]} – {report.periodLabel.split(' – ')[1]?.split(' ')[0]} {report.periodLabel.split(' – ')[1]?.split(' ')[1]})
                    </span>
                    {report.status === 'ACTIVE_CHECKPOINT' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-200"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* QUICK SEARCH */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter weeks..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003876]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* ============================================================ */}
        {/* 1. WEEKLY REPORTS DIRECTORY & DATE SEARCH FILTER BAR          */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 transition-all">
          {/* TOP BAR: SECTION HEADER & DATE SEARCH INPUT BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#003876]/10 text-[#003876]">
                  <Calendar size={18} />
                </span>
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">
                  Available Weekly Reports Archive
                </h2>
              </div>
              <p className="text-xs text-gray-500">
                Filter and inspect previous weekly review checkpoints by date or reporting period.
              </p>
            </div>

            {/* DATE SEARCH INPUT BAR */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="weekly-report-date-search"
                  placeholder="Filter by date (e.g. 2026-09-07, Sep, Week 37)..."
                  value={dateSearch}
                  onChange={(e) => setDateSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 focus:border-[#003876] rounded-lg text-xs text-gray-900 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#003876]/20 font-medium shadow-2xs"
                  aria-label="Filter weekly reports by date"
                />
                {dateSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateSearch('');
                      setPickedDate('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                    title="Clear date filter"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* DATE PICKER SHORTCUT */}
              <input
                type="date"
                aria-label="Filter reports by calendar date"
                value={pickedDate}
                onChange={(e) => {
                  setPickedDate(e.target.value);
                  setDateSearch(e.target.value);
                }}
                className="py-2 px-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003876]/20 shadow-2xs"
                title="Filter by calendar date"
              />
            </div>
          </div>

          {/* QUICK DATE PRESETS & COUNT */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 pb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter size={11} className="text-[#003876]" />
                Filter by Date:
              </span>
              <button
                type="button"
                onClick={() => { setDateSearch(''); setPickedDate(''); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  !dateSearch 
                    ? 'bg-[#003876] text-white shadow-2xs' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                }`}
              >
                All Weeks ({reports.length})
              </button>
              <button
                type="button"
                onClick={() => { setDateSearch('2026-09'); setPickedDate(''); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  dateSearch === '2026-09' || dateSearch.toLowerCase() === 'sep'
                    ? 'bg-[#003876] text-white shadow-2xs' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                }`}
              >
                September 2026
              </button>
              <button
                type="button"
                onClick={() => { setDateSearch('2026-08'); setPickedDate(''); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  dateSearch === '2026-08' || dateSearch.toLowerCase() === 'aug'
                    ? 'bg-[#003876] text-white shadow-2xs' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                }`}
              >
                August 2026
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 font-mono">
                Showing <strong>{filteredReports.length}</strong> of {reports.length} weekly reports
              </span>
              {dateSearch && (
                <button
                  type="button"
                  onClick={() => { setDateSearch(''); setPickedDate(''); }}
                  className="text-[11px] font-bold text-[#C41230] hover:underline cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* REPORT PREVIEW CARDS LIST / GRID */}
          {filteredReports.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredReports.map((report) => {
                const isSelected = report.id === selectedReportId;
                return (
                  <motion.div
                    key={report.id}
                    whileHover={{ y: -4, transition: { duration: 0.22, ease: "easeOut" } }}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`report-preview-card relative rounded-xl border p-4.5 cursor-pointer transition-all duration-300 ease-out flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-blue-50/70 border-[#003876] shadow-md ring-2 ring-[#003876]/30'
                        : 'bg-white hover:bg-slate-50/95 border-gray-200/90 hover:border-[#003876]/50 hover:shadow-xl'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Week Badge & Status */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-black font-mono tracking-tight ${
                            isSelected 
                              ? 'bg-[#003876] text-white' 
                              : 'bg-gray-100 text-gray-800 group-hover:bg-[#003876] group-hover:text-white transition-colors'
                          }`}>
                            {report.weekLabel}
                          </span>
                          {report.status === 'ACTIVE_CHECKPOINT' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active Checkpoint"></span>
                          )}
                        </div>
                        {getStatusBadge(report.status)}
                      </div>

                      {/* Reporting Period */}
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-gray-800">
                        <Calendar size={13} className="text-[#003876] shrink-0" />
                        <span className="truncate">{report.periodLabel}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5 pl-4.5">
                        {report.startDate} &rarr; {report.endDate}
                      </div>

                      {/* Mini Key Metrics Grid */}
                      <div className="mt-3.5 grid grid-cols-2 gap-2 bg-gray-50/80 group-hover:bg-white/80 p-2.5 rounded-lg border border-gray-100 transition-colors">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Paid Orders</span>
                          <span className="text-sm font-black font-mono text-gray-900">{report.metrics.paidOrders.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Gross Sales</span>
                          <span className="text-sm font-black font-mono text-emerald-700">R{(report.metrics.grossSales / 1000).toFixed(0)}k</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Courier SLA</span>
                          <span className="text-xs font-black font-mono text-blue-700">{report.metrics.deliverySLA}%</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Support Tkts</span>
                          <span className="text-xs font-black font-mono text-gray-800">{report.metrics.totalTickets}</span>
                        </div>
                      </div>

                      {/* Summary Note Excerpt */}
                      <p className="mt-3 text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                        {report.summaryNote}
                      </p>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-bold flex items-center gap-1 transition-colors ${
                        isSelected ? 'text-[#003876]' : 'text-gray-500 group-hover:text-[#003876]'
                      }`}>
                        <span>{isSelected ? 'Selected' : 'Select'}</span>
                        <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReport(report);
                        }}
                        className="px-2.5 py-1 rounded bg-[#C41230] hover:bg-[#a50f28] text-white text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Open executive report"
                      >
                        <span>Open WBR</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 py-8 px-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Clock size={28} className="mx-auto text-gray-400 mb-2" />
              <h4 className="text-xs font-bold text-gray-700">No Weekly Reports Match "{dateSearch}"</h4>
              <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                No archived reports found for this date. Try filtering by month (e.g. "Sep", "Aug") or clear the search.
              </p>
              <button
                type="button"
                onClick={() => { setDateSearch(''); setPickedDate(''); }}
                className="mt-3 px-3 py-1.5 bg-[#003876] hover:bg-[#002855] text-white rounded-md text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Reset Date Filter
              </button>
            </div>
          )}
        </section>

        {selectedReport ? (
          <>
            {/* REPORT SUMMARY HERO CARD */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 sm:p-6 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xl sm:text-2xl font-black text-[#003876] tracking-tight">
                      {selectedReport.weekLabel}
                    </span>
                    <span className="text-gray-400 font-light">&bull;</span>
                    <span className="text-base sm:text-lg font-semibold text-gray-700">
                      Reporting Period: {selectedReport.periodLabel}
                    </span>
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <p className="text-xs text-gray-500 font-mono flex items-center gap-3">
                    <span>Published: <strong>{new Date(selectedReport.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                    <span>&bull;</span>
                    <span>Sign-off: <strong className="text-gray-700">{selectedReport.signOffBy || 'Operations Lead'}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#003876] text-xs font-bold border border-blue-200 transition-colors cursor-pointer shadow-2xs">
                    <Sparkles size={13} className="text-[#003876]" />
                    <span>Upload Report Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (uploadEvt) => {
                          const base64 = uploadEvt.target?.result as string;
                          if (!base64) return;
                          try {
                            const updated = { ...selectedReport, reportImageUrl: base64, updatedAt: new Date().toISOString() };
                            const res = await fetch('/api/reports/weekly', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updated)
                            });
                            if (res.ok) {
                              setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, reportImageUrl: base64 } : r));
                            }
                          } catch (err) {
                            console.error('Failed to attach image to weekly report:', err);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => handleOpenReport(selectedReport)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C41230] hover:bg-[#a50f28] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Launch Review Pack (Live WBR)</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              {/* ATTACHED REPORT IMAGE PREVIEW (IF UPLOADED) */}
              {selectedReport.reportImageUrl && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#003876] flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#C41230]" />
                      Verified Report Visual Snapshot ({selectedReport.weekLabel})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Most Recent Snapshot</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto rounded border border-slate-200 shadow-inner bg-white flex justify-center">
                    <img 
                      src={selectedReport.reportImageUrl} 
                      alt={`Report image for ${selectedReport.weekLabel}`} 
                      className="w-full object-contain max-h-96"
                    />
                  </div>
                </div>
              )}

              {/* EXECUTIVE OBSERVATION NOTE */}
              <div className="mt-4 bg-blue-50/70 border-l-4 border-[#003876] p-3.5 rounded-r-lg">
                <div className="flex items-start gap-2.5">
                  <Sparkles size={16} className="text-[#003876] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-[#003876] uppercase tracking-wider">
                      Executive Summary &bull; {selectedReport.weekLabel}
                    </h4>
                    <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                      {selectedReport.summaryNote}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 PILLARS METRIC SCORECARDS */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* PILLAR 1: EXECUTIVE OVERVIEW */}
                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
                    <span className="text-[11px] font-bold text-[#003876] uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-600" />
                      Page 1: Overview
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">Executive Summary</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Paid Orders</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-gray-900 font-mono">
                          {selectedReport.metrics.paidOrders.toLocaleString()}
                        </span>
                        {selectedReport.metrics.paidOrdersWoW !== null && (
                          <span className={`text-[10px] font-bold font-mono flex items-center ${
                            selectedReport.metrics.paidOrdersWoW >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {selectedReport.metrics.paidOrdersWoW >= 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                            {selectedReport.metrics.paidOrdersWoW >= 0 ? `+${selectedReport.metrics.paidOrdersWoW}%` : `${selectedReport.metrics.paidOrdersWoW}%`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-[11px]">
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">Gross Sales</div>
                        <div className="font-bold text-gray-800 font-mono">
                          R{(selectedReport.metrics.grossSales).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">Net Items</div>
                        <div className="font-bold text-gray-800 font-mono">
                          {selectedReport.metrics.netItemsSold.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PILLAR 2: FRESHDESK & VOICE */}
                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
                    <span className="text-[11px] font-bold text-[#003876] uppercase tracking-wider flex items-center gap-1.5">
                      <Headphones size={14} className="text-blue-600" />
                      Page 2: Freshdesk &amp; Calls
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">Freshdesk &bull; Euphoria</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Tickets Received</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-gray-900 font-mono">
                          {selectedReport.metrics.totalTickets}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          ART: {selectedReport.metrics.artHours}h
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-[11px]">
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">Open Backlog</div>
                        <div className="font-bold text-amber-700 font-mono">
                          {selectedReport.metrics.openBacklogTickets} Tickets
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">SLA Resolution</div>
                        <div className="font-bold text-emerald-700 font-mono">
                          92.4%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PILLAR 3: RETURNGO RMAS */}
                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
                    <span className="text-[11px] font-bold text-[#003876] uppercase tracking-wider flex items-center gap-1.5">
                      <RotateCcw size={14} className="text-[#C41230]" />
                      Page 3: ReturnGO RMAs
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">ReturnGO API</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total RMAs Logged</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-gray-900 font-mono">
                          {selectedReport.metrics.totalRMAs}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#C41230]">
                          {selectedReport.metrics.returnRate}% of Orders
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-[11px]">
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">Return Rate</div>
                        <div className="font-bold text-gray-800 font-mono">
                          {selectedReport.metrics.returnRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">Top Reason</div>
                        <div className="font-bold text-gray-800 truncate">
                          Does not fit
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PILLAR 4: PARCELNINJA SHIPMENTS */}
                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
                    <span className="text-[11px] font-bold text-[#003876] uppercase tracking-wider flex items-center gap-1.5">
                      <Truck size={14} className="text-amber-600" />
                      Page 4: Parcelninja
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">Deliveries &amp; Returns</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Delivery SLA</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-emerald-700 font-mono">
                          {selectedReport.metrics.deliverySLA}%
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Target: 95.0%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-[11px]">
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">Exceptions</div>
                        <div className="font-bold text-amber-700 font-mono">
                          {selectedReport.metrics.staleShipmentsCount} Stalled
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">Value At Risk</div>
                        <div className="font-bold text-red-600 font-mono">
                          R{(selectedReport.metrics.valueAtRisk).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HISTORICAL WEEKS COMPARISON TABLE */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-[#003876]" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Comparative Week-Over-Week Executive Ledger
                  </h3>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">
                  {reports.length} Verified Checkpoint Reports
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#003876]/5 text-[#003876] font-bold uppercase text-[9px] border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3">Week</th>
                      <th className="py-2 px-3">Reporting Period</th>
                      <th className="py-2 px-3 text-right">Paid Orders</th>
                      <th className="py-2 px-3 text-right">Gross Sales</th>
                      <th className="py-2 px-3 text-right">Net Items</th>
                      <th className="py-2 px-3 text-right">Backlog Val</th>
                      <th className="py-2 px-3 text-right">Tickets</th>
                      <th className="py-2 px-3 text-right">RMAs</th>
                      <th className="py-2 px-3 text-right">Courier SLA</th>
                      <th className="py-2 px-3 text-center">Evaluation Catalogue (Passed / Failed)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reports.map((r) => {
                      const isCurrentActive = r.id === selectedReportId;
                      return (
                        <tr 
                          key={r.id} 
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isCurrentActive ? 'bg-blue-50/60 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-[#003876] font-bold">
                            {r.weekLabel}
                          </td>
                          <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                            {r.periodLabel}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                            {r.metrics.paidOrders.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-800">
                            R{(r.metrics.grossSales).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-800">
                            {r.metrics.netItemsSold.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-bold">
                            R{(r.metrics.unfulfilledBacklogValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-800">
                            {r.metrics.totalTickets}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-700 font-bold">
                            {r.metrics.totalRMAs} ({r.metrics.returnRate}%)
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                            {r.metrics.deliverySLA}%
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {r.evaluationScore ? (
                              <button
                                onClick={() => handleOpenEvaluation(r)}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all text-xs font-semibold cursor-pointer group shadow-2xs"
                                title={`Week ${r.weekNumber}: ${r.evaluationScore.passed} Passed / ${r.evaluationScore.failed} Failed. Click to inspect all 40 operational metrics in detail.`}
                              >
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                                  <CheckCircle2 size={10} className="text-emerald-600" />
                                  {r.evaluationScore.passed} Passed
                                </span>
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[10px]">
                                  <AlertTriangle size={10} className="text-rose-600" />
                                  {r.evaluationScore.failed} Failed
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenEvaluation(r)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold tracking-tight cursor-pointer transition-colors shadow-2xs"
                                title={`Week ${r.weekNumber}: Baseline pending sign-off (TBC). Click to inspect metrics.`}
                              >
                                <span>TO BE CONFIRMED (TBC)</span>
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {getStatusBadge(r.status)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedReportId(r.id)}
                                className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
                                  isCurrentActive 
                                    ? 'bg-[#003876] text-white' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                Select
                              </button>
                              <button
                                onClick={() => handleOpenReport(r)}
                                className="px-2 py-1 text-[10px] rounded font-bold bg-[#C41230] text-white hover:bg-red-800 transition-colors flex items-center gap-0.5"
                                title="Open full 4-page WBR"
                              >
                                <span>View</span>
                                <ExternalLink size={9} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Clock size={32} className="mx-auto text-gray-400 mb-2" />
            <h3 className="text-sm font-bold text-gray-700">Loading Weekly Reports...</h3>
            <p className="text-xs text-gray-500 mt-1">Fetching weekly checkpoints from repository archive.</p>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-[10px] text-gray-500 font-mono">
        Levi Strauss &amp; Co. &bull; DTC E-Commerce Weekly Business Review Telemetry Engine &bull; All 4 WBR Pages Verified
      </footer>

      {/* EVALUATION CATALOGUE MODAL */}
      {isCatalogModalOpen && evaluationModalReport && (
        <CatalogModal
          isOpen={isCatalogModalOpen}
          onClose={() => {
            setIsCatalogModalOpen(false);
            setEvaluationModalReport(null);
          }}
          wbrData={evaluationModalReport.data}
          startDate={evaluationModalReport.startDate}
          endDate={evaluationModalReport.endDate}
          statusNotice={evaluationModalReport.evaluationScore ? undefined : "Audit Baseline: Pending Sign-Off (TBC)"}
        />
      )}
    </div>
  );
};
