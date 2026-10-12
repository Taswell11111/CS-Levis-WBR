import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Cloud, 
  CheckCircle2, 
  Layers, 
  AlertTriangle, 
  UploadCloud, 
  Key, 
  FileCheck,
  FolderOpen,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { WBRData } from '../types';
import { copyToClipboard } from '../utils/clipboardUtils';
import { 
  generateStandaloneInteractiveHTML, 
  downloadInteractiveHTML, 
  GCS_BUCKET_INFO 
} from '../utils/htmlExportGenerator';

interface HTMLGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WBRData;
  startDate: string;
  endDate: string;
  zoomLevel: number;
}

interface UploadStatus {
  state: 'idle' | 'processing' | 'downloaded' | 'uploading' | 'success' | 'error';
  message?: string;
  filename?: string;
  objectPath?: string;
  consoleUrl?: string;
  publicUrl?: string;
  error?: string;
  instructions?: string | null;
  serviceAccount?: string;
  status?: number;
}

export const HTMLGenerationModal: React.FC<HTMLGenerationModalProps> = ({
  isOpen,
  onClose,
  data,
  startDate,
  endDate,
  zoomLevel,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadOnly, setDownloadOnly] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ state: 'idle' });
  const [showCustomToken, setShowCustomToken] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [cleaningStorage, setCleaningStorage] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [bucketStatus, setBucketStatus] = useState<{ checked: boolean; accessible?: boolean; error?: string } | null>(null);

  const filename = `Levis_WBR_${startDate}_to_${endDate}.html`;

  const handleCleanStorage = async (targetScope: 'inactive' | 'both' = 'inactive') => {
    setCleaningStorage(true);
    setCleanupMessage(null);
    try {
      const res = await fetch('/api/gcs/clear-stale-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: targetScope,
          preserveLatestInLive: true,
          olderThanDays: 0,
          customToken: customToken.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setCleanupMessage(data.message || 'Stale files successfully cleared! Folders preserved with .keep markers.');
      } else {
        setCleanupMessage(data.error || 'Could not clear stale files.');
      }
    } catch (e: any) {
      setCleanupMessage(e.message || 'Network error executing storage cleanup.');
    } finally {
      setCleaningStorage(false);
    }
  };

  // Check bucket connection status upon modal open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function checkBucket() {
      try {
        const res = await fetch('/api/gcs/bucket-status');
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setBucketStatus({
              checked: true,
              accessible: json.authenticated,
              error: json.error
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setBucketStatus({ checked: true, accessible: false, error: err.message });
        }
      }
    }

    checkBucket();
    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Primary Dual Action: Download to local PC AND Upload to GCS Bucket
  const handleDownloadAndUpload = async () => {
    setUploadStatus({ state: 'processing', message: 'Generating standalone interactive HTML replica...' });
    
    let html = '';
    try {
      // 1. Generate and trigger download to local PC
      html = generateStandaloneInteractiveHTML({ data, startDate, endDate, zoomLevel });
      downloadInteractiveHTML({ data, startDate, endDate, zoomLevel }, filename);
      
      setUploadStatus({
        state: 'uploading',
        filename,
        message: 'Downloaded to your PC! Now transmitting to Google Cloud Storage bucket...'
      });

      // 2. Transmit to backend endpoint for GCS bucket storage
      const res = await fetch('/api/gcs/upload-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          htmlContent: html,
          filename,
          customToken: customToken.trim() || undefined
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        const cleanPublicUrl = result.cleanProxyUrl || `${window.location.origin}/reports/${result.filename || filename}`;
        setUploadStatus({
          state: 'success',
          filename: result.filename || filename,
          objectPath: result.objectPath,
          consoleUrl: result.consoleUrl || GCS_BUCKET_INFO.consoleUrl,
          publicUrl: cleanPublicUrl,
          message: `HTML downloaded to PC and successfully uploaded to gs://${GCS_BUCKET_INFO.bucket}/${GCS_BUCKET_INFO.folder}/${filename}`
        });
      } else {
        setUploadStatus({
          state: 'error',
          status: res.status,
          filename,
          consoleUrl: GCS_BUCKET_INFO.consoleUrl,
          error: result.error || 'Permission error uploading to bucket',
          serviceAccount: result.serviceAccount || 'ais-sandbox',
          instructions: result.instructions || (
            res.status === 403
              ? `The Cloud Run container service account requires 'Storage Object Creator' permission in project '${GCS_BUCKET_INFO.project}' on bucket '${GCS_BUCKET_INFO.bucket}'.`
              : null
          ),
          message: 'Downloaded to your PC! Direct cloud upload requires bucket permissions.'
        });
      }
    } catch (err: any) {
      setUploadStatus({
        state: 'error',
        filename,
        consoleUrl: GCS_BUCKET_INFO.consoleUrl,
        error: err.message,
        message: 'Downloaded to your PC! Network issue uploading to cloud bucket.'
      });
    }
  };

  const handleDownloadOnly = () => {
    setDownloadOnly(true);
    try {
      downloadInteractiveHTML({ data, startDate, endDate, zoomLevel }, filename);
      setUploadStatus({
        state: 'downloaded',
        filename,
        message: `Successfully downloaded ${filename} to your local PC.`
      });
    } catch (e: any) {
      console.error('Error downloading HTML:', e);
    } finally {
      setTimeout(() => setDownloadOnly(false), 800);
    }
  };

  const handleCopy = async () => {
    try {
      const html = generateStandaloneInteractiveHTML({ data, startDate, endDate, zoomLevel });
      const success = await copyToClipboard(html);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.error('Failed to copy HTML to clipboard:', e);
    }
  };

  const handlePreview = () => {
    try {
      const html = generateStandaloneInteractiveHTML({ data, startDate, endDate, zoomLevel });
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error('Error previewing HTML:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-xl w-full p-5.5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#003876] shrink-0">
              <Cloud size={22} className="text-[#003876]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#003876]">
                  Download to PC &amp; Upload to Google Cloud Storage
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                  Dual-Action
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Saves the interactive replica locally and synchronises it directly with your GCS Bucket folder.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* REAL-TIME UPLOAD / STATUS FEEDBACK BANNER */}
        {uploadStatus.state !== 'idle' && (
          <div className={`p-3.5 rounded-lg border text-xs mb-4 animate-in fade-in duration-200 ${
            uploadStatus.state === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : uploadStatus.state === 'error'
              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
              : uploadStatus.state === 'uploading' || uploadStatus.state === 'processing'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-gray-50 border-gray-200 text-gray-800'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {uploadStatus.state === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : uploadStatus.state === 'error' ? (
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                ) : uploadStatus.state === 'downloaded' ? (
                  <FileCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                )}
                
                <div>
                  <div className="font-bold text-[12px] flex items-center gap-1.5">
                    {uploadStatus.state === 'success' && "Upload Succeeded & File Downloaded!"}
                    {uploadStatus.state === 'error' && "File Downloaded to PC (Bucket Permissions Needed)"}
                    {uploadStatus.state === 'uploading' && "Uploading to Google Cloud Storage..."}
                    {uploadStatus.state === 'processing' && "Preparing Interactive Replica..."}
                    {uploadStatus.state === 'downloaded' && "Downloaded to PC"}
                  </div>
                  
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    {uploadStatus.message}
                  </p>

                  {uploadStatus.state === 'success' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {uploadStatus.publicUrl && (
                        <a
                          href={uploadStatus.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Globe size={13} />
                          <span>View Public Report URL</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRIMARY ACTION BUTTONS (EXACTLY THE RED BOXED CONTENT) */}
        <div className="space-y-2 mb-2">
          <button
            type="button"
            onClick={handleDownloadAndUpload}
            disabled={uploadStatus.state === 'processing' || uploadStatus.state === 'uploading'}
            className="w-full bg-[#003876] hover:bg-blue-900 active:bg-blue-950 text-white font-bold text-xs py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <UploadCloud size={16} className={uploadStatus.state === 'uploading' ? "animate-pulse" : ""} />
            <span className="text-[12.5px]">
              {uploadStatus.state === 'uploading' 
                ? "Downloading to PC & Uploading to GCS..." 
                : "Download to PC & Upload to Cloud Storage Bucket"}
            </span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleDownloadOnly}
              disabled={downloadOnly}
              className="bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold text-xs py-2 px-3 rounded-lg border border-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Download standalone HTML file only"
            >
              <Download size={13} className={downloadOnly ? "animate-bounce" : ""} />
              <span>Download HTML</span>
            </button>

            <button
              type="button"
              onClick={handlePreview}
              className="bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold text-xs py-2 px-3 rounded-lg border border-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Open standalone replica in a new browser tab"
            >
              <ExternalLink size={13} />
              <span>Preview Tab</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold text-xs py-2 px-3 rounded-lg border border-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copy entire raw HTML source to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? "Copied!" : "Copy HTML"}</span>
            </button>
          </div>

          {/* STORAGE PURGE & FOLDER PRESERVATION ACTION */}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold text-gray-500 flex items-center gap-1">
                <FolderOpen size={12} className="text-blue-700" />
                <span>GCS Storage Maintenance:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCleanStorage('inactive')}
                  disabled={cleaningStorage}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10.5px] font-bold px-2.5 py-1 rounded border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Purge stale archived snapshots from Inactive while preserving folder structure with .keep markers"
                >
                  <Trash2 size={11} className={cleaningStorage ? "animate-spin" : "text-rose-700"} />
                  <span>{cleaningStorage ? "Cleaning..." : "Purge Inactive Folder"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCleanStorage('both')}
                  disabled={cleaningStorage}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10.5px] font-bold px-2 py-1 rounded border border-gray-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Purge all older files in both Live and Inactive while keeping folder structure and current live report"
                >
                  <RefreshCw size={10} className={cleaningStorage ? "animate-spin" : ""} />
                  <span>Clean All Stale</span>
                </button>
              </div>
            </div>

            {cleanupMessage && (
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-700 font-mono leading-tight flex items-start justify-between gap-1">
                <span>{cleanupMessage}</span>
                <button 
                  type="button" 
                  onClick={() => setCleanupMessage(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer font-sans text-xs px-1"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span className="font-mono text-[9.5px]">File: {filename}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
