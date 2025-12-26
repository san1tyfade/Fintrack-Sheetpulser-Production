
import { findVaultFile, uploadVaultFile, downloadVaultFile } from './cloudSyncService';
import { ArchiveMeta } from '../types';

const DB_NAME = 'FinTrackDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbSet = async (key: string, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const dbDelete = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Internal helper to gather all fintrack_ data into a vault object.
 * Refactored to fix race conditions using Promise.all
 */
const getVaultPayload = async (userEmail?: string) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  const getValues = new Promise<any[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const getKeys = new Promise<IDBValidKey[]>((resolve, reject) => {
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const [values, keys] = await Promise.all([getValues, getKeys]);
  
  const payload: Record<string, any> = {};
  let recordCount = 0;

  keys.forEach((key, index) => {
    const keyStr = String(key);
    if (keyStr.startsWith('fintrack_')) {
      payload[keyStr] = values[index];
      recordCount++;
    }
  });

  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    user: userEmail || 'anonymous',
    payload
  };
};

/**
 * Structured Vault Export
 */
export const exportBackup = async (userEmail?: string) => {
  const vault = await getVaultPayload(userEmail);
  
  if (Object.keys(vault.payload).length === 0) {
    throw new Error("No data found to backup.");
  }

  const blob = new Blob([JSON.stringify(vault, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dateStr = vault.timestamp.split('T')[0];
  link.href = url;
  link.download = `Sheetsense_Vault_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  await dbSet('fintrack_last_backup_at', vault.timestamp);
};

/**
 * Validated Vault Import
 */
export const importBackup = async (jsonString: string) => {
  try {
    const vault = JSON.parse(jsonString);
    if (!vault || !vault.payload || typeof vault.payload !== 'object') {
      throw new Error("Invalid format: Not a valid Sheetsense Vault.");
    }

    const keys = Object.keys(vault.payload);
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const key of keys) {
      store.put(vault.payload[key], key);
    }
    
    const now = new Date().toISOString();
    store.put(now, 'fintrack_last_backup_at');
    store.put(now, 'fintrack_last_cloud_sync_at');

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    throw e;
  }
};

/**
 * Phase 2 & 3: Cloud Sync
 */
export const syncToCloud = async (userEmail?: string) => {
  const vault = await getVaultPayload(userEmail);
  const existingFile = await findVaultFile();
  await uploadVaultFile(vault, existingFile?.id);
  
  const timestamp = new Date().toISOString();
  await dbSet('fintrack_last_cloud_sync_at', timestamp);
  return timestamp;
};

export const restoreFromCloud = async () => {
  const existingFile = await findVaultFile();
  if (!existingFile) throw new Error("No vault file found on Google Drive.");
  
  const content = await downloadVaultFile(existingFile.id);
  await importBackup(content);
  
  const timestamp = new Date().toISOString();
  await dbSet('fintrack_last_cloud_sync_at', timestamp);
  return timestamp;
};

/**
 * Phase 3: Archive Management Logic
 * Scans IDB for all stored years and returns stats.
 */
export const getArchiveManagementList = async (): Promise<ArchiveMeta[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result.map(String);
      const yearMap = new Map<number, number>();
      
      keys.forEach(key => {
        // Match fintrack_income_2024 or fintrack_expenses_2024
        const match = key.match(/fintrack_(income|expenses|detailed_income|detailed_expenses)_(\d{4})/);
        if (match) {
          const year = parseInt(match[2]);
          yearMap.set(year, (yearMap.get(year) || 0) + 1);
        }
      });

      const archives: ArchiveMeta[] = Array.from(yearMap.entries()).map(([year, records]) => ({
        year,
        records,
        isLocked: false, // Future: can store lock state in IDB
        lastUpdated: new Date().toISOString() // Dynamic mapping would be better
      })).sort((a, b) => b.year - a.year);

      resolve(archives);
    };
  });
};

/**
 * Delete all local data associated with a specific year.
 */
export const deleteLocalYear = async (year: number) => {
  const keysToDelete = [
    `fintrack_income_${year}`,
    `fintrack_expenses_${year}`,
    `fintrack_detailed_income_${year}`,
    `fintrack_detailed_expenses_${year}`
  ];
  
  for (const key of keysToDelete) {
    await dbDelete(key);
  }
};
