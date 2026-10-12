/**
 * GCS Folder Cleanup Utility
 * 
 * Safely removes stale/inactive HTML & JSON files from Google Cloud Storage
 * while ensuring all parent and sub-folder structures remain intact
 * via `.keep` placeholder preservation.
 */

export interface GcsCleanOptions {
  target?: 'inactive' | 'live' | 'both' | 'all';
  olderThanDays?: number; // 0 = all non-keep files in selected folder
  preserveLatestInLive?: boolean; // if true, keeps the single most recent file in Live
  dryRun?: boolean;
  customToken?: string;
}

export interface GcsCleanResult {
  success: boolean;
  dryRun: boolean;
  target: string;
  bucket: string;
  deletedFiles: { name: string; size?: number; updated?: string }[];
  preservedFiles: string[];
  preservedFolders: string[];
  freedBytes: number;
  message: string;
  error?: string;
}

export const GCS_BUCKET_CONFIG = {
  bucket: "ai-studio-bucket-275737853276-us-west1",
  folders: {
    live: "Upload and report generation archive/Live",
    inactive: "Upload and report generation archive/Inactive",
    archive: "Upload and report generation archive",
    levisArchive: "Customer Service Weekly Business Review/business review Levi's",
    customerServiceWbr: "Customer Service Weekly Business Review"
  }
};

/**
 * Retrieves a valid OAuth2 Bearer token from GCP metadata or environment
 */
export async function getGcpToken(customToken?: string): Promise<string | null> {
  if (customToken) return customToken;
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if (process.env.GCS_ACCESS_TOKEN) return process.env.GCS_ACCESS_TOKEN;

  try {
    const res = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" }
    });
    if (res.ok) {
      const data: any = await res.json();
      return data.access_token || null;
    }
  } catch {}
  return null;
}

/**
 * Ensures all standard WBR folder structures have `.keep` marker files
 */
export async function ensureGcsFolderHierarchy(token: string, bucket = GCS_BUCKET_CONFIG.bucket): Promise<string[]> {
  const foldersToKeep = [
    `${GCS_BUCKET_CONFIG.folders.live}/.keep`,
    `${GCS_BUCKET_CONFIG.folders.inactive}/.keep`,
    `${GCS_BUCKET_CONFIG.folders.customerServiceWbr}/.keep`,
    `${GCS_BUCKET_CONFIG.folders.levisArchive}/.keep`
  ];

  const ensured: string[] = [];

  for (const markerPath of foldersToKeep) {
    try {
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(markerPath)}`;
      await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain"
        },
        body: "Folder Keep Marker"
      });
      ensured.push(markerPath.replace('/.keep', ''));
    } catch (err) {
      console.warn(`Could not ensure keep marker for ${markerPath}:`, err);
    }
  }

  return ensured;
}

/**
 * Lists objects in a GCS folder prefix
 */
export async function listGcsObjects(
  token: string,
  prefix: string,
  bucket = GCS_BUCKET_CONFIG.bucket
): Promise<any[]> {
  const listUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`;
  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errData: any = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to list objects in prefix: ${prefix}`);
  }

  const data: any = await res.json();
  return data.items || [];
}

/**
 * Clears stale/inactive files from the GCS bucket while keeping folders intact
 */
export async function clearStaleGcsFiles(options: GcsCleanOptions = {}): Promise<GcsCleanResult> {
  const {
    target = 'inactive',
    olderThanDays = 0,
    preserveLatestInLive = true,
    dryRun = false,
    customToken
  } = options;

  const bucket = GCS_BUCKET_CONFIG.bucket;
  const token = await getGcpToken(customToken);

  if (!token) {
    return {
      success: false,
      dryRun,
      target,
      bucket,
      deletedFiles: [],
      preservedFiles: [],
      preservedFolders: Object.values(GCS_BUCKET_CONFIG.folders),
      freedBytes: 0,
      message: "No Google Cloud access token detected. Please ensure IAM credentials or customToken is provided.",
      error: "Authentication token missing"
    };
  }

  const prefixesToClean: string[] = [];
  if (target === 'inactive' || target === 'both' || target === 'all') {
    prefixesToClean.push(GCS_BUCKET_CONFIG.folders.inactive);
  }
  if (target === 'live' || target === 'both' || target === 'all') {
    prefixesToClean.push(GCS_BUCKET_CONFIG.folders.live);
  }

  const deletedFiles: { name: string; size?: number; updated?: string }[] = [];
  const preservedFiles: string[] = [];
  let freedBytes = 0;

  const cutoffTime = olderThanDays > 0 ? Date.now() - olderThanDays * 86400 * 1000 : null;

  for (const prefix of prefixesToClean) {
    try {
      const items = await listGcsObjects(token, prefix, bucket);

      // Sort newest first
      const sorted = items.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

      // If cleaning Live and preserveLatestInLive is true, skip the most recent .html and .json files
      let skippedLatestHtml = false;
      let skippedLatestJson = false;

      for (const item of sorted) {
        const name = item.name;

        // Never delete .keep files or directory roots
        if (name.endsWith('/.keep') || name.endsWith('/') || name === `${prefix}/.keep`) {
          preservedFiles.push(name);
          continue;
        }

        // Handle preserving latest files in Live
        if (prefix === GCS_BUCKET_CONFIG.folders.live && preserveLatestInLive) {
          if (name.endsWith('.html') && !skippedLatestHtml) {
            skippedLatestHtml = true;
            preservedFiles.push(name);
            continue;
          }
          if (name.endsWith('.json') && !skippedLatestJson) {
            skippedLatestJson = true;
            preservedFiles.push(name);
            continue;
          }
        }

        // Check age threshold if specified
        if (cutoffTime && item.updated) {
          const itemTime = new Date(item.updated).getTime();
          if (itemTime > cutoffTime) {
            preservedFiles.push(name);
            continue;
          }
        }

        // Delete object
        const size = parseInt(item.size || '0', 10);
        if (!dryRun) {
          const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}`;
          const delRes = await fetch(deleteUrl, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });

          if (delRes.ok || delRes.status === 204) {
            deletedFiles.push({ name, size, updated: item.updated });
            freedBytes += size;
          } else {
            console.warn(`Could not delete GCS object: ${name}`);
            preservedFiles.push(name);
          }
        } else {
          // Dry-run mode
          deletedFiles.push({ name, size, updated: item.updated });
          freedBytes += size;
        }
      }
    } catch (err: any) {
      console.error(`Error scanning prefix ${prefix}:`, err.message);
    }
  }

  // Ensure all folder keep markers exist so folders are never dropped
  const preservedFolders = await ensureGcsFolderHierarchy(token, bucket);

  const kbFreed = (freedBytes / 1024).toFixed(1);
  const actionWord = dryRun ? "Identified for deletion" : "Successfully purged";

  return {
    success: true,
    dryRun,
    target,
    bucket,
    deletedFiles,
    preservedFiles,
    preservedFolders,
    freedBytes,
    message: `${actionWord} ${deletedFiles.length} stale file(s) (${kbFreed} KB) from GCS target '${target}'. Preserved ${preservedFolders.length} folder structures with .keep markers.`
  };
}
