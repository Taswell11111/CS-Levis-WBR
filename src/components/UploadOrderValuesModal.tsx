import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  HelpCircle,
  Save,
  RotateCcw,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StaleShipment } from '../types';

interface UploadOrderValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  staleShipments: (StaleShipment | any)[];
  reportPeriod?: { startDate: string; endDate: string };
  reportId?: string;
  onSaveValues: (updatedShipments: any[]) => Promise<void> | void;
}

interface EditableShipmentRow {
  shipmentId: string;
  sourceStoreOrderId: string;
  orderNumber: string;
  customerName: string;
  courier: string;
  waybillNumber: string;
  daysWithoutUpdate: number;
  currentStatus: string;
  originalValue: number;
  orderValue: number;
  isMatched: boolean;
}

export const UploadOrderValuesModal: React.FC<UploadOrderValuesModalProps> = ({
  isOpen,
  onClose,
  staleShipments,
  reportPeriod,
  reportId,
  onSaveValues
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'upload' | 'paste'>('table');
  const [rows, setRows] = useState<EditableShipmentRow[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [parseNotice, setParseNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync rows from staleShipments
  useEffect(() => {
    if (!staleShipments || staleShipments.length === 0) {
      setRows([]);
      return;
    }

    const mapped = staleShipments.map((s, idx) => {
      const shpId = s.shipmentId || s.orderNumber || `SHP-${idx + 1}`;
      const storeId = s.sourceStoreOrderId || (s.orderNumber && s.orderNumber.startsWith('SHP-') 
        ? `#LSSA-${s.orderNumber.replace('SHP-', '').slice(4)}` 
        : (s.orderNumber ? (s.orderNumber.startsWith('#') ? s.orderNumber : `#${s.orderNumber}`) : `#ORD-${idx + 1}`));
      const val = Number(s.orderValue !== undefined ? s.orderValue : s.valueAtRisk) || 0;

      return {
        shipmentId: shpId,
        sourceStoreOrderId: storeId,
        orderNumber: s.orderNumber || shpId,
        customerName: s.customerName || 'Customer',
        courier: s.courier || 'The Courier Guy',
        waybillNumber: s.waybillNumber || 'N/A',
        daysWithoutUpdate: s.daysWithoutUpdate || 0,
        currentStatus: s.currentStatus || 'In Transit',
        originalValue: val,
        orderValue: val,
        isMatched: val > 0
      };
    });

    setRows(mapped);
    setParseNotice(null);
  }, [staleShipments, isOpen]);

  const cleanId = (id: string) => String(id || '').replace(/^#/, '').toLowerCase().trim();

  // Helper to parse text lines (CSV, TSV, or spaced)
  const parseAndApplyText = (text: string) => {
    if (!text.trim()) {
      setParseNotice({ type: 'error', message: 'No content provided. Paste lines or upload a CSV file.' });
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let matchedCount = 0;
    const newRows = [...rows];

    for (const line of lines) {
      // Ignore header lines
      if (/order|shipment|store|waybill|amount|value|zar|currency/i.test(line) && /order|id|ship/i.test(line)) {
        continue;
      }

      // Split by tab, comma, semicolon, or double spaces
      let parts = line.includes('\t') 
        ? line.split('\t') 
        : line.includes(',') 
          ? line.split(',') 
          : line.includes(';') 
            ? line.split(';') 
            : line.split(/\s{2,}/);

      parts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      // Extract numeric value from last or second token
      let idToken = parts[0];
      let valueToken = parts[1];

      // If parts has 3 columns (e.g. Store Order ID, Shipment ID, Value)
      if (parts.length >= 3) {
        if (!isNaN(parseFloat(parts[2].replace(/[R\s,]/g, '')))) {
          valueToken = parts[2];
        }
      }

      const numVal = parseFloat(valueToken.replace(/[R\s,]/g, ''));
      if (isNaN(numVal)) continue;

      const targetId = cleanId(idToken);
      const secondTarget = cleanId(parts[1]);

      // Match against rows
      for (const row of newRows) {
        const rowStore = cleanId(row.sourceStoreOrderId);
        const rowShip = cleanId(row.shipmentId);
        const rowOrder = cleanId(row.orderNumber);
        const rowWaybill = cleanId(row.waybillNumber);

        const isMatch = 
          (targetId && (rowStore === targetId || rowShip === targetId || rowOrder === targetId || rowWaybill === targetId)) ||
          (secondTarget && (rowStore === secondTarget || rowShip === secondTarget || rowOrder === secondTarget));

        if (isMatch) {
          row.orderValue = numVal;
          row.isMatched = true;
          matchedCount++;
          break;
        }
      }
    }

    setRows(newRows);
    if (matchedCount > 0) {
      setParseNotice({
        type: 'success',
        message: `Successfully matched and updated order values for ${matchedCount} shipment${matchedCount === 1 ? '' : 's'}!`
      });
      setActiveTab('table');
    } else {
      setParseNotice({
        type: 'error',
        message: 'Could not match any rows. Check that your file/text contains the Store Order ID or Shipment ID alongside the order value.'
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseAndApplyText(content);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleManualValueChange = (index: number, valStr: string) => {
    const cleaned = valStr.replace(/[^\d.]/g, '');
    const num = cleaned === '' ? 0 : parseFloat(cleaned);
    const updated = [...rows];
    updated[index].orderValue = isNaN(num) ? 0 : num;
    updated[index].isMatched = num > 0;
    setRows(updated);
  };

  const handleResetToOriginal = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      orderValue: r.originalValue,
      isMatched: r.originalValue > 0
    })));
    setParseNotice({ type: 'info', message: 'Values reset to current report baselines.' });
  };

  const totalCalculatedVar = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.orderValue) || 0), 0);
  }, [rows]);

  const matchedCount = useMemo(() => {
    return rows.filter(r => r.orderValue > 0).length;
  }, [rows]);

  const handleDownloadTemplate = () => {
    const headers = ["Source Store Order ID", "ParcelNinja Shipment ID", "Customer Name", "Courier", "Waybill Number", "Days Stalled", "Order Value (ZAR)"];
    const csvRows = [headers.join(',')];

    rows.forEach(r => {
      const line = [
        `"${r.sourceStoreOrderId}"`,
        `"${r.shipmentId}"`,
        `"${r.customerName.replace(/"/g, '""')}"`,
        `"${r.courier}"`,
        `"${r.waybillNumber}"`,
        r.daysWithoutUpdate,
        r.orderValue > 0 ? r.orderValue.toFixed(2) : ""
      ];
      csvRows.push(line.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stale_shipments_order_values_template_${reportPeriod?.startDate || 'period'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = rows.map(r => ({
        shipmentId: r.shipmentId,
        sourceStoreOrderId: r.sourceStoreOrderId,
        orderNumber: r.orderNumber,
        customerName: r.customerName,
        courier: r.courier,
        waybillNumber: r.waybillNumber,
        orderValue: r.orderValue,
        valueAtRisk: r.orderValue
      }));

      await onSaveValues(updates);
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      setParseNotice({ type: 'error', message: err.message || 'Failed to save order values' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-200"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-[#003876] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs border border-white/20">
                <FileSpreadsheet className="text-white" size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">Upload Order Values &mdash; Value-at-Risk</h2>
                  <span className="text-[10px] bg-white/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-blue-100">
                    ParcelNinja API Linked
                  </span>
                </div>
                <p className="text-xs text-blue-100/90 font-medium">
                  Link commercial order values to stale shipments using the Source Store Order ID. Values are saved for this specific report.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Metric Bar & Period Info */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Report Period</div>
                <div className="text-xs font-bold font-mono text-gray-800">
                  {reportPeriod ? `${reportPeriod.startDate} → ${reportPeriod.endDate}` : 'Active Checkpoint'}
                  {reportId && <span className="ml-1.5 text-gray-500 font-normal">({reportId})</span>}
                </div>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Stale Shipments</div>
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span>{rows.length} Shipments</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${matchedCount === rows.length ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {matchedCount} / {rows.length} with Values
                  </span>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Calculated Value-at-Risk</div>
                <div className="text-sm font-black font-mono text-[#003876]">
                  R {totalCalculatedVar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Download CSV Template with current Source Store Order IDs and Shipment IDs"
              >
                <Download size={13} className="text-[#003876]" />
                <span>CSV Template</span>
              </button>
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs font-semibold text-gray-600 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="Reset to original values"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 pt-3 border-b border-gray-200 flex gap-4 bg-white text-xs font-bold">
            <button
              onClick={() => setActiveTab('table')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'table' ? 'border-[#003876] text-[#003876]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>1. Interactive Values Register ({rows.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'upload' ? 'border-[#003876] text-[#003876]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Upload size={14} />
              <span>2. Bulk File Upload (CSV / Excel)</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'paste' ? 'border-[#003876] text-[#003876]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Sparkles size={14} />
              <span>3. Quick Paste from Excel</span>
            </button>
          </div>

          {/* Notices */}
          {parseNotice && (
            <div className={`mx-6 mt-3 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              parseNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              parseNotice.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
              'bg-blue-50 text-[#003876] border-blue-200'
            }`}>
              {parseNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="font-medium">{parseNotice.message}</span>
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/40">
            {activeTab === 'table' && (
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-lg shadow-2xs overflow-hidden">
                  <div className="p-3 bg-blue-50/50 border-b border-gray-200 text-xs text-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LinkIcon size={14} className="text-[#003876]" />
                      <span className="font-semibold text-gray-900">
                        Active ParcelNinja Shipments with linked Source Store Order IDs
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 font-mono">
                      Edit values directly or use the Bulk Upload / Paste tabs
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3 w-[26%]">Source Store Order ID &amp; Shipment ID</th>
                        <th className="py-2.5 px-3 w-[22%]">Customer</th>
                        <th className="py-2.5 px-3 w-[18%]">Courier &amp; Waybill</th>
                        <th className="py-2.5 px-3 w-[12%] text-center">Delay</th>
                        <th className="py-2.5 px-3 w-[22%] text-right">Order Value (ZAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-blue-100 text-[#003876] font-mono font-bold text-[11px] rounded border border-blue-200">
                                {row.sourceStoreOrderId}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">linked to</span>
                            </div>
                            <div className="mt-1 text-[10.5px] font-mono text-gray-600 flex items-center gap-1">
                              <span className="text-gray-400">Shipment:</span>
                              <span className="font-semibold">{row.shipmentId}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-800">
                            <div>{row.customerName}</div>
                            <div className="text-[10px] text-gray-400">{row.currentStatus}</div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            <div className="font-semibold text-gray-700">{row.courier}</div>
                            <div className="text-[10px] font-mono text-gray-400">{row.waybillNumber}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[10px]">
                              {row.daysWithoutUpdate > 0 ? `${row.daysWithoutUpdate}d` : '> 2d'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-bold text-gray-500 font-mono text-xs">R</span>
                              <input
                                type="text"
                                value={row.orderValue === 0 ? '' : row.orderValue}
                                placeholder="0.00"
                                onChange={(e) => handleManualValueChange(idx, e.target.value)}
                                className="w-28 px-2 py-1 text-right font-mono font-bold bg-white border border-gray-300 rounded text-xs focus:ring-2 focus:ring-[#003876]/20 focus:border-[#003876] outline-none transition-all shadow-2xs"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-gray-300 hover:border-[#003876] bg-white rounded-xl text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="p-3 bg-blue-50 text-[#003876] rounded-full group-hover:scale-105 transition-transform">
                    <Upload size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Click to select or drag &amp; drop a CSV or TSV file</h3>
                    <p className="text-xs text-gray-500 mt-1">Supports CSV, TSV, or TXT file exports from Shopify or ERP</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="px-3 py-1.5 bg-[#003876] text-white text-xs font-bold rounded shadow-xs group-hover:bg-[#002855]">
                    Browse File
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-2">
                  <div className="font-bold text-gray-800 flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-[#003876]" />
                    Supported Column Formats
                  </div>
                  <p>
                    Your CSV can have column headers such as:
                    <code className="mx-1 bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-gray-800">
                      Store Order ID, Shipment ID, Order Value
                    </code>
                    or simply two columns:
                    <code className="mx-1 bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-gray-800">
                      Order ID, Value
                    </code>.
                  </p>
                  <div className="bg-gray-50 p-2.5 rounded font-mono text-[11px] text-gray-700 border border-gray-200">
                    Store Order ID, Order Value<br/>
                    {rows[0]?.sourceStoreOrderId || '#LSSA-94828'}, 1850.00<br/>
                    {rows[1]?.sourceStoreOrderId || '#LSSA-94799'}, 2450.00
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'paste' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Paste Rows directly from Excel or Google Sheets:
                  </label>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Copy the cells with Store Order ID / Shipment ID and Order Value, and paste here:
                  </p>
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`e.g.\n${rows[0]?.sourceStoreOrderId || 'LSSA-94828'}\t1850.00\n${rows[1]?.sourceStoreOrderId || 'LSSA-94799'}\t2450.00`}
                    className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003876]/20 focus:border-[#003876] outline-none"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => parseAndApplyText(pasteText)}
                      className="px-4 py-2 bg-[#003876] hover:bg-[#002855] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      <span>Parse &amp; Apply Values</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-gray-700">New Value-at-Risk:</span>
              <span className="text-base font-black font-mono text-[#003876]">
                R {totalCalculatedVar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-gray-400 font-medium ml-1">
                ({matchedCount} of {rows.length} updated)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-[#003876] hover:bg-[#002855] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Saving to Report...' : 'Save Values for this Report'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
