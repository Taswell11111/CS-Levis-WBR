import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Filter, Download, CheckCircle2, AlertCircle, BookOpen, Layers, Check, AlertTriangle, Printer } from 'lucide-react';
import { getDynamicCatalog } from '../utils/catalogEvaluator';
import { CatalogItem, WBRData } from '../types';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  wbrData?: WBRData | null;
  startDate?: string;
  endDate?: string;
  initialEvaluation?: 'all' | 'PASSED' | 'FAILED' | string;
  initialPage?: 'all' | 'Page 1' | 'Page 2' | 'Page 3' | 'Page 4' | string;
  statusNotice?: string;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({ 
  isOpen, 
  onClose, 
  wbrData,
  startDate,
  endDate,
  initialEvaluation = 'all',
  initialPage = 'all',
  statusNotice
}) => {
  const activeCatalog = useMemo(() => getDynamicCatalog(wbrData), [wbrData]);

  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedPage, setSelectedPage] = useState<string>(initialPage || 'all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>(initialEvaluation || 'all');

  useEffect(() => {
    if (initialEvaluation) {
      setSelectedEvaluation(initialEvaluation);
    }
  }, [initialEvaluation]);

  useEffect(() => {
    if (initialPage) {
      setSelectedPage(initialPage);
    }
  }, [initialPage]);

  const sections = useMemo(() => {
    const set = new Set<string>();
    activeCatalog.forEach(item => set.add(item.section));
    return ['all', ...Array.from(set)];
  }, [activeCatalog]);

  const pages = ['all', 'Page 1', 'Page 2', 'Page 3', 'Page 4'];

  const filteredItems = useMemo(() => {
    return activeCatalog.filter(item => {
      const matchSection = selectedSection === 'all' || item.section === selectedSection;
      const matchPage = selectedPage === 'all' || item.pageNumber.includes(selectedPage);
      const matchEvaluation = selectedEvaluation === 'all' || item.evaluation === selectedEvaluation;
      
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        item.metric.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.section.toLowerCase().includes(term) ||
        item.pageNumber.toLowerCase().includes(term) ||
        item.definition.toLowerCase().includes(term) ||
        item.dataSource.toLowerCase().includes(term) ||
        (item.evaluation && item.evaluation.toLowerCase().includes(term));

      return matchSection && matchPage && matchEvaluation && matchSearch;
    });
  }, [activeCatalog, search, selectedSection, selectedPage, selectedEvaluation]);

  const passedCount = useMemo(() => {
    return activeCatalog.filter(i => i.evaluation === 'PASSED').length;
  }, [activeCatalog]);

  const failedCount = useMemo(() => {
    return activeCatalog.filter(i => i.evaluation === 'FAILED').length;
  }, [activeCatalog]);

  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCSV = () => {
    try {
      setExportingCsv(true);
      const reportPeriodStr = (startDate && endDate) ? `${startDate} to ${endDate}` : 'Operations Scope';
      const exportDateStr = new Date().toISOString().slice(0, 10);

      const headers = [
        'Index',
        'Page Number',
        'Section',
        'Category',
        'Metric',
        'Data Source',
        'Definition / Calculation',
        'Frequency',
        'Target / Benchmark',
        'Current Value',
        'Evaluation (Passed/Failed)',
        'Integration Status',
        'Reporting Period',
        'Export Date'
      ];

      const rows = activeCatalog.map((i, idx) => [
        idx + 1,
        `"${(i.pageNumber || '').replace(/"/g, '""')}"`,
        `"${(i.section || '').replace(/"/g, '""')}"`,
        `"${(i.category || '').replace(/"/g, '""')}"`,
        `"${(i.metric || '').replace(/"/g, '""')}"`,
        `"${(i.dataSource || '').replace(/"/g, '""')}"`,
        `"${(i.definition || '').replace(/"/g, '""')}"`,
        `"${(i.frequency || '').replace(/"/g, '""')}"`,
        `"${(i.benchmark || '').replace(/"/g, '""')}"`,
        `"${(i.currentValue || 'N/A').toString().replace(/"/g, '""')}"`,
        `"${(i.evaluation || 'PASSED')}"`,
        `"${(i.status || 'integrated')}"`,
        `"${reportPeriodStr}"`,
        `"${exportDateStr}"`
      ]);

      // Prepend UTF-8 BOM (\uFEFF) to ensure Microsoft Excel and text parsers correctly display all characters and data
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const safeStart = startDate ? startDate.replace(/[^a-zA-Z0-9]/g, '_') : 'WBR';
      const safeEnd = endDate ? endDate.replace(/[^a-zA-Z0-9]/g, '_') : 'Operations';
      const filename = `Levis_SA_WBR_Metric_Catalogue_${safeStart}_to_${safeEnd}_${exportDateStr}.csv`;

      let downloadSuccess = false;

      // Method 1: Standard Blob with application/octet-stream fallback
      try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        downloadSuccess = true;
        setTimeout(() => {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
        }, 500);
      } catch (blobErr) {
        console.warn('Blob download failed, trying data URI fallback:', blobErr);
      }

      // Method 2: Data URI Fallback if Blob failed
      if (!downloadSuccess) {
        const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const link = document.createElement('a');
        link.href = encodedUri;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('CSV Export Error:', err);
      alert('Unable to generate CSV: ' + (err.message || 'Unknown error'));
    } finally {
      setTimeout(() => setExportingCsv(false), 800);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-7xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-300">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#003876] text-white flex items-center justify-between border-b border-[#002b5c]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C41230] rounded-lg shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Levi's SA WBR Operations Metric Catalogue</h2>
                <span className="bg-white/20 text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  {activeCatalog.length} Metrics
                </span>
                {startDate && endDate && (
                  <span className="bg-[#C41230] text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-red-300/40">
                    {startDate} &ndash; {endDate}
                  </span>
                )}
                {statusNotice && (
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tight shadow-xs border border-amber-300">
                    {statusNotice}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100/90">
                Official operational dictionary, reporting page mappings, SLAs, benchmarks, and real-time pass/fail evaluations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded text-white border border-white/20 transition cursor-pointer"
              title="Print metric catalogue"
            >
              <Printer className="w-3.5 h-3.5 text-blue-200" />
              Print
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exportingCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded text-white border border-white/20 transition cursor-pointer disabled:opacity-60"
              title="Download full catalogue as CSV"
            >
              <Download className={`w-3.5 h-3.5 text-blue-200 ${exportingCsv ? 'animate-bounce' : ''}`} />
              {exportingCsv ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col gap-3">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search catalogue by metric, section, definition, benchmark, or evaluation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#003876] focus:border-[#003876] shadow-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Evaluation Pass/Fail quick filters */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 px-2">Evaluation:</span>
              <button
                type="button"
                onClick={() => setSelectedEvaluation('all')}
                className={`px-2.5 py-1 text-xs rounded font-bold transition ${
                  selectedEvaluation === 'all'
                    ? 'bg-gray-800 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({activeCatalog.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedEvaluation('PASSED')}
                className={`px-2.5 py-1 text-xs rounded font-bold transition flex items-center gap-1 ${
                  selectedEvaluation === 'PASSED'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 size={12} />
                Passed ({passedCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedEvaluation('FAILED')}
                className={`px-2.5 py-1 text-xs rounded font-bold transition flex items-center gap-1 ${
                  selectedEvaluation === 'FAILED'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <AlertCircle size={12} />
                Failed ({failedCount})
              </button>
            </div>
          </div>

          {/* Secondary filter bars: Page filter & Section filter */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-200 text-xs">
            
            {/* Page Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-[#003876] flex items-center gap-1">
                <Layers size={13} />
                Page:
              </span>
              {pages.map(pg => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setSelectedPage(pg)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    selectedPage === pg
                      ? 'bg-[#003876] text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {pg === 'all' ? 'All Pages' : pg}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-gray-300 hidden md:block" />

            {/* Section Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
              <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="font-bold text-gray-600 shrink-0">Section:</span>
              {sections.map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={`px-2 py-0.5 text-[11px] rounded whitespace-nowrap font-medium transition ${
                    selectedSection === sec
                      ? 'bg-[#C41230] text-white font-bold shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {sec === 'all' ? 'All Sections' : sec.replace(/^[A-G]\.\s*/, '')}
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* Catalogue Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 bg-gray-100/50">
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-xs bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300 text-[11px] uppercase tracking-wider">
                  <th className="p-2.5 text-center w-12 border-r border-gray-200 bg-gray-200/60">#</th>
                  <th className="p-2.5 w-24 text-center border-r border-gray-200">Page Number</th>
                  <th className="p-2.5 w-48 border-r border-gray-200">Section</th>
                  <th className="p-2.5 w-48 border-r border-gray-200">Metric</th>
                  <th className="p-2.5 w-32 border-r border-gray-200">Category</th>
                  <th className="p-2.5 w-36 border-r border-gray-200">Data Source</th>
                  <th className="p-2.5 min-w-[200px] border-r border-gray-200">Definition / Calculation</th>
                  <th className="p-2.5 w-32 border-r border-gray-200">Target / Benchmark</th>
                  <th className="p-2.5 w-32 text-right border-r border-gray-200">Current Value</th>
                  <th className="p-2.5 w-28 text-center bg-gray-50">Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-gray-500">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="font-bold text-gray-700">No catalogue metrics found matching your criteria.</p>
                      <p className="text-xs text-gray-400 mt-1">Try resetting the search terms or filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isPassed = item.evaluation === 'PASSED';
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-blue-50/40 transition-colors ${
                          !isPassed ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        {/* Row # */}
                        <td className="p-2.5 text-center font-mono font-bold text-gray-500 border-r border-gray-200 bg-gray-50/40">
                          {idx + 1}
                        </td>

                        {/* Page Number */}
                        <td className="p-2.5 text-center border-r border-gray-200">
                          <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-blue-50 text-[#003876] border border-blue-200 shadow-2xs whitespace-nowrap">
                            {item.pageNumber}
                          </span>
                        </td>

                        {/* Section */}
                        <td className="p-2.5 border-r border-gray-200">
                          <div className="font-semibold text-gray-900 leading-snug">
                            {item.section}
                          </div>
                        </td>

                        {/* Metric */}
                        <td className="p-2.5 border-r border-gray-200">
                          <div className="font-bold text-gray-900">{item.metric}</div>
                        </td>

                        {/* Category */}
                        <td className="p-2.5 text-gray-600 border-r border-gray-200">
                          <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10.5px] font-medium text-gray-700 whitespace-nowrap">
                            {item.category}
                          </span>
                        </td>

                        {/* Data Source */}
                        <td className="p-2.5 text-gray-600 border-r border-gray-200">
                          <div className="font-mono text-[11px] text-gray-800 font-medium">{item.dataSource}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Freq: {item.frequency}</div>
                        </td>

                        {/* Definition / Calculation */}
                        <td className="p-2.5 text-gray-600 leading-relaxed border-r border-gray-200 text-[11.5px]">
                          {item.definition}
                        </td>

                        {/* Target / Benchmark */}
                        <td className="p-2.5 border-r border-gray-200">
                          <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-[11px]">
                            {item.benchmark}
                          </span>
                        </td>

                        {/* Current Value */}
                        <td className="p-2.5 text-right font-bold text-gray-900 font-mono text-[11.5px] border-r border-gray-200">
                          {item.currentValue || 'N/A'}
                        </td>

                        {/* Evaluation: PASSED or FAILED (Last Column) */}
                        <td className="p-2.5 text-center">
                          {isPassed ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold tracking-wide shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              PASSED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold tracking-wide shadow-2xs">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                              FAILED
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <div>
              Showing <strong>{filteredItems.length}</strong> of <strong>{activeCatalog.length}</strong> metrics
            </div>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-3 font-semibold text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Passed: {passedCount} ({Math.round((passedCount / activeCatalog.length) * 100)}%)
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Failed: {failedCount} ({Math.round((failedCount / activeCatalog.length) * 100)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400 font-mono">
              eCompleteCommerce | A Smollan Company &bull; 2026
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#003876] hover:bg-[#002b5c] text-white rounded font-bold transition shadow-xs cursor-pointer"
            >
              Close Catalogue
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
