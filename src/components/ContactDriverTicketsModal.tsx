import React, { useState, useMemo } from 'react';
import { X, Search, Filter, AlertCircle, Clock, CheckCircle, ShieldAlert, ArrowRight, User, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { ContactDriverTicket } from '../types';

interface ContactDriverTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: ContactDriverTicket[];
  initialDriver?: string | null;
}

export const ContactDriverTicketsModal: React.FC<ContactDriverTicketsModalProps> = ({
  isOpen,
  onClose,
  tickets,
  initialDriver = null,
}) => {
  const [selectedDriver, setSelectedDriver] = useState<string>(initialDriver || 'All Drivers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Update selectedDriver if initialDriver changes when opening
  React.useEffect(() => {
    if (initialDriver) {
      setSelectedDriver(initialDriver);
    } else {
      setSelectedDriver('All Drivers');
    }
  }, [initialDriver, isOpen]);

  // Extract unique drivers
  const availableDrivers = useMemo(() => {
    const drivers = Array.from(new Set(tickets.map(t => t.driver)));
    return ['All Drivers', ...drivers];
  }, [tickets]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filtered & Sorted tickets
  const filteredTickets = useMemo(() => {
    let result = tickets.filter(ticket => {
      // Driver filter
      const matchesDriver =
        selectedDriver === 'All Drivers' ||
        ticket.driver.toLowerCase().includes(selectedDriver.toLowerCase()) ||
        selectedDriver.toLowerCase().includes(ticket.driver.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        ticket.status.toLowerCase() === statusFilter.toLowerCase();

      // Search query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ticket.id.toLowerCase().includes(q) ||
        ticket.orderNumber.toLowerCase().includes(q) ||
        ticket.customerName.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.freshdeskType.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q) ||
        ticket.assignedAgent.toLowerCase().includes(q);

      return matchesDriver && matchesStatus && matchesSearch;
    });

    if (sortKey) {
      result = [...result].sort((a: any, b: any) => {
        let aVal = a[sortKey] ?? '';
        let bVal = b[sortKey] ?? '';
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tickets, selectedDriver, statusFilter, searchQuery, sortKey, sortDirection]);

  if (!isOpen) return null;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return <span className="bg-red-100 text-red-800 border border-red-300 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tight">Urgent</span>;
      case 'High':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">High</span>;
      case 'Medium':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-tight">Medium</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-tight">{priority}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">Open (Backlog)</span>;
      case 'Pending':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">Pending 3PL</span>;
      case 'Resolved':
        return <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[10px] font-medium">Resolved</span>;
      case 'Closed':
        return <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-medium">Closed</span>;
      default:
        return <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded text-[10px]">{status}</span>;
    }
  };

  const getSlaBadge = (sla: string) => {
    switch (sla) {
      case 'Breached':
        return <span className="text-red-700 font-bold text-[10px] flex items-center gap-1"><AlertCircle size={11} /> Breached</span>;
      case 'At Risk':
        return <span className="text-amber-700 font-semibold text-[10px] flex items-center gap-1"><Clock size={11} /> At Risk</span>;
      default:
        return <span className="text-green-700 font-medium text-[10px] flex items-center gap-1"><CheckCircle size={11} /> Within SLA</span>;
    }
  };

  // Driver metrics
  const driverTotal = filteredTickets.length;
  const driverOpen = filteredTickets.filter(t => t.status === 'Open' || t.status === 'Pending').length;
  const driverBreaches = filteredTickets.filter(t => t.slaStatus === 'Breached').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        id="contact-driver-tickets-modal"
        className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-7xl w-[96vw] max-h-[92vh] flex flex-col overflow-hidden text-gray-900"
      >
        {/* MODAL HEADER */}
        <div className="bg-[#003876] text-white px-6 py-3.5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <span className="bg-[#C41230] text-white text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              Levi's CS
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight uppercase flex items-center gap-2">
                Customer Query Management &mdash; Freshdesk Ticket Register
              </h2>
              <p className="text-xs text-blue-100/80 font-medium">
                Drill-down investigation into Freshdesk support enquiries &bull; Auditing ticket type, order references &amp; root causes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-md transition-colors"
            title="Close dialog (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* DRIVER PILL SELECTORS & FILTER BAR */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Driver Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter size={12} /> Driver:
            </span>
            {availableDrivers.map((driver) => {
              const count = driver === 'All Drivers' 
                ? tickets.length 
                : tickets.filter(t => t.driver.toLowerCase().includes(driver.toLowerCase()) || driver.toLowerCase().includes(t.driver.toLowerCase())).length;
              const isSelected = selectedDriver.toLowerCase() === driver.toLowerCase();

              return (
                <button
                  key={driver}
                  onClick={() => setSelectedDriver(driver)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#003876] text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>{driver}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-800 text-blue-100' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Stats Banner for Selected Driver */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-gray-200 shadow-2xs">
              <span className="text-gray-500 font-medium">Viewing:</span>
              <strong className="text-gray-900">{driverTotal}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-gray-200 shadow-2xs">
              <span className="text-gray-500 font-medium">Open Backlog:</span>
              <strong className={driverOpen > 0 ? "text-amber-700" : "text-gray-700"}>{driverOpen}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-gray-200 shadow-2xs">
              <span className="text-gray-500 font-medium">SLA Breached:</span>
              <strong className={driverBreaches > 0 ? "text-red-700" : "text-green-700"}>{driverBreaches}</strong>
            </div>
          </div>
        </div>

        {/* SEARCH & SECONDARY CONTROLS */}
        <div className="px-6 py-2.5 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search by ticket #, order #LSA, customer name, subject, or agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#003876] bg-gray-50/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#003876]"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open (Backlog)</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* TICKETS TABLE CONTENT WITH EXPLICIT SCROLLBAR */}
        <div className="flex-1 p-6 bg-gray-50/30 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-[11px] text-gray-500 pb-2 px-1">
            <span>Showing <strong>{filteredTickets.length}</strong> matching tickets &bull; Scroll table vertically to view full audit logs</span>
            <span className="text-gray-400 italic flex items-center gap-1">
              Click any Ticket ID to open directly in Freshdesk
            </span>
          </div>

          {filteredTickets.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded shadow-xs overflow-x-auto overflow-y-scroll max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500">
              <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                <thead className="sticky top-0 bg-[#003876]/10 backdrop-blur-md text-[#003876] border-b border-gray-300 text-[10.5px] uppercase tracking-wider font-bold z-10 shadow-2xs select-none">
                  <tr>
                    <th 
                      onClick={() => handleSort('id')} 
                      className="py-2.5 px-3.5 w-24 bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Ticket ID</span>
                        {sortKey === 'id' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('orderNumber')} 
                      className="py-2.5 px-3 w-28 bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Order #</span>
                        {sortKey === 'orderNumber' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('customerName')} 
                      className="py-2.5 px-3.5 w-44 bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Customer</span>
                        {sortKey === 'customerName' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('subject')} 
                      className="py-2.5 px-4 min-w-[280px] bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Subject &amp; Details</span>
                        {sortKey === 'subject' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('freshdeskType')} 
                      className="py-2.5 px-3 w-36 bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Type</span>
                        {sortKey === 'freshdeskType' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('status')} 
                      className="py-2.5 px-2.5 w-24 text-center bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        {sortKey === 'status' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('priority')} 
                      className="py-2.5 px-2.5 w-24 text-center bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Priority</span>
                        {sortKey === 'priority' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('age')} 
                      className="py-2.5 px-2.5 w-24 text-center bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Age / FRT</span>
                        {sortKey === 'age' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('slaStatus')} 
                      className="py-2.5 px-2.5 w-24 text-center bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>SLA</span>
                        {sortKey === 'slaStatus' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('assignedAgent')} 
                      className="py-2.5 px-3 w-36 bg-[#003876]/10 cursor-pointer hover:bg-[#003876]/20 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Agent</span>
                        {sortKey === 'assignedAgent' ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px]">
                  {filteredTickets.map((t) => {
                    const cleanNum = String(t.id).replace('#FD-', '').replace('FD-', '').replace('#', '');
                    const displayId = `#${cleanNum}`;
                    const ticketLink = `https://ecomplete.freshdesk.com/a/tickets/${cleanNum}`;
                    return (
                      <tr key={t.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-[#003876] whitespace-nowrap">
                          <a 
                            href={ticketLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-[#003876] font-mono font-bold flex items-center gap-1 group"
                            title={`Open Freshdesk ticket #${cleanNum} in new tab`}
                          >
                            <span>{displayId}</span>
                            <ExternalLink size={10} className="text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10.5px] text-gray-700 whitespace-nowrap">
                          {t.orderNumber}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="font-semibold text-gray-900 block leading-tight">{t.customerName}</span>
                          <span className="text-[9.5px] text-gray-400 font-mono">{t.customerEmail || t.source}</span>
                        </td>
                        <td className="py-2.5 px-4 max-w-[340px]">
                          <span className="font-semibold text-gray-900 block leading-tight truncate" title={t.subject}>{t.subject}</span>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5" title={t.description}>{t.description}</p>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">
                            {t.freshdeskType || t.driver}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                          {getStatusBadge(t.status)}
                        </td>
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                          {getPriorityBadge(t.priority)}
                        </td>
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                          <span className="font-bold text-gray-800 block text-[10px]">{t.age}</span>
                          <span className="text-[9px] text-gray-400">FRT: {t.frt}</span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                          {getSlaBadge(t.slaStatus)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-gray-700 font-medium text-[10px] flex items-center gap-1">
                            <User size={11} className="text-gray-400" />
                            {t.assignedAgent}
                          </span>
                          <span className="text-[9px] text-gray-400">{t.source}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded border border-gray-200">
              <ShieldAlert size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No tickets found matching your query</p>
              <p className="text-xs text-gray-400 mt-1">Try resetting the driver tab or clearing the search keyword.</p>
              <button
                onClick={() => { setSelectedDriver('All Drivers'); setSearchQuery(''); setStatusFilter('all'); }}
                className="mt-3 px-3 py-1 text-xs bg-[#003876] text-white rounded font-medium hover:bg-blue-900 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Zero Mock Data Policy:</span>
            <span>All ticket classifications map to Freshdesk standard ticket type & custom field <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px] text-gray-800">cf_ticket_type</code>.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#003876] text-white font-semibold rounded text-xs hover:bg-blue-900 transition-colors"
          >
            Close Register
          </button>
        </div>
      </div>
    </div>
  );
};
