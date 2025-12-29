
import { NormalizedTransaction, LedgerData, TimeFocus, CustomDateRange } from '../types';

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
 * Generates a comparative chronological trend (Current vs Shadow trajectory).
 */
export const aggregateComparativeTrend = (
    currentTransactions: NormalizedTransaction[],
    shadowTransactions: NormalizedTransaction[],
    path: string[],
    type: 'INCOME' | 'EXPENSE'
) => {
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

    // Map them to a common index for comparison overlay
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

/**
 * Calculates start and end dates for a focus period and its "Shadow" (previous) period.
 */
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
            currentStart = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            shadowStart = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
            shadowEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate() - 1);
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
 * Computes period-over-period variance across dimensions.
 */
export const calculateTemporalVariance = (
    currentTransactions: NormalizedTransaction[],
    shadowTransactions: NormalizedTransaction[],
    path: string[],
    type: 'INCOME' | 'EXPENSE',
    excludeFixed: boolean = true
) => {
    const currentGroups = aggregateDimensions(currentTransactions, path, type);
    const shadowGroups = aggregateDimensions(shadowTransactions, path, type);

    const shadowMap = new Map(shadowGroups.map(g => [g.name, g.total]));

    const variances = currentGroups
        .filter(curr => !excludeFixed || curr.name.toLowerCase() !== 'fixed')
        .map(curr => {
            const prevTotal = shadowMap.get(curr.name) || 0;
            const delta = curr.total - prevTotal;
            const pct = prevTotal > 0 ? (delta / prevTotal) * 100 : 100;
            
            return {
                name: curr.name,
                currentTotal: curr.total,
                prevTotal,
                delta,
                pct
            };
        });

    return variances.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
};
