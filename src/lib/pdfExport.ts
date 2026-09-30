import html2canvas from 'html2canvas-pro';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

async function captureElementToImageData(element: HTMLElement): Promise<{ imgData: string; width: number; height: number }> {
  let imgData: string | null = null;
  let width = element.scrollWidth || 1122;
  let height = element.scrollHeight || 793;

  // Temporarily enforce fixed 297mm desktop width during capture to prevent responsive collapsing in smaller viewports/iframes
  const origWidth = element.style.width;
  const origMaxWidth = element.style.maxWidth;
  const origBoxSizing = element.style.boxSizing;

  element.style.width = '1122.5px'; // 297mm at 96 DPI
  element.style.maxWidth = '1122.5px';
  element.style.boxSizing = 'border-box';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#F8F9FA',
      windowWidth: 1280,
      windowHeight: Math.max(1000, element.scrollHeight + 100),
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (el) => el.classList?.contains('no-print'),
    });
    imgData = canvas.toDataURL('image/jpeg', 0.95);
    width = canvas.width;
    height = canvas.height;
  } catch (h2cError) {
    console.warn('html2canvas-pro capture failed, attempting html-to-image fallback:', h2cError);
    imgData = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#F8F9FA',
      filter: (node: HTMLElement) => !node.classList?.contains('no-print'),
    });
  } finally {
    element.style.width = origWidth;
    element.style.maxWidth = origMaxWidth;
    element.style.boxSizing = origBoxSizing;
  }

  if (!imgData) {
    throw new Error('Failed to capture element');
  }

  return { imgData, width, height };
}

export async function downloadWBRReportAsPDF(containerId: string, filename: string): Promise<boolean> {
  try {
    const page1El = document.getElementById('wbr-page-1');
    const page2El = document.getElementById('wbr-page-2');
    const page3El = document.getElementById('wbr-page-3');
    const page4El = document.getElementById('wbr-page-4');

    // Landscape A4 standard width: 297mm
    const pdfWidth = 297;

    if (page1El && page2El) {
      // Page 1: Executive Overview & Synthesis
      const page1Capture = await captureElementToImageData(page1El);
      const page1HeightMM = Math.max(210, Math.round(((page1Capture.height / page1Capture.width) * pdfWidth) * 10) / 10);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pdfWidth, page1HeightMM],
        compress: true,
      });
      pdf.addImage(page1Capture.imgData, 'JPEG', 0, 0, pdfWidth, page1HeightMM);

      // Page 2: Open Backlog Queue & Active RMA Pipeline
      const page2Capture = await captureElementToImageData(page2El);
      const page2HeightMM = Math.max(210, Math.round(((page2Capture.height / page2Capture.width) * pdfWidth) * 10) / 10);
      pdf.addPage([pdfWidth, page2HeightMM], 'landscape');
      pdf.addImage(page2Capture.imgData, 'JPEG', 0, 0, pdfWidth, page2HeightMM);

      // Page 3: Inbound Enquiries, Commercials & Merchandising
      if (page3El) {
        const page3Capture = await captureElementToImageData(page3El);
        const page3HeightMM = Math.max(210, Math.round(((page3Capture.height / page3Capture.width) * pdfWidth) * 10) / 10);
        pdf.addPage([pdfWidth, page3HeightMM], 'landscape');
        pdf.addImage(page3Capture.imgData, 'JPEG', 0, 0, pdfWidth, page3HeightMM);
      }

      // Page 4: Warehouse Fulfilment, Stale Shipments & 3PL Audit
      if (page4El) {
        const page4Capture = await captureElementToImageData(page4El);
        const page4HeightMM = Math.max(210, Math.round(((page4Capture.height / page4Capture.width) * pdfWidth) * 10) / 10);
        pdf.addPage([pdfWidth, page4HeightMM], 'landscape');
        pdf.addImage(page4Capture.imgData, 'JPEG', 0, 0, pdfWidth, page4HeightMM);
      }

      pdf.save(filename);
      return true;
    } else {
      // Fallback to single container
      const containerEl = document.getElementById(containerId);
      if (!containerEl) {
        throw new Error(`Element ${containerId} not found`);
      }
      const capture = await captureElementToImageData(containerEl);
      const heightMM = Math.max(210, Math.round(((capture.height / capture.width) * pdfWidth) * 10) / 10);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pdfWidth, heightMM],
        compress: true,
      });
      pdf.addImage(capture.imgData, 'JPEG', 0, 0, pdfWidth, heightMM);
      pdf.save(filename);
      return true;
    }
  } catch (error) {
    console.error('PDF Export Error:', error);
    // Fallback to system print dialog if canvas generation fails
    window.print();
    return false;
  }
}
