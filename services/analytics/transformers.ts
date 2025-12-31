
import { NormalizedTransaction, LedgerData, TimeFocus, CustomDateRange } from '../../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

/**
 * Prepares Waterfall Chart data for Portfolio analysis.
 */
export const transformWaterfallData = (attribution: any) => {
  if (!attribution) return [];
  const { startValue, contributions, withdrawals, marketAlpha, endValue } = attribution;
  const peak = startValue + contributions;
  
  return [
    { name: 'Start', range: [0, startValue], actual: startValue, type: 'anchor', display: 'Initial' },
    { name: 'Inflow', range: [startValue, peak], actual: contributions, type: 'inflow', display: 'Buy-ins' },
    { name: 'Outflow', range: [peak - withdrawals, peak], actual: -withdrawals, type: 'outflow', display: 'Sells' },
    { name: 'Yield', range: [Math.min(peak - withdrawals, endValue), Math.max(peak - withdrawals, endValue)], actual: marketAlpha, type: 'yield', display: 'Market' },
    { name: 'Current', range: [0, endValue], actual: endValue, type: 'anchor', display: 'End' }
  ];
};

/**
 * Prepares Sankey Chart data for Flow analysis from Ledger data.
 */
export const transformSankeyData = (
  detailedExpenses: LedgerData | undefined,
  monthIndex: number,
  isDarkMode: boolean,
  selectedCategoryName: string | null
) => {
  if (!detailedExpenses || !detailedExpenses.categories.length) {
    return { nodes: [], links: [] };
  }

  const nodes: { name: string; color?: string }[] = [{ 
    name: 'Total Spending', 
    color: isDarkMode ? '#1e293b' : '#334155' 
  }];
  const links: { source: number; target: number; value: number }[] = [];
  let nextId = 1;
  const MAX_SUB_CATEGORIES = selectedCategoryName ? 25 : 8;

  detailedExpenses.categories.forEach((cat, cIdx) => {
    if (selectedCategoryName && cat.name !== selectedCategoryName) return;

    const activeSubs = cat.subCategories
      .map(sub => ({ name: sub.name, value: sub.monthlyValues[monthIndex] || 0 }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    if (activeSubs.length === 0) return;

    const catTotal = activeSubs.reduce((sum, item) => sum + item.value, 0);
    const catColor = COLORS[cIdx % COLORS.length];
    const catNodeIdx = nextId++;

    nodes.push({ name: cat.name, color: catColor });
    links.push({ source: 0, target: catNodeIdx, value: catTotal });

    const displayedSubs = activeSubs.slice(0, MAX_SUB_CATEGORIES);
    const otherSubs = activeSubs.slice(MAX_SUB_CATEGORIES);
    const otherTotal = otherSubs.reduce((sum, item) => sum + item.value, 0);

    displayedSubs.forEach(sub => {
      const subNodeIdx = nextId++;
      nodes.push({ name: sub.name, color: catColor });
      links.push({ source: catNodeIdx, target: subNodeIdx, value: sub.value });
    });

    if (otherTotal > 0) {
      const otherNodeIdx = nextId++;
      nodes.push({ name: `${cat.name} (Other)`, color: catColor });
      links.push({ source: catNodeIdx, target: otherNodeIdx, value: otherTotal });
    }
  });

  return { nodes, links };
};

/**
 * Prepares detailed trend data for Bar charts.
 */
export const transformDetailedTrendData = (detailedExpenses: LedgerData | undefined) => {
  if (!detailedExpenses) return [];
  return detailedExpenses.months.map((month, mIdx) => {
    const catTotals: Record<string, number> = {};
    detailedExpenses.categories.forEach(cat => {
      let catMonthTotal = 0;
      cat.subCategories.forEach(sub => {
        catMonthTotal += (sub.monthlyValues[mIdx] || 0);
      });
      catTotals[cat.name] = (catTotals[cat.name] || 0) + catMonthTotal;
    });
    return { name: month, ...catTotals };
  });
};

/**
 * Standardizes Benchmarking data transformation.
 */
export const transformBenchmarkComparison = (
  portfolioData: { date: string; totalValue: number }[],
  benchmarkData: { date: string; price: number }[]
) => {
  if (portfolioData.length < 2 || benchmarkData.length < 2) return [];
  const firstB = benchmarkData[0].price;
  const firstP = portfolioData[0].totalValue;

  return portfolioData.map(e => {
    const b = benchmarkData.find(bh => bh.date === e.date);
    return {
      date: e.date,
      portfolio: firstP > 0 ? ((e.totalValue / firstP) - 1) * 100 : 0,
      benchmark: b && firstB > 0 ? ((b.price / firstB) - 1) * 100 : 0
    };
  });
};
