
import { openDB, dbSet, dbDelete, STORE_NAME } from '../hooks/useIndexedDB';
import { ArchiveMeta } from '../types';
import { getAccessToken } from './authService';

const VAULT_FILENAME = 'sheetsense_vault.json';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

/**
 * --- DRIVE API WRAPPERS ---
 */

const findVaultFile = async () => {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required.");
  const q = encodeURIComponent(`name = '${VAULT_FILENAME}' and trashed = false`);
  const res = await fetch(`${DRIVE_API_URL}?q=${q}&fields=files(id, name, modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Cloud search failed.");
  const data = await res.json();
  return data.files?.[0] || null;
};

const uploadVaultFile = async (payload: any, fileId?: string) => {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required.");

  const metadata = { name: VAULT_FILENAME, mimeType: 'application/json' };
  const fileContent = JSON.stringify(payload, null, 2);
  const boundary = '-------sheetsense_sync_boundary';
  
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${fileContent}\r\n`,
    `--${boundary}--`
  ].join('');

  const url = fileId ? `${UPLOAD_API_URL}/${fileId}?uploadType=multipart` : `${UPLOAD_API_URL}?uploadType=multipart`;
  const res = await fetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body
  });

  if (!res.ok) throw new Error("Cloud upload failed.");
  return (await res.json()).id;
};

/**
 * --- VAULT LOGIC ---
 */

const getVaultPayload = async (userEmail?: string) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  return new Promise<any>((resolve, reject) => {
    const request = store.openCursor();
    const payload: Record<string, any> = {};
    
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const key = String(cursor.key);
        if (key.startsWith('fintrack_')) {
          payload[key] = cursor.value;
        }
        cursor.continue();
      } else {
        resolve({
          version: "1.1",
          timestamp: new Date().toISOString(),
          user: userEmail || 'anonymous',
          payload
        });
      }
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * --- EXPORTS ---
 */

export const exportBackup = async (userEmail?: string) => {
  const vault = await getVaultPayload(userEmail);
  if (Object.keys(vault.payload).length === 0) throw new Error("Vault is empty.");

  const blob = new Blob([JSON.stringify(vault, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Sheetsense_Vault_${vault.timestamp.split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  await dbSet('fintrack_last_backup_at', vault.timestamp);
};

export const importBackup = async (jsonString: string) => {
  const vault = JSON.parse(jsonString);
  if (!vault?.payload) throw new Error("Invalid Vault format.");

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  Object.entries(vault.payload).forEach(([key, val]) => store.put(val, key));
  const now = new Date().toISOString();
  store.put(now, 'fintrack_last_backup_at');
  store.put(now, 'fintrack_last_cloud_sync_at');

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const syncToCloud = async (userEmail?: string) => {
  const vault = await getVaultPayload(userEmail);
  const existing = await findVaultFile();
  await uploadVaultFile(vault, existing?.id);
  const now = new Date().toISOString();
  await dbSet('fintrack_last_cloud_sync_at', now);
  return now;
};

export const restoreFromCloud = async () => {
  const existing = await findVaultFile();
  if (!existing) throw new Error("No vault found on Drive.");
  
  const token = getAccessToken();
  const res = await fetch(`${DRIVE_API_URL}/${existing.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Cloud download failed.");
  
  await importBackup(await res.text());
  return new Date().toISOString();
};

export const getArchiveManagementList = async (): Promise<ArchiveMeta[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const yearMap = new Map<number, number>();
      request.result.map(String).forEach(key => {
        const match = key.match(/fintrack_(income|expenses|detailed_income|detailed_expenses)_(\d{4})/);
        if (match) {
          const year = parseInt(match[2]);
          yearMap.set(year, (yearMap.get(year) || 0) + 1);
        }
      });
      resolve(Array.from(yearMap.entries()).map(([year, records]) => ({
        year, records, isLocked: false, lastUpdated: new Date().toISOString()
      })).sort((a, b) => b.year - a.year));
    };
  });
};

export const deleteLocalYear = async (year: number) => {
  const targets = [`fintrack_income_${year}`, `fintrack_expenses_${year}`, `fintrack_detailed_income_${year}`, `fintrack_detailed_expenses_${year}`];
  for (const key of targets) await dbDelete(key);
};
