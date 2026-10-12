#!/usr/bin/env tsx
/**
 * CLI Script: Clean GCS Stale / Inactive Storage Files
 * 
 * Usage:
 *   npx tsx scripts/cleanGcsFolders.ts [options]
 * 
 * Options:
 *   --target=inactive|live|both|all   (Default: 'inactive')
 *   --days=N                          (Delete files older than N days, default: 0 = all)
 *   --dry-run                         (Simulate deletion without actually removing files)
 *   --keep-latest-live                (Keep most recent .html and .json in Live, default: true)
 * 
 * Example:
 *   npx tsx scripts/cleanGcsFolders.ts --target=inactive
 *   npx tsx scripts/cleanGcsFolders.ts --target=both --dry-run
 */

import { clearStaleGcsFiles, GcsCleanOptions, GCS_BUCKET_CONFIG } from '../src/utils/gcsFolderCleaner';

async function main() {
  const args = process.argv.slice(2);
  
  let target: 'inactive' | 'live' | 'both' | 'all' = 'inactive';
  let olderThanDays = 0;
  let dryRun = false;
  let preserveLatestInLive = true;

  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      const val = arg.split('=')[1].toLowerCase() as any;
      if (['inactive', 'live', 'both', 'all'].includes(val)) {
        target = val;
      }
    } else if (arg.startsWith('--days=')) {
      olderThanDays = parseInt(arg.split('=')[1], 10) || 0;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--no-preserve-latest') {
      preserveLatestInLive = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
GCS Bucket Folder Cleanup Utility
==================================
Clears stale files from Google Cloud Storage while keeping the folder structures intact (.keep markers).

Options:
  --target=inactive|live|both|all   (default: inactive)
  --days=N                          (only delete files older than N days)
  --dry-run                         (test run without deleting)
  --no-preserve-latest              (also purge newest file in Live)
  -h, --help                        (show this help message)
      `);
      process.exit(0);
    }
  }

  console.log('========================================================');
  console.log('   Levi\'s SA WBR: Google Cloud Storage Cleanup Utility   ');
  console.log('========================================================');
  console.log(`Target Bucket : gs://${GCS_BUCKET_CONFIG.bucket}`);
  console.log(`Target Scope  : ${target.toUpperCase()}`);
  console.log(`Older Than    : ${olderThanDays > 0 ? `${olderThanDays} days` : 'All stale files'}`);
  console.log(`Mode          : ${dryRun ? 'DRY RUN (Simulation)' : 'ACTIVE PURGE'}`);
  console.log(`Preserve Live : ${preserveLatestInLive ? 'Yes (Latest snapshot kept)' : 'No'}`);
  console.log('--------------------------------------------------------');

  try {
    const result = await clearStaleGcsFiles({
      target,
      olderThanDays,
      preserveLatestInLive,
      dryRun
    });

    if (!result.success) {
      console.error(`❌ Cleanup Failed: ${result.message}`);
      if (result.error) console.error(`   Details: ${result.error}`);
      process.exit(1);
    }

    console.log(`\n✅ ${result.message}\n`);

    if (result.deletedFiles.length > 0) {
      console.log('Deleted / Purged Files:');
      result.deletedFiles.forEach((f, idx) => {
        const sizeKb = f.size ? `${(f.size / 1024).toFixed(1)} KB` : 'N/A';
        console.log(`  ${idx + 1}. [${sizeKb}] ${f.name} (Updated: ${f.updated || 'N/A'})`);
      });
    } else {
      console.log('ℹ️ No stale files found matching the criteria.');
    }

    console.log('\nPreserved Folder Hierarchy:');
    result.preservedFolders.forEach(folder => {
      console.log(`  📁 gs://${GCS_BUCKET_CONFIG.bucket}/${folder}/ (.keep preserved)`);
    });

    console.log('========================================================\n');
  } catch (err: any) {
    console.error('Fatal execution error:', err.message || err);
    process.exit(1);
  }
}

main();
