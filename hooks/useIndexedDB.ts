
import { useState, useEffect, useCallback } from 'react';

export const DB_NAME = 'FinTrackDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'app_state';

// Core Promisified IDB Utilities
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const dbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const dbSet = async <T>(key: string, value: T): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const dbDelete = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export function useIndexedDB<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    dbGet<T>(key).then((val) => {
      if (isMounted) {
        if (val !== undefined) {
          setStoredValue(val);
        } else {
            dbSet(key, initialValue);
        }
        setLoaded(true);
      }
    }).catch(err => {
      console.error(`Error loading ${key} from IDB`, err);
      if (isMounted) setLoaded(true);
    });
    
    return () => { isMounted = false; };
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      dbSet(key, valueToStore).catch(e => console.error(`Failed to save ${key}`, e));
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue, loaded];
}
