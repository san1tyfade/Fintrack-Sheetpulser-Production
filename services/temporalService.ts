
import { NormalizedTransaction, LedgerData } from '../types';

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

/**
 * Normalizes year-based ledger data into a single contiguous transaction stream.
 * Scans all fintrack_detailed_* keys in IndexedDB.
 */
export const buildUnifiedTimeline = async (): Promise<NormalizedTransaction[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const request = store.getAllKeys();
    request.onsuccess = async () => {
      const keys = request.result.map(String);
      const timeline: NormalizedTransaction[] = [];
      
      const ledgerKeys = keys.filter(k => k.includes('fintrack_detailed_'));
      
      for (const key of ledgerKeys) {
          const typeMatch = key.match(/fintrack_detailed_(income|expenses)_(\d{4})/);
          if (!typeMatch) continue;
          
          const type = typeMatch[1] === 'income' ? 'INCOME' : 'EXPENSE';
          const year = typeMatch[2];
          
          const data = await new Promise<LedgerData | undefined>((res) => {
              const req = store.get(key);
              req.onsuccess = () => res(req.result);
          });

          if (!data || !data.months || !data.categories) continue;

          data.categories.forEach(cat => {
              cat.subCategories.forEach(sub => {
                  sub.monthlyValues.forEach((val, monthIdx) => {
                      if (val === 0) return;
                      
                      const monthName = data.months[monthIdx]; 
                      const isoDate = parseMonthLabelToISO(monthName, year);

                      timeline.push({
                          id: `${key}-${cat.name}-${sub.name}-${monthIdx}`,
                          date: isoDate,
                          category: cat.name,
                          subCategory: sub.name,
                          amount: Math.abs(val),
                          type: type as any
                      });
                  });
              });
          });
      }
      
      resolve(timeline.sort((a, b) => b.date.localeCompare(a.date)));
    };
  });
};

const parseMonthLabelToISO = (label: string, yearHint: string): string => {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const parts = label.toLowerCase().split('-');
    const mIdx = months.indexOf(parts[0]);
    const month = mIdx === -1 ? '01' : String(mIdx + 1).padStart(2, '0');
    
    let year = yearHint;
    if (parts[1]) {
        year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
    }
    
    return `${year}-${month}-01`;
};

/**
 * Aggregates a timeline into multidimensional buckets based on filter path.
 */
export const aggregateDimensions = (
    transactions: NormalizedTransaction[], 
    path: string[],
    type: 'INCOME' | 'EXPENSE'
) => {
    const filtered = transactions.filter(t => t.type === type);
    const groups: Record<string, { total: number, count: number }> = {};

    filtered.forEach(t => {
        let label = '';
        if (path.length === 0) {
            label = t.category;
        } else if (path.length === 1 && t.category === path[0]) {
            label = t.subCategory;
        } else {
            return;
        }

        if (!groups[label]) groups[label] = { total: 0, count: 0 };
        groups[label].total += t.amount;
        groups[label].count += 1;
    });

    return Object.entries(groups)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.total - a.total);
};

/**
 * Generates a chronological trend (Temporal Velocity) for specific dimensions.
 */
export const aggregateTemporalTrend = (
    transactions: NormalizedTransaction[],
    path: string[],
    type: 'INCOME' | 'EXPENSE'
) => {
    let filtered = transactions.filter(t => t.type === type);
    
    // Drill-down filtering for the trend
    if (path.length > 0) filtered = filtered.filter(t => t.category === path[0]);
    if (path.length > 1) filtered = filtered.filter(t => t.subCategory === path[1]);

    const trendMap: Record<string, number> = {};
    filtered.forEach(t => {
        const monthKey = t.date.substring(0, 7); // YYYY-MM
        trendMap[monthKey] = (trendMap[monthKey] || 0) + t.amount;
    });

    return Object.entries(trendMap)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
};
