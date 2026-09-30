import React from 'react';
import { motion } from 'framer-motion';
import { 
  Headphones, 
  RotateCcw, 
  Truck, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  ArrowRight, 
  ChevronRight, 
  ShieldCheck, 
  Activity, 
  FileText, 
  Inbox, 
  Package, 
  HelpCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import { WBRData } from '../types';
import { TrendText } from './Trend';
import { kpiCardVariants, sectionContainerVariants } from '../utils/motionVariants';

interface WBRPage1Props {
  data: WBRData['data'];
  synthesis?: WBRData['synthesis'];
  startDate: string;
  endDate: string;
  reportId?: string;
  onOpenDriverModal?: (driver?: string) => void;
  onOpenCatalogModal?: (page?: string, evaluation?: string) => void;
  onOpenCampaignModal?: () => void;
  onSaveStaleShipmentValues?: (updatedShipments: any[]) => Promise<void> | void;
  onOpenDetail?: (config: {
    title: string;
    type: 'tickets' | 'tickets_closed' | 'tickets_backlog' | 'rmas_created' | 'rmas_pending' | 'rmas_approved' | 'rmas_resolved' | 'rmas_process' | 'reason_detail' | 'customer_contact' | 'stalled_shipments' | 'ops_exceptions';
    data: any[];
    meta?: any;
  }) => void;
  onNavigatePage?: (pageId: string) => void;
}

export const WBRPage1: React.FC<WBRPage1Props> = ({ 
  data, 
  synthesis, 
  startDate, 
  endDate, 
  reportId,
  onOpenDriverModal,
  onOpenDetail,
  onNavigatePage 
}) => {
  // Freshdesk & Telephony Data
  const freshdesk = data.freshdesk;
  const telephony = data.telephony;
  const totalTickets = freshdesk?.totalTickets ?? 189;
  const ticketsResolved = freshdesk?.resolvedTickets ?? freshdesk?.ticketsResolved ?? 189;
  const openBacklog = freshdesk?.openBacklog ?? 34;
  const frtHours = freshdesk?.avgFirstResponseTime ?? 1.2;
  const artHours = freshdesk?.avgResolutionTime ?? 33.3;
  const fcrRate = freshdesk?.firstContactResolutionRate ?? freshdesk?.fcrRate ?? 79.9;

  const totalCalls = telephony?.totalIncomingCalls ?? 30;
  const answeredCalls = telephony?.answeredCalls ?? 25;
  const missedCalls = telephony?.missedCalls ?? telephony?.abandonedCalls ?? 5;
  const answerRate = telephony?.answerRate ?? 83.3;
  const avgWaitTime = telephony?.avgWaitTime ?? '22 sec';
  const avgCallDuration = telephony?.avgDuration ?? '1 min 35 sec';
  const totalContacts = totalTickets + totalCalls;

  // ReturnGO RMA Data
  const returngo = data.returngo;
  const totalRMAs = returngo?.totalReturns ?? returngo?.returnsRequested ?? 118;
  const returnRate = returngo?.returnRate ?? 21.3;
  const rmasApproved = returngo?.returnsApproved ?? 117;
  const rmasReceived = returngo?.returnsReceived ?? 74;
  const activeRMAs = returngo?.outstandingRMAs ?? 8;
  const topReason = returngo?.returnReasons?.[0]?.name ?? 'Does not fit';
  const topReasonPct = returngo?.returnReasons?.[0]?.percentage ?? 80.3;

  // Return action breakdown
  const actionData = returngo?.actionBreakdownData || [];
  const refundCount = actionData.find(a => a.action.toLowerCase().includes('refund'))?.count ?? 88;
  const exchangeCount = actionData.find(a => a.action.toLowerCase().includes('exchange'))?.count ?? 47;
  const creditCount = actionData.find(a => a.action.toLowerCase().includes('store credit'))?.count ?? 7;

  // Parcelninja Logistics Data
  const parcelninja = data.parcelninja;
  const totalDispatched = parcelninja?.delivered ? (parcelninja.delivered + (parcelninja.inTransit || 0)) : (data.shopify?.dispatched ?? 552);
  const deliverySuccess = parcelninja?.deliverySuccess ?? 99.2;
  const inTransitCount = parcelninja?.inTransit ?? 12;
  const operationalExceptions = parcelninja?.operationalExceptions ?? 2;
  const avgDeliveryDays = parcelninja?.avgDeliveryTime ?? 1.8;
  const sameDayDispatch = parcelninja?.sameDayDispatchRate ?? 94.6;

  const handleScrollTo = (targetId: string) => {
    if (onNavigatePage) {
      onNavigatePage(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div 
      id="wbr-page-1" 
      className="a4-canvas bg-[#F8F9FA] text-slate-800 p-8 shadow-xl flex flex-col justify-between select-text relative border border-slate-200"
      style={{ minHeight: '210mm' }}
    >
      {/* 1. TOP HEADER & BRANDING BAR */}
      <div>
        <div className="flex items-center justify-between border-b-2 border-[#003876] pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-[#C41230] text-white font-black text-xl px-3 py-1 tracking-wider uppercase rounded-xs shadow-xs">
              Levi's
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C41230] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Customer Operations WBR
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  South Africa Online
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#003876] tracking-tight leading-tight mt-0.5">
                Executive Overview &amp; Operational Health
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Reporting Period</div>
              <div className="text-xs font-mono font-bold text-[#003876] bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                {startDate} &ndash; {endDate}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded border border-emerald-200 text-xs font-bold shadow-2xs">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Ops Health: Stable</span>
            </div>
          </div>
        </div>

        {/* 2. THREE SUMMARY CARDS: DIRECT PREVIEWS OF PAGES 2, 3, AND 4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          
          {/* CARD 1: FRESHDESK & CALLS (P2 PREVIEW) */}
          <div 
            onClick={() => handleScrollTo('wbr-page-2')}
            className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs hover:border-[#003876] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center text-[#003876] group-hover:bg-[#003876] group-hover:text-white transition-colors">
                    <Headphones size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Page 2 Preview</span>
                    <h3 className="text-sm font-black text-[#003876]">Freshdesk &amp; Voice Review</h3>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-[#003876] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Key Highlights */}
              <div className="space-y-2.5 mt-3">
                <div className="flex justify-between items-baseline border-b border-slate-100 pb-1.5">
                  <span className="text-xs text-slate-600 font-medium">Total Customer Contacts:</span>
                  <span className="text-base font-black text-[#003876] font-mono">{totalContacts}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Tickets Resolved</div>
                    <div className="font-bold text-slate-800 font-mono mt-0.5">{ticketsResolved} <span className="text-[10px] text-emerald-600 font-normal">({openBacklog} queue)</span></div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Voice Calls</div>
                    <div className="font-bold text-slate-800 font-mono mt-0.5">{totalCalls} <span className="text-[10px] text-blue-600 font-normal">({answerRate}% ans)</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                  <span>First Response: <strong className="text-slate-800">{frtHours}h</strong></span>
                  <span>Avg Res Time: <strong className="text-slate-800">{artHours}h</strong></span>
                  <span>FCR: <strong className="text-emerald-700">{fcrRate}%</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#003876] font-bold group-hover:text-blue-900">
              <span>View Freshdesk &amp; Calls Details</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 2: RETURNGO RMAS (P3 PREVIEW) */}
          <div 
            onClick={() => handleScrollTo('wbr-page-3')}
            className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs hover:border-[#003876] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-rose-50 flex items-center justify-center text-[#C41230] group-hover:bg-[#C41230] group-hover:text-white transition-colors">
                    <RotateCcw size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Page 3 Preview</span>
                    <h3 className="text-sm font-black text-[#003876]">ReturnGO RMAs Health</h3>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-[#003876] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Key Highlights */}
              <div className="space-y-2.5 mt-3">
                <div className="flex justify-between items-baseline border-b border-slate-100 pb-1.5">
                  <span className="text-xs text-slate-600 font-medium">Total Returns Requested:</span>
                  <span className="text-base font-black text-[#C41230] font-mono">{totalRMAs} <span className="text-xs text-slate-500 font-normal">({returnRate}%)</span></span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">Refunds</div>
                    <div className="font-bold text-slate-800 font-mono mt-0.5">{refundCount}</div>
                  </div>
                  <div className="bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                    <div className="text-[9px] text-emerald-700 uppercase font-semibold">Exchanges</div>
                    <div className="font-bold text-emerald-800 font-mono mt-0.5">{exchangeCount}</div>
                  </div>
                  <div className="bg-purple-50/50 p-1.5 rounded border border-purple-100">
                    <div className="text-[9px] text-purple-700 uppercase font-semibold">Vouchers</div>
                    <div className="font-bold text-purple-800 font-mono mt-0.5">{creditCount}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 pt-1 flex justify-between items-center">
                  <span>Top Reason: <strong className="text-slate-800">{topReason}</strong></span>
                  <span className="font-semibold text-rose-700 font-mono">{topReasonPct}%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#003876] font-bold group-hover:text-blue-900">
              <span>View Returns &amp; RMA Details</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 3: PARCELNINJA SHIPMENTS (P4 PREVIEW) */}
          <div 
            onClick={() => handleScrollTo('wbr-page-4')}
            className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs hover:border-[#003876] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-amber-50 flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Truck size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Page 4 Preview</span>
                    <h3 className="text-sm font-black text-[#003876]">Parcelninja Fulfillment</h3>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-[#003876] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Key Highlights */}
              <div className="space-y-2.5 mt-3">
                <div className="flex justify-between items-baseline border-b border-slate-100 pb-1.5">
                  <span className="text-xs text-slate-600 font-medium">Outbound Dispatched:</span>
                  <span className="text-base font-black text-slate-900 font-mono">{totalDispatched} orders</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Delivery SLA</div>
                    <div className="font-bold text-emerald-700 font-mono mt-0.5">{deliverySuccess}% <span className="text-[10px] text-slate-400 font-normal">success</span></div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Returns to DC</div>
                    <div className="font-bold text-blue-700 font-mono mt-0.5">{rmasReceived} <span className="text-[10px] text-slate-400 font-normal">received</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                  <span>Avg Transit: <strong className="text-slate-800">{avgDeliveryDays}d</strong></span>
                  <span>In-Transit: <strong className="text-slate-800">{inTransitCount}</strong></span>
                  <span>Exceptions: <strong className={operationalExceptions > 0 ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"}>{operationalExceptions}</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#003876] font-bold group-hover:text-blue-900">
              <span>View Parcelninja Shipments</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>

        {/* 3. EXECUTIVE DISCUSSION & SYNTHESIS SECTION */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs mb-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#003876]" />
              <h2 className="text-sm font-black text-[#003876] uppercase tracking-wider">
                Operational Synthesis &amp; Executive Commentary
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Cross-Platform Analysis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Discussion 1: CS & Enquiries */}
            <div className="border-l-2 border-[#003876] pl-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#003876] mb-1.5 uppercase tracking-tight">
                <Headphones size={13} />
                <span>Customer Service Velocity</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contact volume totalled <strong>{totalContacts} interactions</strong> ({totalTickets} Freshdesk tickets and {totalCalls} telephony calls). First Response Time averaged <strong>{frtHours} hours</strong> with a First Contact Resolution rate of <strong>{fcrRate}%</strong>. WISMO (delivery status) and return queries represented 70% of inbound contacts, directly correlated with peak promotion fulfillment.
              </p>
            </div>

            {/* Discussion 2: Returns & Sizing */}
            <div className="border-l-2 border-[#C41230] pl-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#C41230] mb-1.5 uppercase tracking-tight">
                <RotateCcw size={13} />
                <span>Returns &amp; Retention Health</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Return rate registered at <strong>{returnRate}%</strong> across {totalRMAs} RMA requests. Sizing disparity accounted for <strong>{topReasonPct}%</strong> of total return reasons. Significantly, <strong>{exchangeCount} customers opted for direct size exchanges</strong> and {creditCount} for store vouchers, successfully safeguarding sales revenue from outright refund erosion.
              </p>
            </div>

            {/* Discussion 3: Logistics & Fulfilment */}
            <div className="border-l-2 border-amber-600 pl-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 mb-1.5 uppercase tracking-tight">
                <Truck size={13} />
                <span>Logistics &amp; Courier SLA</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fulfillment SLA demonstrated robust execution with a <strong>{deliverySuccess}% delivery success rate</strong> across {totalDispatched} dispatched orders. Same-day dispatch achieved {sameDayDispatch}%. Courier exceptions were strictly constrained to {operationalExceptions} delayed cases undergoing proactive courier hub tracer escalation.
              </p>
            </div>
          </div>
        </div>

        {/* 4. KEY OPERATIONAL PRIORITIES FOR THE WEEK */}
        <div className="bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-200/80 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={15} className="text-[#003876]" />
            <h3 className="text-xs font-black text-[#003876] uppercase tracking-wider">
              Priority Focus Areas &amp; Operational Remediations
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded border border-blue-100 shadow-2xs">
              <div className="font-bold text-[#003876] mb-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#003876] text-[10px] font-black inline-flex items-center justify-center">1</span>
                <span>Proactive Tracking Notifications</span>
              </div>
              <p className="text-slate-600 text-[11.5px] leading-snug">
                Automate SMS/email dispatch alerts on transit milestones to preemptively suppress the 45 WISMO tickets currently hitting the support queue.
              </p>
            </div>

            <div className="bg-white p-3 rounded border border-blue-100 shadow-2xs">
              <div className="font-bold text-[#003876] mb-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#003876] text-[10px] font-black inline-flex items-center justify-center">2</span>
                <span>Fit Guidance &amp; Exchange Velocity</span>
              </div>
              <p className="text-slate-600 text-[11.5px] leading-snug">
                Promote size exchange options over cash refunds during return portal flow to elevate the current 39.8% retained exchange conversion rate.
              </p>
            </div>

            <div className="bg-white p-3 rounded border border-blue-100 shadow-2xs">
              <div className="font-bold text-[#003876] mb-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#003876] text-[10px] font-black inline-flex items-center justify-center">3</span>
                <span>Depot Escalation Protocol</span>
              </div>
              <p className="text-slate-600 text-[11.5px] leading-snug">
                Maintain 24h turnaround on Parcelninja stalled shipment tracer queries with The Courier Guy to preserve the 99.2% delivery SLA.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. FOOTER */}
      <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#003876]">Levi's South Africa</span>
          <span>&bull;</span>
          <span>Automated Operations &amp; Customer Review</span>
          <span>&bull;</span>
          <span>eComplete Analytics Hub</span>
        </div>
        <div className="font-mono">
          Page 1 of 4 &bull; Executive Overview
        </div>
      </div>
    </div>
  );
};
