export interface CampaignRevenueItem {
  campaign: string;
  revenue: number;
  orders: number;
}

export interface DiscountCodeItem {
  code: string;
  orders: number;
  amount?: number | null;
}

export interface DailyAgingBucket {
  day: number;
  label: string;
  dateLabel?: string;
  orders: number;
}

export interface UnfulfilledOrderAging {
  days1to2: number | null;
  days3to5: number | null;
  days5plus: number | null;
  day1?: number | null;
  day2?: number | null;
  day3?: number | null;
  day4?: number | null;
  day5?: number | null;
  day6?: number | null;
  day7Plus?: number | null;
  dailyBuckets?: DailyAgingBucket[];
}

export interface ShopifyRevenueAOV {
  totalRevenue: number | null;
  grossSales: number | null;
  totalDiscountsGiven: number | null;
  netSales: number | null;
  aov: number | null;
  aovWoW: number | null;
  revenueWoW: number | null;
  grossSalesWoW?: number | null;
  netSalesWoW?: number | null;
}

export interface ShopifyCustomerInsights {
  newCustomerOrders: number | null;
  returningCustomerOrders: number | null;
  newCustomerSplitPct: number | null;
  returningCustomerSplitPct: number | null;
  repeatPurchaseRate: number | null;
  newCustomerOrdersWoW: number | null;
  returningCustomerOrdersWoW: number | null;
}

export interface CampaignDiscountData {
  campaignName: string | null;
  discountCode: string | null;
  discountedOrders: number | null;
  discountRate: number | null; // percentage of total orders
  totalDiscountAmount: number | null;
  avgDiscountPerOrder: number | null;
  campaignWoW: number | null;
  topDiscountCodes?: DiscountCodeItem[];
  noDiscountOrders?: number | null;
  campaignRevenueBreakdown?: CampaignRevenueItem[];
  totalCampaignRevenue?: number | null;
  attributedRevenue?: number | null;
  unattributedRevenue?: number | null;
}

export interface DailyOrderPoint {
  date: string;
  dayLabel: string;
  orders: number;
  revenue: number;
}

export interface CommercialFlag {
  id?: string;
  title: string;
  description?: string;
  severity: 'critical' | 'warning' | 'watchlist' | 'info' | 'healthy';
  category?: 'inventory' | 'promotion' | 'sales' | 'fulfillment' | 'returns';
  sku?: string;
  value?: string | number;
  badge?: string;
}

export interface ShopifyData {
  totalOrders: number | null;
  ordersWoW: number | null;
  fulfilled?: number | null;
  fulfilledWoW?: number | null;
  dispatched: number | null;
  dispatchedWoW: number | null;
  unfulfilled?: number | null;
  unfulfilledWoW?: number | null;
  pendingFulfillment: number | null;
  pendingWoW: number | null;
  delivered?: number | null;
  deliveredWoW?: number | null;
  failedUndelivered?: number | null;
  inTransit?: number | null;
  cancellationRate?: number | null;
  cancellationWoW?: number | null;
  itemsInPaidOrders?: number | null;
  netItemsSold?: number | null;
  netItemsSoldWoW?: number | null;
  returnReversalGap?: number | null;
  unfulfilledOrders?: number | null;
  cancelledOrders?: number | null;
  unitsPerOrder?: number | null;
  campaign?: CampaignDiscountData | null;
  unfulfilledAging?: UnfulfilledOrderAging | null;
  revenueAOV?: ShopifyRevenueAOV | null;
  customerInsights?: ShopifyCustomerInsights | null;
  dailyOrders?: DailyOrderPoint[];
  commercialFlags?: CommercialFlag[];
}

export interface DailyCallStat {
  date: string;
  dayLabel: string;
  incoming: number;
  answered: number;
  missed: number;
  abandoned?: number;
  totalCalls?: number;
  percentage?: number;
  avgWaitTime?: string;
  avgCallTime?: string;
  avgDuration?: string;
  answerRate?: number;
}

export interface EuphoriaTelephonyData {
  totalIncomingCalls: number | null;
  callsWoW: number | null;
  answeredCalls: number | null;
  missedCalls: number | null;
  abandonedCalls: number | null;
  answerRate: number | null;
  abandonmentRate: number | null;
  avgWaitTime: string | null;
  avgDuration: string | null;
  firstCallResolution?: number | null;
  peakPeriod?: string | null;
  dailyCalls?: DailyCallStat[];
}

export interface FreshdeskData {
  totalTickets: number | null;
  ticketsWoW: number | null;
  ticketsResolved: number | null;
  ticketsClosed?: number | null;
  resolvedTickets?: number | null;
  ticketsResolvedWoW: number | null;
  openBacklog: number | null;
  openBacklogWoW: number | null;
  avgFrustResponseTime: number | null;
  avgFirstResponseTime?: number | null;
  firstResponseTime?: string | number | null;
  frtWoW: number | null;
  avgResolutionTime: number | null;
  resolutionTime?: string | number | null;
  artWoW: number | null;
  incomingCalls: number | null;
  callsWoW: number | null;
  slaBreach: number | null;
  slaBreachWoW: number | null;
  positiveSentiment: number | null;
  sentimentWoW: number | null;
  contactDrivers: { name: string; value: number; wow?: number | null }[];
  statusBreakdown?: {
    open: number | null;
    pending: number | null;
    onHold: number | null;
    awaitingCustomer: number | null;
  };
  firstContactResolutionRate?: number | null;
  fcrRate?: number | null;
  fcrRateFormatted?: string | null;
  fcrWoW?: number | null;
  csatScore?: number | null;
  csatWoW?: number | null;
}

export interface ActionBreakdownItem {
  action: string;
  count: number;
  percentage: number;
  totalValue: number;
  avgValue: number;
  retentionType: 'cash_loss' | 'revenue_retained' | 'rejected';
}

export interface RequestedBreakdownItem {
  requestedType: string;
  count: number;
  percentage: number;
  totalValue: number;
  convertedToExchangeCount: number;
  conversionRate: number;
}

export interface ExchangeValueData {
  totalReturnValue: number;
  refundValue: number;
  refundPercentage: number;
  retainedValue: number;
  retainedPercentage: number;
  upsellValue: number;
  avgExchangeOrderValue: number;
  avgRefundValue: number;
  retentionRate: number;
}

export interface RmaStatusPipelineItem {
  stage: string;
  count: number;
  percentage: number;
  avgDurationHours: number;
  status: string;
}

export interface ReturnReasonSubItem {
  name: string;
  count: number;
}

export interface ReturnReasonDetailed {
  reason: string;
  count: number;
  percentage: number;
  subReasons: ReturnReasonSubItem[];
}

export interface ReturnGoData {
  totalReturns: number | null;
  totalReturnValue?: number | null;
  returnsRequested?: number | null;
  returnsWoW: number | null;
  pendingRMAs?: number | null;
  returnsApproved?: number | null;
  returnsApprovedWoW?: number | null;
  returnsReceived: number | null;
  returnsReceivedWoW: number | null;
  inTransitRMAs?: number | null;
  returnRate: number | null;
  returnRateWoW: number | null;
  outstandingRMAs: number | null;
  outstandingWoW: number | null;
  agedRMAs: number | null;
  agedWoWWoW: number | null;
  avgOpenRmaDays?: number | null;
  avgOpenRmaDaysWoW?: number | null;
  cycleTime: number | null;
  cycleTimeWoW: number | null;
  refundValue: number | null;
  refundWoW: number | null;
  returnReasons: { name: string; value: number; wow?: number | null; percentage?: number | null }[];
  outcomes?: {
    refundPercent: number | null;
    exchangePercent: number | null;
    storeCreditPercent: number | null;
    exchangeValue: number | null;
    storeCreditValue: number | null;
    totalValueTiedUp: number | null;
  };
  topCategories?: { name: string; returnPercent: number }[];
  actionBreakdownData?: ActionBreakdownItem[];
  requestedBreakdownData?: RequestedBreakdownItem[];
  exchangeValueData?: ExchangeValueData;
  rmaStatusPipeline?: RmaStatusPipelineItem[];
  returnReasonsDetailed?: ReturnReasonDetailed[];
  rmas?: any[];
}

export interface DailyDeliveredShipment {
  date: string;
  dayLabel: string;
  delivered: number;
  cumulativeDelivered: number;
}

export interface StatusAgingDay {
  date: string;
  dayLabel: string;
  totalCreated: number;
  delivered: number;
  dispatched: number;
  inTransit: number;
  awaitingPickup: number;
  inDCQueue: number; // picking + packing
  onHold: number;
}

export interface ParcelNinjaData {
  dailyDeliveryData?: any[];
  delivered?: number | null;
  deliverySuccess: number | null;
  inTransit: number | null;
  inTransitWoW: number | null;
  failedUndelivered: number | null;
  failedWoW: number | null;
  operationalExceptions: number | null;
  exceptionsWoW: number | null;
  warehouseRelatedExceptions: number | null;
  courierRelatedExceptions: number | null;
  inventoryRelatedExceptions: number | null;
  otherExceptions: number | null;
  casesNeedingAction: number | null;
  avgDeliveryTime: number | null;
  avgDeliveryWoW: number | null;
  exceptionSources: { name: string; value: number }[];
  rootCauses?: { source: string; percent: number; color?: string }[];
  sameDayDispatchRate?: number | null;
  dispatchToDeliveryDays?: number | null;
  recentShipments?: {
    id: string | number;
    orderNumber: string;
    channelId?: string;
    customer: string;
    status: string;
    courier: string;
    trackingNo: string;
    createDate?: string;
    createdDate?: string;
    orderDate?: string;
    statusDate?: string;
    lastUpdateDate?: string;
    updatedAt?: string;
  }[];
  allShipments?: {
    id: string | number;
    orderNumber: string;
    channelId?: string;
    customer: string;
    status: string;
    courier: string;
    trackingNo: string;
    createDate?: string;
    createdDate?: string;
    orderDate?: string;
    statusDate?: string;
    lastUpdateDate?: string;
    updatedAt?: string;
  }[];
  shipmentsByStatus?: { status: string; count: number; percentage?: number }[];
  totalShipmentsCount?: number;
  statusAgingAnalysis?: {
    within1Day: number;
    within1DayPct: number;
    within2Days: number;
    within2DaysPct: number;
    over2Days: number;
    over2DaysPct: number;
  };
  dailyDelivered?: DailyDeliveredShipment[];
  statusAgingByDay?: StatusAgingDay[];
  couriers?: Record<string, number>;
}

export interface RiskTicket {
  id: string;
  ticketUrl?: string;
  orderNumber: string;
  customerName: string;
  subject: string;
  issueDescription: string;
  category: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  age: string;
  slaStatus: 'Breached' | 'At Risk' | 'Within SLA';
  requiredAction: string;
}

export interface PurchasedProduct {
  sku: string;
  name: string;
  category: string;
  unitsSold: number | null;
  grossSales: number | null;
  stockStatus: string;
  unitsAvailable?: number | null;
  returns?: number | null;
  flags?: string[];
  flag?: string | null;
}

export interface ReturnedProduct {
  sku: string;
  name: string;
  unitsReturned: number | null;
  returnRate: number | null;
  topReasons: { reason: string; count: number }[];
}

export interface WarehouseAffectedOrder {
  orderNumber: string;
  issueType: string;
  description: string;
  courier: string;
  affectedUnits: number | null;
  status: string;
  actionRequired: string;
  orderDate?: string;
  createdDate?: string;
  statusDate?: string;
  lastUpdateDate?: string;
}

export interface ExecutiveHealthSummary {
  keyConcern: string;
  operationalRisks: string[];
  improvementOpportunities: string[];
  criticalClientAction: string[];
  criticalWarehouseAction: string[];
}

export interface CommercialImpact {
  totalRefundValue: number | null;
  exchangeRetainedValue: number | null;
  storeCreditRetainedValue: number | null;
  valueUnresolvedOrders: number | null;
  valueUndeliveredShipments: number | null;
  estimatedRepeatContactCost: number | null;
  staleShipmentsVar?: number;
  openRmaVar?: number;
  totalVar?: number;
}

export interface Synthesis {
  customerService: string | string[];
  returnsHealth: string | string[];
  exceptions: string | string[];
  operationalRisks?: string[];
  efficiencyOpportunities?: string;
  urgentRemediationActions?: { title: string; action: string }[];
  commercialExposure?: { amount: number; description?: string };
}

export interface ContactDriverTicket {
  id: string;
  ticketUrl?: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  driver: string; // Exact Freshdesk type, e.g. "Where is my order", "Return", "Stock/Product Query", etc.
  freshdeskType: string;
  subject: string;
  description: string;
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed' | 'On Hold';
  statusCode: number;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  priorityCode: number;
  createdDate: string;
  age: string;
  frt: string;
  source: string;
  assignedAgent: string;
  slaStatus: 'Breached' | 'At Risk' | 'Within SLA';
}

export interface StaleShipment {
  orderNumber: string;
  sourceStoreOrderId?: string;
  shipmentId?: string;
  customerName: string;
  destination: string;
  courier: string;
  waybillNumber: string;
  createdDate: string;
  shippedDate: string | null;
  createdToShippedHours: number | null;
  createdToShippedDays: string;
  currentStatus: string;
  lastStatusUpdateDate: string;
  daysWithoutUpdate: number;
  stalledLocation: string;
  rootCause: string;
  actionRequired: string;
  valueAtRisk?: number;
  orderValue?: number;
  isOrderValueUploaded?: boolean;
  lat?: number;
  lng?: number;
}

export interface PipelineStageDuration {
  stage: string;
  description: string;
  avgDurationHours: number;
  avgDurationDays: number;
  slaTargetHours: number;
  varianceHours: number;
  status: 'Within SLA' | 'At Risk' | 'Breached';
}

export interface WarehouseDeliveryInsights {
  avgCreatedToShippedHours: number | null;
  avgCreatedToShippedDays: number | null;
  sameDayDispatchRate: number | null;
  nextDayDispatchRate: number | null;
  delayedDispatchRate: number | null;
  avgTransitDays: number | null;
  avgEndToEndDays: number | null;
  staleShipmentsCount: number;
  statusPipeline: PipelineStageDuration[];
  staleShipments: StaleShipment[];
}

export interface ActiveOpenTicket {
  id: string;
  ticketUrl?: string;
  orderNumber: string;
  customerName: string;
  subject: string;
  freshdeskType: string;
  cfTicketType?: string;
  status: string;
  statusCode?: number;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low' | string;
  createdDate?: string;
  lastResponseDate?: string;
  ageDays?: number;
  lastUpdated?: string;
  daysSinceLastUpdate?: number;
  assignedAgent?: string;
  slaStatus?: 'Breached' | 'At Risk' | 'Within SLA';
  nextRemediation?: string;
  actionRequired?: string;
  geminiSummary?: string;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  sentimentScore?: number;
}

export interface PeriodCreatedTicket {
  id: string;
  ticketUrl?: string;
  orderNumber: string;
  customerName: string;
  createdDate: string;
  freshdeskType: string;
  cfTicketType?: string;
  subject: string;
  source?: string;
  status: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  firstResponseTime: string;
  resolutionTime: string | null;
  agent?: string;
}

export interface ActiveOpenRMA {
  rmaNumber: string;
  createdDate: string;
  orderRef: string;
  customerName: string;
  returnReason: string;
  resolutionRequested: 'Refund to Payment' | 'Size Exchange' | 'Refund Store Credit' | string;
  currentStage: string;
  status: 'Pending' | 'Approved' | 'In Transit' | 'Received';
  ageDays: number;
  actionRequired: string;
  amount?: number;
  valueAtRisk?: number;
}

export interface TicketCategory {
  category: string;
  count: number;
  percentage: number;
  frt?: string;
  breaches?: number;
  wowDiff?: number;
  wowPercentage?: number;
}

export interface ApiDiagnostic {
  connected: boolean;
  status: number | null;
  message: string;
}

export interface WBRData {
  data: {
    reportingPeriod?: {
      startDate: string;
      endDate: string;
    };
    shopify: ShopifyData | null;
    freshdesk: FreshdeskData | null;
    telephony: EuphoriaTelephonyData | null;
    returngo: ReturnGoData | null;
    parcelninja: ParcelNinjaData | null;
    contactRatio: number | null;
    contactRatioWoW: number | null;
    executiveHealth?: ExecutiveHealthSummary | null;
    commercialImpact?: CommercialImpact | null;
    commercialFlags?: CommercialFlag[];
    apiDiagnostics?: {
      freshdesk?: ApiDiagnostic;
      returngo?: ApiDiagnostic;
      parcelninja?: ApiDiagnostic;
    };
    
    // Page 2 (Freshdesk & ReturnGO Open Queue)
    activeOpenTickets?: ActiveOpenTicket[];
    activeOpenRMAs?: ActiveOpenRMA[];
    periodCreatedTickets?: PeriodCreatedTicket[];
    allTickets?: any[];
    allRMAs?: any[];

    // Page 3 (Inbound Enquiries & Commercials)
    topPurchasedProducts?: PurchasedProduct[];
    bottomPurchasedProducts?: PurchasedProduct[];
    topReturnedProducts?: ReturnedProduct[];
    ticketCategories?: TicketCategory[];

    // Page 4 (Warehouse & Courier Fulfilment Audit) and Modal items
    contactDriverTickets?: ContactDriverTicket[];
    warehouseDeliveryInsights?: WarehouseDeliveryInsights;
    warehouseAffectedOrders?: WarehouseAffectedOrder[];
    riskTickets?: RiskTicket[];
  };
  synthesis: Synthesis;
  statuses?: {
    freshdesk: 'connected' | 'not_configured' | 'manual';
    returngo: 'connected' | 'not_configured' | 'manual';
    parcelninja: 'connected' | 'not_configured' | 'manual';
    telephony: 'manual' | 'not_configured';
  };
}

export interface CatalogItem {
  pageNumber: string; // e.g. 'Page 1', 'Page 2', 'Page 1 & 3'
  section: string;
  category: string;
  metric: string;
  dataSource: string;
  definition: string;
  frequency: string;
  benchmark: string;
  currentValue?: string | number;
  status: 'active' | 'integrated' | 'roadmap';
  evaluation?: 'PASSED' | 'FAILED';
  wowTrend?: number; // e.g. -15.4, 12.1
}

export interface WeeklyReportItem {
  id: string; // e.g. "week-38-2026"
  weekNumber: number; // 38
  weekLabel: string; // "Week 38"
  periodLabel: string; // "14 Sep – 20 Sep 2026"
  startDate: string; // "2026-09-14"
  endDate: string; // "2026-09-20"
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  status: 'ACTIVE_CHECKPOINT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
  signOffBy?: string;
  signOffDate?: string;
  summaryNote: string;
  metrics: {
    paidOrders: number;
    paidOrdersWoW: number | null;
    grossSales: number;
    itemsInPaidOrders: number;
    netItemsSold: number;
    netItemsSoldWoW: number | null;
    unitsPerOrder: number;
    fulfilledOrders: number;
    unfulfilledOrders: number;
    unfulfilledBacklogValue: number;
    unfulfilledBacklogValueWoW: number | null;
    totalTickets: number;
    openBacklogTickets: number;
    artHours: number;
    totalRMAs: number;
    returnRate: number;
    deliverySLA: number;
    staleShipmentsCount: number;
    valueAtRisk: number;
  };
  inputs?: {
    shopifyText?: string;
    euphoriaText?: string;
    returngoText?: string;
    parcelninjaText?: string;
  };
  evaluationScore?: {
    passed: number;
    failed: number;
    total: number;
    percentage: number;
  } | null;
  reportImageUrl?: string | null;
  data?: any;
}
