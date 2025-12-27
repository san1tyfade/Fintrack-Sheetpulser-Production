
import { Investment, Trade, NetWorthEntry, TimeFocus, AttributionResult, IncomeEntry, ExpenseEntry } from '../types';
import { normalizeTicker } from './geminiService';

/**
 * Checks if a YYYY-MM-DD string falls within a specific TimeFocus window relative to "now".
 */
export const isDateWithinFocus = (dateStr: string, focus: TimeFocus): boolean => {
  if (!dateStr) return false;
  if (focus === TimeFocus.FULL_YEAR) return true;

  // Normalize inputs: Today at local midnight
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Parse target: YYYY-MM-DD at local midnight
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);

  switch (focus) {
    case TimeFocus.MTD:
      return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
    case TimeFocus.QTD: {
      const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
      const qStart = new Date(today.getFullYear(), qStartMonth, 1);
      return target >= qStart;
    }
    case TimeFocus.YTD:
      return target.getFullYear() === today.getFullYear();
    case TimeFocus.ROLLING_12M: {
      const limit = new Date(today);
      limit.setFullYear(today.getFullYear() - 1);
      return target >= limit;
    }
    default:
      return true;
  }
};

/**
 * Reconciles static Investment data from Sheets with dynamic Trade data.
 */
export const reconcileInvestments = (investments: Investment[], trades: Trade[]): Investment[] => {
    if (!investments.length) return [];
    
    const tradeHoldings = new Map<string, number>();
    trades.forEach(t => {
        const qty = Math.abs(t.quantity || 0);
        if (qty === 0) return;
        const ticker = normalizeTicker(t.ticker);
        const type = (t.type || 'BUY').toUpperCase().trim();
        tradeHoldings.set(ticker, (tradeHoldings.get(ticker) || 0) + (type === 'BUY' ? qty : -qty));
    });

    const invByTicker = new Map<string, Investment[]>();
    investments.forEach(inv => {
       const t = normalizeTicker(inv.ticker);
       if (!invByTicker.has(t)) invByTicker.set(t, []);
       invByTicker.get(t)?.push(inv);
    });

    const result: Investment[] = [];
    
    invByTicker.forEach((invs, ticker) => {
        const tradeQty = tradeHoldings.get(ticker);
        if (tradeQty === undefined) {
            result.push(...invs);
            return;
        }

        const totalSheetQty = invs.reduce((sum, i) => sum + i.quantity, 0);
        if (totalSheetQty === 0) {
            result.push({ ...invs[0], quantity: tradeQty });
            for(let i=1; i<invs.length; i++) result.push({ ...invs[i], quantity: 0 });
        } else {
            let remaining = tradeQty;
            invs.forEach((inv, index) => {
                if (index === invs.length - 1) {
                     result.push({ ...inv, quantity: remaining });
                } else {
                     const ratio = inv.quantity / totalSheetQty;
                     const newQty = tradeQty * ratio;
                     result.push({ ...inv, quantity: newQty });
                     remaining -= newQty;
                }
            });
        }
    });
    return result;
};

/**
 * Calculates net worth attribution by comparing the change in total wealth
 * against the "Savings" (Income - Expenses) logged in the same period.
 * 
 * Market Gain = Total Growth - New Savings.
 */
export const calculateAttribution = (
  currentNW: number,
  history: NetWorthEntry[],
  incomeData: IncomeEntry[],
  expenseData: ExpenseEntry[],
  focus: TimeFocus
): AttributionResult => {
  const now = new Date();
  let anchorDate = new Date(now.getFullYear(), 0, 1);

  switch (focus) {
    case TimeFocus.MTD:
      anchorDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case TimeFocus.QTD:
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      anchorDate = new Date(now.getFullYear(), qStartMonth, 1);
      break;
    case TimeFocus.YTD:
      anchorDate = new Date(now.getFullYear(), 0, 1);
      break;
    case TimeFocus.ROLLING_12M:
      anchorDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case TimeFocus.FULL_YEAR:
      if (history.length > 0) {
        anchorDate = new Date(history.sort((a,b) => a.date.localeCompare(b.date))[0].date);
      }
      break;
  }

  const anchorISO = anchorDate.toISOString().split('T')[0];

  // 1. Find Starting Net Worth
  const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const startEntry = sortedHistory.find(h => h.date <= anchorISO) || sortedHistory[sortedHistory.length - 1];
  const startValue = startEntry ? startEntry.value : (history.length > 0 ? history[0].value : 0);

  // 2. Calculate "New Savings" (Income - Expenses) for the period
  const periodIncome = incomeData
    .filter(d => d.date >= anchorISO)
    .reduce((acc, d) => acc + (d.amount || 0), 0);
  
  const periodExpense = expenseData
    .filter(d => d.date >= anchorISO)
    .reduce((acc, d) => acc + (d.total || 0), 0);

  const netSavings = periodIncome - periodExpense;

  // 3. Attribution Math
  const totalChange = currentNW - startValue;
  const marketGain = totalChange - netSavings;
  
  // Return percentage using Simple Dietz method
  const divisor = startValue + (netSavings / 2);
  const percentageReturn = Math.abs(divisor) > 1 ? (marketGain / Math.abs(divisor)) * 100 : 0;

  return {
    startValue,
    endValue: currentNW,
    netContributions: netSavings,
    marketGain,
    percentageReturn
  };
};
