
import { useState, useEffect, useCallback } from 'react';
import { get, set } from '../services/dbService';

export function useIndexedDB<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        // 1. Check IndexedDB first
        const dbValue = await get(key);
        
        if (dbValue !== undefined) {
          if (isActive) {
            setStoredValue(dbValue);
            setIsLoaded(true);
          }
          return;
        }

        // 2. Migration: Check LocalStorage if not in DB
        // If data exists in LocalStorage, move it to IndexedDB and delete from LocalStorage
        if (typeof window !== 'undefined') {
          const item = window.localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (isActive) setStoredValue(parsed);
              
              // Persist to IDB
              await set(key, parsed);
              
              // Cleanup Legacy
              window.localStorage.removeItem(key);
              
              if (isActive) setIsLoaded(true);
              return;
            } catch (e) {
              console.warn(`[Migration] Failed to parse localStorage key "${key}"`, e);
            }
          }
        }

        // 3. Fallback to Initial Value
        // If we reached here, data is neither in DB nor LS. Use default.
        if (isActive) setIsLoaded(true);

      } catch (error) {
        console.error(`Error loading key "${key}" from IndexedDB:`, error);
        if (isActive) setIsLoaded(true);
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      // Fire-and-forget write to DB
      set(key, valueToStore).catch(err => console.error(`Failed to write to DB for key "${key}"`, err));
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue, isLoaded] as const;
}
