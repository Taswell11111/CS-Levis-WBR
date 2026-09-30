import React, { useState, useMemo } from 'react';
import { X, Search, DollarSign, Tag, TrendingUp, Download, PieChart, ArrowUpDown } from 'lucide-react';
import { CampaignRevenueItem, DiscountCodeItem } from '../types';

interface CampaignRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: CampaignRevenueItem[];
  topDiscountCodes?: DiscountCodeItem[];
  noDiscountOrders?: number | null;
  totalRevenue?: number | null;
  attributedRevenue?: number | null;
  unattributedRevenue?: number | null;
  totalOrders?: number | null;
}

export const CampaignRevenueModal: React.FC<CampaignRevenueModalProps> = ({
  isOpen,
  onClose,
  campaigns = [],
  topDiscountCodes = [],
  noDiscountOrders = null,
  totalRevenue = null,
  attributedRevenue = null,
  unattributedRevenue = null,
  totalOrders = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'revenue' | 'orders' | 'name'>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (!isOpen) return null;

  const totalCalculatedRevenue = useMemo(() => {
    if (totalRevenue !== null && totalRevenue !== undefined) return totalRevenue;
    return campaigns.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  }, [totalRevenue, campaigns]);

  const totalCampaignOrders = useMemo(() => {
    return campaigns.reduce((acc, curr) => acc + (curr.orders || 0), 0);
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => c.campaign.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (sortField === 'name') {
          valA = a.campaign.toLowerCase();
          valB = b.campaign.toLowerCase();
        }
        if (sortDirection === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [campaigns, searchTerm, sortField, sortDirection]);

  const handleSort = (field: 'revenue' | 'orders' | 'name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Rank', 'Campaign Name', 'Orders', 'Revenue (ZAR)', 'Avg Order Value (ZAR)', 'Share of Revenue %'];
    const rows = campaigns.map((c, idx) => {
      const aov = c.orders > 0 ? (c.revenue / c.orders).toFixed(2) : '0.00';
      const share = totalCalculatedRevenue > 0 ? ((c.revenue / totalCalculatedRevenue) * 100).toFixed(1) : '0.0';
      return [
        idx + 1,
        `"${c.campaign.replace(/"/g, '""')}"`,
        c.orders,
        c.revenue.toFixed(2),
        aov,
        `${share}%`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Levis_SA_Campaign_Revenue_Attribution_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* MODAL HEADER */}
        <div className="bg-[#003876] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#C41230] text-white text-[10px] font-black px-2 py-0.5 rounded-xs uppercase tracking-wider">
              Levi's SA
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight uppercase flex items-center gap-1.5">
                <Tag size={15} />
                Shopify Marketing Campaigns &amp; Revenue Attribution (ZAR)
              </h2>
              <p className="text-[10.5px] text-blue-100 font-normal">
                Granular UTM campaign performance, order attribution &amp; discount code redemption audit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-blue-800/80 hover:bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors border border-blue-600"
              title="Export campaign performance to CSV"
            >
              <Download size={12} />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS STRIP */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded p-2.5 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Net Revenue</span>
            <span className="text-base font-bold text-gray-900">
              R{totalCalculatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9.5px] text-gray-500 block mt-0.5">
              Across {totalCampaignOrders || totalOrders || 0} orders
            </span>
          </div>

          <div className="bg-white border border-emerald-200 rounded p-2.5 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">UTM Attributed Revenue</span>
            <span className="text-base font-bold text-emerald-700">
              R{(attributedRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9.5px] text-emerald-600 font-medium block mt-0.5">
              {totalCalculatedRevenue > 0 && attributedRevenue
                ? `${((attributedRevenue / totalCalculatedRevenue) * 100).toFixed(1)}% of total revenue`
                : `${campaigns.filter(c => !c.campaign.toLowerCase().includes('no utm')).length} active campaigns`}
            </span>
          </div>

          <div className="bg-white border border-blue-200 rounded p-2.5 shadow-2xs">
            <span className="text-[10px] font-bold text-[#003876] uppercase block">No UTM Attributed</span>
            <span className="text-base font-bold text-[#003876]">
              R{(unattributedRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9.5px] text-gray-500 block mt-0.5">
              {totalCalculatedRevenue > 0 && unattributedRevenue
                ? `${((unattributedRevenue / totalCalculatedRevenue) * 100).toFixed(1)}% (organic / direct)`
                : 'Direct & organic volume'}
            </span>
          </div>

          <div className="bg-white border border-amber-200 rounded p-2.5 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Discount Code Usage</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {topDiscountCodes.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {topDiscountCodes.map((d, i) => (
                    <span key={i} className="bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold px-1.5 py-0.5 rounded text-[9px]">
                      {d.code}: {d.orders} orders{d.amount ? ` (R${Math.round(d.amount).toLocaleString()})` : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-semibold text-gray-700">None tracked</span>
              )}
            </div>
            {noDiscountOrders !== null && (
              <span className="text-[9px] text-gray-500 block mt-1">
                {noDiscountOrders} orders had no promo code
              </span>
            )}
          </div>
        </div>

        {/* SEARCH & CONTROLS */}
        <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search campaigns by name (e.g. cinch, apple_pay, sale)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:border-[#003876] focus:ring-1 focus:ring-[#003876] outline-none"
            />
          </div>
          <span className="text-xs text-gray-500">
            Showing <strong>{filteredCampaigns.length}</strong> of <strong>{campaigns.length}</strong> campaigns
          </span>
        </div>

        {/* CAMPAIGNS TABLE */}
        <div className="overflow-y-auto flex-grow p-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[9.5px]">
                <th className="pb-2 w-10 text-center">#</th>
                <th 
                  onClick={() => handleSort('name')}
                  className="pb-2 cursor-pointer hover:text-[#003876]"
                >
                  <div className="flex items-center gap-1">
                    <span>Campaign Name / UTM Source</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('orders')}
                  className="pb-2 text-right cursor-pointer hover:text-[#003876]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Orders</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('revenue')}
                  className="pb-2 text-right cursor-pointer hover:text-[#003876]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Revenue (ZAR)</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="pb-2 text-right">Avg Order Value (AOV)</th>
                <th className="pb-2 text-right">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((c, idx) => {
                  const isNoUtm = c.campaign.toLowerCase().includes('no utm');
                  const aov = c.orders > 0 ? (c.revenue / c.orders).toFixed(2) : '0.00';
                  const sharePct = totalCalculatedRevenue > 0 ? ((c.revenue / totalCalculatedRevenue) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={idx} className={`hover:bg-blue-50/40 ${isNoUtm ? 'bg-gray-50/70 font-semibold' : ''}`}>
                      <td className="py-2 text-center text-gray-400 font-mono text-[10px]">{idx + 1}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{c.campaign}</span>
                          {isNoUtm ? (
                            <span className="bg-gray-200 text-gray-700 text-[8.5px] px-1.5 py-0.2 rounded font-bold uppercase">
                              Organic / Direct
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-[#003876] border border-blue-200 text-[8.5px] px-1 py-0.2 rounded font-mono font-medium">
                              UTM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-right font-bold text-gray-900">
                        {c.orders} {c.orders === 1 ? 'order' : 'orders'}
                      </td>
                      <td className="py-2 text-right font-bold text-gray-900">
                        R{c.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-right text-gray-600 font-mono text-[11px]">
                        R{parseFloat(aov).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 bg-gray-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className={`h-full ${isNoUtm ? 'bg-gray-400' : 'bg-emerald-600'}`}
                              style={{ width: `${Math.min(parseFloat(sharePct), 100)}%` }}
                            />
                          </div>
                          <span className="font-semibold text-gray-700 text-[10.5px]">{sharePct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                    No marketing campaigns matched "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-2.5 flex items-center justify-between text-[11px] text-gray-500">
          <span>
            Attributed marketing data source: Shopify Orders API &bull; 26 Campaigns Identified
          </span>
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-3 py-1 rounded cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
