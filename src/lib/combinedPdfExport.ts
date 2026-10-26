import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { toJpeg } from 'html-to-image';
import { WeeklyReportItem } from '../types';

export interface CombinedPDFOptions {
  title?: string;
  subtitle?: string;
  reviewType?: 'Quarterly' | 'Monthly' | 'Multi-Week Executive';
  signOffLead?: string;
}

/**
 * Capture an HTMLElement to image data with desktop 297mm landscape constraints
 */
async function captureElement(element: HTMLElement): Promise<{ imgData: string; width: number; height: number }> {
  let imgData: string | null = null;
  let width = element.scrollWidth || 1122;
  let height = element.scrollHeight || 793;

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
      windowHeight: Math.max(800, element.scrollHeight + 50),
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (el) => el.classList?.contains('no-print'),
    });
    imgData = canvas.toDataURL('image/jpeg', 0.95);
    width = canvas.width;
    height = canvas.height;
  } catch (err) {
    console.warn('html2canvas capture fallback to html-to-image:', err);
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

  if (!imgData) throw new Error('Failed to capture element for PDF');
  return { imgData, width, height };
}

/**
 * Generates a unified combined PDF document from multiple rendered page containers
 */
export async function generateCombinedReportPDF(
  pageElementIds: string[],
  filename: string,
  onProgress?: (current: number, total: number) => void
): Promise<boolean> {
  try {
    const pdfWidth = 297; // Landscape A4 standard width (mm)
    let pdf: jsPDF | null = null;

    for (let i = 0; i < pageElementIds.length; i++) {
      const pageId = pageElementIds[i];
      const el = document.getElementById(pageId);
      if (!el) {
        console.warn(`Element with id ${pageId} not found, skipping page`);
        continue;
      }

      if (onProgress) {
        onProgress(i + 1, pageElementIds.length);
      }

      const capture = await captureElement(el);
      const heightMM = Math.max(210, Math.round(((capture.height / capture.width) * pdfWidth) * 10) / 10);

      if (!pdf) {
        pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [pdfWidth, heightMM],
          compress: true,
        });
        pdf.addImage(capture.imgData, 'JPEG', 0, 0, pdfWidth, heightMM);
      } else {
        pdf.addPage([pdfWidth, heightMM], 'landscape');
        pdf.addImage(capture.imgData, 'JPEG', 0, 0, pdfWidth, heightMM);
      }
    }

    if (!pdf) {
      throw new Error('No valid pages were captured for combined PDF');
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating combined PDF:', error);
    return false;
  }
}
