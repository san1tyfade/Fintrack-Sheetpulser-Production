
import { IncomeEntry, ExpenseEntry } from '../../types';

/**
 * Simple Dietz Method for Money-Weighted Return approximation.
 * Formula: (EndValue - StartValue - NetFlow) / (StartValue + NetFlow / 2)
 */
export const calculateDietzReturn = (
  startValue: number,
  endValue: number,
  netFlow: number
): { gain: number; percentage: number } => {
  const gain = endValue - startValue - netFlow;
  const averageCapital = startValue + (netFlow / 2);
  const percentage = Math.abs(averageCapital) > 1 
    ? (gain / Math.abs(averageCapital)) * 100 
    : (startValue > 0 ? (gain / startValue) * 100 : 0);
  
  return { gain, percentage };
};

/**
 * Calculates Max Drawdown from a series of valuation entries.
 */
export const calculateMaxDrawdown = (data: { totalValue: number }[]): number => {
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

/**
 * Calculates dollar-velocity (growth per day).
 */
export const calculateGrowthVelocity = (data: { date: string; totalValue: number }[]): number => {
  if (data.length < 2) return 0;
  const start = data[0];
  const end = data[data.length - 1];
  const startDate = new Date(start.date);
  const endDate = new Date(end.date);
  const dayDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return (end.totalValue - start.totalValue) / dayDiff;
};

/**
 * Shared logic for Net Worth Attribution (used in Dashboard & Analytics).
 */
export const calculateNetWorthAttribution = (
  currentNW: number,
  startValue: number,
  incomeData: IncomeEntry[],
  expenseData: ExpenseEntry[],
  anchorISO: string
) => {
  const periodIncome = incomeData
    .filter(d => d.date >= anchorISO)
    .reduce((acc, d) => acc + (d.amount || 0), 0);
  
  const periodExpense = expenseData
    .filter(d => d.date >= anchorISO)
    .reduce((acc, d) => acc + (d.total || 0), 0);

  const netSavings = periodIncome - periodExpense;
  const { gain, percentage } = calculateDietzReturn(startValue, currentNW, netSavings);

  return {
    startValue,
    endValue: currentNW,
    netContributions: netSavings,
    marketGain: gain,
    percentageReturn: percentage
  };
};

/**
 * Standardizes Year-to-Date vs Archive-Full-Year totals.
 */
export const calculatePeriodTotals = (
  incomeData: IncomeEntry[], 
  expenseData: ExpenseEntry[], 
  year: number
) => {
  const isCurrentYear = year === new Date().getFullYear();
  const todayISO = new Date().toISOString().split('T')[0];

  const incFiltered = incomeData.filter(d => d.date.startsWith(String(year)));
  const expFiltered = expenseData.filter(d => d.date.startsWith(String(year)));

  const ytdInc = incFiltered
    .filter(d => !isCurrentYear || d.date <= todayISO)
    .reduce((s, d) => s + (d.amount || 0), 0);

  const ytdExp = expFiltered
    .filter(d => !isCurrentYear || d.date <= todayISO)
    .reduce((s, d) => s + (d.total || 0), 0);

  const totalInc = incFiltered.reduce((s, d) => s + (d.amount || 0), 0);
  const totalExp = expFiltered.reduce((s, d) => s + (d.total || 0), 0);

  const savings = ytdInc - ytdExp;
  const rate = ytdInc > 0 ? (savings / ytdInc) * 100 : 0;

  return { ytdInc, ytdExp, totalInc, totalExp, savings, rate };
};
