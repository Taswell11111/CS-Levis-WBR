/**
 * Interactive Standalone HTML Generator for Levi's CS & Operations WBR Dashboard
 * 
 * Generates an exact, self-contained interactive replica of the 4-page dashboard
 * suitable for hosting on Google Cloud Storage / Google Cloud Console, or opening
 * offline in any web browser.
 */

import { WBRData } from '../types';
import { getDynamicCatalog } from './catalogEvaluator';

export interface HTMLGeneratorOptions {
  data: WBRData;
  startDate: string;
  endDate: string;
  zoomLevel: number;
}

export const GCS_BUCKET_INFO = {
  bucket: "ai-studio-bucket-275737853276-us-west1",
  folder: "Upload and report generation archive/Live",
  archiveFolder: "Upload and report generation archive/Inactive",
  project: "levis-report",
  consoleUrl: "https://console.cloud.google.com/storage/browser/ai-studio-bucket-275737853276-us-west1/Upload%20and%20report%20generation%20archive/Live"
};

export function generateStandaloneInteractiveHTML(options: HTMLGeneratorOptions): string {
  const { data, startDate, endDate, zoomLevel } = options;
  const activeCatalog = getDynamicCatalog(data);

  // 1. Gather all CSS rules from active document
  let collectedStyles = '';
  try {
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach((el) => {
      collectedStyles += el.textContent + '\n';
    });

    const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((el) => {
      const link = el as HTMLLinkElement;
      if (link.sheet) {
        try {
          const rules = link.sheet.cssRules;
          for (let i = 0; i < rules.length; i++) {
            collectedStyles += rules[i].cssText + '\n';
          }
        } catch {
          // Cross-origin CSS ignored
        }
      }
    });
  } catch (e) {
    console.warn('Could not collect full document styles:', e);
  }

  // 2. Clone the dashboard DOM
  const dashboardElement = document.getElementById('wbr-canvas-wrapper');
  let dashboardHtml = '';
  if (dashboardElement) {
    const clone = dashboardElement.cloneNode(true) as HTMLElement;
    
    // Remove transient loaders or unwanted elements
    const loaders = clone.querySelectorAll('.animate-spin, .no-export');
    loaders.forEach(el => el.remove());

    dashboardHtml = clone.innerHTML;
  }

  // 3. Standalone Modals (Driver Actionable Tickets, Campaign Attribution, Metrics Catalogue)
  const driverTickets = data.data?.contactDriverTickets || [];
  const campaigns = data.data?.shopify?.campaign?.campaignRevenueBreakdown || [];
  const topDiscountCodes = data.data?.shopify?.campaign?.topDiscountCodes || [];

  const driverTicketsModalHtml = `
    <div id="standalone-driver-modal" class="gcp-modal-backdrop" style="display: none;">
      <div class="gcp-modal-box">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-[#003876] text-white rounded-t-lg">
          <div class="flex items-center gap-2">
            <span class="bg-[#C41230] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Urgent 3PL</span>
            <h3 class="text-sm font-bold">Contact Driver / Delivery Actionable Tickets (${driverTickets.length} Cases)</h3>
          </div>
          <button onclick="hideModal('standalone-driver-modal')" class="text-white/80 hover:text-white text-lg font-bold px-2 cursor-pointer">&times;</button>
        </div>
        <div class="p-4 max-h-[70vh] overflow-y-auto">
          <p class="text-xs text-gray-600 mb-3">
            Showing actionable tickets requiring courier driver coordination and depot sweeps.
          </p>
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b">
              <tr>
                <th class="p-2">Ticket ID</th>
                <th class="p-2">Order #</th>
                <th class="p-2">Customer</th>
                <th class="p-2">Subject / Driver Note</th>
                <th class="p-2">Status</th>
                <th class="p-2">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 font-mono text-[11px]">
              ${driverTickets.length > 0 ? driverTickets.map(t => `
                <tr class="hover:bg-blue-50/40">
                  <td class="p-2 font-bold text-[#003876]"><a href="${t.ticketUrl || '#'}" target="_blank" class="hover:underline">${t.id}</a></td>
                  <td class="p-2">${t.orderNumber}</td>
                  <td class="p-2 font-sans font-medium">${t.customerName}</td>
                  <td class="p-2 font-sans text-gray-800">${t.subject}</td>
                  <td class="p-2"><span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">${t.status}</span></td>
                  <td class="p-2 text-gray-500">${t.createdDate}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="6" class="p-4 text-center text-gray-500 italic">No open driver return tickets found.</td></tr>
              `}
            </tbody>
          </table>
        </div>
        <div class="p-3 border-t bg-gray-50 flex justify-end">
          <button onclick="hideModal('standalone-driver-modal')" class="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold px-3 py-1.5 rounded cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  `;

  const catalogModalHtml = `
    <div id="standalone-catalog-modal" class="gcp-modal-backdrop" style="display: none;">
      <div class="gcp-modal-box" style="max-width: 1200px;">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-[#003876] text-white rounded-t-lg">
          <div class="flex items-center gap-3">
            <span class="bg-[#C41230] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Dictionary</span>
            <h3 class="text-sm font-bold">Levi's SA WBR Operations Metric Catalogue (${activeCatalog.length} Metrics)</h3>
          </div>
          <button onclick="hideModal('standalone-catalog-modal')" class="text-white/80 hover:text-white text-lg font-bold px-2 cursor-pointer">&times;</button>
        </div>
        <div class="p-4 max-h-[75vh] overflow-y-auto overflow-x-auto">
          <p class="text-xs text-gray-600 mb-3">
            Standard operating metrics dictionary, target benchmarks, page mapping, and real-time pass/fail audit.
          </p>
          <table class="w-full text-left text-xs border-collapse border border-gray-200">
            <thead class="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b">
              <tr>
                <th class="p-2 text-center w-10 border-r border-gray-200">#</th>
                <th class="p-2 text-center w-20 border-r border-gray-200">Page Number</th>
                <th class="p-2 w-36 border-r border-gray-200">Section</th>
                <th class="p-2 w-44 border-r border-gray-200">Metric</th>
                <th class="p-2 w-28 border-r border-gray-200">Category</th>
                <th class="p-2 w-32 border-r border-gray-200">Data Source</th>
                <th class="p-2 min-w-[200px] border-r border-gray-200">Definition / Calculation</th>
                <th class="p-2 w-28 border-r border-gray-200">Benchmark</th>
                <th class="p-2 w-28 text-right border-r border-gray-200">Current Value</th>
                <th class="p-2 w-24 text-center">Evaluation</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 text-[11px]">
              ${activeCatalog.map((item, idx) => `
                <tr class="hover:bg-blue-50/40 ${item.evaluation !== 'PASSED' ? 'bg-rose-50/20' : ''}">
                  <td class="p-2 text-center font-mono font-bold text-gray-500 border-r border-gray-200 bg-gray-50/40">${idx + 1}</td>
                  <td class="p-2 text-center border-r border-gray-200">
                    <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#003876] border border-blue-200">${item.pageNumber}</span>
                  </td>
                  <td class="p-2 font-semibold text-gray-900 border-r border-gray-200">${item.section}</td>
                  <td class="p-2 font-bold text-gray-900 border-r border-gray-200">${item.metric}</td>
                  <td class="p-2 text-gray-600 border-r border-gray-200">${item.category}</td>
                  <td class="p-2 font-mono text-[10.5px] text-gray-700 border-r border-gray-200">${item.dataSource}</td>
                  <td class="p-2 text-gray-600 border-r border-gray-200">${item.definition}</td>
                  <td class="p-2 border-r border-gray-200"><span class="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-200">${item.benchmark}</span></td>
                  <td class="p-2 text-right font-mono font-bold text-gray-900 border-r border-gray-200">${item.currentValue || 'N/A'}</td>
                  <td class="p-2 text-center">
                    ${item.evaluation === 'PASSED'
                      ? '<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">PASSED</span>'
                      : '<span class="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">FAILED</span>'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="p-3 border-t bg-gray-50 flex justify-between items-center text-xs text-gray-500">
          <span>eCompleteCommerce | A Smollan Company &bull; 2026</span>
          <button onclick="hideModal('standalone-catalog-modal')" class="bg-[#003876] hover:bg-[#002b5c] text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  `;

  // 4. Fallback and critical A4 CSS
  const criticalA4Styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      background-color: #E5E7EB;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1A1A1A;
      -webkit-font-smoothing: antialiased;
    }

    .font-mono {
      font-family: 'JetBrains Mono', monospace, ui-monospace;
    }

    .a4-canvas {
      width: 297mm;
      min-height: 210mm;
      box-sizing: border-box;
      background-color: #F8F9FA;
      margin-left: auto;
      margin-right: auto;
      page-break-after: always;
      break-after: page;
    }

    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    @media print {
      body {
        background-color: transparent !important;
        padding: 0 !important;
      }
      .no-print, #gcp-export-banner, #standalone-sticky-nav {
        display: none !important;
      }
      .a4-canvas {
        width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 6mm !important;
        page-break-after: always !important;
        break-after: page !important;
      }
    }

    /* Modal styles */
    .gcp-modal-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .gcp-modal-box {
      background: #ffffff;
      border-radius: 10px;
      max-width: 900px;
      width: 100%;
      max-height: 88vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      border: 1px solid #D1D5DB;
    }

    /* Standalone HTML tooltip hover support */
    span[role="tooltip"]:hover > div {
      opacity: 1 !important;
      visibility: visible !important;
      transform: scale(1) !important;
    }

    #wbr-printable-report {
      transform-origin: top center;
      transition: transform 0.2s ease;
    }
  `;

  // 5. Embedded client scripts for tabs, modals, and tooltips
  const interactiveScript = `
    (function() {
      // 1. Interactive Tab Logic for Page 2 (Freshdesk vs ReturnGo Queues)
      window.initP2Tabs = function() {
        const p2 = document.getElementById('wbr-page-2');
        if (!p2) return;

        const p2Sections = p2.querySelectorAll('section');
        const queueButtons = p2.querySelectorAll('button');

        queueButtons.forEach(btn => {
          btn.addEventListener('click', function() {
            const text = btn.innerText.trim().toLowerCase();
            if (text.includes('driver') || text.includes('modal')) {
              window.showModal('standalone-driver-modal');
              return;
            }

            if (text.includes('all') || text.includes('freshdesk') || text.includes('returngo')) {
              queueButtons.forEach(b => {
                if (b.parentElement === btn.parentElement) {
                  b.classList.remove('bg-white', 'text-[#003876]', 'shadow-xs', 'font-bold');
                  b.classList.add('text-gray-600');
                }
              });
              btn.classList.remove('text-gray-600');
              btn.classList.add('bg-white', 'text-[#003876]', 'shadow-xs', 'font-bold');

              if (p2Sections.length >= 2) {
                if (text.includes('all')) {
                  p2Sections[0].style.display = 'block';
                  p2Sections[1].style.display = 'block';
                } else if (text.includes('freshdesk')) {
                  p2Sections[0].style.display = 'block';
                  p2Sections[1].style.display = 'none';
                } else if (text.includes('returngo')) {
                  p2Sections[0].style.display = 'none';
                  p2Sections[1].style.display = 'block';
                }
              }
            }
          });
        });
      };

      // 2. Interactive Tab Logic for Page 3 (Commercials & Returns Triage)
      window.initP3Tabs = function() {
        const p3 = document.getElementById('wbr-page-3');
        if (!p3) return;

        const buttons = p3.querySelectorAll('button');
        buttons.forEach(btn => {
          btn.addEventListener('click', function() {
            const text = btn.innerText.trim().toLowerCase();
            if (text.includes('campaign') && (text.includes('revenue') || text.includes('modal'))) {
              window.showModal('standalone-campaign-modal');
              return;
            }

            // Handle Product view tabs (Top 5 / Bottom 5) or Return view tabs (Items / Actions / Reasons / Pipeline)
            const parentGroup = btn.parentElement;
            if (parentGroup && (parentGroup.classList.contains('bg-gray-100') || parentGroup.classList.contains('flex'))) {
              const groupButtons = parentGroup.querySelectorAll('button');
              groupButtons.forEach(b => {
                b.classList.remove('bg-white', 'text-[#003876]', 'text-[#C41230]', 'shadow-xs', 'shadow-2xs', 'font-bold');
                b.classList.add('text-gray-600');
              });
              btn.classList.remove('text-gray-600');
              if (text.includes('top') || text.includes('bottom') || text.includes('campaign')) {
                btn.classList.add('bg-white', 'text-[#003876]', 'shadow-2xs', 'font-bold');
              } else {
                btn.classList.add('bg-white', 'text-[#C41230]', 'shadow-xs', 'font-bold');
              }
            }

            // Also toggle visibility of panels if matching sibling containers have style attribute
            const card = btn.closest('.bg-white.border');
            if (card) {
              const panels = card.querySelectorAll('.interactive-panel');
              if (panels.length >= 2) {
                // Determine active index
                const groupButtons = parentGroup ? Array.from(parentGroup.querySelectorAll('button')) : [];
                const idx = groupButtons.indexOf(btn);
                if (idx >= 0 && idx < panels.length) {
                  panels.forEach((p, pIdx) => {
                    (p as HTMLElement).style.display = pIdx === idx ? 'block' : 'none';
                  });
                }
              }
            }
          });
        });
      };

      // 3. Interactive Tab Logic for Page 4 (Fulfillment + Aging Analysis)
      window.initP4Tabs = function() {
        const p4 = document.getElementById('wbr-page-4');
        if (!p4) return;

        const buttons = p4.querySelectorAll('button');
        buttons.forEach(btn => {
          btn.addEventListener('click', function() {
            const text = btn.innerText.trim().toLowerCase();
            const parentGroup = btn.parentElement;
            if (parentGroup) {
              parentGroup.querySelectorAll('button').forEach(b => {
                b.classList.remove('bg-white', 'text-[#003876]', 'shadow-xs', 'font-bold');
                b.classList.add('text-gray-600');
              });
              btn.classList.remove('text-gray-600');
              btn.classList.add('bg-white', 'text-[#003876]', 'shadow-xs', 'font-bold');
            }

            const section = btn.closest('section');
            if (section) {
              const panels = section.querySelectorAll(':scope > div[style]');
              if (panels.length >= 2) {
                const groupButtons = parentGroup ? Array.from(parentGroup.querySelectorAll('button')) : [];
                const idx = groupButtons.indexOf(btn);
                if (idx >= 0 && idx < panels.length) {
                  panels.forEach((p, pIdx) => {
                    (p as HTMLElement).style.display = pIdx === idx ? 'block' : 'none';
                  });
                } else {
                  // Fallback string matching
                  if (text.includes('daily') || text.includes('matrix')) {
                    panels[0].style.display = 'block';
                    if (panels[1]) panels[1].style.display = 'none';
                    if (panels[2]) panels[2].style.display = 'none';
                  } else if (text.includes('manifest') || text.includes('stale')) {
                    if (panels[0]) panels[0].style.display = 'none';
                    if (panels[1]) panels[1].style.display = 'block';
                    if (panels[2]) panels[2].style.display = 'none';
                  } else if (text.includes('aging') || text.includes('lifecycle')) {
                    if (panels[0]) panels[0].style.display = 'none';
                    if (panels[1]) panels[1].style.display = 'none';
                    if (panels[2]) panels[2].style.display = 'block';
                  }
                }
              }
            }
          });
        });
      };

      // 4. Quick-jump navigation with viewport support
      window.scrollToPage = function(pageId) {
        const el = document.getElementById(pageId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const viewport = document.getElementById('wbr-canvas-viewport') || document.getElementById('wbr-canvas-wrapper');
          if (viewport) {
            const rect = el.getBoundingClientRect();
            viewport.scrollTo({ top: viewport.scrollTop + rect.top - 80, behavior: 'smooth' });
          }
        }
      };

      // 5. Modal Helpers
      window.showModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'flex';
      };

      window.hideModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
      };

      // Attach global trigger for driver modal and catalog modal buttons across all pages
      document.addEventListener('click', function(e) {
        const target = e.target.closest('button, a');
        if (target) {
          const t = target.innerText.toLowerCase();
          if (t.includes('driver') && (t.includes('modal') || t.includes('ticket'))) {
            e.preventDefault();
            window.showModal('standalone-driver-modal');
          } else if (t.includes('metric') && (t.includes('catalog') || t.includes('catalogue'))) {
            e.preventDefault();
            window.showModal('standalone-catalog-modal');
          }
        }
      });

      // Generic Reusable Vanilla JavaScript Tab Controller
      window.initGenericTabs = function() {
        const tabButtons = document.querySelectorAll('button[data-tab-group]');
        if (tabButtons.length === 0) return;

        const groups = {};
        tabButtons.forEach(btn => {
          const g = btn.getAttribute('data-tab-group');
          if (!groups[g]) groups[g] = [];
          groups[g].push(btn);
        });

        Object.keys(groups).forEach(gName => {
          const buttons = groups[gName];
          buttons.forEach(btn => {
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              const targetId = btn.getAttribute('data-tab-target');
              
              buttons.forEach(b => {
                b.classList.remove('bg-[#003876]', 'text-white', 'shadow-xs', 'shadow-2xs', 'font-bold', 'bg-amber-700', 'bg-rose-700');
                b.classList.add('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
              });

              btn.classList.remove('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
              btn.classList.add('bg-[#003876]', 'text-white', 'shadow-xs', 'font-bold');

              if (targetId) {
                const container = btn.closest('.relative, section, div, .a4-canvas') || document;
                const contents = container.querySelectorAll('[data-tab-content="' + gName + '"]');
                contents.forEach(content => {
                  if (content.getAttribute('data-tab-id') === targetId) {
                    content.style.display = 'block';
                  } else {
                    content.style.display = 'none';
                  }
                });
              }
            });
          });
        });
      };

      // Document ready boot
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          window.initGenericTabs();
          window.initP2Tabs();
          window.initP3Tabs();
          window.initP4Tabs();
          window.initZoom();
        });
      } else {
        window.initGenericTabs();
        window.initP2Tabs();
        window.initP3Tabs();
        window.initP4Tabs();
        window.initZoom();
      }

      window.initZoom = function() {
        const slider = document.getElementById('zoom-slider');
        const report = document.getElementById('wbr-printable-report');
        const zoomContainer = document.getElementById('wbr-zoom-container');
        const viewport = document.getElementById('wbr-canvas-viewport') || document.getElementById('wbr-canvas-wrapper');
        const zoomVal = document.getElementById('zoom-value');
        const btnIn = document.getElementById('btn-zoom-in');
        const btnOut = document.getElementById('btn-zoom-out');
        const btnToggle = document.getElementById('btn-zoom-toggle');
        const btnReset = document.getElementById('btn-zoom-reset');
        if (!report) return;

        let currentZoom = parseFloat(slider ? slider.value : '1') || 1;

        function applyZoom(val, centerPoint) {
          currentZoom = Math.min(1.6, Math.max(0.5, parseFloat(val)));
          report.style.transform = 'scale(' + currentZoom + ')';
          report.style.transformOrigin = '0 0';
          report.style.marginBottom = currentZoom > 1 ? Math.round((currentZoom - 1) * 4100) + 'px' : '0px';

          if (zoomContainer) {
            zoomContainer.style.width = Math.round(297 * currentZoom) + 'mm';
            zoomContainer.style.minWidth = Math.round(297 * currentZoom) + 'mm';
            zoomContainer.style.margin = '0 auto';
          }

          if (slider) slider.value = currentZoom;
          if (zoomVal) zoomVal.innerText = Math.round(currentZoom * 100) + '%';
          if (dragHint) {
            dragHint.style.display = currentZoom > 1 ? 'inline' : 'none';
            dragHint.innerText = isPanMode ? 'Drag to pan' : 'Select text or drag margins';
          }
          if (viewport) {
            viewport.style.cursor = isPanMode ? 'grab' : 'default';
            viewport.title = isPanMode
              ? 'Hand tool active: Click and drag anywhere to pan • Click Hand icon to return to Text Selection'
              : currentZoom > 1 
                ? 'Select/highlight text freely • Drag open margins to pan (or hold Space to pan anywhere) • Double-click open area to reset to 100%' 
                : 'Select/highlight text freely • Double-click open area to zoom into that location';
          }

          if (centerPoint && viewport) {
            const vpRect = viewport.getBoundingClientRect();
            const targetX = centerPoint.unscaledX * currentZoom;
            const targetY = centerPoint.unscaledY * currentZoom;
            const desiredLeft = targetX - (vpRect.width / 2);
            viewport.scrollTo({
              left: Math.max(0, desiredLeft),
              behavior: 'smooth'
            });

            const docTop = (window.scrollY || window.pageYOffset || 0) + centerPoint.reportTop;
            const desiredTop = (docTop + targetY) - (window.innerHeight / 2);
            window.scrollTo({
              top: Math.max(0, desiredTop),
              behavior: 'smooth'
            });
          }
        }

        // Slider input
        if (slider) {
          slider.addEventListener('input', function() {
            applyZoom(slider.value);
          });
        }

        // Plus / Minus buttons
        if (btnIn) {
          btnIn.addEventListener('click', function() {
            applyZoom(+(currentZoom + 0.1).toFixed(2));
          });
        }
        if (btnOut) {
          btnOut.addEventListener('click', function() {
            applyZoom(+(currentZoom - 0.1).toFixed(2));
          });
        }
        if (btnToggle) {
          btnToggle.addEventListener('click', function() {
            applyZoom(Math.abs(currentZoom - 1.35) < 0.05 ? 1.0 : 1.35);
          });
        }
        if (btnReset) {
          btnReset.addEventListener('click', function() {
            applyZoom(1.0);
            if (viewport) viewport.scrollTo({ left: 0, behavior: 'smooth' });
          });
        }

        // Double Click: zoom in towards exact double-clicked area, or revert to 100%
        const clickTarget = viewport || report;
        clickTarget.addEventListener('dblclick', function(e) {
          const target = e.target;
          if (target && target.closest('button, input, select, textarea, a, [role="button"], .gcp-modal-backdrop')) {
            return;
          }

          // If double-clicking on selectable text, allow native word highlighting/selection
          const isText = target && target.closest('p, span, td, th, h1, h2, h3, h4, h5, h6, strong, b, em, label, code, pre, dt, dd, li');
          if (isText && !isPanMode && !isSpacePressed) {
            return;
          }

          // If already zoomed in, revert to default 100% view
          if (currentZoom > 1.05) {
            applyZoom(1.0);
            if (viewport) viewport.scrollTo({ left: 0, behavior: 'smooth' });
            return;
          }

          // Otherwise, zoom in towards where the double click occurred (135%)
          const repRect = report.getBoundingClientRect();
          const unscaledX = (e.clientX - repRect.left) / currentZoom;
          const unscaledY = (e.clientY - repRect.top) / currentZoom;

          applyZoom(1.35, {
            unscaledX: unscaledX,
            unscaledY: unscaledY,
            reportTop: repRect.top
          });
        });

        // Initial boot
        applyZoom(currentZoom);
      };
    })();
      };
    })();
  `;

  // Raw JSON data embedded for programmatic access
  const safeDataJson = JSON.stringify(data).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Levi's Customer Service Executive WBR — ${startDate} to ${endDate}</title>
  <meta name="description" content="Customer Service Weekly Business Review (WBR) Interactive Dashboard for Levi's South Africa (${startDate} to ${endDate}). Hosted in Google Cloud Storage.">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <link rel="icon" type="image/svg+xml" href="https://storage.googleapis.com/ai-studio-bucket-275737853276-us-west1/Upload%20and%20report%20generation%20archive/Live/favicon.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="https://storage.googleapis.com/ai-studio-bucket-275737853276-us-west1/Upload%20and%20report%20generation%20archive/Live/apple-touch-icon.png">
  <meta property="og:title" content="Levi's Customer Service Executive WBR — ${startDate} to ${endDate}">
  <meta property="og:description" content="Interactive 4-page Executive WBR Dashboard with Shopify, Euphoria, Freshdesk, ReturnGo, and ParcelNinja synthesis.">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://storage.googleapis.com/ai-studio-bucket-275737853276-us-west1/Upload%20and%20report%20generation%20archive/Live/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://storage.googleapis.com/ai-studio-bucket-275737853276-us-west1/Upload%20and%20report%20generation%20archive/Live/og-image.png">
  <!-- Tailwind CSS CDN for pristine standalone utility styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${collectedStyles}
    ${criticalA4Styles}
  </style>
</head>
<body class="bg-gray-200 text-gray-900 min-h-screen py-4 flex flex-col items-center">

  <!-- GOOGLE CLOUD STORAGE / HOSTED BANNER -->
  <header id="gcp-export-banner" class="no-print w-full max-w-[297mm] bg-[#003876] text-white px-4 py-2.5 rounded-t-lg shadow-md flex items-center justify-between gap-3 text-xs mb-1">
    <div class="flex items-center gap-2">
      <span class="bg-[#C41230] text-white text-[10px] font-black px-2 py-0.5 rounded-xs uppercase">Levi's</span>
      <span class="font-bold tracking-wide">Customer Service WBR &bull; Interactive Cloud Replica</span>
      <a 
        href="${GCS_BUCKET_INFO.consoleUrl}" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
        title="View in Google Cloud Storage Bucket: gs://${GCS_BUCKET_INFO.bucket}/${GCS_BUCKET_INFO.folder}"
      >
        <span>gs://${GCS_BUCKET_INFO.bucket}/${GCS_BUCKET_INFO.folder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>
    </div>

    <div class="flex items-center gap-2">
      <span class="font-mono text-[10px] text-blue-200 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/30">
        Review Period: ${startDate} to ${endDate}
      </span>
      <button onclick="window.print()" class="bg-white text-[#003876] hover:bg-gray-100 font-bold px-3 py-1 rounded cursor-pointer transition-colors shadow-2xs">
        Print / Save as PDF
      </button>
    </div>
  </header>

  <!-- STICKY QUICK-NAV BAR -->
  <nav id="standalone-sticky-nav" class="no-print sticky top-0 z-50 w-full max-w-[297mm] bg-white/95 backdrop-blur-md border-x border-b border-gray-300 rounded-b-lg p-2.5 mb-4 shadow-md flex flex-wrap items-center justify-between gap-2 text-xs">
    <div class="flex items-center gap-1.5">
      <span class="text-gray-500 font-bold uppercase text-[10px]">Jump to:</span>
      <button onclick="scrollToPage('wbr-page-1')" class="bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-[#003876] font-bold px-2.5 py-1 rounded border border-gray-200 cursor-pointer">
        P1: Executive Overview
      </button>
      <button onclick="scrollToPage('wbr-page-2')" class="bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-[#003876] font-bold px-2.5 py-1 rounded border border-gray-200 cursor-pointer">
        P2: Freshdesk &amp; Calls
      </button>
      <button onclick="scrollToPage('wbr-page-3')" class="bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-[#003876] font-bold px-2.5 py-1 rounded border border-gray-200 cursor-pointer">
        P3: Parcelninja Fulfilment
      </button>
      <button onclick="scrollToPage('wbr-page-4')" class="bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-[#003876] font-bold px-2.5 py-1 rounded border border-gray-200 cursor-pointer">
        P4: ReturnGO RMAs &amp; Commercials
      </button>
    </div>

    <div class="flex items-center gap-2 text-[11px] text-gray-600 font-mono">
      <span>Synthesis Engine: <strong class="text-purple-700">Gemini 2.5 Flash</strong></span>
      &bull;
      <span>Live 3PL: <strong class="text-[#003876]">ParcelNinja + ReturnGo</strong></span>
    </div>
  </nav>

  <!-- ZOOM CONTROL -->
  <div id="standalone-zoom" class="no-print fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-300 shadow-xl">
    <button id="btn-zoom-out" class="p-1 hover:bg-gray-100 rounded-full text-gray-700 cursor-pointer" title="Zoom out">&minus;</button>
    <input id="zoom-slider" type="range" min="0.5" max="1.6" step="0.05" value="${zoomLevel}" class="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#003876]" title="Adjust zoom" />
    <button id="btn-zoom-in" class="p-1 hover:bg-gray-100 rounded-full text-gray-700 cursor-pointer" title="Zoom in">&plus;</button>
    <button id="btn-zoom-toggle" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer" title="Toggle 135% zoom / Double-click open area">135%</button>
    <button id="btn-zoom-reset" class="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 cursor-pointer" title="Reset to 100%">&#8634;</button>
    <span id="zoom-value" class="text-[10.5px] font-bold text-gray-800 min-w-8 text-center font-mono select-none">${Math.round(zoomLevel * 100)}%</span>
  </div>

  <!-- MAIN CANVAS -->
  <main id="wbr-canvas-wrapper" class="w-full flex flex-col items-center overflow-x-auto pb-8">
    ${dashboardHtml}
  </main>

  <!-- STANDALONE MODALS -->
  ${driverTicketsModalHtml}
  ${catalogModalHtml}

  <!-- FOOTER -->
  <footer class="no-print w-full max-w-[297mm] py-4 text-center text-xs text-gray-500">
    <p>Levi's South Africa e-Commerce Operations WBR &bull; Standalone Cloud Archive &bull; Stored in <a href="${GCS_BUCKET_INFO.consoleUrl}" target="_blank" class="text-blue-600 underline">gs://${GCS_BUCKET_INFO.bucket}/${GCS_BUCKET_INFO.folder}</a></p>
    <p class="text-[10.5px] font-bold text-gray-600 font-mono mt-1.5">Levi's Weekly CS &amp; OPS review | A product of eCompleteCommerce | A Smollan Company. Analytics Data Centre. 2026.</p>
  </footer>

  <!-- EMBEDDED RAW DATA STORE -->
  <script>
    window.__WBR_INITIAL_DATA__ = ${safeDataJson};
    window.__WBR_START_DATE__ = "${startDate}";
    window.__WBR_END_DATE__ = "${endDate}";
    window.scrollToPage = function(pageId) {
      const el = document.getElementById(pageId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  </script>

  <!-- INTERACTIVE LOGIC SCRIPT -->
  <script>
    ${interactiveScript}
  </script>
</body>
</html>`;
}

/**
 * Trigger browser file download of the generated HTML
 */
export function downloadInteractiveHTML(options: HTMLGeneratorOptions, filename?: string) {
  const htmlContent = generateStandaloneInteractiveHTML(options);
  const defaultFilename = `Levis_WBR_Interactive_Dashboard_${options.startDate}_to_${options.endDate}.html`;
  const name = filename || defaultFilename;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return htmlContent;
}
