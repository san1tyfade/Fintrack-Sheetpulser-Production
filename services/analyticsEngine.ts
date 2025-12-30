
import { TimeFocus, CustomDateRange, NormalizedTransaction, ProcessedPortfolioEntry, Trade } from '../types';
import { isDateWithinFocus } from './portfolioService';
import { getTemporalWindows } from './temporalService';

/**
 * Common Analytics Engine for standardizing windowing and PoP calculations.
 */

export interface ComparisonResult {
  current: number;
  previous: number;
  delta: number;
  pct: number;
}

export const getComparisonStats = (
  currentData: number,
  previousData: number
): ComparisonResult => {
  const delta = currentData - previousData;
  const pct = previousData !== 0 ? (delta / Math.abs(previousData)) * 100 : 0;
  return { current: currentData, previous: previousData, delta, pct };
};

export const filterByWindow = <T extends { date: string }>(
  items: T[],
  focus: TimeFocus,
  customRange: CustomDateRange,
  isShadow: boolean = false
): T[] => {
  const windows = getTemporalWindows(focus, customRange);
  const target = isShadow ? windows.shadow : windows.current;
  return items.filter(item => item.date >= target.start && item.date <= target.end);
};

export const formatBenchmarkLabel = (val: string) => {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
