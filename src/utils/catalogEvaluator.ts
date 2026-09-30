import { WBR_METRIC_CATALOG } from '../catalogData';
import { CatalogItem, WBRData } from '../types';

export function getDynamicCatalog(wbrData: WBRData | null | undefined): CatalogItem[] {
  if (!wbrData || !wbrData.data) {
    return WBR_METRIC_CATALOG;
  }

  const { shopify, freshdesk, telephony, returngo, parcelninja, contactRatio, executiveHealth, commercialImpact } = wbrData.data;

  return WBR_METRIC_CATALOG.map(item => {
    // Clone item to avoid modifying original static template
    const dynamicItem = { ...item };

    switch (item.metric) {
      // PAGE 1: Operational Diagnostics
      case 'Key Deterioration / Concern': {
        const concern = executiveHealth?.keyConcern || "";
        dynamicItem.currentValue = concern;
        // Evaluate if concern is significant or based on critical flags count
        const criticalCount = shopify?.commercialFlags?.filter(f => f.severity === 'critical').length || 0;
        dynamicItem.evaluation = criticalCount >= 2 ? 'FAILED' : 'PASSED';
        break;
      }
      case 'Top 3 Operational Risks': {
        const risks = executiveHealth?.operationalRisks && executiveHealth.operationalRisks.length > 0
          ? executiveHealth.operationalRisks.slice(0, 3).join(', ')
          : '';
        dynamicItem.currentValue = risks;
        dynamicItem.evaluation = 'PASSED'; // Always PASSED for tracking if zero unresolved SLA risks
        break;
      }
      case 'Top 3 Improvement Opportunities': {
        const opps = executiveHealth?.improvementOpportunities && executiveHealth.improvementOpportunities.length > 0
          ? executiveHealth.improvementOpportunities.slice(0, 3).join(', ')
          : '';
        dynamicItem.currentValue = opps;
        dynamicItem.evaluation = 'PASSED';
        break;
      }
      case 'Critical Items Requiring Client Action': {
        const action = executiveHealth?.criticalClientAction && executiveHealth.criticalClientAction.length > 0
          ? executiveHealth.criticalClientAction.slice(0, 2).join(', ')
          : '';
        dynamicItem.currentValue = action;
        dynamicItem.evaluation = 'PASSED';
        break;
      }
      case 'Critical Items Requiring Warehouse/Courier Action': {
        const action = executiveHealth?.criticalWarehouseAction && executiveHealth.criticalWarehouseAction.length > 0
          ? executiveHealth.criticalWarehouseAction.slice(0, 2).join(', ')
          : '';
        dynamicItem.currentValue = action;
        dynamicItem.evaluation = 'PASSED';
        break;
      }

      // FRESHDESK: Volume & Demand
      case 'Total Tickets Received': {
        const val = freshdesk?.totalTickets ?? 0;
        dynamicItem.currentValue = String(val);
        dynamicItem.evaluation = val < 400 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Tickets Currently Open / Backlog': {
        const val = freshdesk?.openBacklog ?? 0;
        dynamicItem.currentValue = String(val);
        dynamicItem.evaluation = val < 35 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Tickets per 100 Orders (Contact Ratio)': {
        const ratio = contactRatio ?? 0;
        dynamicItem.currentValue = `${ratio.toFixed(1)}%`;
        dynamicItem.evaluation = ratio < 25.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'First Response Time (FRT)': {
        let frtStr = "0h";
        let frtVal = 0;
        if (freshdesk?.firstResponseTime !== undefined && freshdesk?.firstResponseTime !== null) {
          frtStr = String(freshdesk.firstResponseTime);
          frtVal = parseFloat(frtStr.replace(/[^\d.]/g, '')) || 0;
        } else if (freshdesk?.avgFirstResponseTime !== undefined && freshdesk?.avgFirstResponseTime !== null) {
          frtVal = freshdesk.avgFirstResponseTime;
          frtStr = `${frtVal.toFixed(1)}h`;
        }
        dynamicItem.currentValue = frtStr;
        dynamicItem.evaluation = frtVal < 24.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Average Resolution Time (ART)': {
        let artStr = "0h";
        let artVal = 0;
        if (freshdesk?.resolutionTime !== undefined && freshdesk?.resolutionTime !== null) {
          artStr = String(freshdesk.resolutionTime);
          artVal = parseFloat(artStr.replace(/[^\d.]/g, '')) || 0;
        } else if (freshdesk?.avgResolutionTime !== undefined && freshdesk?.avgResolutionTime !== null) {
          artVal = freshdesk.avgResolutionTime;
          artStr = `${artVal.toFixed(1)}h`;
        }
        dynamicItem.currentValue = artStr;
        dynamicItem.evaluation = artVal < 48.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'SLA Breach %': {
        const breach = freshdesk?.slaBreach ?? 0;
        dynamicItem.currentValue = `${breach.toFixed(1)}%`;
        dynamicItem.evaluation = breach < 3.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'First Contact Resolution Rate %': {
        const sentiment = freshdesk?.positiveSentiment ?? 0;
        dynamicItem.currentValue = `${Math.round(sentiment)}%`;
        dynamicItem.evaluation = sentiment > 90 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Top 5 Enquiry Drivers': {
        const drivers = freshdesk?.contactDrivers && freshdesk.contactDrivers.length > 0
          ? freshdesk.contactDrivers.slice(0, 3).map(d => `${d.name} (${Math.round(d.value)}%)`).join(', ')
          : '';
        dynamicItem.currentValue = drivers;
        // Evaluated as FAILED if any single driver represents >= 40% of contacts
        const maxDriverVal = freshdesk?.contactDrivers && freshdesk.contactDrivers.length > 0
          ? Math.max(...freshdesk.contactDrivers.map(d => d.value))
          : 0;
        dynamicItem.evaluation = maxDriverVal < 40 ? 'PASSED' : 'FAILED';
        break;
      }

      // TELEPHONY
      case 'Answer Rate %': {
        const rate = telephony?.answerRate ?? 0;
        dynamicItem.currentValue = `${rate.toFixed(1)}%`;
        dynamicItem.evaluation = rate > 85.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Abandonment Rate %': {
        const rate = telephony?.abandonmentRate ?? 0;
        dynamicItem.currentValue = `${rate.toFixed(1)}%`;
        dynamicItem.evaluation = rate < 10.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Average Wait Time': {
        const wait = telephony?.avgWaitTime || "0s";
        dynamicItem.currentValue = wait;
        const waitSecs = parseInt(wait.replace(/[^\d]/g, ''), 10) || 0;
        dynamicItem.evaluation = waitSecs < 45 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Peak Calling Periods': {
        dynamicItem.currentValue = telephony?.peakPeriod || '';
        dynamicItem.evaluation = 'PASSED';
        break;
      }

      // RETURNS MANAGEMENT (RMA)
      case 'Total Returns Requested (RMAs)': {
        const rmas = returngo?.totalReturns ?? returngo?.returnsRequested ?? 0;
        dynamicItem.currentValue = String(rmas);
        dynamicItem.evaluation = rmas < 150 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Return Rate %': {
        const rate = returngo?.returnRate ?? 0;
        dynamicItem.currentValue = `${rate.toFixed(1)}%`;
        dynamicItem.evaluation = rate < 20.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Average Return Cycle Time': {
        const val = returngo?.cycleTime ?? 0;
        dynamicItem.currentValue = `${val.toFixed(1)} days`;
        dynamicItem.evaluation = val < 4.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Aged RMAs (> 7 Days)': {
        const val = returngo?.agedRMAs ?? 0;
        dynamicItem.currentValue = String(val);
        dynamicItem.evaluation = val < 5 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Refund Value (ZAR)': {
        const val = returngo?.refundValue ?? 0;
        dynamicItem.currentValue = `R${Number(val).toLocaleString()}`;
        dynamicItem.evaluation = 'PASSED';
        break;
      }
      case 'Exchange & Store Credit Retention %': {
        let retRate = 0;
        if (returngo?.exchangeValueData?.retentionRate !== undefined) {
          retRate = returngo.exchangeValueData.retentionRate;
        } else if (returngo?.outcomes?.exchangePercent !== undefined && returngo?.outcomes?.storeCreditPercent !== undefined) {
          retRate = (returngo.outcomes.exchangePercent || 0) + (returngo.outcomes.storeCreditPercent || 0);
        }
        dynamicItem.currentValue = `${retRate.toFixed(1)}% retained`;
        dynamicItem.evaluation = retRate > 35 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Top Return Reason: Sizing Discrepancies': {
        // Look for any reason with sizing
        let sizingPct = 0;
        let count = 0;
        if (returngo?.returnReasonsDetailed && returngo.returnReasonsDetailed.length > 0) {
          const sizingDetail = returngo.returnReasonsDetailed.find(r => r.reason.toLowerCase().includes('size'));
          if (sizingDetail) {
            sizingPct = sizingDetail.percentage;
            count = sizingDetail.count;
          }
        } else if (returngo?.returnReasons && returngo.returnReasons.length > 0) {
          const sizingReason = returngo.returnReasons.find(r => r.name.toLowerCase().includes('size') || r.name.toLowerCase().includes('fit'));
          if (sizingReason) {
            sizingPct = sizingReason.value;
            // estimate count based on total returns
            const totalRmas = returngo?.totalReturns ?? returngo?.returnsRequested ?? 0;
            count = Math.round((sizingPct / 100) * totalRmas);
          }
        }
        dynamicItem.currentValue = `${sizingPct.toFixed(1)}% (${count} RMAs)`;
        dynamicItem.evaluation = sizingPct < 60.0 ? 'PASSED' : 'FAILED';
        break;
      }

      // SHIPMENT OVERSIGHT
      case 'Total Orders Dispatched': {
        const total = shopify?.totalOrders ?? 0;
        const dispatched = shopify?.dispatched ?? shopify?.fulfilled ?? 0;
        const ratio = total > 0 ? (dispatched / total) : 0;
        dynamicItem.currentValue = `${Number(dispatched).toLocaleString()} / ${Number(total).toLocaleString()}`;
        dynamicItem.evaluation = ratio >= 0.95 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Orders Pending Fulfilment': {
        const val = shopify?.unfulfilled ?? shopify?.pendingFulfillment ?? 0;
        dynamicItem.currentValue = String(val);
        dynamicItem.evaluation = val < 200 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Delivery Success Rate %': {
        const val = parcelninja?.deliverySuccess ?? 0;
        dynamicItem.currentValue = `${val.toFixed(1)}%`;
        dynamicItem.evaluation = val > 90.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Average Delivery Time (Days)': {
        const val = parcelninja?.avgDeliveryTime ?? 0;
        dynamicItem.currentValue = `${val.toFixed(1)} days`;
        dynamicItem.evaluation = val < 2.5 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'In Transit Backlog': {
        const val = parcelninja?.inTransit ?? 0;
        dynamicItem.currentValue = String(val);
        dynamicItem.evaluation = 'PASSED';
        break;
      }
      case 'Failed Delivery / Undelivered Shipments': {
        const val = parcelninja?.failedUndelivered ?? 0;
        dynamicItem.currentValue = String(val);
        dynamicItem.evaluation = val < 10 ? 'PASSED' : 'FAILED';
        break;
      }

      // WAREHOUSE OPERATIONAL HEALTH
      case 'Operational Exceptions / Variance': {
        const val = parcelninja?.operationalExceptions ?? 0;
        dynamicItem.currentValue = String(val);
        dynamicItem.evaluation = val < 12 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Root-Cause Breakdown: Customer / Address Issue': {
        let pct = 0;
        if (parcelninja?.rootCauses && parcelninja.rootCauses.length > 0) {
          const match = parcelninja.rootCauses.find(rc => rc.source.toLowerCase().includes('customer') || rc.source.toLowerCase().includes('address'));
          if (match) pct = match.percent;
        }
        dynamicItem.currentValue = `${pct}% of exceptions`;
        dynamicItem.evaluation = 'PASSED';
        break;
      }
      case 'Root-Cause Breakdown: Courier Routing': {
        let pct = 0;
        if (parcelninja?.rootCauses && parcelninja.rootCauses.length > 0) {
          const match = parcelninja.rootCauses.find(rc => rc.source.toLowerCase().includes('courier') || rc.source.toLowerCase().includes('routing'));
          if (match) pct = match.percent;
        }
        dynamicItem.currentValue = `${pct}% of exceptions`;
        dynamicItem.evaluation = pct < 30 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Root-Cause Breakdown: Warehouse / Packaging': {
        let pct = 0;
        if (parcelninja?.rootCauses && parcelninja.rootCauses.length > 0) {
          const match = parcelninja.rootCauses.find(rc => rc.source.toLowerCase().includes('warehouse') || rc.source.toLowerCase().includes('packaging') || rc.source.toLowerCase().includes('dc'));
          if (match) pct = match.percent;
        }
        dynamicItem.currentValue = `${pct}% of exceptions`;
        dynamicItem.evaluation = pct < 15 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Same-Day Dispatch Rate %': {
        const val = parcelninja?.sameDayDispatchRate ?? 0;
        dynamicItem.currentValue = `${val.toFixed(1)}%`;
        dynamicItem.evaluation = val > 90 ? 'PASSED' : 'FAILED';
        break;
      }

      // COMMERCIAL IMPACT
      case 'Total Refund Financial Outflow': {
        const val = returngo?.refundValue ?? 0;
        const revenue = shopify?.revenueAOV?.totalRevenue ?? 0;
        const ratio = revenue > 0 ? (val / revenue) * 100 : 0;
        dynamicItem.currentValue = `${ratio.toFixed(1)}% of GMV (R${Number(val).toLocaleString()})`;
        dynamicItem.evaluation = ratio < 3.0 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Exchange & Store Credit Retained GMV': {
        const exValue = commercialImpact?.exchangeRetainedValue ?? 0;
        const scValue = commercialImpact?.storeCreditRetainedValue ?? 0;
        const totalVal = exValue + scValue;
        dynamicItem.currentValue = `R${Number(totalVal).toLocaleString()}`;
        dynamicItem.evaluation = totalVal > 40000 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Value of Unresolved / Aged Returns': {
        const val = commercialImpact?.valueUnresolvedOrders ?? 0;
        dynamicItem.currentValue = `R${Number(val).toLocaleString()}`;
        dynamicItem.evaluation = val < 20000 ? 'PASSED' : 'FAILED';
        break;
      }
      case 'Estimated Cost of Support Contacts': {
        const val = commercialImpact?.estimatedRepeatContactCost ?? 0;
        const contactsCount = (freshdesk?.totalTickets || 0);
        dynamicItem.currentValue = `R${Number(val).toLocaleString()} (${contactsCount} total contacts)`;
        dynamicItem.evaluation = val < 15000 ? 'PASSED' : 'FAILED';
        break;
      }
    }

    return dynamicItem;
  });
}
