import React, { useState, useMemo } from 'react';
import { X, Search, Filter, ExternalLink, Ticket, RotateCcw, CheckCircle2, Clock, AlertCircle, Upload, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DoughnutChart } from './DoughnutChart';
import { createPortal } from 'react-dom';

interface Page1DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'tickets' | 'tickets_closed' | 'tickets_backlog' | 'rmas_created' | 'rmas_pending' | 'rmas_approved' | 'rmas_resolved' | 'rmas_process' | 'reason_detail' | 'customer_contact' | 'stalled_shipments' | 'ops_exceptions';
  data: any[];
  meta?: any;
  onOpenUploadOrderValues?: () => void;
}

export const Page1DetailsModal: React.FC<Page1DetailsModalProps> = ({ isOpen, onClose, title, type, data, meta, onOpenUploadOrderValues }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const rowsPerPage = 20;

  const availableStatuses = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return ['ALL'];
    const unique = new Set<string>();
    data.forEach(item => {
      if (item.status) unique.add(item.status);
    });
    const list = Array.from(unique).filter(Boolean);
    if (list.length === 0) return ['ALL'];
    return ['ALL', ...list.slice(0, 6)];
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    let result = data.filter(item => {
      if (selectedStatus !== 'ALL') {
        const itemStatus = (item.status || '').toLowerCase();
        const targetStatus = selectedStatus.toLowerCase();
        if (targetStatus === 'closed') {
          if (!itemStatus.includes('closed') && !itemStatus.includes('resolved')) return false;
        } else if (!itemStatus.includes(targetStatus)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const id = String(item.id || item.rmaNumber || item.rmaId || item.shipmentNumber || '').toLowerCase();
        const order = String(item.orderName || item.orderNumber || item.channelId || '').toLowerCase();
        const customer = String(item.customerName || item.customer || '').toLowerCase();
        const subject = String(item.subject || item.returnReason || item.reason || '').toLowerCase();
        const detail = String(item.productDetail || item.details || '').toLowerCase();
        const courier = String(item.courier || '').toLowerCase();
        return id.includes(q) || order.includes(q) || customer.includes(q) || subject.includes(q) || detail.includes(q) || courier.includes(q);
      }
      return true;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, selectedStatus, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (!isOpen) return null;


  const renderIcon = () => {
    switch (type) {
      case 'customer_contact': return <Ticket size={20} className="text-[#003876]" />;
      case 'stalled_shipments': return <AlertCircle size={20} className="text-red-600" />;
      case 'tickets': 
      case 'tickets_closed':
      case 'tickets_backlog':
        return <Ticket size={20} className="text-red-600" />;
      case 'rmas_created': return <RotateCcw size={20} className="text-blue-600" />;
      case 'rmas_pending': return <Clock size={20} className="text-amber-600" />;
      case 'rmas_approved': return <CheckCircle2 size={20} className="text-emerald-600" />;
      case 'rmas_resolved': return <CheckCircle2 size={20} className="text-[#003876]" />;
      case 'rmas_process': return <Clock size={20} className="text-blue-500" />;
      case 'ops_exceptions': return <AlertCircle size={20} className="text-red-600" />;
      default: return <AlertCircle size={20} className="text-[#003876]" />;
    }
  };

  const fmtOrderId = (id: any) => {
    if (!id) return null;
    const s = String(id).trim();
    if (s === 'N/A' || s === '') return null;
    return s.startsWith('#') ? s : `#${s}`;
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-7xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                {renderIcon()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                  <span className="px-2 py-0.5 bg-[#003876]/10 text-[#003876] text-xs font-mono font-bold rounded-full">
                    {filteredData.length} records
                  </span>
                  {type === 'stalled_shipments' && onOpenUploadOrderValues && (
                    <button
                      type="button"
                      onClick={onOpenUploadOrderValues}
                      className="ml-2 px-3 py-1 bg-[#003876] hover:bg-[#002855] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Upload or edit commercial order values for these shipments"
                    >
                      <Upload size={13} />
                      <span>Upload Order Values</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">Detailed audit breakdown for active reporting period</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {type === 'customer_contact' ? (
            <div className="flex-1 overflow-auto p-6 bg-gray-50/30 flex items-center justify-center min-h-[400px]">
              <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 flex flex-col items-center w-full max-w-lg">
                <h3 className="text-sm font-bold text-[#003876] mb-6 uppercase tracking-widest text-center">
                  Contact Volume Breakdown
                </h3>
                <div className="flex gap-8 items-center">
                  <DoughnutChart 
                    slices={[
                      { label: 'CS Tickets', count: data[0]?.value || 0, color: '#C41230', percentage: ((data[0]?.value || 0) / ((data[0]?.value || 0) + (data[1]?.value || 0)) * 100) || 0 },
                      { label: 'Calls Received', count: data[1]?.value || 0, color: '#003876', percentage: ((data[1]?.value || 0) / ((data[0]?.value || 0) + (data[1]?.value || 0)) * 100) || 0 }
                    ]}
                    size={160}
                    thickness={30}
                    centerNumber={((data[0]?.value || 0) + (data[1]?.value || 0)).toString()}
                    centerLabel="Total Contacts"
                  />
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#C41230]"></div>
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">CS TICKETS</div>
                        <div className="text-xl font-black font-mono">{data[0]?.value || 0}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#003876]"></div>
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">CALLS RECEIVED</div>
                        <div className="text-xl font-black font-mono">{data[1]?.value || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {type === 'ops_exceptions' && (
                <div className="mx-6 mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-[#003876] flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-bold uppercase text-[10px] text-[#003876] tracking-wider">
                    <AlertCircle size={14} className="text-[#003876]" />
                    AUDITED OUTBOUND &amp; LOGISTICS RECORD REGISTER
                  </div>
                  <p className="leading-relaxed text-[11px] text-gray-700">
                    {meta?.methodology || 'This ledger details all active shipments, pending dispatches, courier handovers, and exceptions synchronized from ParcelNinja WMS.'}
                  </p>
                </div>
              )}

              {/* Search & Status Filter Bar */}
              <div className="px-6 py-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search by ID, Order #, Customer, Courier, Tracking, or Details..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#003876]/20 focus:border-[#003876] transition-all"
                  />
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 text-xs font-semibold overflow-x-auto max-w-full">
                  {availableStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(st);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                        selectedStatus === st ? 'bg-[#003876] text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content / Table with Full Horizontal & Vertical Scrollbar */}
              <div className="flex-1 overflow-y-auto overflow-x-auto p-6 bg-gray-50/30">
                <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                    <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10.5px] tracking-wider border-b border-gray-200">
                      {type === 'stalled_shipments' ? (
                        <tr>
                          <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-900 w-[18%]" onClick={() => requestSort('sourceStoreOrderId')}>
                            Source Store Order ID
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-900 w-[16%]" onClick={() => requestSort('shipmentId')}>
                            ParcelNinja Shipment ID
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-900 w-[16%]" onClick={() => requestSort('customerName')}>
                            Customer &amp; Destination
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap w-[16%]">
                            Courier &amp; Waybill
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap w-[14%]">
                            Delay &amp; Root Cause
                          </th>
                          <th className="px-4 py-3 text-right whitespace-nowrap cursor-pointer hover:text-gray-900 w-[12%]" onClick={() => requestSort('orderValue')}>
                            Order Value (VAR)
                          </th>
                          <th className="px-4 py-3 text-center whitespace-nowrap cursor-pointer hover:text-gray-900 w-[8%]" onClick={() => requestSort('status')}>
                            Status
                          </th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-900 w-[18%]" onClick={() => requestSort('id')}>
                            ID / Order / Shipment
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-900 w-[16%]" onClick={() => requestSort('customerName')}>
                            Customer
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-900 w-[14%]" onClick={() => requestSort('createdDate')}>
                            Date / Time
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap w-[24%]">
                            {type.includes('stalled') || type.includes('ops') ? 'Courier & Tracking / Root Cause' : 'Subject / Details / Product'}
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap w-[18%]">
                            {type.includes('stalled') || type.includes('ops') ? 'Operational Action' : 'Resolution / Notes'}
                          </th>
                          <th className="px-4 py-3 text-center whitespace-nowrap cursor-pointer hover:text-gray-900 w-[10%]" onClick={() => requestSort('status')}>
                            Status
                          </th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {paginatedData && paginatedData.length > 0 ? (
                        paginatedData.map((item, idx) => {
                          if (type === 'stalled_shipments') {
                            const storeId = item.sourceStoreOrderId || (item.channelId ? (item.channelId.startsWith('#') ? item.channelId : `#${item.channelId}`) : (item.clientId ? `#${item.clientId}` : (item.orderNumber && item.orderNumber.startsWith('SHP-') ? `#LSSA-${item.orderNumber.replace('SHP-', '').slice(4)}` : fmtOrderId(item.orderNumber || item.id))));
                            const shpId = item.shipmentId || item.shipmentNumber || item.orderNumber || item.id;
                            const val = Number(item.orderValue !== undefined ? item.orderValue : item.valueAtRisk) || 0;

                            return (
                              <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                <td className="px-4 py-3 font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-blue-100 text-[#003876] font-bold text-xs rounded border border-blue-200">
                                      {storeId}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 font-sans">
                                    Shopify / Store Reference
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-gray-700">
                                  <div className="font-semibold text-xs text-gray-900">{shpId}</div>
                                  <div className="text-[10px] text-gray-400 font-sans">ParcelNinja Outbound</div>
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  <div className="font-semibold text-gray-800">{item.customerName || item.customer || 'Unknown Customer'}</div>
                                  {item.destination && (
                                    <div className="text-[10px] text-gray-500">{item.destination}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  <div className="font-semibold text-gray-800">{item.courier || 'Pending dispatch'}</div>
                                  <div className="text-[10px] font-mono text-gray-400">{item.waybillNumber || item.trackingNo || 'N/A'}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className="px-1.5 py-0.2 bg-red-100 text-red-800 font-bold rounded text-[10px]">
                                      {item.daysWithoutUpdate ? `${item.daysWithoutUpdate}d delayed` : '> 2d delayed'}
                                    </span>
                                  </div>
                                  <div className="text-[10.5px] text-gray-500 leading-snug line-clamp-1" title={item.rootCause || item.actionRequired}>
                                    {item.rootCause || item.actionRequired || 'Awaiting courier scan update'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <div className={`font-mono font-bold text-xs ${val > 0 ? 'text-gray-900' : 'text-amber-600 italic'}`}>
                                    {val > 0 ? `R ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Pending Upload'}
                                  </div>
                                  {item.isOrderValueUploaded && (
                                    <span className="text-[9px] text-emerald-600 font-semibold uppercase">Uploaded</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                    {item.currentStatus || item.status || 'Stalled'}
                                  </span>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-[#003876]">
                                <div className="font-bold text-[12px]">{fmtOrderId(item.id || item.rmaNumber || item.rmaId || item.shipmentNumber || item.orderNumber) || 'N/A'}</div>
                                {(item.orderName || item.order_name) && (fmtOrderId(item.orderName || item.order_name) !== fmtOrderId(item.id || item.rmaNumber || item.rmaId || item.shipmentNumber || item.orderNumber)) && (
                                  <div className="text-[10.5px] text-gray-600 font-normal">Order: <span className="font-mono font-semibold">{fmtOrderId(item.orderName || item.order_name)}</span></div>
                                )}
                                {!item.orderName && !item.order_name && item.orderNumber && (fmtOrderId(item.orderNumber) !== fmtOrderId(item.id || item.rmaNumber || item.rmaId || item.shipmentNumber || item.orderNumber)) && (
                                  <div className="text-[10.5px] text-gray-600 font-normal">Order: <span className="font-mono font-semibold">{fmtOrderId(item.orderNumber)}</span></div>
                                )}
                                {item.shipmentNumber && (fmtOrderId(item.shipmentNumber) !== fmtOrderId(item.id || item.rmaNumber || item.rmaId || item.shipmentNumber || item.orderNumber)) && (
                                  <div className="text-[10px] text-gray-500 font-mono">Shipment: {fmtOrderId(item.shipmentNumber)}</div>
                                )}
                                {item.sourceStoreId && (
                                  <div className="text-[9.5px] text-gray-400 font-mono">Store: {item.sourceStoreId}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                <div className="font-semibold text-gray-800">{item.customerName || item.customer || 'Unknown Customer'}</div>
                                {item.courier && (
                                  <div className="text-[10px] text-gray-500 font-normal">Courier: <span className="font-medium text-slate-700">{item.courier}</span></div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-[11px]">
                                {item.createdDate || item.eventDate || item.createDate || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <div className="font-medium text-gray-900 mb-0.5" title={item.subject || item.returnReason || item.reason}>
                                  {item.subject || item.returnReason || item.reason || 'N/A'}
                                </div>
                                {(item.productDetail || item.details) && (
                                  <div className="text-[10.5px] text-gray-500 leading-snug" title={item.productDetail || item.details}>
                                    {item.productDetail || item.details}
                                  </div>
                                )}
                                {item.trackingNo && (
                                  <div className="text-[10px] text-blue-700 font-mono mt-0.5">
                                    Waybill: {item.trackingNo}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <div className="text-[11px] text-[#003876] font-medium leading-tight">
                                  {item.resolution || item.actionRequired || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  String(item.status).toLowerCase().includes('closed') || String(item.status).toLowerCase().includes('deliver') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  String(item.status).toLowerCase().includes('resolved') || String(item.status).toLowerCase().includes('approve') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  String(item.status).toLowerCase().includes('pending') || String(item.status).toLowerCase().includes('process') || String(item.status).toLowerCase().includes('dispatch') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  String(item.status).toLowerCase().includes('hold') || String(item.status).toLowerCase().includes('stalled') || String(item.status).toLowerCase().includes('fail') ? 'bg-red-50 text-red-700 border border-red-200' :
                                  'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}>
                                  {item.status || 'N/A'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={type === 'stalled_shipments' ? 7 : 6} className="px-4 py-12 text-center text-gray-400 italic">
                            No matching records found for this criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div className="text-xs text-gray-500 font-medium">
                        Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1 border border-gray-300 bg-white rounded text-xs font-semibold disabled:opacity-40 hover:bg-gray-100 cursor-pointer"
                        >
                          Prev
                        </button>
                        <span className="px-3 py-1 text-xs font-semibold bg-gray-200 rounded text-gray-800">
                          {currentPage} / {totalPages}
                        </span>
                        <button 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className="px-3 py-1 border border-gray-300 bg-white rounded text-xs font-semibold disabled:opacity-40 hover:bg-gray-100 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}


          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium font-mono">
              Showing {data?.length || 0} results &bull; Data verified via {
                type.includes('ticket') ? 'Freshdesk API' :
                type.includes('stalled') || type.includes('ops') ? 'ParcelNinja WMS & Carrier API' :
                'ReturnGo API'
              }
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#003876] text-white text-sm font-bold rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
            >
              Close Details
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
