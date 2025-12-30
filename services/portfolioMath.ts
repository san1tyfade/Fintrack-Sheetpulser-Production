import { PortfolioLogEntry, ProcessedPortfolioEntry, TimeFocus, CustomDateRange, Trade } from '../types';
import { isDateWithinFocus } from './portfolioService';

/**
 * Transforms raw portfolio logs into processed entries suitable for charting.
 */
export const processPortfolioHistory = (
  history: PortfolioLogEntry[],
  focus: TimeFocus,
  customRange?: CustomDateRange
): { data: ProcessedPortfolioEntry[], accountKeys: string[] } => {
  if (!history || history.length === 0) {
    return { data: [], accountKeys: [] };
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const filtered = sorted.filter(entry => isDateWithinFocus(entry.date, focus, customRange));
  
  if (filtered.length === 0) {
    return { data: [], accountKeys: [] };
  }

  const accountKeysSet = new Set<string>();
  filtered.forEach(entry => {
    Object.keys(entry.accounts).forEach(key => accountKeysSet.add(key));
  });
  const accountKeys = Array.from(accountKeysSet).sort();

  const anchorEntry = filtered[0];
  const anchorTotal = Object.values(anchorEntry.accounts).reduce((sum, val) => sum + (val || 0), 0);

  const processed: ProcessedPortfolioEntry[] = filtered.map(entry => {
    const totalValue = Object.values(entry.accounts).reduce((sum, val) => sum + (val || 0), 0);
    const percentChange = anchorTotal > 0 ? ((totalValue - anchorTotal) / anchorTotal) * 100 : 0;
    
    return {
      ...entry,
      totalValue,
      percentChange
    };
  });

  return {
    data: processed,
    accountKeys
  };
};

/**
 * Calculates investment performance attribution using snapshots and trades.
 * Explicitly ignores income/expense ledger data.
 */
export const calculatePortfolioAttribution = (
    data: ProcessedPortfolioEntry[],
    trades: Trade[],
    focus: TimeFocus,
    customRange?: CustomDateRange
) => {
    if (data.length < 2) return null;

    const start = data[0];
    const end = data[data.length - 1];
    const totalGrowth = end.totalValue - start.totalValue;

    // 1. Identify trade-based flows within the window
    const windowTrades = trades.filter(t => isDateWithinFocus(t.date, focus, customRange));
    
    // As per request: BUYs are Contributions, SELLs are Withdrawals
    const contributions = windowTrades
        .filter(t => (t.type || 'BUY').toUpperCase().trim() === 'BUY')
        .reduce((sum, t) => sum + Math.abs(t.total || 0), 0);
        
    const withdrawals = windowTrades
        .filter(t => (t.type || 'BUY').toUpperCase().trim() === 'SELL')
        .reduce((sum, t) => sum + Math.abs(t.total || 0), 0);

    const netFlow = contributions - withdrawals;
    const marketAlpha = totalGrowth - netFlow;

    // Simple Dietz Method for Money-Weighted Return approximation
    // Divisor accounts for flows entering/leaving mid-period
    const averageCapital = start.totalValue + (netFlow / 2);
    const alphaPercentage = Math.abs(averageCapital) > 1 
        ? (marketAlpha / Math.abs(averageCapital)) * 100 
        : (start.totalValue > 0 ? (marketAlpha / start.totalValue) * 100 : 0);

    return {
        startValue: start.totalValue,
        endValue: end.totalValue,
        totalGrowth,
        contributions,
        withdrawals,
        marketAlpha,
        alphaPercentage
    };
};

export const calculateMaxDrawdown = (data: ProcessedPortfolioEntry[]): number => {
    if (data.length < 2) return 0;
    let maxDrawdown = 0;
    let peak = data[0].totalValue;
    data.forEach(entry => {
        if (entry.totalValue > peak) peak = entry.totalValue;
        const drawdown = peak > 0 ? ((entry.totalValue - peak) / peak) * 100 : 0;
        if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    });
    return maxDrawdown;
};

export const calculateVelocity = (data: ProcessedPortfolioEntry[]): number => {
    if (data.length < 2) return 0;
    const start = data[0];
    const end = data[data.length - 1];
    const startDate = new Date(start.date);
    const endDate = new Date(end.date);
    const dayDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (end.totalValue - start.totalValue) / dayDiff;
};