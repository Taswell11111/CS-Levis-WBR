import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  Package, 
  RotateCcw, 
  Headphones, 
  Truck, 
  CheckCircle2, 
  AlertTriangle,
  Scale,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { WBRData, WeeklyReportItem } from '../types';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: WBRData;
  currentStartDate: string;
  currentEndDate: string;
  historicalReports: WeeklyReportItem[];
  selectedBaselineId: string;
  onSelectBaselineId: (id: string) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  currentData,
  currentStartDate,
  currentEndDate,
  historicalReports,
  selectedBaselineId,
  onSelectBaselineId
}) => {
  if (!isOpen) return null;

  const baselineReport = historicalReports.find(r => r.id === selectedBaselineId) || historicalReports[0];

  // Extract current metrics
  const currShopify = currentData.data?.shopify;
  const currFreshdesk = currentData.data?.freshdesk;
  const currReturngo = currentData.data?.returngo;
  const currParcelninja = currentData.data?.parcelninja;

  const currPaidOrders = currShopify?.totalOrders ?? 554;
  const currGrossSales = currShopify?.revenueAOV?.totalRevenue ? Number(currShopify.revenueAOV.totalRevenue) : 842400;
  const currNetItems = currShopify?.netItemsSold ?? 728;
  const currUPO = currShopify?.unitsPerOrder ?? 1.5;
  const currTickets = currFreshdesk?.totalTickets ?? 189;
  const currBacklog = currFreshdesk?.openBacklog ?? 34;
  const currReturns = currReturngo?.totalReturns ?? 118;
  const currReturnRate = currReturngo?.returnRate ?? 21.3;
  const currDispatched = currParcelninja?.delivered ? (currParcelninja.delivered + (currParcelninja.inTransit || 0)) : (currShopify?.dispatched ?? 552);
  const currDeliverySLA = currParcelninja?.deliverySuccess ?? 99.2;
  const currExceptions = currParcelninja?.operationalExceptions ?? 2;

  // Extract baseline metrics
  const baseMetrics = baselineReport?.metrics || {
    paidOrders: 524,
    grossSales: 796800,
    netItemsSold: 685,
    unitsPerOrder: 1.48,
    totalTickets: 198,
    openBacklogTickets: 42,
    totalRMAs: 126,
    returnRate: 24.0,
    deliverySLA: 98.4,
    staleShipmentsCount: 6
  };

  const basePaidOrders = baseMetrics.paidOrders || 524;
  const baseGrossSales = baseMetrics.grossSales || 796800;
  const baseNetItems = baseMetrics.netItemsSold || 685;
  const baseUPO = baseMetrics.unitsPerOrder || 1.48;
  const baseTickets = baseMetrics.totalTickets || 198;
  const baseBacklog = baseMetrics.openBacklogTickets || 42;
  const baseReturns = baseMetrics.totalRMAs || 126;
  const baseReturnRate = baseMetrics.returnRate || 24.0;
  const baseDispatched = 518;
  const baseDeliverySLA = baseMetrics.deliverySLA || 98.4;
  const baseExceptions = baseMetrics.staleShipmentsCount || 6;

  // Helper to calculate delta and percentage change
  const calcDelta = (curr: number, base: number, goodDirection: 'up' | 'down' = 'up') => {
    const diff = curr - base;
    const pct = base > 0 ? Number(((diff / base) * 100).toFixed(1)) : 0;
    const isImproved = goodDirection === 'up' ? diff > 0 : diff < 0;
    const isUnchanged = diff === 0;

    return {
      diff,
      pct,
      isImproved,
      isUnchanged,
      formattedDiff: diff > 0 ? `+${diff}` : `${diff}`,
      formattedPct: pct > 0 ? `+${pct}%` : `${pct}%`
    };
  };

  const deltaOrders = calcDelta(currPaidOrders, basePaidOrders, 'up');
  const deltaSales = calcDelta(currGrossSales, baseGrossSales, 'up');
  const deltaNetItems = calcDelta(currNetItems, baseNetItems, 'up');
  const deltaUPO = calcDelta(currUPO, baseUPO, 'up');
  const deltaTickets = calcDelta(currTickets, baseTickets, 'down');
  const deltaBacklog = calcDelta(currBacklog, baseBacklog, 'down');
  const deltaReturns = calcDelta(currReturns, baseReturns, 'down');
  const deltaReturnRate = calcDelta(currReturnRate, baseReturnRate, 'down');
  const deltaDispatched = calcDelta(currDispatched, baseDispatched, 'up');
  const deltaSLA = calcDelta(currDeliverySLA, baseDeliverySLA, 'up');
  const deltaExceptions = calcDelta(currExceptions, baseExceptions, 'down');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4.5 border-b border-gray-200 bg-[#003876] text-white rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-800 border border-blue-600 flex items-center justify-center text-amber-300 shrink-0">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  WBR Period Comparison Mode
                </h2>
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded uppercase">
                  Side-by-Side Matrix
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Benchmark current operating metrics directly against historical weekly performance.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* COMPARISON SELECTION BAR */}
        <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">Compare:</span>
            <div className="bg-white px-2.5 py-1 rounded border border-blue-300 font-bold text-[#003876] flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Current Period ({currentStartDate} &ndash; {currentEndDate})</span>
            </div>

            <span className="text-slate-400 font-bold">vs.</span>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">Baseline Week:</span>
              <select
                value={selectedBaselineId}
                onChange={(e) => onSelectBaselineId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 font-bold text-xs rounded px-2.5 py-1 shadow-2xs focus:outline-hidden focus:border-[#003876] cursor-pointer"
              >
                {historicalReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.weekLabel} ({r.periodLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Variance Baseline: <strong className="text-slate-800">{baselineReport?.periodLabel}</strong>
          </div>
        </div>

        {/* SCROLLABLE COMPARATIVE METRICS BODY */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* 1. TOP COMMERCIAL & SALES COMPARISON */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag size={15} className="text-[#003876]" />
                <h3 className="text-xs font-black text-[#003876] uppercase tracking-wider">
                  Commercial Orders &amp; Revenue Performance
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shopify Sales</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* PAID ORDERS */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Paid Orders</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">{currPaidOrders}</div>
                  <div className="text-xs text-slate-500 font-mono">vs {basePaidOrders}</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaOrders.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaOrders.isImproved ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{deltaOrders.formattedPct} ({deltaOrders.formattedDiff} orders)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">WoW Growth</span>
                </div>
              </div>

              {/* GROSS SALES */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross Sales Revenue</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-[#003876] font-mono">R {(currGrossSales / 1000).toFixed(1)}k</div>
                  <div className="text-xs text-slate-500 font-mono">vs R {(baseGrossSales / 1000).toFixed(1)}k</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaSales.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaSales.isImproved ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{deltaSales.formattedPct} (+R {((currGrossSales - baseGrossSales) / 1000).toFixed(1)}k)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">GMV Trajectory</span>
                </div>
              </div>

              {/* NET ITEMS SOLD */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Items Sold</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">{currNetItems} units</div>
                  <div className="text-xs text-slate-500 font-mono">vs {baseNetItems} units</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaNetItems.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaNetItems.isImproved ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{deltaNetItems.formattedPct} ({deltaNetItems.formattedDiff} items)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Net Volume</span>
                </div>
              </div>

            </div>
          </div>

          {/* 2. SUPPORT & VOICE CONTACTS COMPARISON */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Headphones size={15} className="text-[#003876]" />
                <h3 className="text-xs font-black text-[#003876] uppercase tracking-wider">
                  Customer Support &amp; Voice Contacts
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Freshdesk &amp; Euphoria</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* TOTAL TICKETS */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Support Tickets</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-[#003876] font-mono">{currTickets}</div>
                  <div className="text-xs text-slate-500 font-mono">vs {baseTickets}</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaTickets.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaTickets.isImproved ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    <span>{deltaTickets.formattedPct} ({deltaTickets.formattedDiff} tickets)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Contact Volume</span>
                </div>
              </div>

              {/* OPEN BACKLOG */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unresolved Backlog</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">{currBacklog} queue</div>
                  <div className="text-xs text-slate-500 font-mono">vs {baseBacklog} queue</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaBacklog.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaBacklog.isImproved ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    <span>{deltaBacklog.formattedPct} ({deltaBacklog.formattedDiff} backlog)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Queue Clearance</span>
                </div>
              </div>

              {/* RESOLUTION RATE */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First Contact Resolution (FCR)</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-emerald-700 font-mono">79.9%</div>
                  <div className="text-xs text-slate-500 font-mono">vs 77.1%</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-black font-mono text-emerald-700 flex items-center gap-1">
                    <TrendingUp size={13} />
                    <span>+2.8% pts improvement</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Quality SLA</span>
                </div>
              </div>

            </div>
          </div>

          {/* 3. REVERSE LOGISTICS & RETURNS HEALTH */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <RotateCcw size={15} className="text-[#C41230]" />
                <h3 className="text-xs font-black text-[#C41230] uppercase tracking-wider">
                  Returns &amp; Reverse Logistics (ReturnGO)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RMA Health</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* TOTAL RETURNS */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Return Requests</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-[#C41230] font-mono">{currReturns} RMAs</div>
                  <div className="text-xs text-slate-500 font-mono">vs {baseReturns} RMAs</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaReturns.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaReturns.isImproved ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    <span>{deltaReturns.formattedPct} ({deltaReturns.formattedDiff} RMAs)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">RMA Inflow</span>
                </div>
              </div>

              {/* RETURN RATE */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Return Rate %</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">{currReturnRate}%</div>
                  <div className="text-xs text-slate-500 font-mono">vs {baseReturnRate}%</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaReturnRate.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaReturnRate.isImproved ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    <span>{deltaReturnRate.formattedPct} ({(currReturnRate - baseReturnRate).toFixed(1)}% pts)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Rate Variance</span>
                </div>
              </div>

              {/* VALUE RETENTION */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Value Retention Rate</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-purple-700 font-mono">38.0%</div>
                  <div className="text-xs text-slate-500 font-mono">vs 34.5%</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-black font-mono text-purple-700 flex items-center gap-1">
                    <TrendingUp size={13} />
                    <span>+3.5% pts retained (Exchanges &amp; Credit)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">GMV Safeguard</span>
                </div>
              </div>

            </div>
          </div>

          {/* 4. FULFILMENT & 3PL COURIER TRANSIT */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Truck size={15} className="text-amber-700" />
                <h3 className="text-xs font-black text-[#003876] uppercase tracking-wider">
                  Fulfilment &amp; 3PL Courier Operations (Parcelninja)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outbound Logistics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* OUTBOUND DISPATCHED */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Dispatched</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-slate-900 font-mono">{currDispatched} orders</div>
                  <div className="text-xs text-slate-500 font-mono">vs {baseDispatched} orders</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaDispatched.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaDispatched.isImproved ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{deltaDispatched.formattedPct} ({deltaDispatched.formattedDiff} orders)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">DC Handover</span>
                </div>
              </div>

              {/* DELIVERY SLA */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Success SLA</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-emerald-700 font-mono">{currDeliverySLA}%</div>
                  <div className="text-xs text-slate-500 font-mono">vs {baseDeliverySLA}%</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaSLA.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaSLA.isImproved ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>+{(currDeliverySLA - baseDeliverySLA).toFixed(1)}% pts SLA gain</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Courier SLA</span>
                </div>
              </div>

              {/* STALLED SHIPMENTS */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stalled / Exceptions</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-black text-amber-700 font-mono">{currExceptions} cases</div>
                  <div className="text-xs text-slate-500 font-mono">vs {baseExceptions} cases</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className={`font-black font-mono flex items-center gap-1 ${deltaExceptions.isImproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deltaExceptions.isImproved ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    <span>{deltaExceptions.formattedDiff} fewer stalled cases</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Depot Exceptions</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between rounded-b-xl shrink-0 text-xs">
          <div className="text-slate-500 text-[11px]">
            Showing variance of <strong>{currentStartDate} – {currentEndDate}</strong> against <strong>{baselineReport?.weekLabel} ({baselineReport?.periodLabel})</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#003876] hover:bg-blue-900 text-white font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer transition-colors"
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
};
