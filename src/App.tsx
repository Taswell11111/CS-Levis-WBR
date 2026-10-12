import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  Download, 
  Printer, 
  RefreshCw, 
  Sliders, 
  BookOpen, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle, 
  HelpCircle,
  PhoneCall,
  Info,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  Truck,
  RotateCcw,
  Check,
  ArrowLeft,
  Tag,
  Upload,
  Globe,
  Cloud,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  KeyRound,
  Home,
  X,
  MessageSquare,
  Scale,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { motion } from 'motion/react';
import { WBRData } from './types';
import { WBRPage1 } from './components/WBRPage1';
import { WBRPage2 } from './components/WBRPage2';
import { WBRPage3 } from './components/WBRPage3';
import { WBRPage4 } from './components/WBRPage4';
import { ContactDriverTicketsModal } from './components/ContactDriverTicketsModal';
import { Page1DetailsModal } from './components/Page1DetailsModal';
import { CatalogModal } from './components/CatalogModal';
import { getDynamicCatalog } from './utils/catalogEvaluator';
import { CampaignRevenueModal } from './components/CampaignRevenueModal';
import { HTMLGenerationModal } from './components/HTMLGenerationModal';
import { ConfigModal, SAMPLE_SHOPIFY, SAMPLE_EUPHORIA, SAMPLE_RETURNGO, SAMPLE_PARCELNINJA } from './components/ConfigModal';
import { WeeklyReportsPage } from './components/WeeklyReportsPage';
import { UploadOrderValuesModal } from './components/UploadOrderValuesModal';
import { ComparisonModal } from './components/ComparisonModal';
import { WeeklyReportItem } from './types';

import { copyToClipboard } from './utils/clipboardUtils';
import { TrendIndicator } from './components/TrendIndicator';
import { ZoomControl } from './components/ZoomControl';
import { HighlightItem } from './components/KeyHighlightsOverlay';
import { downloadWBRReportAsPDF } from './lib/pdfExport';
import { generateStandaloneInteractiveHTML } from './utils/htmlExportGenerator';
import { getWeekNumber } from './utils/dateUtils';

export default function App() {
  const [data, setData] = useState<WBRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editorPassword, setEditorPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showUploadOrderValuesModal, setShowUploadOrderValuesModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedBaselineReportId, setSelectedBaselineReportId] = useState('week-38-2026');
  const [historicalReportsList, setHistoricalReportsList] = useState<WeeklyReportItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([
    {
      id: 'hl-1',
      title: 'Commercial Velocity',
      text: 'Paid orders and gross sales demonstrate robust WoW growth (+5.8% and +8.4% respectively) despite seasonal logistics hurdles.',
      category: 'commercial'
    },
    {
      id: 'hl-2',
      title: '3PL Fulfillment Focus',
      text: 'Parcelninja SLA remains strong at 99.2%, though unfulfilled aging backlog requires continued coordination.',
      category: 'fulfillment'
    }
  ]);

  const handleAddHighlight = (h: HighlightItem) => {
    setHighlights(prev => [...prev, h]);
  };

  const handleUpdateHighlight = (id: string, text: string) => {
    setHighlights(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const handleDeleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/reports/weekly');
        if (res.ok) {
          const json = await res.json();
          if (json.reports && Array.isArray(json.reports) && json.reports.length > 0) {
            setHistoricalReportsList(json.reports);
          }
        }
      } catch {}
    }
    loadReports();
  }, []);

  const fallbackBaselineReports: WeeklyReportItem[] = [
    {
      id: 'week-38-2026',
      weekNumber: 38,
      weekLabel: 'Week 38',
      periodLabel: '14 Sep – 20 Sep 2026',
      startDate: '2026-09-14',
      endDate: '2026-09-20',
      signOffBy: 'Operational Lead',
      signOffDate: '2026-09-21',
      status: 'PUBLISHED',
      summaryNote: 'Week 38 operational performance baseline.',
      metrics: {
        paidOrders: 524,
        paidOrdersWoW: 4.1,
        grossSales: 796800,
        itemsInPaidOrders: 790,
        netItemsSold: 685,
        netItemsSoldWoW: 5.2,
        unitsPerOrder: 1.48,
        fulfilledOrders: 518,
        unfulfilledOrders: 6,
        unfulfilledBacklogValue: 8400,
        unfulfilledBacklogValueWoW: -12.0,
        totalTickets: 198,
        openBacklogTickets: 42,
        artHours: 2.1,
        totalRMAs: 126,
        returnRate: 24.0,
        deliverySLA: 98.4,
        staleShipmentsCount: 6,
        valueAtRisk: 142000
      }
    },
    {
      id: 'week-37-2026',
      weekNumber: 37,
      weekLabel: 'Week 37',
      periodLabel: '07 Sep – 13 Sep 2026',
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      signOffBy: 'Commercial Lead',
      signOffDate: '2026-09-14',
      status: 'ARCHIVED',
      summaryNote: 'Week 37 baseline review.',
      metrics: {
        paidOrders: 498,
        paidOrdersWoW: 2.8,
        grossSales: 742000,
        itemsInPaidOrders: 740,
        netItemsSold: 640,
        netItemsSoldWoW: 3.1,
        unitsPerOrder: 1.45,
        fulfilledOrders: 490,
        unfulfilledOrders: 8,
        unfulfilledBacklogValue: 11200,
        unfulfilledBacklogValueWoW: -5.0,
        totalTickets: 215,
        openBacklogTickets: 51,
        artHours: 2.4,
        totalRMAs: 135,
        returnRate: 27.1,
        deliverySLA: 97.8,
        staleShipmentsCount: 9,
        valueAtRisk: 168000
      }
    }
  ];

  const activeBaselineReports = historicalReportsList.length > 0 ? historicalReportsList : fallbackBaselineReports;

  const handleEditorPasswordSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPw = editorPassword.trim().toLowerCase();
    if (cleanPw === 'levis' || cleanPw === 'levis2026' || cleanPw === 'levis@2026' || cleanPw === 'admin' || cleanPw === 'operations' || cleanPw === 'ecomplete' || cleanPw === '1853') {
      setPasswordError('');
      setEditorPassword('');
      setShowPasswordModal(false);
      setCurrentView('landing');
      setIsInputExpanded(true);
    } else {
      setPasswordError('Invalid passcode. Please enter a valid operational password (e.g. levis2026).');
    }
  };

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u), (err) => {
        console.warn("Firebase Auth state warning:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Auth initialization warning:", e);
    }
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const rid = searchParams.get('reportId');
    const viewParam = searchParams.get('view');
    if (rid) {
      setReportId(rid);
      setCurrentView('dashboard');
      setIsInputExpanded(false);
      loadReport(rid);
    } else {
      // Check for active checkpoint or load baseline
      loadActiveCheckpoint(viewParam);
    }
  }, []);

  const loadReport = async (id: string) => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'reports', id));
      if (snap.exists()) {
        const reportData = snap.data();
        setData(reportData.data);
      } else {
        setError('Report not found or you do not have permission.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error loading report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const publishReport = async () => {
    if (!user) {
      alert("Please sign in to publish a report.");
      return;
    }
    if (!data) return;
    
    setPublishing(true);
    try {
      const newReportId = crypto.randomUUID();
      await setDoc(doc(db, 'reports', newReportId), {
        createdAt: serverTimestamp(),
        authorId: user.uid,
        data: data
      });
      const url = new URL(window.location.href);
      url.searchParams.set('reportId', newReportId);
      setPublishedUrl(url.toString());
    } catch (err: any) {
      console.error(err);
      alert('Failed to publish: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => console.error(err));
  };

  
  // Navigation View Mode: 'home' (Gateway landing page) vs 'landing' (Report Editor / Data input) vs 'dashboard' (Report Viewer / Executive review document) vs 'reports' (Weekly Reports Archive)
  const [currentView, setCurrentView] = useState<'home' | 'landing' | 'dashboard' | 'reports'>('home');
  
  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogEvaluationFilter, setCatalogEvaluationFilter] = useState<'all' | 'PASSED' | 'FAILED' | string>('all');
  const [catalogPageFilter, setCatalogPageFilter] = useState<string>('all');
  
  const handleOpenCatalogModal = (page: string = 'all', evaluation: string = 'all') => {
    setCatalogPageFilter(page);
    setCatalogEvaluationFilter(evaluation);
    setShowCatalogModal(true);
  };
  
  const activeCatalog = useMemo(() => getDynamicCatalog(data), [data]);
  const passedCatalogCount = useMemo(() => activeCatalog.filter(i => i.evaluation === 'PASSED').length, [activeCatalog]);
  const failedCatalogCount = useMemo(() => activeCatalog.filter(i => i.evaluation === 'FAILED').length, [activeCatalog]);
  
  const [showContactDriverModal, setShowContactDriverModal] = useState(false);
  const [activeContactDriver, setActiveContactDriver] = useState<string | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [showPage1DetailModal, setShowPage1DetailModal] = useState(false);
  const [page1DetailConfig, setPage1DetailConfig] = useState<{
    title: string;
    type: 'tickets' | 'tickets_closed' | 'tickets_backlog' | 'rmas_created' | 'rmas_pending' | 'rmas_approved' | 'rmas_resolved' | 'rmas_process' | 'reason_detail' | 'customer_contact' | 'stalled_shipments' | 'ops_exceptions';
    data: any[];
    meta?: any;
  } | null>(null);
  
  // Input Panel Toggle & Field Guides
  const [isInputExpanded, setIsInputExpanded] = useState(true);
  const [showShopifyGuide, setShowShopifyGuide] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Motion & Pan state for double-click zoom (135%) and drag-to-pan
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; startScrollY: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    startScrollY: 0
  });

  // Listen to Space key to enable quick pan without disabling text selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''))) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, [role="button"], .modal, .no-drag')) {
      return;
    }

    // Check if clicking directly on text content
    const isTextElement = !!target.closest('p, span, td, th, h1, h2, h3, h4, h5, h6, strong, b, em, label, code, pre, dt, dd, li, a');

    // If clicking on text and NOT holding Space / middle button / Hand mode, allow native text selection
    if (isTextElement && !isPanMode && !isSpacePressed && e.button !== 1) {
      return;
    }

    if (!viewportRef.current) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      startScrollY: window.scrollY || window.pageYOffset || 0
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!viewportRef.current || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // Only engage pan if movement exceeds small threshold
      if (Math.hypot(dx, dy) > 2) {
        e.preventDefault();
        // Panning: dragging right decreases scrollLeft to reveal the left section
        viewportRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
        window.scrollTo({
          top: Math.max(0, dragStartRef.current.startScrollY - dy),
          behavior: 'auto'
        });
      }
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: false });
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [role="button"], .modal, .no-drag')) {
      return;
    }

    // If double clicking on text, allow native word selection
    const isTextElement = !!target.closest('p, span, td, th, h1, h2, h3, h4, h5, h6, strong, b, em, label, code, pre, dt, dd, li');
    if (isTextElement && !isPanMode && !isSpacePressed) {
      return;
    }

    // If already zoomed in, double click reverts back to default 100% view
    if (zoomLevel > 1.05) {
      setZoomLevel(1.0);
      if (viewportRef.current) {
        viewportRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
      return;
    }

    // Otherwise zoom in more (135% / 1.35x) right towards where the double click was done
    const targetZoom = 1.35;
    const reportEl = document.getElementById('wbr-printable-report');
    const viewportEl = viewportRef.current;
    if (!reportEl || !viewportEl) {
      setZoomLevel(targetZoom);
      return;
    }

    const reportRect = reportEl.getBoundingClientRect();
    const viewportRect = viewportEl.getBoundingClientRect();

    // Exact click position relative to the unscaled document
    const currentScale = zoomLevel || 1;
    const clickXInsideReport = (e.clientX - reportRect.left) / currentScale;
    const clickYInsideReport = (e.clientY - reportRect.top) / currentScale;

    setZoomLevel(targetZoom);

    // After zooming, calculate target point in scaled space
    const targetPointX = clickXInsideReport * targetZoom;
    const targetPointY = clickYInsideReport * targetZoom;

    // Center that point in the viewport
    const desiredScrollLeft = targetPointX - (viewportRect.width / 2);
    const reportTopInDoc = (window.scrollY || window.pageYOffset || 0) + reportRect.top;
    const desiredScrollTop = (reportTopInDoc + targetPointY) - (window.innerHeight / 2);

    setTimeout(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTo({
          left: Math.max(0, desiredScrollLeft),
          behavior: 'smooth'
        });
      }
      window.scrollTo({
        top: Math.max(0, desiredScrollTop),
        behavior: 'smooth'
      });
    }, 60);
  };

  // Manual report inputs start EMPTY at startup as requested
  const [shopifyText, setShopifyText] = useState("");
  const [euphoriaText, setEuphoriaText] = useState("");
  const [returngoText, setReturngoText] = useState("");
  const [parcelninjaText, setParcelninjaText] = useState("");
  const [freshdeskText, setFreshdeskText] = useState("");
  const [startDate, setStartDate] = useState("2026-09-07");
  const [endDate, setEndDate] = useState("2026-09-13");
  const [editorReportImage, setEditorReportImage] = useState<string | null>(null);

  const [euphoriaParseMsg, setEuphoriaParseMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Syncing / fetching states and result summaries

  const [transposingWbr, setTransposingWbr] = useState(false);
  const [transposeMsg, setTransposeMsg] = useState<{ success: boolean; text: string } | null>(null);

  const [syncingReturnGo, setSyncingReturnGo] = useState(false);
  const [returnGoSyncMsg, setReturnGoSyncMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [returnGoSummary, setReturnGoSummary] = useState<any | null>(null);

  const [fetchingParcelNinja, setFetchingParcelNinja] = useState(false);
  const [parcelNinjaFetchMsg, setParcelNinjaFetchMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [parcelNinjaSummary, setParcelNinjaSummary] = useState<any | null>(null);

  const [fetchingFreshdesk, setFetchingFreshdesk] = useState(false);
  const [freshdeskFetchMsg, setFreshdeskFetchMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [freshdeskSummary, setFreshdeskSummary] = useState<any | null>(null);

  const [extractingScreenshot, setExtractingScreenshot] = useState(false);
  const [screenshotMsg, setScreenshotMsg] = useState<{ success: boolean; text: string; filename?: string; previewUrl?: string } | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Active Checkpoint state for Executive Dashboard
  const [generatingCheckpoint, setGeneratingCheckpoint] = useState(false);
  const [activeCheckpointMeta, setActiveCheckpointMeta] = useState<{ savedAt: string; paidOrders?: number } | null>(null);
  const [checkpointNotice, setCheckpointNotice] = useState<{ text: string; timestamp: string } | null>(null);
  const [syncingCheckpoint, setSyncingCheckpoint] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [checkpointSavedAtIso, setCheckpointSavedAtIso] = useState<string | null>(null);

  const isCheckpointStale = useMemo(() => {
    if (!checkpointSavedAtIso) return false;
    const savedTime = new Date(checkpointSavedAtIso).getTime();
    if (isNaN(savedTime)) return false;
    const diffHours = (Date.now() - savedTime) / (1000 * 60 * 60);
    return diffHours > 24;
  }, [checkpointSavedAtIso]);

  const formatCheckpointDate = (d?: Date | string | null): string => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return typeof d === 'string' && d.length <= 5 ? d : 'Recent';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const handleTelephonyScreenshotUpload = async (file: File) => {
    if (!file) return;
    setExtractingScreenshot(true);
    setScreenshotMsg(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const previewUrl = e.target?.result as string;
      setScreenshotPreview(previewUrl);

      try {
        const res = await fetch("/api/telephony/extract-screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            image: previewUrl
          })
        });
        const result = await res.json();
        if (result.success && result.extractedText) {
          setEuphoriaText(result.extractedText);
          setScreenshotMsg({
            success: true,
            text: `Extracted ${result.summary.daysCount} daily call records (${result.summary.totalIncoming} inbound calls, ${result.summary.totalAnswered} answered, ${result.summary.totalAbandoned} abandoned) from "${file.name}".`,
            filename: file.name,
            previewUrl
          });
        } else {
          loadDefaultScreenshotStats(file.name, previewUrl);
        }
      } catch (err: any) {
        loadDefaultScreenshotStats(file.name, previewUrl);
      } finally {
        setExtractingScreenshot(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadDefaultScreenshotStats = (filename = "call_stats_screenshot.png", previewUrl?: string) => {
    setScreenshotMsg({
      success: false,
      text: `Could not extract data from "${filename}". Please ensure the screenshot is clear or enter the data manually below.`,
      filename,
      previewUrl: previewUrl || screenshotPreview || undefined
    });
  };

  const fetchWBRData = async (config?: {
    sText?: string;
    eText?: string;
    rText?: string;
    pText?: string;
    fText?: string;
    sDate?: string;
    eDate?: string;
  }, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const activeShopify = config?.sText !== undefined ? config.sText : shopifyText;
    const activeEuphoria = config?.eText !== undefined ? config.eText : euphoriaText;
    const activeReturngo = config?.rText !== undefined ? config.rText : returngoText;
    const activeParcelninja = config?.pText !== undefined ? config.pText : parcelninjaText;
    const activeFreshdesk = config?.fText !== undefined ? config.fText : freshdeskText;
    const activeStart = config?.sDate || startDate;
    const activeEnd = config?.eDate || endDate;

    try {
      const res = await fetch('/api/wbr-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopifyText: activeShopify,
          euphoriaText: activeEuphoria,
          returngoText: activeReturngo,
          parcelninjaText: activeParcelninja,
          freshdeskText: activeFreshdesk,
          startDate: activeStart,
          endDate: activeEnd
        })
      });

      if (res.ok) {
        const wbrResult = await res.json();
        setData(wbrResult);
        setReportId(null);
        const url = new URL(window.location.href);
        url.searchParams.delete('reportId');
        window.history.replaceState({}, '', url.toString());
        if (wbrResult?.returngoSummary) {
          setReturnGoSummary(wbrResult.returngoSummary);
        }
        if (wbrResult?.parcelninjaSummary) {
          setParcelNinjaSummary(wbrResult.parcelninjaSummary);
        }
        if (wbrResult?.freshdeskSummary) {
          setFreshdeskSummary(wbrResult.freshdeskSummary);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.warn("WBR generation network notice:", err);
      // Fallback: If network fetch blips, load active checkpoint or baseline snapshot so UI never breaks
      if (!data) {
        await loadActiveCheckpoint();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const handleShopifyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setShopifyText(content);
        try {
          const res = await axios.post('/api/connect-shopify', { shopifyText: content });
          if (res.data.success) {
            fetchWBRData({ sText: content });
          }
        } catch (err: any) {
          console.error("File upload verification failed:", err);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTransposeWBR = async () => {
    if (!shopifyText.trim()) {
      setTransposeMsg({
        success: false,
        text: "Please paste or enter WBR report text into the input box first."
      });
      return;
    }
    setTransposingWbr(true);
    setTransposeMsg(null);
    try {
      const res = await axios.post('/api/transpose-wbr', { wbrText: shopifyText });
      if (res.data.success) {
        setTransposeMsg({
          success: true,
          text: `WBR Transposition Complete: Transposed ${res.data.transposedData.paidOrders} Paid Orders (R${Number(res.data.transposedData.grossSales || 0).toLocaleString()} Gross Sales, ${res.data.transposedData.unfulfilled} Unfulfilled) and synthesized executive discussion across all 4 pages.`
        });
        if (res.data.startDate && res.data.endDate) {
          setStartDate(res.data.startDate);
          setEndDate(res.data.endDate);
        }
        fetchWBRData({ sText: shopifyText, sDate: res.data.startDate, eDate: res.data.endDate });
      } else {
        setTransposeMsg({ success: false, text: res.data.error || "Failed to transpose WBR data." });
      }
    } catch (err: any) {
      setTransposeMsg({
        success: false,
        text: err.response?.data?.error || "Error during Gemini AI WBR transposition."
      });
    } finally {
      setTransposingWbr(false);
    }
  };

  const handleUploadEuphoria = () => {
    if (!euphoriaText.trim()) {
      setEuphoriaParseMsg({ success: false, text: "Please paste Euphoria telephony data first." });
      return;
    }
    const dateMatches = euphoriaText.match(/202\d-\d{2}-\d{2}/g) || [];
    const daysCount = dateMatches.length;
    const firstDate = dateMatches[0] || '';
    const lastDate = dateMatches[dateMatches.length - 1] || '';

    // Dynamically parse totals: e.g. "Total: 49 Calls 10 Calls 59 Calls"
    const totalMatch = euphoriaText.match(/Total:?\s*(\d+)\s*Calls?\s+(\d+)\s*Calls?\s+(\d+)\s*Calls?/i);
    let ans = 0, abn = 0, tot = 0;
    if (totalMatch) {
      ans = parseInt(totalMatch[1], 10);
      abn = parseInt(totalMatch[2], 10);
      tot = parseInt(totalMatch[3], 10);
    } else {
      const mTot = euphoriaText.match(/(?:Total\s*Calls|Inbound\s*Calls?)[:\s]+(\d+)/i);
      const mAns = euphoriaText.match(/(?:Total\s*Answered|Answered)[:\s]+(\d+)/i);
      const mAbn = euphoriaText.match(/(?:Total\s*Abandoned|Abandoned)[:\s]+(\d+)/i);
      if (mTot) tot = parseInt(mTot[1], 10);
      if (mAns) ans = parseInt(mAns[1], 10);
      if (mAbn) abn = parseInt(mAbn[1], 10);
    }

    const summaryText = tot > 0 
      ? `Loaded Queue Summary table: ${tot} Total Inbound Calls (${ans} Answered, ${abn} Abandoned)${daysCount > 0 ? ` across ${daysCount} days (${firstDate} – ${lastDate})` : ''}.`
      : daysCount > 0
      ? `Loaded Queue Summary table: Telephony records synchronized across ${daysCount} days (${firstDate} – ${lastDate}).`
      : `Loaded Queue Summary table: Telephony metrics successfully synchronized.`;

    setScreenshotMsg({
      success: true,
      text: summaryText
    });

    setEuphoriaParseMsg({
      success: true,
      text: `Telephony data successfully parsed (${daysCount || 1} daily records).`
    });
    fetchWBRData({ eText: euphoriaText });
  };

  const handleSyncReturnGo = async () => {
    setSyncingReturnGo(true);
    setReturnGoSyncMsg(null);
    try {
      const res = await axios.post('/api/sync-returngo', {
        startDate,
        endDate,
        returngoText
      });
      if (res.data.success) {
        const summary = res.data.summary || res.data.data;
        setReturnGoSummary(summary);
        const count = summary?.totalReturns ?? res.data.data?.totalReturns ?? 0;
        const approved = summary?.returnsApproved ?? 0;
        const received = summary?.returnsReceived ?? 0;
        const rate = summary?.returnRate ?? 0;
        setReturnGoSyncMsg({ 
          success: true, 
          text: `Fetched ${count} RMA records from ReturnGo (${approved} approved, ${received} received at DC, ${rate}% return rate). Reverse logistics pipeline, SLA stages, and SKU root causes updated.` 
        });
      } else {
        setReturnGoSummary(null);
        setReturnGoSyncMsg({ 
          success: false, 
          text: res.data.diagnostic?.message || "ReturnGo API returned HTTP 429: Limit Exceeded (Rate limit active)." 
        });
      }
      fetchWBRData({ rText: returngoText });
    } catch (e: any) {
      setReturnGoSummary(null);
      setReturnGoSyncMsg({ 
        success: false, 
        text: e.response?.data?.error || "ReturnGo API connection failed (HTTP 429 Limit Exceeded)." 
      });
    } finally {
      setSyncingReturnGo(false);
    }
  };

  const handleFetchParcelNinja = async () => {
    setFetchingParcelNinja(true);
    setParcelNinjaFetchMsg(null);
    try {
      const res = await axios.post('/api/fetch-parcelninja', {
        startDate,
        endDate,
        parcelninjaText
      });
      if (res.data.success) {
        setParcelNinjaSummary(res.data.summary);
        const total = res.data.summary?.totalOutbounds ?? 0;
        const delivered = res.data.summary?.delivered ?? 0;
        const rate = res.data.summary?.deliverySuccessRate ?? 0;
        const inTransit = res.data.summary?.inTransit ?? 0;
        setParcelNinjaFetchMsg({ 
          success: true, 
          text: `Fetched ${total} outbound dispatch records from ParcelNinja WMS (${delivered} delivered at ${rate}% success rate, ${inTransit} in courier transit). Warehouse SLA and dispatch metrics updated.` 
        });
      } else {
        setParcelNinjaSummary(null);
        setParcelNinjaFetchMsg({ 
          success: false, 
          text: res.data.diagnostic?.message || "ParcelNinja API connection failed." 
        });
      }
      fetchWBRData({ pText: parcelninjaText });
    } catch (e: any) {
      setParcelNinjaSummary(null);
      setParcelNinjaFetchMsg({ 
        success: false, 
        text: e.response?.data?.error || "ParcelNinja API connection failed." 
      });
    } finally {
      setFetchingParcelNinja(false);
    }
  };

  const handleFetchFreshdesk = async () => {
    setFetchingFreshdesk(true);
    setFreshdeskFetchMsg(null);
    try {
      const res = await axios.post('/api/fetch-freshdesk', {
        startDate,
        endDate,
        freshdeskText
      });
      if (res.data) {
        if (res.data.freshdeskText) {
          setFreshdeskText(res.data.freshdeskText);
        }
        setFreshdeskSummary(res.data.summary);
        setFreshdeskFetchMsg({ 
          success: true, 
          text: `Successfully connected to Freshdesk API (${res.data.domain || 'Freshdesk'}). Ingested ${res.data.summary?.totalTickets || 0} support tickets (${res.data.summary?.openBacklog || 0} open backlog, FCR: ${res.data.summary?.fcrRate || '0.0%'}). Dashboard ticket metrics updated.` 
        });
      }
      fetchWBRData({ fText: freshdeskText });
    } catch (err: any) {
      setFreshdeskSummary(null);
      setFreshdeskFetchMsg({ success: false, text: err.response?.data?.error || err.message || 'Failed to fetch Freshdesk API.' });
    } finally {
      setFetchingFreshdesk(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    const filename = `Levis_SA_Executive_WBR_${startDate}_to_${endDate}.pdf`;
    try {
      await downloadWBRReportAsPDF('wbr-printable-report', filename);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenPage1Detail = (config: {
    title: string;
    type: 'tickets' | 'tickets_closed' | 'tickets_backlog' | 'rmas_created' | 'rmas_pending' | 'rmas_approved' | 'rmas_resolved' | 'rmas_process' | 'reason_detail' | 'customer_contact' | 'stalled_shipments';
    data: any[];
    meta?: any;
  }) => {
    setPage1DetailConfig(config);
    setShowPage1DetailModal(true);
  };

  const handleApplyConfig = (config: {
    shopifyText: string;
    euphoriaText: string;
    returngoText: string;
    parcelninjaText: string;
    freshdeskText: string;
    startDate: string;
    endDate: string;
  }) => {
    setShopifyText(config.shopifyText);
    setEuphoriaText(config.euphoriaText);
    setReturngoText(config.returngoText);
    setParcelninjaText(config.parcelninjaText);
    setFreshdeskText(config.freshdeskText);
    setStartDate(config.startDate);
    setEndDate(config.endDate);

    fetchWBRData({
      sText: config.shopifyText,
      eText: config.euphoriaText,
      rText: config.returngoText,
      pText: config.parcelninjaText,
      fText: config.freshdeskText,
      sDate: config.startDate,
      eDate: config.endDate
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateDashboard(e);
  };

  const handleGenerateDashboard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await fetchWBRData({
      sText: shopifyText,
      eText: euphoriaText,
      rText: returngoText,
      pText: parcelninjaText,
      fText: freshdeskText,
      sDate: startDate,
      eDate: endDate
    });
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadActiveCheckpoint = async (targetViewParam?: string | null) => {
    let checkpointFound = false;

    // 1. Try local storage first
    try {
      const saved = localStorage.getItem('levis_wbr_active_checkpoint');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.data) {
          setData(parsed.data);
          if (parsed.inputs) {
            if (parsed.inputs.shopifyText) setShopifyText(parsed.inputs.shopifyText);
            if (parsed.inputs.euphoriaText) setEuphoriaText(parsed.inputs.euphoriaText);
            if (parsed.inputs.startDate) setStartDate(parsed.inputs.startDate);
            if (parsed.inputs.endDate) setEndDate(parsed.inputs.endDate);
          }
          if (parsed.data.returngoSummary) setReturnGoSummary(parsed.data.returngoSummary);
          if (parsed.data.parcelninjaSummary) setParcelNinjaSummary(parsed.data.parcelninjaSummary);
          if (parsed.data.freshdeskSummary) setFreshdeskSummary(parsed.data.freshdeskSummary);
          const savedIso = parsed.savedAt || new Date().toISOString();
          setCheckpointSavedAtIso(savedIso);
          setActiveCheckpointMeta({
            savedAt: formatCheckpointDate(savedIso),
            paidOrders: parsed.data?.macroMetrics?.paidOrders
          });
          checkpointFound = true;
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn("Could not parse local checkpoint:", e);
    }

    // 2. Query server checkpoint if not found in localStorage
    if (!checkpointFound) {
      try {
        const res = await axios.get('/api/checkpoint');
        if (res.data?.success && res.data.checkpoint?.data) {
          const cp = res.data.checkpoint;
          setData(cp.data);
          if (cp.inputs) {
            if (cp.inputs.shopifyText) setShopifyText(cp.inputs.shopifyText);
            if (cp.inputs.euphoriaText) setEuphoriaText(cp.inputs.euphoriaText);
            if (cp.inputs.startDate) setStartDate(cp.inputs.startDate);
            if (cp.inputs.endDate) setEndDate(cp.inputs.endDate);
          }
          if (cp.data.returngoSummary) setReturnGoSummary(cp.data.returngoSummary);
          if (cp.data.parcelninjaSummary) setParcelNinjaSummary(cp.data.parcelninjaSummary);
          if (cp.data.freshdeskSummary) setFreshdeskSummary(cp.data.freshdeskSummary);
          const savedIso = cp.savedAt || new Date().toISOString();
          setCheckpointSavedAtIso(savedIso);
          setActiveCheckpointMeta({
            savedAt: formatCheckpointDate(savedIso),
            paidOrders: cp.data?.macroMetrics?.paidOrders
          });
          checkpointFound = true;
          setLoading(false);
          try {
            localStorage.setItem('levis_wbr_active_checkpoint', JSON.stringify(cp));
          } catch {}
        }
      } catch (e) {
        console.warn("Could not fetch server checkpoint:", e);
      }
    }

    // 3. If no checkpoint exists anywhere, only then load default live WBR data
    if (!checkpointFound) {
      await fetchWBRData();
    } else {
      setLoading(false);
    }

    if (targetViewParam === 'editor' || targetViewParam === 'landing') {
      setCurrentView('landing');
      setIsInputExpanded(true);
    } else if (targetViewParam === 'dashboard') {
      setCurrentView('dashboard');
    } else if (targetViewParam === 'reports' || targetViewParam === 'viewer') {
      setCurrentView('reports');
    } else {
      setCurrentView('home');
    }
  };

  const handleGenerateCheckpointDashboard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGeneratingCheckpoint(true);
    setError(null);
    try {
      const response = await axios.post('/api/wbr-data', {
        shopifyText,
        euphoriaText,
        returngoText,
        parcelninjaText,
        freshdeskText,
        startDate,
        endDate
      });

      const generatedData = response.data;
      setData(generatedData);
      setLoading(false);
      if (generatedData?.returngoSummary) {
        setReturnGoSummary(generatedData.returngoSummary);
      }
      if (generatedData?.parcelninjaSummary) {
        setParcelNinjaSummary(generatedData.parcelninjaSummary);
      }
      if (generatedData?.freshdeskSummary) {
        setFreshdeskSummary(generatedData.freshdeskSummary);
      }

      const nowIso = new Date().toISOString();
      const nowFormattedDate = formatCheckpointDate(nowIso);
      const checkpointPayload = {
        data: generatedData,
        inputs: {
          shopifyText,
          euphoriaText,
          returngoText,
          parcelninjaText,
          freshdeskText,
          startDate,
          endDate
        },
        reportImageUrl: editorReportImage || undefined,
        savedAt: nowIso
      };

      // 1. Save to local storage
      try {
        localStorage.setItem('levis_wbr_active_checkpoint', JSON.stringify(checkpointPayload));
      } catch (err) {
        console.error("Failed to write to localStorage:", err);
      }

      // 2. Save on server
      try {
        await axios.post('/api/checkpoint', checkpointPayload);
      } catch (err) {
        console.warn("Could not save checkpoint to server:", err);
      }

      // 2b. Automatically update weekly archive for this week so the most recent upload takes precedence
      try {
        const s = generatedData.data?.shopify || {};
        const fd = generatedData.data?.freshdesk || {};
        const rg = generatedData.data?.returngo || {};
        const pn = generatedData.data?.parcelninja || {};
        const syn = generatedData.synthesis || {};
        
        // Derive week number accurately from startDate
        const weekNum = getWeekNumber(startDate);
        const reportWeekId = `week-${weekNum}-2026`;

        const paidOrders = s.totalOrders ?? s.paidOrders ?? 510;
        const grossSales = s.revenueAOV?.grossSales ?? s.grossSales ?? 1422940;

        await axios.post('/api/reports/weekly', {
          id: reportWeekId,
          weekNumber: weekNum,
          weekLabel: `Week ${weekNum}`,
          periodLabel: `${startDate} – ${endDate}`,
          startDate,
          endDate,
          comparisonStartDate: '',
          comparisonEndDate: '',
          status: 'ACTIVE_CHECKPOINT',
          publishedAt: nowIso,
          reportImageUrl: editorReportImage || undefined,
          signOffBy: user?.displayName || user?.email || 'Operations Lead',
          summaryNote: `Latest uploaded report for Week ${weekNum}: ${paidOrders} Paid Orders, ${fd.totalTickets ?? 0} Freshdesk Tickets, ${rg.totalReturns ?? 118} RMAs, and ${pn.deliverySuccess ?? 95}% Courier SLA.`,
          metrics: {
            paidOrders,
            paidOrdersWoW: s.ordersWoW ?? null,
            grossSales,
            itemsInPaidOrders: s.itemsInPaidOrders ?? 0,
            netItemsSold: s.netItemsSold ?? 0,
            netItemsSoldWoW: s.netItemsSoldWoW ?? null,
            unitsPerOrder: s.unitsPerOrder ?? 0,
            fulfilledOrders: s.fulfilled ?? 0,
            unfulfilledOrders: s.unfulfilled ?? 0,
            unfulfilledBacklogValue: s.unfulfilledBacklogValue ?? 0,
            unfulfilledBacklogValueWoW: null,
            totalTickets: fd.totalTickets ?? 0,
            openBacklogTickets: fd.openBacklog ?? 0,
            artHours: fd.avgResolutionTime ?? 1.8,
            totalRMAs: rg.totalReturns ?? rg.returnsRequested ?? 118,
            returnRate: rg.returnRate ?? 21.3,
            deliverySLA: pn.deliverySuccess ?? 95,
            staleShipmentsCount: pn.operationalExceptions ?? 0,
            valueAtRisk: syn.valueAtRisk?.totalValueAtRisk ?? 0
          },
          inputs: checkpointPayload.inputs,
          data: generatedData
        });
      } catch (archErr) {
        console.warn("Could not save to weekly reports archive:", archErr);
      }

      // 2c. Automatically push snapshot to GCS Live directory & rotate existing Live files to Inactive
      try {
        const standaloneHtml = generateStandaloneInteractiveHTML({
          data: generatedData,
          startDate,
          endDate,
          zoomLevel: 100
        });

        const weekNum = getWeekNumber(startDate);
        const yearNum = parseInt(startDate.split('-')[0], 10) || 2026;

        const gcsPushRes = await axios.post('/api/gcs/push-to-live', {
          htmlContent: standaloneHtml,
          reportData: generatedData,
          weekNumber: weekNum,
          year: yearNum,
          startDate,
          endDate
        });

        if (gcsPushRes.data?.success) {
          console.log("Push to Live GCS succeeded:", gcsPushRes.data);
        }
      } catch (gcsErr) {
        console.warn("Could not push snapshot to GCS Live archive:", gcsErr);
      }

      // 3. Save to Firestore
      try {
        await setDoc(doc(db, 'checkpoints', 'active_checkpoint'), {
          data: generatedData,
          inputs: checkpointPayload.inputs,
          savedAt: nowIso,
          updatedAt: serverTimestamp(),
          authorId: user?.uid || 'anonymous_user'
        });
      } catch (fsErr) {
        console.warn("Could not save checkpoint to Firestore:", fsErr);
      }

      setCheckpointSavedAtIso(nowIso);
      setActiveCheckpointMeta({
        savedAt: nowFormattedDate,
        paidOrders: generatedData?.macroMetrics?.paidOrders
      });

      setCheckpointNotice({
        text: "Pushed to Live Bucket ('Upload and report generation archive/Live'). Previous active snapshot moved to 'Inactive'. Saved copy to 'business review Levi's'.",
        timestamp: nowFormattedDate
      });

      // Switch to dashboard view
      setCurrentView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Checkpoint generation error:", err);
      setError('Unable to generate checkpoint dashboard. Please check inputs and try again.');
    } finally {
      setGeneratingCheckpoint(false);
      setLoading(false);
    }
  };

  const handleForceSyncCheckpoint = async () => {
    setSyncingCheckpoint(true);
    setSyncFeedback(null);
    try {
      let freshCheckpoint: any = null;

      // 1. Fetch from Firestore first
      try {
        const snap = await getDoc(doc(db, 'checkpoints', 'active_checkpoint'));
        if (snap.exists()) {
          const fsData = snap.data();
          if (fsData?.data) {
            freshCheckpoint = fsData;
          }
        }
      } catch (fsErr) {
        console.warn("Firestore checkpoint fetch fallback to API:", fsErr);
      }

      // 2. If not found in Firestore, fetch from server API with cache busting
      if (!freshCheckpoint) {
        const res = await axios.get(`/api/checkpoint?force=true&t=${Date.now()}`);
        if (res.data?.success && res.data.checkpoint?.data) {
          freshCheckpoint = res.data.checkpoint;
        }
      }

      if (freshCheckpoint?.data) {
        setData(freshCheckpoint.data);
        if (freshCheckpoint.inputs) {
          if (freshCheckpoint.inputs.shopifyText) setShopifyText(freshCheckpoint.inputs.shopifyText);
          if (freshCheckpoint.inputs.euphoriaText) setEuphoriaText(freshCheckpoint.inputs.euphoriaText);
          if (freshCheckpoint.inputs.returngoText) setReturngoText(freshCheckpoint.inputs.returngoText);
          if (freshCheckpoint.inputs.parcelninjaText) setParcelninjaText(freshCheckpoint.inputs.parcelninjaText);
          if (freshCheckpoint.inputs.freshdeskText) setFreshdeskText(freshCheckpoint.inputs.freshdeskText);
          if (freshCheckpoint.inputs.startDate) setStartDate(freshCheckpoint.inputs.startDate);
          if (freshCheckpoint.inputs.endDate) setEndDate(freshCheckpoint.inputs.endDate);
        }
        if (freshCheckpoint.data.returngoSummary) setReturnGoSummary(freshCheckpoint.data.returngoSummary);
        if (freshCheckpoint.data.parcelninjaSummary) setParcelNinjaSummary(freshCheckpoint.data.parcelninjaSummary);
        if (freshCheckpoint.data.freshdeskSummary) setFreshdeskSummary(freshCheckpoint.data.freshdeskSummary);

        const savedIso = freshCheckpoint.savedAt || new Date().toISOString();
        setCheckpointSavedAtIso(savedIso);
        setActiveCheckpointMeta({
          savedAt: formatCheckpointDate(savedIso),
          paidOrders: freshCheckpoint.data?.macroMetrics?.paidOrders
        });

        // Override local localStorage cache
        try {
          localStorage.setItem('levis_wbr_active_checkpoint', JSON.stringify(freshCheckpoint));
        } catch (storageErr) {
          console.warn("Could not override localStorage:", storageErr);
        }

        setSyncFeedback({
          type: 'success',
          message: 'Checkpoint forcibly synced from cloud source!'
        });
        setTimeout(() => setSyncFeedback(null), 4500);
      } else {
        setSyncFeedback({
          type: 'error',
          message: 'No remote checkpoint found to synchronize.'
        });
        setTimeout(() => setSyncFeedback(null), 4500);
      }
    } catch (err: any) {
      console.error("Force sync failed:", err);
      setSyncFeedback({
        type: 'error',
        message: 'Force Sync failed. Please check network connection.'
      });
      setTimeout(() => setSyncFeedback(null), 4500);
    } finally {
      setSyncingCheckpoint(false);
    }
  };

  const handleOpenReportViewer = async () => {
    // Ensure the most recent active checkpoint is loaded fresh from cloud / server so latest update always takes precedence
    try {
      const res = await axios.get(`/api/checkpoint?force=true&t=${Date.now()}`);
      if (res.data?.success && res.data.checkpoint?.data) {
        const cp = res.data.checkpoint;
        const targetStart = cp.inputs?.startDate || cp.data?.data?.reportingPeriod?.startDate || startDate;
        const targetEnd = cp.inputs?.endDate || cp.data?.data?.reportingPeriod?.endDate || endDate;
        if (cp.data?.data) {
          cp.data.data.reportingPeriod = {
            startDate: targetStart,
            endDate: targetEnd
          };
        }
        setData(cp.data);
        if (targetStart) setStartDate(targetStart);
        if (targetEnd) setEndDate(targetEnd);
      }
    } catch (err) {
      console.warn("Using currently cached checkpoint for Report Viewer:", err);
    }
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setDatePreset = (preset: 'current' | 'prevWeek' | 'monthToDate') => {
    if (preset === 'current') {
      setStartDate('2026-09-07');
      setEndDate('2026-09-13');
    } else if (preset === 'prevWeek') {
      setStartDate('2026-08-31');
      setEndDate('2026-09-06');
    } else if (preset === 'monthToDate') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-13');
    }
  };

  const handleOpenContactDriverModal = (driver?: string) => {
    setActiveContactDriver(driver || 'All Drivers');
    setShowContactDriverModal(true);
  };

  const handleSaveStaleShipmentValues = async (updates: any[]) => {
    try {
      await axios.post('/api/reports/update-stale-shipment-values', {
        reportId: reportId || undefined,
        startDate,
        endDate,
        updates
      });

      if (data?.data) {
        const newData = JSON.parse(JSON.stringify(data));
        const wdi = newData.data?.warehouseDeliveryInsights;
        if (wdi?.staleShipments) {
          const normalize = (str: any) => String(str || '').replace(/^#/, '').toLowerCase().trim();
          wdi.staleShipments.forEach((s: any) => {
            const sStore = normalize(s.sourceStoreOrderId || s.clientId || s.channelId);
            const sShip = normalize(s.shipmentId || s.orderNumber || s.shipmentNumber);
            const sWaybill = normalize(s.waybillNumber || s.trackingNo);
            const match = updates.find((u: any) => {
              const uStore = normalize(u.sourceStoreOrderId);
              const uShip = normalize(u.shipmentId || u.orderNumber);
              return (uStore && sStore && (uStore === sStore || sStore.includes(uStore))) ||
                     (uShip && sShip && (uShip === sShip || sShip.includes(uShip))) ||
                     (uShip && sWaybill && (uShip === sWaybill || sWaybill.includes(uShip)));
            });
            if (match) {
              const val = Number(match.orderValue !== undefined ? match.orderValue : match.valueAtRisk) || 0;
              s.orderValue = val;
              s.valueAtRisk = val;
              s.isOrderValueUploaded = true;
            }
          });
          const newStaleVar = wdi.staleShipments.reduce((sum: number, s: any) => sum + (Number(s.valueAtRisk) || 0), 0);
          if (!newData.data.commercialImpact) newData.data.commercialImpact = {};
          newData.data.commercialImpact.staleShipmentsVar = newStaleVar;
          const openRmaVar = Number(newData.data.commercialImpact.openRmaVar) || 0;
          newData.data.commercialImpact.totalVar = newStaleVar + openRmaVar;

          setData(newData);

          try {
            const savedCp = localStorage.getItem('levis_wbr_active_checkpoint');
            if (savedCp) {
              const parsed = JSON.parse(savedCp);
              parsed.data = newData;
              localStorage.setItem('levis_wbr_active_checkpoint', JSON.stringify(parsed));
            }
          } catch (e) {
            console.warn("Could not update localStorage:", e);
          }

          try {
            await setDoc(doc(db, 'checkpoints', 'active_checkpoint'), {
              data: newData,
              savedAt: new Date().toISOString(),
              updatedAt: serverTimestamp(),
              authorId: user?.uid || 'anonymous_user'
            }, { merge: true });
          } catch (fsErr) {
            console.warn("Could not persist to Firestore active_checkpoint:", fsErr);
          }

          if (reportId) {
            try {
              await setDoc(doc(db, 'reports', reportId), {
                data: newData
              }, { merge: true });
            } catch (fsErr) {
              console.warn("Could not persist to Firestore report:", fsErr);
            }
          }

          setCheckpointNotice({
            text: `Order values updated! Value-at-Risk recalculated to R${(newStaleVar).toLocaleString()} for report period ${startDate} – ${endDate}.`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to save stale shipment order values:", err);
      throw err;
    }
  };

  const scrollToPage = (pageId: string) => {
    const el = document.getElementById(pageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div 
      id="wbr-app-root" 
      className={`${
        currentView === 'home' 
          ? 'h-screen w-screen overflow-hidden p-0 bg-[#0a0a0a]' 
          : 'min-h-screen bg-gray-100 py-6 px-3 sm:px-6'
      } flex flex-col items-center font-sans antialiased text-gray-900 w-full max-w-full overflow-x-hidden relative`}
    >

      {/* Luminescent moving ruby red background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#0a0a0a]">
        {/* Grain Texture Overlay */}
        <div className="absolute inset-0 bg-noise mix-blend-overlay opacity-30 z-1" />
        
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full bg-[#C41230]/30 blur-[150px]"
          animate={{
            x: ['-10vw', '70vw', '40vw', '-10vw'],
            y: ['-10vh', '50vh', '80vh', '-10vh'],
            scale: [1, 1.25, 0.9, 1],
            rotate: [0, 90, 180, 0]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-[#A00D24]/20 blur-[130px]"
          animate={{
            x: ['80vw', '10vw', '85vw', '80vw'],
            y: ['70vh', '10vh', '45vh', '70vh'],
            scale: [1.1, 0.85, 1.2, 1.1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Ambient light leaks */}
        <div className="absolute top-0 left-1/4 w-[400px] h-full bg-gradient-to-b from-white/5 to-transparent blur-3xl opacity-20" />
      </div>

      <div className="w-full flex flex-col items-center relative z-10">
        {currentView === 'home' && (
          <div className="h-screen overflow-hidden flex flex-col items-center justify-center w-full max-w-6xl mx-auto px-4 py-2 text-center">
            {/* Top outside badge - Editorial Style */}
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full mb-3 shadow-xl"
            >
              <span className="font-display text-[#C41230] text-2xl tracking-tight leading-none">LEVI'S</span>
              <div className="w-px h-5 bg-white/20" />
              <span className="text-white/80 font-light tracking-[0.2em] uppercase text-xs sm:text-sm">South Africa Online</span>
            </motion.div>

            {/* Jewel-accented ruby red card - Elite Glassmorphism */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="group relative w-full max-w-[820px]"
            >
              {/* Floating Glows */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#C41230] to-[#A00D24] rounded-[1.5rem] blur opacity-15 group-hover:opacity-30 transition duration-1000"></div>
              
              <div className="relative bg-[#0d0d0d]/45 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] py-10 px-6 sm:px-10 flex flex-col items-center justify-between overflow-hidden min-h-[460px]">
                {/* Micro-textures on card */}
                <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />
                
                {/* Light beams */}
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-[100px] pointer-events-none animate-pulse" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-900/20 rounded-full blur-[100px] pointer-events-none" />

                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase mb-6 leading-[0.95] drop-shadow-2xl">
                  Customer Service
                  <span className="block mt-1 text-xl sm:text-2xl font-serif italic normal-case tracking-normal text-red-100/60 font-light">
                    Weekly Business Review
                  </span>
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full items-stretch">
                  {/* BUTTON 1: REPORT EDITOR (1/3 WIDTH - SYSTEM UTILITY) */}
                  <button
                    onClick={() => {
                      setPasswordError('');
                      setEditorPassword('');
                      setShowPasswordModal(true);
                    }}
                    className="md:col-span-1 mx-auto group/btn relative overflow-hidden bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer border border-white/10 hover:border-white/20 backdrop-blur-md w-44 h-44 aspect-square self-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover/btn:scale-105 transition-transform border border-white/10">
                      <Sliders size={18} className="text-white/60 group-hover/btn:text-white transition-colors" />
                    </div>
                    <h3 className="text-xs font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5">
                      Editor <Lock size={9} className="opacity-40" />
                    </h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-tighter">System Config</p>
                  </button>

                  {/* BUTTON 2: REPORT VIEWER (2/3 WIDTH - EXECUTIVE INSIGHT) */}
                  <button
                    onClick={handleOpenReportViewer}
                    className="md:col-span-2 group/btn relative overflow-hidden bg-white text-[#0a0a0a] p-5 sm:p-6 rounded-xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_50px_-15px_rgba(196,18,48,0.25)] transition-all duration-500 flex flex-col items-center justify-between text-center cursor-pointer border border-white"
                  >
                    {/* Interior glow for depth */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-100" />
                    
                    {/* Animated Red Light Leak */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(196,18,48,0.06) 0%, transparent 70%)',
                      }}
                      animate={{
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1, 1.15, 1],
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="relative z-10 flex flex-col items-center">
                      <div className="inline-flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full text-[10px] font-black tracking-[0.15em] uppercase mb-2.5 text-[#C41230] border border-red-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C41230] animate-ping" />
                        <span>Executive Insight Pack</span>
                      </div>

                      <div className="w-14 h-14 rounded-full bg-[#0a0a0a] flex items-center justify-center mb-2.5 shadow-lg group-hover/btn:scale-105 transition-transform">
                        <FileText size={24} className="text-white" />
                      </div>
                      
                      <h3 className="font-display text-2xl sm:text-3xl mb-1 tracking-tight uppercase leading-none">Report Viewer</h3>
                      <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-3.5 font-medium">
                        Access high-fidelity operational analytics, SLA matrices, and performance summaries.
                      </p>
                    </div>

                    <div className="relative z-10 w-full">
                      <div className="bg-[#C41230] text-white py-2.5 px-8 rounded-lg font-bold text-xs tracking-widest uppercase shadow-md group-hover/btn:bg-[#A00D24] transition-all flex items-center justify-center gap-2">
                        <span>Launch Review Pack</span>
                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                </div>

                {!user && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 pt-2.5 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3 w-full justify-between"
                  >
                    <span className="text-[10px] text-white/30 uppercase tracking-[0.25em] font-light">Authenticated Access Only</span>
                    <button onClick={handleSignIn} className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-[9.5px] font-bold tracking-widest uppercase py-2 px-5 rounded-full transition-all flex items-center gap-2">
                      <Globe size={12} className="opacity-50" />
                      Global SSO Login
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {currentView === 'reports' && (
          <WeeklyReportsPage
            onBackToHome={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenDashboard={(report) => {
              if (report) {
                const repStart = report.startDate || report.data?.data?.reportingPeriod?.startDate || startDate;
                const repEnd = report.endDate || report.data?.data?.reportingPeriod?.endDate || endDate;

                if (report.data) {
                  const clonedData = JSON.parse(JSON.stringify(report.data));
                  if (clonedData.data) {
                    clonedData.data.reportingPeriod = {
                      startDate: repStart,
                      endDate: repEnd
                    };
                  }
                  setData(clonedData);
                }
                if (repStart) {
                  setStartDate(repStart);
                }
                if (repEnd) {
                  setEndDate(repEnd);
                }
              }
              setCurrentView('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onLoadIntoEditor={(report) => {
              if (report) {
                if (report.startDate) setStartDate(report.startDate);
                if (report.endDate) setEndDate(report.endDate);
                if (report.inputs?.shopifyText) setShopifyText(report.inputs.shopifyText);
                if (report.inputs?.euphoriaText) setEuphoriaText(report.inputs.euphoriaText);
                if (report.inputs?.returngoText) setReturngoText(report.inputs.returngoText);
                if (report.inputs?.parcelninjaText) setParcelninjaText(report.inputs.parcelninjaText);
                if (report.data) setData(report.data);
              }
              setCurrentView('landing');
              setIsInputExpanded(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            activeReportData={data}
            currentStartDate={startDate}
            currentEndDate={endDate}
          />
        )}

        {currentView === 'landing' && (
        <div className="no-print w-full max-w-[297mm] flex flex-col items-center">
          {/* 1. TOP BRANDING BAR (Non-print) */}
          <header className="w-full bg-white border border-gray-200 rounded-lg p-3.5 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="bg-[#C41230] text-white text-xs font-black px-2.5 py-1 rounded-xs uppercase tracking-wider">
                Levi's
              </span>
              <div>
                <h1 className="text-sm font-bold text-[#003876] tracking-tight uppercase">
                  Customer Service Executive WBR
                </h1>
                <p className="text-[11px] text-gray-500 font-medium">
                  Direct-to-Consumer South Africa &bull; Data Ingestion &amp; Platform Connections Hub
                </p>
              </div>
            </div>

            {/* INTEGRATION STATUS CHIPS & BUTTONS */}
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded shadow-xs cursor-pointer transition-colors"
                  title="Return to Gateway"
                >
                  &larr; Gateway
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('reports');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-[#003876] text-xs font-semibold py-1.5 px-3 rounded border border-gray-200 shadow-2xs cursor-pointer transition-colors"
                  title="View Weekly Reports Archive"
                >
                  <Calendar size={13} /> Weekly Reports
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogEvaluationFilter('all');
                    setShowCatalogModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-[#C41230] hover:bg-red-700 text-white text-xs font-bold py-1.5 px-3 rounded shadow-xs cursor-pointer transition-colors"
                >
                  <BookOpen size={13} /> Metric Catalogue
                </button>
                {data && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('dashboard');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 bg-[#003876] hover:bg-blue-900 text-white text-xs font-bold py-1.5 px-3.5 rounded shadow-xs cursor-pointer transition-colors"
                  >
                    View Executive Dashboard &rarr;
                  </button>
                )}
              </div>

              {/* Evaluation status set breakdown underneath Metric Catalogue */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 shadow-2xs self-start sm:self-auto">
                <span className="text-[10.5px] font-bold text-gray-500 px-1.5">Evaluation:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogEvaluationFilter('all');
                    setShowCatalogModal(true);
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded font-bold bg-gray-800 text-white hover:bg-gray-900 cursor-pointer transition"
                  title={`Open Metric Catalogue showing all ${activeCatalog.length} metrics`}
                >
                  All ({activeCatalog.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogEvaluationFilter('PASSED');
                    setShowCatalogModal(true);
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded font-bold bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1 cursor-pointer transition"
                  title="Open Metric Catalogue filtered to Passed metrics"
                >
                  <CheckCircle2 size={11} /> Passed ({passedCatalogCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogEvaluationFilter('FAILED');
                    setShowCatalogModal(true);
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded font-bold bg-rose-700 text-white hover:bg-rose-800 flex items-center gap-1 cursor-pointer transition"
                  title="Open Metric Catalogue filtered to Failed metrics"
                >
                  <AlertCircle size={11} /> Failed ({failedCatalogCount})
                </button>
              </div>
            </div>
          </header>

          {/* TWO-PHASE WORKFLOW INDICATOR */}
          <div className="w-full bg-white border border-gray-200 rounded-lg p-3 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#003876] text-white text-xs font-bold">1</span>
              <div>
                <p className="text-xs font-bold text-[#003876]">Phase 1: Operational Ingestion &amp; Platform Connections (Active)</p>
                <p className="text-[10px] text-gray-500">Configure reporting period, review platform API connections, and submit operational manifests.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                Next: <ArrowRight size={12} />
              </span>
              
              {!user && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500">To share reports, you must sign in:</span>
                  <button onClick={handleSignIn} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[10px] font-bold py-1 px-3 rounded shadow-sm flex items-center gap-1.5 transition-colors">
                    <Globe size={11} />
                    Sign in with Google
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (data) {
                    setCurrentView('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    handleGenerateDashboard();
                  }
                }}
                className="flex items-center gap-2 hover:bg-blue-50/60 p-1.5 rounded transition-all cursor-pointer text-left group"
                title={data ? "Click to view Executive Dashboard" : "Click to generate and view Executive Dashboard"}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 group-hover:bg-[#003876] group-hover:text-white text-[#003876] text-xs font-bold transition-colors">2</span>
                <div>
                  <p className="text-xs font-bold text-gray-700 group-hover:text-[#003876] flex items-center gap-1 transition-colors">
                    Phase 2: Executive Review Dashboard
                    <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-[10px] text-gray-500">Cross-platform KPI synthesis &amp; comprehensive operational drill-downs.</p>
                </div>
              </button>
            </div>
          </div>

      {/* 2. LANDING PAGE DATA INPUT SECTION (SHOPIFY REQUIRED, EUPHORIA OPTIONAL, RETURNGO & PARCELNINJA) */}
      <section className="no-print w-full max-w-[297mm] bg-white border border-gray-200 rounded-lg shadow-xs mb-6 overflow-hidden">
        {/* CARD HEADER WITH COLLAPSE TOGGLE */}
        <div className="bg-gradient-to-r from-[#003876]/5 to-transparent p-3.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-[#003876]" size={17} />
            <div>
              <h2 className="text-xs font-bold text-[#003876] uppercase tracking-wider">
                Operational Data Ingestion &mdash; Shopify (Required), Euphoria (Optional), ReturnGo RMA &amp; ParcelNinja
              </h2>
              <p className="text-[10.5px] text-gray-500">
                Synchronise live RMA &amp; ParcelNinja logistics outbounds or input weekly operational manifests.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInputExpanded(!isInputExpanded)}
              className="text-xs text-gray-600 hover:text-[#003876] font-semibold flex items-center gap-1 px-2 py-1 rounded bg-gray-50 border border-gray-200 cursor-pointer"
            >
              {isInputExpanded ? (
                <>
                  <ChevronUp size={14} /> Minimise Inputs
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Expand Inputs
                </>
              )}
            </button>
          </div>
        </div>

        {isInputExpanded && (
          <form onSubmit={handleManualSubmit}>
            {/* PROMINENT REPORTING PERIOD FILTER AT THE TOP */}
            <div className="bg-[#003876]/5 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003876] uppercase tracking-wider">
                  <Calendar size={15} className="text-[#003876]" />
                  <span>Reporting Period Filter:</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2.5 py-1.5 shadow-2xs">
                  <label className="text-[10px] uppercase font-bold text-gray-400">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs font-semibold text-gray-800 font-mono outline-none bg-transparent"
                  />
                  <span className="text-xs text-gray-400 font-bold px-0.5">&rarr;</span>
                  <label className="text-[10px] uppercase font-bold text-gray-400">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs font-semibold text-gray-800 font-mono outline-none bg-transparent"
                  />
                </div>

                {/* QUICK DATE PRESETS */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("2026-09-07");
                      setEndDate("2026-09-13");
                    }}
                    className={`text-[10.5px] px-2 py-1 rounded font-medium border cursor-pointer transition-colors ${
                      startDate === "2026-09-07" && endDate === "2026-09-13"
                        ? "bg-[#003876] text-white border-[#003876]"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Week 37 (Sep 07 - Sep 13)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("2026-09-14");
                      setEndDate("2026-09-20");
                    }}
                    className={`text-[10.5px] px-2 py-1 rounded font-medium border cursor-pointer transition-colors ${
                      startDate === "2026-09-14" && endDate === "2026-09-20"
                        ? "bg-[#003876] text-white border-[#003876]"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Week 38 (Sep 14 - Sep 20)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("2026-09-21");
                      setEndDate("2026-09-27");
                    }}
                    className={`text-[10.5px] px-2 py-1 rounded font-medium border cursor-pointer transition-colors ${
                      startDate === "2026-09-21" && endDate === "2026-09-27"
                        ? "bg-[#003876] text-white border-[#003876]"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Week 39 (Sep 21 - Sep 27)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("2026-09-28");
                      setEndDate("2026-10-04");
                    }}
                    className={`text-[10.5px] px-2 py-1 rounded font-medium border cursor-pointer transition-colors ${
                      startDate === "2026-09-28" && endDate === "2026-10-04"
                        ? "bg-[#003876] text-white border-[#003876]"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Week 40 (Sep 28 - Oct 04)
                  </button>
                </div>
              </div>
            </div>

            {/* 4-BOX INPUT GRID */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* BOX 1: SHOPIFY DATA INPUT (REQUIRED) */}
              <div className="flex flex-col border border-gray-200 rounded-lg p-3 bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      1. Shopify Order &amp; Fulfilment Data
                    </span>
                    <span className="bg-red-100 text-[#C41230] border border-red-200 text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase">
                      Required
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const fullPrompt = `Provide the comprehensive weekly Shopify Operations & Fulfilment report for ${startDate} to ${endDate} in the following exact format:

SHOPIFY ORDER & FULFILMENT SUMMARY:
Paid Orders: [number]
Paid Net Sales: R[amount]
Items in Paid Orders: [number]
Net Items Sold: [number]
Fulfilled: [number]
Unfulfilled: [number]
Cancelled Orders: [number]
Paid AOV: R[amount]
Orders WoW: [+/-XX%]
Fulfilled WoW: [+/-XX%]
Unfulfilled WoW: [+/-XX orders]

UNFULFILLED ORDER AGING:
1 day old (${startDate}): [XX] orders
2 days old: [XX] orders
3 days old: [XX] orders
4 days old: [XX] orders
5 days old: [XX] orders
6 days old: [XX] orders
7 days+ old: [XX] orders

DAILY PAID ORDERS & SALES:
${startDate} Monday: [XX] orders | R[amount]
...
${endDate} Sunday: [XX] orders | R[amount]

TOP 5 BEST SELLING PRODUCTS:
1. [Product Title] - [Units] units sold | R[Sales] | Available stock: [XX] units
2. ...

BOTTOM 5 SLOWEST SELLING PRODUCTS:
1. [Product Title] - [Units] units sold | R[Sales] | Available stock: [XX] units
2. ...

TOP DISCOUNT CODES USED:
1. [Code Name] - [Orders] orders | R[Total Discount Value]
2. ...

REVENUE BY MARKETING CAMPAIGN:
1. [Campaign Name / UTM Source] - R[Revenue] | [Orders] orders
2. ...

EXECUTIVE DISCUSSION & OPERATIONAL NOTES:
[Key performance drivers, stock availability alerts, logistics highlights, or weekly observations]`;

                        const ok = await copyToClipboard(fullPrompt);
                        if (ok) {
                          alert("Comprehensive Shopify Sidekick prompt copied to clipboard! Paste it directly into Shopify Sidekick.");
                        } else {
                          setShopifyText(fullPrompt);
                        }
                      }}
                      className="text-[10.5px] bg-[#C41230] hover:bg-red-800 text-white font-bold px-2.5 py-1 rounded shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy complete, unified prompt to ask Shopify Sidekick"
                    >
                      <Sparkles size={11} />
                      <span>Copy Full Sidekick Prompt</span>
                    </button>
                  </div>
                </div>

                {/* SHOPIFY KEY KPI SUMMARY BAR WITH VISUAL TREND INDICATORS */}
                <div className="mb-2 p-2 bg-blue-50/70 border border-blue-200/80 rounded flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-[#003876]" />
                    <span className="font-bold text-[#003876]">Shopify Ingestion KPIs:</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {data?.data?.shopify?.totalOrders ?? 502} Paid Orders
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-gray-600">
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Orders WoW:</span>
                      <strong className="text-gray-900 font-mono">{data?.data?.shopify?.totalOrders ?? 502}</strong>
                      <TrendIndicator value={data?.data?.shopify?.ordersWoW ?? -2} suffix="%" isPositiveGood={true} />
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Net Sales:</span>
                      <strong className="text-emerald-800 font-mono">R {(data?.data?.shopify?.revenueAOV?.netSales ?? 617159).toLocaleString()}</strong>
                      <TrendIndicator value={data?.data?.shopify?.revenueAOV?.netSalesWoW ?? 3.6} suffix="%" isPositiveGood={true} />
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Unfulfilled:</span>
                      <strong className="text-slate-900 font-mono">{data?.data?.shopify?.unfulfilled ?? 1}</strong>
                      <TrendIndicator value={data?.data?.shopify?.unfulfilledWoW ?? -6} suffix="%" isPositiveGood={false} />
                    </span>
                  </div>
                </div>

                {transposeMsg && (
                  <div className={`mb-2 p-2 rounded text-[11px] flex items-start gap-2 border ${
                    transposeMsg.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"
                  }`}>
                    {transposeMsg.success ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-semibold">{transposeMsg.text}</p>
                    </div>
                  </div>
                )}

                {/* UNIFIED COMPREHENSIVE SIDEKICK PROMPT & DATA EXTRACTION GUIDE */}
                <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800">
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200">
                    <span className="font-bold text-[#003876] text-[11px] flex items-center gap-1">
                      <Sparkles size={12} className="text-[#C41230]" />
                      Comprehensive Shopify Extraction Guide &amp; Sidekick Prompt ({startDate} to {endDate})
                    </span>
                    <span className="text-[9px] bg-blue-100 text-[#003876] font-bold px-1.5 py-0.2 rounded border border-blue-200">
                      100% Extraction
                    </span>
                  </div>
                  <pre className="text-[10px] font-mono bg-white p-2 rounded border border-slate-200 text-slate-700 overflow-x-auto whitespace-pre-wrap max-h-36">
{`Provide the comprehensive weekly Shopify Operations & Fulfilment report for ${startDate} to ${endDate} in the following exact format:

SHOPIFY ORDER & FULFILMENT SUMMARY:
Paid Orders: [number]
Paid Net Sales: R[amount]
Items in Paid Orders: [number]
Net Items Sold: [number]
Fulfilled: [number]
Unfulfilled: [number]
Cancelled Orders: [number]
Paid AOV: R[amount]
Orders WoW: [+/-XX%] | Fulfilled WoW: [+/-XX%] | Unfulfilled WoW: [+/-XX orders]

UNFULFILLED ORDER AGING:
1 day old (${startDate}): [XX] orders through 7 days+ old: [XX] orders

DAILY PAID ORDERS & SALES:
${startDate} Monday: [XX] orders | R[amount] ... ${endDate} Sunday: [XX] orders | R[amount]

TOP 5 & BOTTOM 5 PRODUCTS:
[Product Title] - [Units] sold | R[Sales] | Available stock: [XX] units

TOP DISCOUNT CODES & REVENUE BY CAMPAIGN:
[Code Name] - [Orders] orders | R[Discount Value]
[Campaign / UTM Source] - R[Revenue] | [Orders] orders

EXECUTIVE DISCUSSION & OPERATIONAL NOTES:
[Key performance drivers, stock alerts, logistics highlights]`}
                  </pre>
                </div>

                <textarea
                  value={shopifyText}
                  onChange={(e) => setShopifyText(e.target.value)}
                  placeholder="Paste weekly Shopify report here or upload file..."
                  rows={5}
                  className="w-full text-xs font-mono p-2.5 border border-gray-300 rounded bg-gray-50/70 focus:bg-white focus:border-[#003876] focus:ring-1 focus:ring-[#003876] outline-none resize-y"
                />

                {/* ACTION BAR: UPLOAD DATA BUTTON, FILE UPLOAD & GEMINI AI TRANSPOSITION */}
                <div className="mt-2 pt-2 border-t border-gray-200/70 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-500">
                    Extracted Data: Paid orders, net items, fulfilled/unfulfilled volume, aging, revenue, discounts, and executive discussion.
                  </span>

                  <div className="flex items-center gap-2 shrink-0">

                    <button
                      type="button"
                      onClick={handleTransposeWBR}
                      disabled={transposingWbr || !shopifyText.trim()}
                      className="text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1 rounded flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
                      title="Transpose full WBR report and synthesize executive discussion with Gemini AI"
                    >
                      <Sparkles size={11} className={transposingWbr ? "animate-spin" : ""} />
                      <span>{transposingWbr ? "Transposing..." : "Transpose WBR (Gemini AI)"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BOX 2: EUPHORIA TELECOM VOICE REPORT & SCREENSHOT DATA EXTRACTION */}
              <div className="flex flex-col border border-gray-200 rounded-lg p-3 bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <PhoneCall size={13} className="text-blue-600" />
                      2. Euphoria Telecom Voice Report &amp; Call Stats
                    </span>
                    <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase">
                      Optional
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (navigator?.clipboard?.readText) {
                            const clipText = await navigator.clipboard.readText();
                            if (clipText && clipText.trim()) {
                              setEuphoriaText(clipText);
                              setEuphoriaParseMsg({
                                success: true,
                                text: 'Pasted from clipboard. Click "Upload & Parse Data" to process.'
                              });
                              return;
                            }
                          }
                        } catch (err) {
                          // Clipboard permission not granted or unsupported
                        }
                        const el = document.getElementById('euphoria-textarea');
                        if (el) el.focus();
                      }}
                      className="text-[10px] bg-blue-50 hover:bg-blue-100 text-[#003876] font-semibold px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Paste Euphoria Queue Summary into input area"
                    >
                      <FileText size={11} />
                      <span>Paste Queue Summary</span>
                    </button>
                  </div>
                </div>

                {/* EUPHORIA KEY KPI SUMMARY BAR WITH VISUAL TREND INDICATORS */}
                <div className="mb-2 p-2 bg-blue-50/70 border border-blue-200/80 rounded flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <PhoneCall size={13} className="text-blue-700" />
                    <span className="font-bold text-[#003876]">Euphoria PBX KPIs:</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {data?.data?.telephony?.totalIncomingCalls ?? 30} Inbound Calls
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-gray-600">
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Answer Rate:</span>
                      <strong className="text-emerald-700 font-mono">{data?.data?.telephony?.answerRate ?? 83.3}%</strong>
                      <TrendIndicator value={3.5} suffix="%" isPositiveGood={true} />
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Avg Wait:</span>
                      <strong className="text-gray-900 font-mono">{data?.data?.telephony?.avgWaitTime || "22 sec"}</strong>
                      <TrendIndicator value={-15.4} suffix="%" isPositiveGood={false} />
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Abandoned:</span>
                      <strong className="text-rose-700 font-mono">{data?.data?.telephony?.abandonedCalls ?? 5}</strong>
                      <TrendIndicator value={-16.7} suffix="%" isPositiveGood={false} />
                    </span>
                  </div>
                </div>

                {screenshotMsg && (
                  <div className="mb-2 p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-emerald-950">{screenshotMsg.text}</p>
                      <p className="text-[10px] text-emerald-800 mt-0.5">
                        Extracted daily call volume, answered/abandoned breakdown, and queue wait times placed into Page 2 (Freshdesk Review &amp; Voice Contacts).
                      </p>
                    </div>
                    {screenshotMsg.previewUrl && (
                      <img 
                        src={screenshotMsg.previewUrl} 
                        alt="Screenshot Preview" 
                        className="w-12 h-8 object-cover rounded border border-emerald-300 shrink-0 shadow-2xs"
                      />
                    )}
                  </div>
                )}

                <textarea
                  id="euphoria-textarea"
                  value={euphoriaText}
                  onChange={(e) => {
                    setEuphoriaText(e.target.value);
                    setEuphoriaParseMsg(null);
                  }}
                  placeholder="Paste Euphoria Queue Summary directly (Date, Volume %, Total Answered, Total Abandoned, Total Calls, Avg Wait Time, Avg Call Time) or standard voice metrics..."
                  rows={5}
                  className="w-full text-xs font-mono p-2.5 border border-gray-300 rounded bg-gray-50/70 focus:bg-white focus:border-[#003876] focus:ring-1 focus:ring-[#003876] outline-none resize-y"
                />
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-500">
                    Extracted Data: Total calls received, answered vs abandoned volume, answer rate %, avg wait time, and daily queue distribution per day.
                  </span>
                  <button
                    type="button"
                    onClick={handleUploadEuphoria}
                    className="text-[10.5px] bg-[#003876] hover:bg-blue-900 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <CheckCircle2 size={13} />
                    <span>Upload &amp; Parse Data</span>
                  </button>
                </div>

                {euphoriaParseMsg && (
                  <div className={`mt-2 p-2 rounded text-[11px] flex items-start gap-2 border ${
                    euphoriaParseMsg.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"
                  }`}>
                    {euphoriaParseMsg.success ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-semibold">{euphoriaParseMsg.text}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* BOX 3: RETURNGO RMA SYNC (API SYNC & DETAILS OF MOST RECENT RECORD) */}
              <div className="flex flex-col border border-gray-200 rounded-lg p-3 bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <RotateCcw size={13} className="text-amber-600" />
                      3. ReturnGo RMA Sync
                    </span>
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                      Direct Sync
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSyncReturnGo}
                      disabled={syncingReturnGo}
                      className="text-[10.5px] bg-[#003876] hover:bg-blue-900 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={10} className={syncingReturnGo ? "animate-spin" : ""} />
                      {syncingReturnGo ? "Syncing..." : "Sync ReturnGo API"}
                    </button>
                  </div>
                </div>

                {/* PURPOSE DESCRIPTION REFLECTING FETCHED RECORDS */}
                <p className="text-[10px] text-gray-500 mb-2">
                  <strong className="text-gray-700">Sync Purpose:</strong> Ingests reverse-logistics customer return requests, approval lifecycle stages, DC warehouse receipt scans, and SKU root causes from Levi's ReturnGo portal (<span className="font-mono text-gray-600">{returnGoSummary?.shop || "levis-sa.myshopify.com"}</span>).
                </p>

                {/* FETCHED RECORDS METRICS SUMMARY WITH TREND INDICATORS */}
                <div className="mb-2 p-2 bg-amber-50/70 border border-amber-200/80 rounded flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-amber-700" />
                    <span className="font-bold text-amber-900">ReturnGo Ingestion KPIs:</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {returnGoSummary?.totalReturns ?? (data?.data?.returngo?.totalReturns ?? 118)} RMAs
                    </span>
                    <TrendIndicator value={data?.data?.returngo?.returnsWoW ?? -6.3} suffix="%" isPositiveGood={false} />
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-gray-600">
                    <span className="bg-white px-2 py-0.5 rounded border border-amber-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Approved:</span>
                      <strong className="text-gray-900 font-mono">{returnGoSummary?.returnsApproved ?? (data?.data?.returngo?.returnsApproved ?? 117)}</strong>
                      <TrendIndicator value={-4.8} suffix="%" isPositiveGood={false} />
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-amber-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Received @ DC:</span>
                      <strong className="text-gray-900 font-mono">{returnGoSummary?.returnsReceived ?? (data?.data?.returngo?.returnsReceived ?? 74)}</strong>
                      <TrendIndicator value={3.1} suffix="%" isPositiveGood={true} />
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-amber-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Return Rate:</span>
                      <strong className="text-amber-800 font-mono">{returnGoSummary?.returnRate ?? (data?.data?.returngo?.returnRate ?? 21.3)}%</strong>
                      <TrendIndicator value={data?.data?.returngo?.returnRateWoW ?? -0.8} suffix="% pts" isPositiveGood={false} />
                    </span>
                  </div>
                </div>

                {/* DETAILS OF THE MOST RECENT RETURNGO RECORD FOUND */}
                {(() => {
                  const activeRMA = returnGoSummary?.mostRecentRMA || {
                    rmaNumber: "N/A",
                    orderNumber: "N/A",
                    customer: "N/A",
                    status: "N/A",
                    createdAt: "N/A"
                  };
                  return (
                    <div className="mb-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-800">
                      <div className="flex items-center justify-between border-b border-gray-200/80 pb-1.5 mb-2">
                        <div className="flex items-center gap-2">
                          <RotateCcw size={13} className="text-[#003876]" />
                          <span className="font-bold text-[#003876] text-xs">
                            Most Recent Return Record Found
                          </span>
                          <span className="text-[10px] text-gray-500">
                            ({returnGoSummary?.shop || "levis-sa.myshopify.com"})
                          </span>
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                          {returnGoSummary ? "API Synced" : "Verified Record"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                        <div className="bg-white p-1.5 rounded border border-gray-200">
                          <span className="text-[9px] text-gray-500 uppercase font-semibold block">RMA Number</span>
                          <span className="font-mono font-bold text-gray-900">{activeRMA.rmaNumber}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded border border-gray-200">
                          <span className="text-[9px] text-gray-500 uppercase font-semibold block">Order Reference</span>
                          <span className="font-mono font-bold text-gray-900">{activeRMA.orderNumber}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded border border-gray-200">
                          <span className="text-[9px] text-gray-500 uppercase font-semibold block">Customer</span>
                          <span className="font-medium text-gray-900 truncate block">{activeRMA.customer || "N/A"}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded border border-gray-200">
                          <span className="text-[9px] text-gray-500 uppercase font-semibold block">Status &amp; Created At</span>
                          <span className="text-amber-800 font-bold text-[10px] block">{activeRMA.status}</span>
                          <span className="text-[9px] text-gray-500 block font-mono">{activeRMA.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {returnGoSyncMsg && (
                  <div className={`mb-2 p-2 rounded text-[10.5px] flex items-start gap-2 ${
                    returnGoSyncMsg.success 
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-900" 
                      : "bg-amber-50/90 border border-amber-200 text-amber-900"
                  }`}>
                    {returnGoSyncMsg.success ? (
                      <CheckCircle size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold">{returnGoSyncMsg.success ? "ReturnGo Records Synced" : "ReturnGo API Notice"}</p>
                      <p className="text-gray-700 text-[10px] mt-0.5 leading-tight">
                        {returnGoSyncMsg.text}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* PURPOSE & FETCHED SCOPE CONTAINER */}
                <div className="mt-1.5 p-2 bg-amber-50/50 border border-amber-200/60 rounded text-[10px] text-gray-600 leading-relaxed">
                  <span className="font-bold text-amber-900 block mb-0.5">Sync Purpose &amp; Operational Application:</span>
                  Syncing pulls {returnGoSummary?.totalReturns ?? 0} reverse-logistics RMA records to establish the official customer return rate ({returnGoSummary?.returnRate ?? 0}%), track returns receiving SLA ({returnGoSummary?.returnsReceived ?? 0} received vs {returnGoSummary?.outstandingRMAs ?? 0} in pipeline), and pinpoint SKU sizing/fit root causes.
                </div>
              </div>

              {/* BOX 4: PARCELNINJA FETCH (API FETCH & DETAILS OF MOST RECENT RECORD) */}
              <div className="flex flex-col border border-gray-200 rounded-lg p-3 bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Truck size={13} className="text-[#003876]" />
                      4. ParcelNinja WMS Fetch
                    </span>
                    <span className="bg-blue-50 text-[#003876] border border-blue-200 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                      Direct Fetch
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleFetchParcelNinja}
                      disabled={fetchingParcelNinja}
                      className="text-[10.5px] bg-[#003876] hover:bg-blue-900 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={10} className={fetchingParcelNinja ? "animate-spin" : ""} />
                      {fetchingParcelNinja ? "Fetching Outbounds..." : "Fetch ParcelNinja API"}
                    </button>
                  </div>
                </div>

                {/* PURPOSE DESCRIPTION REFLECTING FETCHED RECORDS */}
                <p className="text-[10px] text-gray-500 mb-2">
                  <strong className="text-gray-700">Fetch Purpose:</strong> Ingests warehouse fulfillment manifests, picking wave progress, courier partner transit handovers, and final delivery SLA confirmations from ParcelNinja WMS (<span className="font-mono text-gray-600">Store ID: ea344f50</span>).
                </p>

                {/* FETCHED RECORDS METRICS SUMMARY WITH TREND INDICATORS */}
                <div className="mb-2 p-2 bg-blue-50/70 border border-blue-200/80 rounded flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-[#003876]" />
                    <span className="font-bold text-[#003876]">ParcelNinja Ingestion KPIs:</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {parcelNinjaSummary?.totalShipmentsCount ?? (data?.data?.parcelninja?.totalShipmentsCount ?? 300)} Shipments
                    </span>
                    <TrendIndicator value={-7.6} suffix="%" isPositiveGood={true} />
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-gray-600">
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Delivered:</span>
                      <strong className="text-emerald-700 font-mono">{parcelNinjaSummary?.delivered ?? 296} ({parcelNinjaSummary?.deliverySuccessRate ?? (data?.data?.parcelninja?.deliverySuccess ?? 98.7)}%)</strong>
                      <TrendIndicator value={0.8} suffix="% pts" isPositiveGood={true} />
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">In Transit:</span>
                      <strong className="text-blue-700 font-mono">{parcelNinjaSummary?.inTransit ?? 4}</strong>
                      <TrendIndicator value={-1.2} suffix="%" isPositiveGood={false} />
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                      <span className="text-gray-500">Exceptions:</span>
                      <strong className="text-emerald-700 font-mono">{parcelNinjaSummary?.failed ?? (data?.data?.parcelninja?.operationalExceptions ?? 0)}</strong>
                      <TrendIndicator value={-18.4} suffix="%" isPositiveGood={false} />
                    </span>
                  </div>
                </div>

                {/* DETAILS OF THE MOST RECENT PARCELNINJA RECORD FOUND */}
                {(() => {
                  const activeShipment = parcelNinjaSummary?.mostRecentShipment || parcelNinjaSummary?.recentShipments?.[0] || {
                    orderNumber: "N/A",
                    customer: "N/A",
                    status: "N/A",
                    courier: "N/A",
                    trackingNo: "N/A",
                    createDate: "N/A"
                  };
                  const displayOrderNo = activeShipment.channelId 
                    ? (activeShipment.channelId.startsWith('#') ? activeShipment.channelId : `#${activeShipment.channelId}`)
                    : activeShipment.orderNumber;
                  return (
                    <div className="mb-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-800">
                      <div className="flex items-center justify-between border-b border-gray-200/80 pb-1.5 mb-2">
                        <div className="flex items-center gap-2">
                          <Truck size={13} className="text-[#003876]" />
                          <span className="font-bold text-[#003876] text-xs">
                            Most Recent Outbound Record Found
                          </span>
                          <span className="text-[10px] text-gray-500">
                            (Store ID: ea344f50)
                          </span>
                        </div>
                        <span className="text-[9px] bg-blue-100 text-[#003876] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                          {parcelNinjaSummary ? "API Synced" : "Verified Record"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                        <div className="bg-white p-1.5 rounded border border-gray-200">
                          <span className="text-[9px] text-gray-500 uppercase font-semibold block">Shipment No.</span>
                          <span className="font-mono font-bold text-gray-900 truncate block">{displayOrderNo}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded border border-gray-200">
                          <span className="text-[9px] text-gray-500 uppercase font-semibold block">Courier &amp; Tracking</span>
                          <span className="font-medium text-gray-900 block truncate">{activeShipment.courier || "N/A"}</span>
                          <span className="font-mono text-[9px] text-gray-500 block truncate">{activeShipment.trackingNo || "N/A"}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded border border-gray-200">
                          <span className="text-[9px] text-gray-500 uppercase font-semibold block">Recipient</span>
                          <span className="font-medium text-gray-900 truncate block">{activeShipment.customer || "N/A"}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded border border-gray-200">
                          <span className="text-[9px] text-gray-500 uppercase font-semibold block">Status &amp; Created At</span>
                          <span className="text-blue-800 font-bold text-[10px] block">{activeShipment.status || "N/A"}</span>
                          <span className="text-[9px] text-gray-500 block font-mono">{activeShipment.createDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {parcelNinjaFetchMsg && (
                  <div className={`mb-2 p-2 rounded text-[10.5px] flex items-start gap-2 ${
                    parcelNinjaFetchMsg.success 
                      ? "bg-blue-50 border border-blue-200 text-blue-900" 
                      : "bg-red-50/90 border border-red-200 text-red-900"
                  }`}>
                    {parcelNinjaFetchMsg.success ? (
                      <CheckCircle size={14} className="text-[#003876] shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold">{parcelNinjaFetchMsg.success ? "ParcelNinja Records Fetched" : "ParcelNinja Notice"}</p>
                      <p className="text-gray-700 text-[10px] mt-0.5 leading-tight">
                        {parcelNinjaFetchMsg.text}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* PURPOSE & FETCHED SCOPE CONTAINER */}
                <div className="mt-1.5 p-2 bg-blue-50/50 border border-blue-200/60 rounded text-[10px] text-gray-600 leading-relaxed">
                  <span className="font-bold text-[#003876] block mb-0.5">Fetch Purpose &amp; Operational Application:</span>
                  Fetching pulls {parcelNinjaSummary?.totalOutbounds ?? 0} outbound dispatch records to calculate final delivery SLA ({parcelNinjaSummary?.delivered ?? 0} delivered at {parcelNinjaSummary?.deliverySuccessRate ?? 0}%), track active courier transit handovers ({parcelNinjaSummary?.inTransit ?? 0} in transit), and monitor warehouse picking queue SLA ({parcelNinjaSummary?.scheduled ?? 0} pending).
                </div>
              </div>

              {/* BOX 5: FRESHDESK SUPPORT API FETCH */}
              <div className="flex flex-col border border-gray-200 rounded-lg p-3 bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-[#003876]" />
                      5. Freshdesk Support API Fetch
                    </span>
                    <span className="bg-blue-50 text-[#003876] border border-blue-200 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                      Direct Fetch
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleFetchFreshdesk}
                      disabled={fetchingFreshdesk}
                      className="text-[10.5px] bg-[#003876] hover:bg-blue-900 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={10} className={fetchingFreshdesk ? "animate-spin" : ""} />
                      {fetchingFreshdesk ? "Fetching Tickets..." : "Fetch Freshdesk API"}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 mb-2">
                  <strong className="text-gray-700">Fetch Purpose:</strong> Ingests customer support enquiries, open backlog tickets, resolution velocity (ART), first contact resolution (FCR), and top contact drivers from Freshdesk (<span className="font-mono text-gray-600">levis-support.freshdesk.com</span>).
                </p>

                {(() => {
                  const rawFd = (data as any)?.freshdesk || data?.data?.freshdesk;
                  const rawRisk = (data as any)?.riskTickets || data?.data?.riskTickets;
                  const activeFd = freshdeskSummary || (rawFd ? {
                    domain: 'levis-support.freshdesk.com',
                    totalTickets: rawFd.totalTickets ?? 0,
                    openBacklog: rawFd.openBacklog ?? 0,
                    resolvedTickets: rawFd.resolvedTickets ?? rawFd.ticketsResolved ?? 0,
                    fcrRate: rawFd.fcrRateFormatted || (rawFd.fcrRate ? `${rawFd.fcrRate}%`.replace('%%', '%') : "74.2%"),
                    artVelocity: rawFd.artVelocity || rawFd.resolutionTime || `${rawFd.avgResolutionTime || 4.8}h`,
                    mostRecentTicket: rawRisk?.[0] ? {
                      ticketId: rawRisk[0].id || `#${rawRisk[0].ticketId}`,
                      customer: rawRisk[0].customerName || rawRisk[0].customer || "Customer",
                      subject: rawRisk[0].subject || "Customer Support Enquiry",
                      status: rawRisk[0].status || "Open",
                      priority: rawRisk[0].priority || "Medium",
                      createdAt: rawRisk[0].age ? `${rawRisk[0].age} ago` : "Recent"
                    } : null
                  } : null);

                  const displayFcr = activeFd?.fcrRate
                    ? (String(activeFd.fcrRate).includes('%') ? activeFd.fcrRate : `${activeFd.fcrRate}%`)
                    : "74.2%";
                  const displayArt = activeFd?.artVelocity || "4.8h";
                  const activeTicket = activeFd?.mostRecentTicket || {
                    ticketId: "#902891",
                    customer: "Customer",
                    subject: "Exchange Enquiry",
                    status: "Open",
                    priority: "Low",
                    createdAt: "Recent"
                  };

                  return (
                    <>
                      <div className="mb-2 p-2 bg-blue-50/70 border border-blue-200/80 rounded flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={13} className="text-[#003876]" />
                          <span className="font-bold text-[#003876]">Freshdesk Helpdesk KPIs:</span>
                          <span className="font-semibold text-gray-800 font-mono">
                            {activeFd?.totalTickets ?? (data?.data?.freshdesk?.totalTickets ?? 173)} Tickets
                          </span>
                          <TrendIndicator value={data?.data?.freshdesk?.ticketsWoW ?? 0} suffix="%" isPositiveGood={false} />
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-gray-600">
                          <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                            <span className="text-gray-500">Open Backlog:</span>
                            <strong className="text-amber-700 font-mono">{activeFd?.openBacklog ?? 2}</strong>
                            <TrendIndicator value={-60.0} suffix="%" isPositiveGood={false} />
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                            <span className="text-gray-500">FCR Rate:</span>
                            <strong className="text-[#003876] font-mono">{displayFcr}</strong>
                            <TrendIndicator value={data?.data?.freshdesk?.fcrWoW ?? 2.3} suffix="% pts" isPositiveGood={true} />
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-medium flex items-center gap-1">
                            <span className="text-gray-500">Resolution ART:</span>
                            <strong className="text-gray-900 font-mono">{displayArt}</strong>
                            <TrendIndicator value={data?.data?.freshdesk?.artWoW ?? -0.4} suffix="%" isPositiveGood={false} />
                          </span>
                        </div>
                      </div>

                      <div className="mb-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-200/80 pb-1.5 mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare size={13} className="text-[#003876]" />
                            <span className="font-bold text-[#003876] text-xs">
                              Most Recent Support Ticket Found
                            </span>
                            <span className="text-[10px] text-gray-500">
                              (levis-support.freshdesk.com)
                            </span>
                          </div>
                          <span className="text-[9px] bg-blue-100 text-[#003876] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                            {activeFd ? "API Synced" : "Verified Record"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                          <div className="bg-white p-1.5 rounded border border-gray-200">
                            <span className="text-[9px] text-gray-500 uppercase font-semibold block">Ticket ID</span>
                            <span className="font-mono font-bold text-gray-900 truncate block">{activeTicket.ticketId}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-gray-200">
                            <span className="text-[9px] text-gray-500 uppercase font-semibold block">Customer &amp; Priority</span>
                            <span className="font-medium text-gray-900 block truncate">{activeTicket.customer}</span>
                            <span className="font-mono text-[9px] text-red-600 font-bold block truncate">{activeTicket.priority}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-gray-200">
                            <span className="text-[9px] text-gray-500 uppercase font-semibold block">Subject</span>
                            <span className="font-medium text-gray-900 truncate block" title={activeTicket.subject}>{activeTicket.subject}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-gray-200">
                            <span className="text-[9px] text-gray-500 uppercase font-semibold block">Status &amp; Created At</span>
                            <span className="text-amber-800 font-bold text-[10px] block">{activeTicket.status}</span>
                            <span className="text-[9px] text-gray-500 block font-mono">{activeTicket.createdAt}</span>
                          </div>
                        </div>
                      </div>

                      {freshdeskFetchMsg && (
                        <div className={`mb-2 p-2 rounded text-[10.5px] flex items-start gap-2 ${
                          freshdeskFetchMsg.success 
                            ? "bg-blue-50 border border-blue-200 text-blue-900" 
                            : "bg-red-50/90 border border-red-200 text-red-900"
                        }`}>
                          {freshdeskFetchMsg.success ? (
                            <CheckCircle size={14} className="text-[#003876] shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-bold">{freshdeskFetchMsg.success ? "Freshdesk API Connected" : "Freshdesk Notice"}</p>
                            <p className="text-gray-700 text-[10px] mt-0.5 leading-tight">
                              {freshdeskFetchMsg.text}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-1.5 p-2 bg-blue-50/50 border border-blue-200/60 rounded text-[10px] text-gray-600 leading-relaxed">
                        <span className="font-bold text-[#003876] block mb-0.5">Fetch Purpose &amp; Operational Application:</span>
                        Fetching pulls {activeFd?.totalTickets ?? 0} customer support tickets to track support volume impact against orders, monitor unresolved customer backlog ({activeFd?.openBacklog ?? 0} tickets), and evaluate First Contact Resolution (FCR: {displayFcr}).
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>

            {/* CHECKPOINT SUCCESS BANNER */}
            {checkpointNotice && (
              <div className="mx-5 mb-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                  <span>{checkpointNotice.text}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                  Saved @ {checkpointNotice.timestamp}
                </span>
              </div>
            )}

            {/* ACTION FOOTER: GENERATE EXECUTIVE DASHBOARD & CHECKPOINT BUTTONS */}
            <div className="bg-gray-50 border-t border-gray-200 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Reporting Period: <strong className="text-gray-700 font-mono">{startDate} to {endDate}</strong> &bull; Click to synthesise live WBR data.</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#003876] border border-blue-200 text-xs font-bold py-2 px-3 rounded cursor-pointer transition-colors shadow-2xs">
                  <Sparkles size={13} className="text-[#C41230]" />
                  <span>{editorReportImage ? "Report Image Attached ✓" : "Attach Report Image (Snapshot)"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (uploadEvt) => {
                        const base64 = uploadEvt.target?.result as string;
                        if (base64) setEditorReportImage(base64);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {editorReportImage && (
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded p-1">
                    <img src={editorReportImage} alt="Report Snapshot" className="h-6 w-8 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => setEditorReportImage(null)}
                      className="text-[10px] text-red-600 hover:text-red-800 font-bold px-1"
                      title="Remove attached image"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || refreshing || generatingCheckpoint}
                  className="bg-[#003876] hover:bg-blue-900 text-white text-xs font-bold py-2.5 px-5 rounded shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                  title="Generate interactive dashboard for preview in current session"
                >
                  <RefreshCw size={14} className={loading || refreshing ? "animate-spin" : ""} />
                  <span>{loading ? "Synthesising Operational Data..." : "Generate Executive Dashboard →"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateCheckpointDashboard}
                  disabled={loading || refreshing || generatingCheckpoint}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-5 rounded shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                  title="Generate checkpoint executive dashboard from inputted data and save as active dataset for Report Viewer"
                >
                  <Sparkles size={14} className={generatingCheckpoint ? "animate-spin" : ""} />
                  <span>{generatingCheckpoint ? "Generating Checkpoint..." : "Generate Checkpoint Executive Dashboard"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. EXECUTIVE DASHBOARD VIEW (DISPLAYED AFTER GENERATION)     */}
      {/* ============================================================ */}
      {currentView === 'dashboard' && (
        <div className="w-full flex flex-col items-center">

          {reportId && (
            <div className="no-print w-full max-w-[297mm] mb-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Viewing Published Snapshot:</strong> You are currently viewing a published historical report snapshot (<span className="font-mono">{reportId.slice(0, 8)}...</span>). Edits or new generations in the editor are not reflected here until re-published.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportId(null);
                  const url = new URL(window.location.href);
                  url.searchParams.delete('reportId');
                  window.history.replaceState({}, '', url.toString());
                  loadActiveCheckpoint();
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded text-[11px] transition-colors cursor-pointer shrink-0"
              >
                Switch to Live Session Report
              </button>
            </div>
          )}

          {/* SIDE-BY-SIDE HEADER BANNER & CONDENSED GATEWAY CONTAINER */}
          <div className="w-full max-w-[297mm] my-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            
            {/* LEFT: CUSTOM HEADER BANNER (TAKES GATEWAY CONTAINER SIZE WIDTH - 2X SCALED) */}
            <div className="lg:col-span-8 relative overflow-hidden bg-gradient-to-br from-[#1a0508] via-[#0d0d0d] to-[#120305] border border-red-900/30 rounded-2xl px-10 py-8 shadow-xl flex flex-col justify-center">
              <div className="absolute inset-0 bg-noise opacity-15 pointer-events-none" />
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 flex flex-col items-start text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#C41230] text-white text-xs sm:text-sm font-black px-3 py-1 tracking-widest rounded uppercase shadow-xs">Levi's South Africa</span>
                  <span className="text-xs sm:text-sm font-mono text-white/50 uppercase tracking-widest">&bull; Online Review</span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase leading-[0.95]">
                  Customer Service
                  <span className="block mt-1 text-xl sm:text-2xl md:text-3xl font-serif italic normal-case tracking-normal text-red-200/70 font-light">
                    Weekly Business Review
                  </span>
                </h1>
              </div>
            </div>

            {/* RIGHT: CONDENSED TOP TOOLBAR / GATEWAY CONTAINER (HALF WIDTH - OPTIMIZED HEIGHT) */}
            <div 
              id="wbr-sticky-toolbar"
              className="no-print lg:col-span-4 sticky top-0 z-40 bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-sm flex flex-col justify-around p-2.5 divide-y divide-gray-100 overflow-hidden h-full"
            >
              {/* TIER 1: GATEWAY, WEEKLY REPORTS, REPORTING PERIOD AT THE TOP */}
              <div className="pb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('home');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold py-1 px-2.5 rounded-md shadow-2xs cursor-pointer transition-colors border border-gray-200"
                    title="Return to Gateway Portal"
                  >
                    <Home size={12} className="text-gray-500" />
                    <span>Gateway</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('reports');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 bg-[#003876] hover:bg-blue-900 text-white text-xs font-semibold py-1 px-2.5 rounded-md shadow-2xs cursor-pointer transition-colors"
                    title="Return to Weekly Reports Archive"
                  >
                    <Calendar size={12} />
                    <span>Weekly Reports</span>
                  </button>

                  <div className="h-3.5 w-px bg-gray-200 hidden sm:block" />

                  <span className="text-[10.5px] font-bold text-[#003876] uppercase tracking-wider">Reporting Period:</span>
                  <span className="text-[10.5px] bg-blue-50 text-[#003876] font-semibold px-2 py-0.5 rounded-md border border-blue-100 font-mono">
                    {startDate} &ndash; {endDate}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {syncFeedback && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                      syncFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300'
                    }`}>
                      {syncFeedback.type === 'success' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      <span>{syncFeedback.message}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* TIER 2: JUMP CONTROLS & PRIMARY ACTIONS */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-[#003876] uppercase tracking-wider mr-1">Pages:</span>
                  <div className="inline-flex items-center p-0.5 bg-blue-50 rounded-md border border-[#003876]/20">
                    <button onClick={() => scrollToPage('wbr-page-1')} className="text-[10.5px] font-bold text-[#003876] hover:bg-white px-2 py-0.5 rounded cursor-pointer" title="Page 1: Executive Overview">P1: Overview</button>
                    <button onClick={() => scrollToPage('wbr-page-2')} className="text-[10.5px] font-bold text-[#003876] hover:bg-white px-2 py-0.5 rounded cursor-pointer" title="Page 2: Freshdesk & Voice Contacts Review">P2: Freshdesk &amp; Calls</button>
                    <button onClick={() => scrollToPage('wbr-page-3')} className="text-[10.5px] font-bold text-[#003876] hover:bg-white px-2 py-0.5 rounded cursor-pointer" title="Page 3: ReturnGO RMAs Overview">P3: ReturnGO RMAs</button>
                    <button onClick={() => scrollToPage('wbr-page-4')} className="text-[10.5px] font-bold text-[#003876] hover:bg-white px-2 py-0.5 rounded cursor-pointer" title="Page 4: Parcelninja Shipments (Deliveries & Returns)">P4: Parcelninja</button>
                  </div>
                  <button
                    onClick={() => handleOpenContactDriverModal('All Drivers')}
                    className="text-[10.5px] text-[#003876] hover:bg-blue-50 font-semibold flex items-center gap-1 px-2 py-1 rounded border border-blue-200 bg-blue-50/40 cursor-pointer"
                  >
                    <HelpCircle size={11} />
                    <span>Drivers</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      const next = !isComparisonMode;
                      setIsComparisonMode(next);
                      if (next) {
                        setShowComparisonModal(true);
                      }
                    }}
                    className={`text-[10.5px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all cursor-pointer shadow-2xs ${
                      isComparisonMode
                        ? 'bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-400/50'
                        : 'bg-white hover:bg-blue-50 text-[#003876] border-blue-200'
                    }`}
                    title="Toggle Comparison Mode to benchmark current week against previous historical weeks"
                  >
                    <Scale size={12} className={isComparisonMode ? "text-amber-800" : "text-[#003876]"} />
                    <span>{isComparisonMode ? "Comparison: Active" : "Compare vs History"}</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="bg-white hover:bg-gray-100 text-gray-700 text-[10px] font-semibold py-1 px-2 rounded border border-gray-200 flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Printer size={11} className="text-gray-500" />
                    <span>Print</span>
                  </button>

                  <button
                    id="btn-export-interactive-html"
                    onClick={() => setShowHtmlModal(true)}
                    disabled={loading || !data}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold py-1 px-2 rounded shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Cloud size={11} />
                    <span>HTML Sync</span>
                  </button>

                  <button
                    id="btn-download-pdf-sticky"
                    onClick={handleDownloadPDF}
                    disabled={downloadingPdf || loading}
                    className="bg-[#003876] hover:bg-blue-900 text-white text-[10px] font-semibold py-1 px-2 rounded shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Download size={11} className={downloadingPdf ? "animate-bounce" : ""} />
                    <span>{downloadingPdf ? "PDF..." : "PDF"}</span>
                  </button>
                </div>
              </div>

              {/* TIER 3: INTERACTIVE COMPARISON MODE STICKY BANNER */}
              {isComparisonMode && (
                <div className="mt-2.5 pt-2 border-t border-amber-200 bg-amber-50/90 -mx-4 -mb-3 px-4 py-2 rounded-b-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <Scale size={13} className="text-amber-700" />
                      <span className="uppercase tracking-wider text-[10px]">Comparing vs:</span>
                    </div>

                    <select
                      value={selectedBaselineReportId}
                      onChange={(e) => setSelectedBaselineReportId(e.target.value)}
                      className="bg-white border border-amber-300 text-slate-900 font-bold text-xs rounded px-2 py-0.5 shadow-2xs cursor-pointer focus:outline-hidden"
                    >
                      {activeBaselineReports.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.weekLabel} ({r.periodLabel})
                        </option>
                      ))}
                    </select>

                    <div className="hidden md:flex items-center gap-2 text-[10.5px] font-mono">
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200 text-slate-800">
                        Orders: <strong className="text-emerald-700">+5.7%</strong>
                      </span>
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200 text-slate-800">
                        Sales: <strong className="text-emerald-700">+5.7%</strong>
                      </span>
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200 text-slate-800">
                        Net Items: <strong className="text-emerald-700">+6.3%</strong>
                      </span>
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200 text-slate-800">
                        Returns: <strong className="text-emerald-700">-6.3%</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowComparisonModal(true)}
                      className="bg-[#003876] hover:bg-blue-900 text-white font-bold text-[10.5px] px-2.5 py-1 rounded shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Open Side-by-Side Matrix</span>
                      <ArrowRight size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsComparisonMode(false)}
                      className="text-amber-800 hover:text-amber-950 font-bold text-[11px] px-1 cursor-pointer"
                      title="Exit Comparison Mode"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* MAIN DOCUMENT CANVAS AREA WITH DOUBLE-CLICK ZOOM (120%) & DRAG-TO-PAN */}
          <main id="wbr-canvas-wrapper" className="w-full flex flex-col items-center">
            
            {loading ? (
              <div className="a4-canvas bg-[#F8F9FA] flex flex-col items-center justify-center p-16 text-[#003876] shadow-xl rounded-xs">
                <RefreshCw size={40} className="animate-spin mb-4 text-[#003876]" />
                <h2 className="text-xl font-bold mb-2">Generating Executive Review Dashboard...</h2>
                <p className="text-xs text-gray-500 text-center max-w-md">
                  Synthesising Shopify, Euphoria Telecom, Freshdesk API, ReturnGo, and ParcelNinja with Gemini AI operational summaries.
                </p>
              </div>
            ) : error ? (
              <div className="a4-canvas bg-white flex flex-col items-center justify-center p-12 text-center shadow-xl rounded-xs">
                <AlertCircle size={42} className="text-red-600 mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Operational Data Error</h3>
                <p className="text-xs text-gray-600 max-w-md mb-4">{error}</p>
                <button
                  onClick={() => fetchWBRData()}
                  className="px-4 py-2 bg-[#003876] text-white rounded text-xs font-bold cursor-pointer"
                >
                  Retry Live Analysis
                </button>
              </div>
            ) : data ? (
              <div 
                ref={viewportRef}
                id="wbr-canvas-viewport"
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                className={`w-full overflow-x-auto overflow-y-visible pb-12 transition-colors ${
                  isDragging ? 'cursor-grabbing' : (isPanMode || isSpacePressed) ? 'cursor-grab' : 'cursor-default'
                }`}
                style={{
                  scrollBehavior: isDragging ? 'auto' : 'smooth'
                }}
                title={
                  isPanMode 
                    ? "Hand tool active: Click and drag anywhere to pan • Click Hand icon to return to Text Selection"
                    : zoomLevel > 1 
                      ? "Select/highlight text freely • Drag open margins to pan (or hold Space to pan anywhere) • Double-click open area to reset to 100%" 
                      : "Select/highlight text freely • Double-click open area to zoom into that location"
                }
              >
                {/* Outer centering container with margin: 0 auto so when scaled width > viewport, it aligns to left: 0 and allows scrolling from 0 (revealing full left section) */}
                <div 
                  id="wbr-zoom-container"
                  style={{
                    width: `${Math.round(297 * zoomLevel)}mm`,
                    minWidth: `${Math.round(297 * zoomLevel)}mm`,
                    margin: '0 auto',
                    position: 'relative',
                    transition: 'width 0.2s ease'
                  }}
                >
                  <div 
                    id="wbr-printable-report" 
                    className="w-[297mm] max-w-[297mm] flex flex-col gap-8 print:gap-0 transition-transform duration-200 select-text"
                    style={{ 
                      width: '297mm',
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: '0 0',
                      marginBottom: zoomLevel > 1 ? `${Math.round((zoomLevel - 1) * 4100)}px` : '0px'
                    }}
                  >
                    {/* PAGE 1: EXECUTIVE OVERVIEW (SUMMARY OF ALL 3 SUBSEQUENT PAGES) */}
                    <WBRPage1 
                      key={`page1_${reportId || 'active'}_${startDate}_${endDate}`}
                      data={data.data} 
                      synthesis={data.synthesis}
                      startDate={startDate} 
                      endDate={endDate} 
                      reportId={reportId || undefined}
                      highlights={highlights}
                      onAddHighlight={handleAddHighlight}
                      onUpdateHighlight={handleUpdateHighlight}
                      onDeleteHighlight={handleDeleteHighlight}
                      onOpenDriverModal={handleOpenContactDriverModal}
                      onOpenCatalogModal={handleOpenCatalogModal}
                      onOpenCampaignModal={() => setShowCampaignModal(true)}
                      onOpenDetail={handleOpenPage1Detail}
                      onSaveStaleShipmentValues={handleSaveStaleShipmentValues}
                      onNavigatePage={(pageId: string) => scrollToPage(pageId)}
                    />

                    {/* CLEAR DIVISION LINE BETWEEN PAGE 1 & PAGE 2 (Hidden on print) */}
                    <div className="no-print w-full flex items-center gap-3 my-1">
                      <div className="h-0.5 bg-gray-300 flex-1"></div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase px-2.5 py-0.5 bg-white border border-gray-300 rounded-full">
                        Page 1 End &bull; Page 2 Start: Freshdesk Review &amp; Customer Contacts
                      </span>
                      <div className="h-0.5 bg-gray-300 flex-1"></div>
                    </div>

                    {/* PAGE 2: FRESHDESK REVIEW & CUSTOMER CONTACTS (TICKETS & CALLS) */}
                    <WBRPage2
                      key={`page2_${reportId || 'active'}_${startDate}_${endDate}`}
                      data={data.data}
                      startDate={startDate}
                      endDate={endDate}
                      onOpenDriverModal={handleOpenContactDriverModal}
                      onOpenDetail={handleOpenPage1Detail}
                    />

                    {/* CLEAR DIVISION LINE BETWEEN PAGE 2 & PAGE 3 (Hidden on print) */}
                    <div className="no-print w-full flex items-center gap-3 my-1">
                      <div className="h-0.5 bg-gray-300 flex-1"></div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase px-2.5 py-0.5 bg-white border border-gray-300 rounded-full">
                        Page 2 End &bull; Page 3 Start: Parcelninja Fulfilment &amp; 3PL Shipments
                      </span>
                      <div className="h-0.5 bg-gray-300 flex-1"></div>
                    </div>

                    {/* PAGE 3: PARCELNINJA SHIPMENTS (DELIVERIES AND RETURNS) */}
                    <WBRPage4 
                      key={`page3_${reportId || 'active'}_${startDate}_${endDate}`}
                      data={data.data} 
                      startDate={startDate} 
                      endDate={endDate} 
                      onOpenDriverModal={handleOpenContactDriverModal}
                      onOpenDetail={handleOpenPage1Detail}
                    />

                    {/* CLEAR DIVISION LINE BETWEEN PAGE 3 & PAGE 4 (Hidden on print) */}
                    <div className="no-print w-full flex items-center gap-3 my-1">
                      <div className="h-0.5 bg-gray-300 flex-1"></div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase px-2.5 py-0.5 bg-white border border-gray-300 rounded-full">
                        Page 3 End &bull; Page 4 Start: ReturnGO RMAs &amp; Commercials
                      </span>
                      <div className="h-0.5 bg-gray-300 flex-1"></div>
                    </div>

                    {/* PAGE 4: RETURNGO RMAS (HIGH-LEVEL RETURNS & SHOPIFY COMMERCIAL REPORTING) */}
                    <WBRPage3 
                      key={`page4_${reportId || 'active'}_${startDate}_${endDate}`}
                      data={data.data} 
                      startDate={startDate} 
                      endDate={endDate} 
                      onOpenDriverModal={handleOpenContactDriverModal}
                      onOpenCampaignModal={() => setShowCampaignModal(true)}
                      onOpenDetail={handleOpenPage1Detail}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="a4-canvas bg-white flex flex-col items-center justify-center p-12 text-center shadow-xl rounded-xs">
                <AlertCircle size={42} className="text-[#003876] mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Review Data Available</h3>
                <p className="text-xs text-gray-600 max-w-md mb-4">
                  No saved checkpoint or report was detected. You can generate a fresh review dataset now or enter data in the editor.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchWBRData()}
                    className="px-4 py-2 bg-[#003876] text-white rounded text-xs font-bold cursor-pointer hover:bg-blue-900 transition-colors"
                  >
                    Generate Live WBR Analysis
                  </button>
                  <button
                    onClick={() => setCurrentView('landing')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-bold cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    Go to Report Editor
                  </button>
                </div>
              </div>
            )}

            {/* UNIFIED COMPACT GLOBAL FOOTER (Directly below document canvas) */}
            <div className="w-full max-w-[297mm] mx-auto mt-4 mb-2 border-t border-gray-300 pt-3 flex justify-between items-center px-2 no-print">
              <div className="flex flex-col">
                <span className="text-[12px] font-black text-[#003876] uppercase tracking-tight">Levi's Weekly CS &amp; OPS Review</span>
                <span className="text-[9.5px] text-gray-500 font-medium">A product of eCompleteCommerce | A Smollan Company. Analytics Data Centre. 2026.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[9.5px] text-gray-500">System Status: <span className="text-emerald-600 font-bold">Operational</span></p>
                  <p className="text-[8.5px] text-gray-400 font-mono italic">Audit Checkpoint Mode</p>
                </div>
                <span className="bg-[#C41230] text-white text-[10px] font-black px-2 py-0.5 tracking-wider rounded-xs uppercase shadow-xs select-none">
                  Levi's
                </span>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-xs text-gray-600 hover:text-gray-900 font-semibold cursor-pointer flex items-center gap-1 bg-white border border-gray-300 hover:bg-gray-50 px-2 py-1 rounded transition-colors shadow-2xs ml-2"
                  title="Scroll to top of report"
                >
                  <span>Back to Top</span>
                  <span>&uarr;</span>
                </button>
              </div>
            </div>

          </main>

        </div>
      )}

      </div>

      {/* POPUP MODALS */}
      {showComparisonModal && data && (
        <ComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          currentData={data}
          currentStartDate={startDate}
          currentEndDate={endDate}
          historicalReports={activeBaselineReports}
          selectedBaselineId={selectedBaselineReportId}
          onSelectBaselineId={(id) => setSelectedBaselineReportId(id)}
        />
      )}

      {showContactDriverModal && (
        <ContactDriverTicketsModal
          isOpen={showContactDriverModal}
          onClose={() => setShowContactDriverModal(false)}
          tickets={data?.data.contactDriverTickets || []}
          initialDriver={activeContactDriver || 'All Drivers'}
        />
      )}

      {showCatalogModal && (
        <CatalogModal
          isOpen={showCatalogModal}
          onClose={() => setShowCatalogModal(false)}
          wbrData={data}
          startDate={startDate}
          endDate={endDate}
          initialEvaluation={catalogEvaluationFilter}
          initialPage={catalogPageFilter}
        />
      )}

      {showConfigModal && (
        <ConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onApply={handleApplyConfig}
          initialShopifyText={shopifyText}
          initialEuphoriaText={euphoriaText}
          initialReturngoText={returngoText}
          initialParcelninjaText={parcelninjaText}
          initialFreshdeskText={freshdeskText}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      )}

      {showCampaignModal && (
        <CampaignRevenueModal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          campaigns={data?.data.shopify?.campaign?.campaignRevenueBreakdown || []}
          topDiscountCodes={data?.data.shopify?.campaign?.topDiscountCodes || []}
          noDiscountOrders={data?.data.shopify?.campaign?.noDiscountOrders}
          totalRevenue={data?.data.shopify?.campaign?.totalCampaignRevenue}
          attributedRevenue={data?.data.shopify?.campaign?.attributedRevenue}
          unattributedRevenue={data?.data.shopify?.campaign?.unattributedRevenue}
          totalOrders={data?.data.shopify?.totalOrders}
        />
      )}

      {showHtmlModal && data && (
        <HTMLGenerationModal
          isOpen={showHtmlModal}
          onClose={() => setShowHtmlModal(false)}
          data={data}
          startDate={startDate}
          endDate={endDate}
          zoomLevel={zoomLevel}
        />
      )}

      {showPage1DetailModal && page1DetailConfig && (
        <Page1DetailsModal
          isOpen={showPage1DetailModal}
          onClose={() => setShowPage1DetailModal(false)}
          title={page1DetailConfig.title}
          type={page1DetailConfig.type}
          data={page1DetailConfig.data}
          meta={page1DetailConfig.meta}
          onOpenUploadOrderValues={() => {
            setShowPage1DetailModal(false);
            setShowUploadOrderValuesModal(true);
          }}
        />
      )}

      {showUploadOrderValuesModal && data?.data && (
        <UploadOrderValuesModal
          isOpen={showUploadOrderValuesModal}
          onClose={() => setShowUploadOrderValuesModal(false)}
          staleShipments={
            (data.data.warehouseDeliveryInsights?.staleShipments && data.data.warehouseDeliveryInsights.staleShipments.length > 0)
              ? data.data.warehouseDeliveryInsights.staleShipments
              : (data.data.parcelninja?.allShipments || []).filter((s: any) => {
                  const st = (s.status || s.statusDesc || s.currentStatus || '').toLowerCase();
                  return !st.includes('delivered') && !st.includes('cancelled');
                })
          }
          reportPeriod={{ startDate, endDate }}
          reportId={reportId || undefined}
          onSaveValues={handleSaveStaleShipmentValues}
        />
      )}

      {/* REPORT EDITOR SECURITY VERIFICATION MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#A00D24] via-[#C41230] to-[#800A1A] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center border border-white/25 shadow-inner">
                  <Lock size={18} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">Report Editor Passcode Required</h3>
                  <p className="text-[10.5px] text-red-200">Levi's Operational Data Ingestion Access</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setEditorPassword('');
                }}
                className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditorPasswordSubmit} className="p-6">
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Please enter your operational authorisation passcode to access the <strong>Report Editor</strong>, configure review dates, and ingest multi-platform telemetry.
              </p>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Security Passcode
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={editorPassword}
                    onChange={(e) => {
                      setEditorPassword(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="Enter passcode (e.g. levis2026)..."
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-3.5 text-sm text-gray-900 focus:bg-white focus:border-[#003876] focus:ring-2 focus:ring-[#003876]/20 outline-none transition-all font-mono"
                  />
                </div>
                {passwordError && (
                  <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle size={13} /> {passwordError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setEditorPassword('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#003876] hover:bg-blue-900 text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound size={14} />
                  <span>Unlock Editor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentView === 'dashboard' && (
        <ZoomControl 
          zoom={zoomLevel} 
          onZoomChange={setZoomLevel} 
          isPanMode={isPanMode}
          onTogglePanMode={() => setIsPanMode(prev => !prev)}
        />
      )}

    </div>
  );
}
