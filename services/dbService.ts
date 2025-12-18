
import { openDB, DBSchema } from 'idb';

interface FintrackDB extends DBSchema {
  keyval: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'fintrack_db';
const STORE_NAME = 'keyval';

// Initialize Database
export const dbPromise = openDB<FintrackDB>(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export const get = async (key: string) => {
  return (await dbPromise).get(STORE_NAME, key);
};

export const set = async (key: string, val: any) => {
  return (await dbPromise).put(STORE_NAME, val, key);
};

export const del = async (key: string) => {
  return (await dbPromise).delete(STORE_NAME, key);
};

export const clear = async () => {
  return (await dbPromise).clear(STORE_NAME);
};
