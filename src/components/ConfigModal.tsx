import React, { useState } from 'react';
import { X, FileText, PhoneCall, RefreshCw, Undo2, RotateCcw, AlertCircle, ShieldAlert, Calendar, ShieldCheck, CheckCircle2, Database, Activity } from 'lucide-react';
import { getDatesFromWeek } from '../utils/dateUtils';
import axios from 'axios';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: {
    shopifyText: string;
    euphoriaText: string;
    returngoText: string;
    parcelninjaText: string;
    freshdeskText: string;
    startDate: string;
    endDate: string;
  }) => void;
  initialShopifyText: string;
  initialEuphoriaText: string;
  initialReturngoText: string;
  initialParcelninjaText: string;
  initialFreshdeskText: string;
  initialStartDate: string;
  initialEndDate: string;
}

export const SAMPLE_SHOPIFY = ``;

export const SAMPLE_EUPHORIA = ``;

export const SAMPLE_RETURNGO = ``;

export const SAMPLE_PARCELNINJA = ``;

export const SAMPLE_FRESHDESK = ``;

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialShopifyText,
  initialEuphoriaText,
  initialReturngoText,
  initialParcelninjaText,
  initialFreshdeskText,
  initialStartDate,
  initialEndDate
}) => {
  const [activeTab, setActiveTab] = useState<'shopify' | 'euphoria' | 'freshdesk' | 'returngo' | 'parcelninja'>('shopify');
  const [shopifyText, setShopifyText] = useState(initialShopifyText);
  const [euphoriaText, setEuphoriaText] = useState(initialEuphoriaText);
  const [returngoText, setReturngoText] = useState(initialReturngoText);
  const [parcelninjaText, setParcelninjaText] = useState(initialParcelninjaText);
  const [freshdeskText, setFreshdeskText] = useState(initialFreshdeskText);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [weekNumber, setWeekNumber] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [verifyData, setVerifyData] = useState<any>(null);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({
      shopifyText,
      euphoriaText,
      returngoText,
      parcelninjaText,
      freshdeskText,
      startDate,
      endDate
    });
    onClose();
  };

  const handleAutoFillDates = () => {
    const wn = parseInt(weekNumber, 10);
    if (!isNaN(wn) && wn >= 1 && wn <= 53) {
      const { startDate: s, endDate: e } = getDatesFromWeek(wn);
      setStartDate(s);
      setEndDate(e);
    }
  };

  const handleClearAll = () => {
    setShopifyText('');
    setEuphoriaText('');
    setReturngoText('');
    setParcelninjaText('');
    setFreshdeskText('');
    setVerifyData(null);
  };

  const handleLoadAllSamples = () => {
    setShopifyText(SAMPLE_SHOPIFY);
    setEuphoriaText(SAMPLE_EUPHORIA);
    setReturngoText(SAMPLE_RETURNGO);
    setParcelninjaText(SAMPLE_PARCELNINJA);
    setFreshdeskText(SAMPLE_FRESHDESK);
  };

  const handleVerifyConnections = async () => {
    setVerifying(true);
    setVerifyData(null);
    try {
      const res = await axios.post('/api/verify-connections', {
        startDate,
        endDate,
        shopifyText,
        returngoText,
        parcelninjaText,
        freshdeskText,
        euphoriaText
      });
      if (res.data.success) {
        setVerifyData(res.data);
      }
    } catch (err: any) {
      alert("Failed to verify connections: " + (err.message || 'Unknown error'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#003876] text-white">
          <div className="flex items-center gap-2">
            <span className="bg-[#C41230] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Input Center</span>
            <h3 className="text-base font-bold">Manual Operational Data & Record Range Connection Validator</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* DATES & VERIFICATION BAR */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
              <span className="font-semibold text-gray-700">Week:</span>
              <input 
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 w-16"
                placeholder="42"
              />
              <button
                type="button"
                onClick={handleAutoFillDates}
                className="bg-blue-100 text-blue-800 hover:bg-blue-200 font-bold px-2 py-1 rounded cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
            <label className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Start Date:</span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">End Date:</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVerifyConnections}
              disabled={verifying}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              title="Verify first and last record range and live data connections for all integrations"
            >
              <Activity size={13} className={verifying ? "animate-spin" : ""} />
              <span>{verifying ? "Verifying Records..." : "Check First/Last Records & Connections"}</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] bg-red-50 text-red-700 hover:bg-red-100 font-bold px-2.5 py-1.5 rounded border border-red-200 flex items-center gap-1 cursor-pointer"
              title="Clear all manual inputs to verify that unknown values strictly display N/A"
            >
              <Undo2 size={12} /> Clear
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 bg-gray-100 px-6 pt-2">
          <button
            onClick={() => setActiveTab('shopify')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'shopify'
                ? 'border-[#003876] text-[#003876] bg-white rounded-t-md shadow-xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={14} /> Shopify Orders
          </button>
          <button
            onClick={() => setActiveTab('euphoria')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'euphoria'
                ? 'border-[#003876] text-[#003876] bg-white rounded-t-md shadow-xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <PhoneCall size={14} /> Euphoria Telephony
          </button>
          <button
            onClick={() => setActiveTab('freshdesk')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'freshdesk'
                ? 'border-[#003876] text-[#003876] bg-white rounded-t-md shadow-xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Freshdesk Support
          </button>
          <button
            onClick={() => setActiveTab('returngo')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'returngo'
                ? 'border-[#003876] text-[#003876] bg-white rounded-t-md shadow-xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ReturnGo Returns
          </button>
          <button
            onClick={() => setActiveTab('parcelninja')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'parcelninja'
                ? 'border-[#003876] text-[#003876] bg-white rounded-t-md shadow-xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ParcelNinja / Warehouse
          </button>
        </div>

        {/* TAB BODY */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4">
          {verifyData && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-700" />
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                    Live Connections & Record Range Verification ({verifyData.timePeriod.startDate} to {verifyData.timePeriod.endDate})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyData(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                >
                  Close Results
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(verifyData.integrations).map(([key, intg]: [string, any]) => (
                  <div key={key} className="bg-white p-3 rounded border border-emerald-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[#003876]">{intg.name}</span>
                        <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded font-bold ${intg.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {intg.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 space-y-1 mt-2 font-mono">
                        <div><strong className="text-gray-700">First Record:</strong> {intg.firstRecord}</div>
                        <div><strong className="text-gray-700">Last Record:</strong> {intg.lastRecord}</div>
                        <div><strong className="text-gray-700">Records in Period:</strong> {intg.recordCount} verified</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shopify' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Paste the weekly Shopify Order Report text below. Metrics such as Paid Orders, Fulfilled, Unfulfilled, Aging Buckets (1 to 7+ days), Items Sold, Units Available, and Commercial Flags will be extracted automatically.
                </p>
              </div>
              <textarea
                value={shopifyText}
                onChange={(e) => setShopifyText(e.target.value)}
                placeholder="Paste raw Shopify Order report text here..."
                rows={10}
                className="w-full border border-gray-300 rounded p-3 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003876]"
              />
              <p className="text-[11px] text-gray-400">
                Tip: Leave blank to test the zero mock data rule (metrics will display as N/A).
              </p>
            </div>
          )}

          {activeTab === 'euphoria' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Paste the Euphoria Telecom voice report text below. The system extracts Total Calls, Answered, Missed, Answer Rate, and Wait Times.
                </p>
              </div>
              <textarea
                value={euphoriaText}
                onChange={(e) => setEuphoriaText(e.target.value)}
                placeholder="Paste raw Euphoria Telephony report text here..."
                rows={10}
                className="w-full border border-gray-300 rounded p-3 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003876]"
              />
              <p className="text-[11px] text-gray-400">
                Euphoria data is manually inputted just like Shopify. When left empty, all telephony metrics will show N/A.
              </p>
            </div>
          )}

          {activeTab === 'freshdesk' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Manual Freshdesk Customer Service metrics. If API credentials are not configured, this text input will be parsed.
                </p>
              </div>
              <textarea
                value={freshdeskText}
                onChange={(e) => setFreshdeskText(e.target.value)}
                placeholder="Paste Freshdesk metrics or summary..."
                rows={10}
                className="w-full border border-gray-300 rounded p-3 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003876]"
              />
            </div>
          )}

          {activeTab === 'returngo' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Manual ReturnGo RMA metrics. If ReturnGo API is unconfigured or rate-limited, this text is parsed.
                </p>
              </div>
              <textarea
                value={returngoText}
                onChange={(e) => setReturngoText(e.target.value)}
                placeholder="Paste ReturnGo RMA report text here..."
                rows={10}
                className="w-full border border-gray-300 rounded p-3 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003876]"
              />
            </div>
          )}

          {activeTab === 'parcelninja' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Manual ParcelNinja / Warehouse logistics metrics (operational exceptions, warehouse/courier breakdown).
                </p>
              </div>
              <textarea
                value={parcelninjaText}
                onChange={(e) => setParcelninjaText(e.target.value)}
                placeholder="Paste ParcelNinja logistics exceptions text here..."
                rows={10}
                className="w-full border border-gray-300 rounded p-3 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003876]"
              />
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <AlertCircle size={13} className="text-blue-600" />
            Zero mock data guarantee: Any missing/unprovided metrics display as N/A.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-[#003876] hover:bg-blue-900 text-white rounded text-xs font-bold shadow-xs cursor-pointer"
            >
              Apply & Generate WBR
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
