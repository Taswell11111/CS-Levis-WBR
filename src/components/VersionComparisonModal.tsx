import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  DollarSign, 
  Package, 
  Truck, 
  RotateCcw, 
  Headphones, 
  Clock, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { WeeklyReportItem } from '../types';

interface VersionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: WeeklyReportItem[];
  initialReportId?: string;
  onSelectForCombinedPDF?: (reportIds: string[]) => void;
}

export const VersionComparisonModal: React.FC<VersionComparisonModalProps> = ({
  isOpen,
  onClose,
  reports,
  initialReportId,
  onSelectForCombinedPDF
}) => {
  // Find report to initialize with
  const initialReport = reports.find(r => r.id === initialReportId) || reports[0];
  const initialBaseId = initialReport?.baseReportId || (initialReport?.id ? initialReport.id.replace(/-v\d+$/, '') : '');

  // State: selected reporting week / base report group
  const [selectedBaseId, setSelectedBaseId] = useState<string>(initialBaseId || 'week-41-2026');

  // Group all available reports by base week/reporting period
  const weekGroups = useMemo(() => {
    const map = new Map<string, { baseId: string; label: string; period: string; versions: WeeklyReportItem[] }>();
    
    reports.forEach(r => {
      const bId = r.baseReportId || (r.id ? r.id.replace(/-v\d+$/, '') : `week-${r.weekNumber || 'unknown'}`);
      if (!map.has(bId)) {
        map.set(bId, {
          baseId: bId,
          label: r.weekLabel,
          period: r.periodLabel,
          versions: []
        });
      }
      map.get(bId)!.versions.push(r);
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      // Sort versions ascending (v1, v2, v3...)
      versions: g.versions.sort((a, b) => (a.version || 1) - (b.version || 1))
    }));
  }, [reports]);

  // Current active group
  const currentGroup = weekGroups.find(g => g.baseId === selectedBaseId) || weekGroups[0];
  const availableVersions = currentGroup?.versions || [];

  // State: Version A (Baseline) and Version B (Comparison)
  const [versionAId, setVersionAId] = useState<string>(() => {
    if (availableVersions.length >= 2) return availableVersions[0].id;
    return availableVersions[0]?.id || reports[0]?.id || '';
  });

  const [versionBId, setVersionBId] = useState<string>(() => {
    if (availableVersions.length >= 2) return availableVersions[1].id;
    return availableVersions[availableVersions.length - 1]?.id || reports[1]?.id || reports[0]?.id || '';
  });

  // When changing base week group, update selected versions
  const handleSelectGroup = (newBaseId: string) => {
    setSelectedBaseId(newBaseId);
    const grp = weekGroups.find(g => g.baseId === newBaseId);
    if (grp && grp.versions.length >= 2) {
      setVersionAId(grp.versions[0].id);
      setVersionBId(grp.versions[grp.versions.length - 1].id);
    } else if (grp && grp.versions.length > 0) {
      setVersionAId(grp.versions[0].id);
      setVersionBId(grp.versions[0].id);
    }
  };

  // Swap Version A and Version B
  const handleSwapVersions = () => {
    const temp = versionAId;
    setVersionAId(versionBId);
    setVersionBId(temp);
  };

  if (!isOpen) return null;

  const reportA = reports.find(r => r.id === versionAId) || availableVersions[0] || reports[0];
  const reportB = reports.find(r => r.id === versionBId) || availableVersions[1] || availableVersions[0] || reports[0];

  // Helper function to calculate variance and styling
  const calculateVariance = (
    valA: number | null | undefined, 
    valB: number | null | undefined, 
    isPercentage: boolean = false,
    invertSentiment: boolean = false // true if lower is better (e.g. unfulfilled backlog, ART hours, tickets)
  ) => {
    const numA = Number(valA || 0);
    const numB = Number(valB || 0);
    const diff = numB - numA;

    if (numA === numB) {
      return {
        diff: 0,
        diffFormatted: '0.0',
        pctFormatted: '0.0%',
        isPositive: false,
        isZero: true,
        sentiment: 'neutral'
      };
    }

    const pct = numA !== 0 ? ((diff / Math.abs(numA)) * 100).toFixed(1) : diff > 0 ? '+100%' : '-100%';
    const diffFormatted = isPercentage 
      ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
      : `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString()}`;

    // Good performance
    const isGood = invertSentiment ? diff < 0 : diff > 0;

    return {
      diff,
      diffFormatted,
      pctFormatted: `${diff > 0 ? '+' : ''}${pct}%`,
      isPositive: diff > 0,
      isZero: false,
      sentiment: isGood ? 'positive' : 'negative'
    };
  };

  // Format currency
  const fmtCurrency = (val: number | null | undefined) => `R${Number(val || 0).toLocaleString()}`;

  // Metric comparisons configuration
  const metricGroups = [
    {
      title: 'Commercial & Revenue Velocity',
      icon: <DollarSign size={15} className="text-emerald-700" />,
      items: [
        {
          name: 'Paid Net Orders',
          unit: 'orders',
          valA: reportA.metrics.paidOrders,
          valB: reportB.metrics.paidOrders,
          format: (v: number) => v.toLocaleString(),
          variance: calculateVariance(reportA.metrics.paidOrders, reportB.metrics.paidOrders)
        },
        {
          name: 'Gross Sales',
          unit: 'ZAR',
          valA: reportA.metrics.grossSales,
          valB: reportB.metrics.grossSales,
          format: fmtCurrency,
          variance: calculateVariance(reportA.metrics.grossSales, reportB.metrics.grossSales)
        },
        {
          name: 'Net Items Sold',
          unit: 'units',
          valA: reportA.metrics.netItemsSold,
          valB: reportB.metrics.netItemsSold,
          format: (v: number) => v.toLocaleString(),
          variance: calculateVariance(reportA.metrics.netItemsSold, reportB.metrics.netItemsSold)
        },
        {
          name: 'Units Per Order (UPO)',
          unit: 'ratio',
          valA: reportA.metrics.unitsPerOrder,
          valB: reportB.metrics.unitsPerOrder,
          format: (v: number) => Number(v || 0).toFixed(2),
          variance: calculateVariance(reportA.metrics.unitsPerOrder, reportB.metrics.unitsPerOrder)
        },
        {
          name: 'Average Order Value (AOV)',
          unit: 'ZAR',
          valA: reportA.metrics.paidOrders > 0 ? Math.round(reportA.metrics.grossSales / reportA.metrics.paidOrders) : 0,
          valB: reportB.metrics.paidOrders > 0 ? Math.round(reportB.metrics.grossSales / reportB.metrics.paidOrders) : 0,
          format: fmtCurrency,
          variance: calculateVariance(
            reportA.metrics.paidOrders > 0 ? Math.round(reportA.metrics.grossSales / reportA.metrics.paidOrders) : 0,
            reportB.metrics.paidOrders > 0 ? Math.round(reportB.metrics.grossSales / reportB.metrics.paidOrders) : 0
          )
        }
      ]
    },
    {
      title: 'Warehouse Fulfilment & Carrier Logistics',
      icon: <Truck size={15} className="text-[#003876]" />,
      items: [
        {
          name: 'Fulfilled Orders',
          unit: 'orders',
          valA: reportA.metrics.fulfilledOrders,
          valB: reportB.metrics.fulfilledOrders,
          format: (v: number) => v.toLocaleString(),
          variance: calculateVariance(reportA.metrics.fulfilledOrders, reportB.metrics.fulfilledOrders)
        },
        {
          name: 'Unfulfilled Orders Queue',
          unit: 'orders',
          valA: reportA.metrics.unfulfilledOrders,
          valB: reportB.metrics.unfulfilledOrders,
          format: (v: number) => v.toLocaleString(),
          variance: calculateVariance(reportA.metrics.unfulfilledOrders, reportB.metrics.unfulfilledOrders, false, true)
        },
        {
          name: 'Unfulfilled Backlog Value',
          unit: 'ZAR',
          valA: reportA.metrics.unfulfilledBacklogValue,
          valB: reportB.metrics.unfulfilledBacklogValue,
          format: fmtCurrency,
          variance: calculateVariance(reportA.metrics.unfulfilledBacklogValue, reportB.metrics.unfulfilledBacklogValue, false, true)
        },
        {
          name: 'Courier Delivery SLA %',
          unit: '%',
          valA: reportA.metrics.deliverySLA,
          valB: reportB.metrics.deliverySLA,
          format: (v: number) => `${v}%`,
          variance: calculateVariance(reportA.metrics.deliverySLA, reportB.metrics.deliverySLA, true)
        },
        {
          name: 'Stale Shipments Exceptions',
          unit: 'shipments',
          valA: reportA.metrics.staleShipmentsCount,
          valB: reportB.metrics.staleShipmentsCount,
          format: (v: number) => `${v}`,
          variance: calculateVariance(reportA.metrics.staleShipmentsCount, reportB.metrics.staleShipmentsCount, false, true)
        }
      ]
    },
    {
      title: 'Customer Experience & Reverse Logistics',
      icon: <Headphones size={15} className="text-purple-700" />,
      items: [
        {
          name: 'Freshdesk Total Tickets',
          unit: 'tickets',
          valA: reportA.metrics.totalTickets,
          valB: reportB.metrics.totalTickets,
          format: (v: number) => v.toLocaleString(),
          variance: calculateVariance(reportA.metrics.totalTickets, reportB.metrics.totalTickets, false, true)
        },
        {
          name: 'Open Support Backlog',
          unit: 'tickets',
          valA: reportA.metrics.openBacklogTickets,
          valB: reportB.metrics.openBacklogTickets,
          format: (v: number) => `${v} tkts`,
          variance: calculateVariance(reportA.metrics.openBacklogTickets, reportB.metrics.openBacklogTickets, false, true)
        },
        {
          name: 'Average Resolution Time (ART)',
          unit: 'hours',
          valA: reportA.metrics.artHours,
          valB: reportB.metrics.artHours,
          format: (v: number) => `${v}h`,
          variance: calculateVariance(reportA.metrics.artHours, reportB.metrics.artHours, false, true)
        },
        {
          name: 'Total ReturnGO RMAs',
          unit: 'returns',
          valA: reportA.metrics.totalRMAs,
          valB: reportB.metrics.totalRMAs,
          format: (v: number) => `${v} RMAs`,
          variance: calculateVariance(reportA.metrics.totalRMAs, reportB.metrics.totalRMAs, false, true)
        },
        {
          name: 'Return Rate %',
          unit: '%',
          valA: reportA.metrics.returnRate,
          valB: reportB.metrics.returnRate,
          format: (v: number) => `${v}%`,
          variance: calculateVariance(reportA.metrics.returnRate, reportB.metrics.returnRate, true, true)
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="bg-[#003876] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-[#C41230] text-white text-[11px] font-black tracking-widest px-2.5 py-1 rounded uppercase shadow-xs">
              LEVI STRAUSS &amp; CO.
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                  Version Comparison Matrix
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-800/80 text-white border border-blue-600">
                  Side-by-Side Audit Ledger
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Metric Variance Comparison &bull; {currentGroup?.label}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* VERSION SELECTOR TOOLBAR */}
        <div className="bg-slate-50 border-b border-gray-200 p-4 shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* WEEK SELECTOR */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={14} className="text-[#003876]" />
              Report Week:
            </span>
            <select
              value={selectedBaseId}
              onChange={(e) => handleSelectGroup(e.target.value)}
              className="py-1.5 px-3 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 shadow-2xs focus:ring-1 focus:ring-[#003876] cursor-pointer"
            >
              {weekGroups.map(grp => (
                <option key={grp.baseId} value={grp.baseId}>
                  {grp.label} ({grp.period}) &bull; {grp.versions.length} {grp.versions.length === 1 ? 'version' : 'versions'}
                </option>
              ))}
            </select>
          </div>

          {/* DUAL VERSION SELECTORS */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* VERSION A (BASELINE) */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-gray-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-gray-500 pl-1">Baseline (A):</span>
              <select
                value={versionAId}
                onChange={(e) => setVersionAId(e.target.value)}
                className="py-1 px-2.5 bg-blue-50/70 border border-blue-200 rounded text-xs font-bold text-[#003876] font-mono cursor-pointer"
              >
                {availableVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    '{v.versionPrefix || 'v1'}' {v.weekLabel} {v.isLatestVersion ? '(Latest)' : '(Past)'}
                  </option>
                ))}
              </select>
            </div>

            {/* SWAP BUTTON */}
            <button
              type="button"
              onClick={handleSwapVersions}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer border border-gray-300"
              title="Swap Baseline (A) and Comparison (B)"
            >
              <ArrowLeftRight size={14} />
            </button>

            {/* VERSION B (COMPARISON) */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-gray-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-gray-500 pl-1">Comparison (B):</span>
              <select
                value={versionBId}
                onChange={(e) => setVersionBId(e.target.value)}
                className="py-1 px-2.5 bg-emerald-50 border border-emerald-300 rounded text-xs font-bold text-emerald-900 font-mono cursor-pointer"
              >
                {availableVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    '{v.versionPrefix || 'v1'}' {v.weekLabel} {v.isLatestVersion ? '(Latest)' : '(Past)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* MODAL BODY / SCROLLABLE COMPARISON */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100 space-y-6">

          {/* DUAL VERSION BANNER HERO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VERSION A CARD */}
            <div className="bg-white rounded-xl border-2 border-blue-200 p-4.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-xs font-black font-mono bg-blue-100 text-[#003876] border border-blue-300">
                  Baseline: '{reportA.versionPrefix || 'v1'}'
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  reportA.isLatestVersion ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {reportA.isLatestVersion ? 'Latest Active' : 'Archived Historical'}
                </span>
              </div>
              <h3 className="text-base font-black text-gray-900">
                '{reportA.versionPrefix || 'v1'}' {reportA.weekLabel}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed font-sans line-clamp-2">
                {reportA.summaryNote}
              </p>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span>Published: {new Date(reportA.publishedAt || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span>Sign-Off: <strong className="text-gray-700">{reportA.signOffBy || 'Operations Lead'}</strong></span>
              </div>
            </div>

            {/* VERSION B CARD */}
            <div className="bg-white rounded-xl border-2 border-emerald-300 p-4.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-xs font-black font-mono bg-emerald-100 text-emerald-900 border border-emerald-400">
                  Comparison: '{reportB.versionPrefix || 'v1'}'
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  reportB.isLatestVersion ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {reportB.isLatestVersion ? 'Latest Active' : 'Archived Historical'}
                </span>
              </div>
              <h3 className="text-base font-black text-gray-900">
                '{reportB.versionPrefix || 'v1'}' {reportB.weekLabel}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed font-sans line-clamp-2">
                {reportB.summaryNote}
              </p>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span>Published: {new Date(reportB.publishedAt || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span>Sign-Off: <strong className="text-gray-700">{reportB.signOffBy || 'Operations Lead'}</strong></span>
              </div>
            </div>
          </div>

          {/* SIDE-BY-SIDE METRIC COMPARISON TABLES */}
          <div className="space-y-5">
            {metricGroups.map((group, gIdx) => (
              <div key={gIdx} className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="px-4.5 py-3 bg-slate-50 border-b border-gray-200 flex items-center gap-2">
                  {group.icon}
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    {group.title}
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-slate-100/70 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-4 w-1/3">Metric Dimension</th>
                        <th className="py-2.5 px-4 text-right font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#003876] font-bold mr-1">
                            '{reportA.versionPrefix || 'v1'}'
                          </span>
                          Baseline
                        </th>
                        <th className="py-2.5 px-4 text-right font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold mr-1">
                            '{reportB.versionPrefix || 'v1'}'
                          </span>
                          Comparison
                        </th>
                        <th className="py-2.5 px-4 text-right w-1/4">Variance / &Delta; Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {group.items.map((item, mIdx) => (
                        <tr key={mIdx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-sans font-bold text-gray-800">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-4 text-right text-gray-900 font-semibold">
                            {item.format(item.valA as any)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-gray-900 font-bold">
                            {item.format(item.valB as any)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-sans">
                            {item.variance.isZero ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono text-gray-500 bg-gray-100">
                                <Minus size={11} />
                                <span>No Variance</span>
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono font-bold ${
                                item.variance.sentiment === 'positive'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {item.variance.isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                <span>{item.variance.diffFormatted}</span>
                                <span className="opacity-80">({item.variance.pctFormatted})</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* AUDIT & OPERATIONAL NARRATIVE */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4.5 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#003876] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#C41230]" />
              Comparative Audit Intelligence Note
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed font-sans">
              Comparing <strong>'{reportA.versionPrefix || 'v1'}'</strong> against <strong>'{reportB.versionPrefix || 'v1'}'</strong> for 
              {reportA.weekLabel}: Paid order volume shifted by <strong>{calculateVariance(reportA.metrics.paidOrders, reportB.metrics.paidOrders).diffFormatted} orders</strong> 
              ({calculateVariance(reportA.metrics.paidOrders, reportB.metrics.paidOrders).pctFormatted}), yielding a 
              <strong> {fmtCurrency(calculateVariance(reportA.metrics.grossSales, reportB.metrics.grossSales).diff)} variance</strong> in gross sales. 
              Courier delivery SLA recorded a <strong>{calculateVariance(reportA.metrics.deliverySLA, reportB.metrics.deliverySLA, true).diffFormatted} movement</strong>.
              Both versions remain preserved in the Weekly Reports Archive with distinct audit history stamps.
            </p>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500 font-mono">
            Comparing '{reportA.versionPrefix || 'v1'}' vs '{reportB.versionPrefix || 'v1'}' &bull; {reportA.periodLabel}
          </div>

          <div className="flex items-center gap-2">
            {onSelectForCombinedPDF && (
              <button
                type="button"
                onClick={() => {
                  onSelectForCombinedPDF([reportA.id, reportB.id]);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#003876] hover:bg-[#002855] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Layers size={13} />
                <span>Select Both for Combined PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Close Comparison
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
