
import { NormalizedTransaction, LedgerData, TimeFocus, CustomDateRange, NetWorthEntry } from '../types';

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
 * Returns the anchor date for a given time focus.
 */
export const getAnchorDate = (focus: TimeFocus, history: NetWorthEntry[] = []): Date => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (focus) {
    case TimeFocus.MTD:
      return new Date(today.getFullYear(), today.getMonth(), 1);
    case TimeFocus.QTD:
      return new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    case TimeFocus.YTD:
      return new Date(today.getFullYear(), 0, 1);
    case TimeFocus.ROLLING_12M:
      const d = new Date(today);
      d.setFullYear(today.getFullYear() - 1);
      d.setDate(1); // Start at the beginning of the month 12 months ago
      return d;
    case TimeFocus.FULL_YEAR:
    default:
      if (history.length > 0) {
        const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
        return new Date(sorted[0].date);
      }
      return new Date(today.getFullYear(), 0, 1);
  }
};

export const getTemporalWindows = (
    focus: TimeFocus, 
    customRange?: CustomDateRange
): { current: { start: string, end: string }, shadow: { start: string, end: string }, label: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let currentStart = new Date(today);
    let currentEnd = new Date(today);
    let shadowStart = new Date(today);
    let shadowEnd = new Date(today);
    let label = 'previous period';

    const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());
    const toISO = (d: Date) => isValidDate(d) ? d.toISOString().split('T')[0] : today.toISOString().split('T')[0];

    switch (focus) {
        case TimeFocus.MTD:
            currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
            shadowStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            shadowEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            label = 'last month';
            break;
        case TimeFocus.QTD:
            const currentQ = Math.floor(today.getMonth() / 3);
            currentStart = new Date(today.getFullYear(), currentQ * 3, 1);
            shadowStart = new Date(today.getFullYear(), (currentQ - 1) * 3, 1);
            shadowEnd = new Date(today.getFullYear(), currentQ * 3, 0);
            label = 'last quarter';
            break;
        case TimeFocus.YTD:
            currentStart = new Date(today.getFullYear(), 0, 1);
            shadowStart = new Date(today.getFullYear() - 1, 0, 1);
            shadowEnd = new Date(today.getFullYear() - 1, 11, 31);
            label = 'last year';
            break;
        case TimeFocus.ROLLING_12M:
            // Normalize to start of month for consistent traversal
            currentStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
            shadowStart = new Date(today.getFullYear() - 2, today.getMonth(), 1);
            shadowEnd = new Date(today.getFullYear() - 1, today.getMonth(), 0);
            label = 'previous 12 months';
            break;
        case TimeFocus.CUSTOM:
            if (customRange) {
                const start = new Date(customRange.start);
                const end = new Date(customRange.end);
                
                if (isValidDate(start) && isValidDate(end)) {
                    const diff = end.getTime() - start.getTime();
                    currentStart = start;
                    currentEnd = end;
                    shadowStart = new Date(start.getTime() - (isNaN(diff) ? 0 : diff));
                    shadowEnd = new Date(start.getTime() - 86400000); 
                    label = 'previous custom window';
                }
            }
            break;
        default:
            currentStart = new Date(1970, 0, 1);
            shadowStart = new Date(1970, 0, 1);
            shadowEnd = new Date(1969, 11, 31);
            label = 'the past';
    }

    return {
        current: { start: toISO(currentStart), end: toISO(currentEnd) },
        shadow: { start: toISO(shadowStart), end: toISO(shadowEnd) },
        label
    };
};

/**
 * Normalizes year-based ledger data into a single contiguous transaction stream.
 * Optimized to prevent IndexedDB transaction timeouts.
 */
export const buildUnifiedTimeline = async (): Promise<NormalizedTransaction[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const keyRequest = store.getAllKeys();
    keyRequest.onsuccess = async () => {
      const keys = keyRequest.result.map(String);
      const ledgerKeys = keys.filter(k => k.includes('fintrack_detailed_'));
      
      if (ledgerKeys.length === 0) {
        resolve([]);
        return;
      }

      // Fetch all ledger objects concurrently to keep transaction active
      const dataPromises = ledgerKeys.map(key => {
        return new Promise<{key: string, data: LedgerData | undefined}>((res) => {
          const req = store.get(key);
          req.onsuccess = () => res({ key, data: req.result });
          req.onerror = () => res({ key, data: undefined });
        });
      });

      const results = await Promise.all(dataPromises);
      const timeline: NormalizedTransaction[] = [];

      results.forEach(({ key, data }) => {
          if (!data || !data.months || !data.categories) return;

          const typeMatch = key.match(/fintrack_detailed_(income|expenses)_(\d{4})/);
          if (!typeMatch) return;
          
          const type = typeMatch[1] === 'income' ? 'INCOME' : 'EXPENSE';
          const year = typeMatch[2];

          data.categories.forEach(cat => {
              cat.subCategories.forEach(sub => {
                  sub.monthlyValues.forEach((val, monthIdx) => {
                      if (!val || val === 0) return;
                      
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
      });
      
      resolve(timeline.sort((a, b) => b.date.localeCompare(a.date)));
    };
    keyRequest.onerror = () => resolve([]);
  });
};

const parseMonthLabelToISO = (label: string, yearHint: string): string => {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    // Handles formats like "Jan-25", "January 2025", "Jan"
    const cleanLabel = (label || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const parts = cleanLabel.split(/\s+/);
    
    const mIdx = months.findIndex(m => parts[0].startsWith(m));
    const month = mIdx === -1 ? '01' : String(mIdx + 1).padStart(2, '0');
    
    let year = yearHint;
    // Check if the label itself contains a year part (e.g. "Jan-25")
    if (parts.length > 1) {
        const yearPart = parts[parts.length - 1];
        year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    }
    
    // Final sanity check for year length
    if (year.length !== 4) year = yearHint;

    return `${year}-${month}-01`;
};

export const aggregateDimensions = (transactions: NormalizedTransaction[], path: string[], type: 'INCOME' | 'EXPENSE') => {
    const filtered = transactions.filter(t => t.type === type);
    const groups: Record<string, { total: number, count: number }> = {};

    filtered.forEach(t => {
        let label = '';
        if (path.length === 0) {
            label = t.category || 'Uncategorized';
        } else if (path.length === 1) {
            if (t.category !== path[0]) return;
            label = t.subCategory || 'Other';
        } else if (path.length === 2) {
            if (t.category !== path[0] || t.subCategory !== path[1]) return;
            // Group by Date (Month) for the leaf node drilldown
            // FIX: Manual parsing from ISO string ("YYYY-MM-DD") to Local Date components
            // prevents the UTC timezone shift that causes labels to be off by one month.
            const parts = t.date.split('-');
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        } else {
            return;
        }

        if (!groups[label]) groups[label] = { total: 0, count: 0 };
        groups[label].total += t.amount;
        groups[label].count += 1;
    });

    return Object.entries(groups)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => {
            // Sorting by total descending for size-based visualization
            return b.total - a.total;
        });
};

export const aggregateComparativeTrend = (currentTransactions: NormalizedTransaction[], shadowTransactions: NormalizedTransaction[], path: string[], type: 'INCOME' | 'EXPENSE') => {
    const getTrendMap = (txs: NormalizedTransaction[]) => {
        let filtered = txs.filter(t => t.type === type);
        if (path.length > 0) filtered = filtered.filter(t => t.category === path[0]);
        if (path.length > 1) filtered = filtered.filter(t => t.subCategory === path[1]);

        const map: Record<string, number> = {};
        filtered.forEach(t => {
            const monthKey = t.date.substring(0, 7); 
            map[monthKey] = (map[monthKey] || 0) + t.amount;
        });
        return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    };

    const currentTrend = getTrendMap(currentTransactions);
    const shadowTrend = getTrendMap(shadowTransactions);
    const maxLength = Math.max(currentTrend.length, shadowTrend.length);
    const combined = [];

    for (let i = 0; i < maxLength; i++) {
        const curr = currentTrend[i];
        const shad = shadowTrend[i];
        combined.push({
            index: i,
            label: curr ? curr[0] : (shad ? 'Prev' : ''),
            current: curr ? curr[1] : null,
            shadow: shad ? shad[1] : null
        });
    }
    return combined;
};

export const calculateTemporalVariance = (currentTransactions: NormalizedTransaction[], shadowTransactions: NormalizedTransaction[], path: string[], type: 'INCOME' | 'EXPENSE', excludeFixed: boolean = true) => {
    const currentGroups = aggregateDimensions(currentTransactions, path, type);
    const shadowGroups = aggregateDimensions(shadowTransactions, path, type);
    const shadowMap = new Map(shadowGroups.map(g => [g.name, g.total]));

    return currentGroups
        .filter(curr => !excludeFixed || (curr.name && curr.name.toLowerCase() !== 'fixed'))
        .map(curr => {
            const prevTotal = shadowMap.get(curr.name) || 0;
            const delta = curr.total - prevTotal;
            const variancePct = prevTotal > 0 ? (delta / prevTotal) * 100 : 100;
            return { name: curr.name, currentTotal: curr.total, prevTotal, delta, variancePct };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
};
