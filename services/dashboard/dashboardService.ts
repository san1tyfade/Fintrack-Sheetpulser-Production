
import { Asset, NetWorthEntry, ExchangeRates, IncomeEntry, ExpenseEntry, TimeFocus } from '../../types';
import { convertToBase } from '../currencyService';
import { isInvestmentAsset, isCashAsset } from '../classificationService';
import { isSafeKey } from '../geminiService';
import { getAnchorDate } from '../temporalService';
import { calculateNetWorthAttribution } from '../math/financialMath';

/**
 * Aggregates high-level stats for the main dashboard dashboard.
 */
export const calculateDashboardAggregates = (assets: Asset[], exchangeRates?: ExchangeRates) => {
    let nw = 0, inv = 0, cash = 0;
    const groups: Record<string, number> = {};
    
    assets.forEach(asset => {
        const baseVal = convertToBase(asset.value, asset.currency, exchangeRates);
        nw += baseVal;
        if (isInvestmentAsset(asset)) inv += baseVal;
        if (isCashAsset(asset)) cash += baseVal;
        const type = asset.type || 'Other';
        if (isSafeKey(type)) groups[type] = (groups[type] || 0) + baseVal;
    });

    const allocation = Object.entries(groups)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return { netWorth: nw, totalInvestments: inv, totalCash: cash, allocationData: allocation };
};

/**
 * Computes attribution stats based on time focus.
 */
export const resolveAttribution = (
    currentNW: number,
    history: NetWorthEntry[],
    incomeData: IncomeEntry[],
    expenseData: ExpenseEntry[],
    timeFocus: TimeFocus
) => {
    const anchorDate = getAnchorDate(timeFocus, history);
    const anchorISO = anchorDate.toISOString().split('T')[0];
    const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));
    const startEntry = sortedHistory.find(h => h.date <= anchorISO) || sortedHistory[sortedHistory.length - 1];
    const startValue = startEntry ? startEntry.value : (history.length > 0 ? history[0].value : 0);
    
    return calculateNetWorthAttribution(currentNW, startValue, incomeData, expenseData, anchorISO);
};

/**
 * Processes monthly net income data for the Bar chart.
 */
export const processNetIncomeTrend = (
    incomeData: IncomeEntry[], 
    expenseData: ExpenseEntry[], 
    selectedYear: number
) => {
    const map = new Map<string, { date: string, monthStr: string, income: number, expense: number }>();
    const merge = (date: string, monthStr: string, inc: number, exp: number) => {
        if (!date.startsWith(String(selectedYear))) return;
        const key = date.substring(0, 7); 
        const prev = map.get(key) || { date, monthStr, income: 0, expense: 0 };
        map.set(key, { ...prev, income: prev.income + inc, expense: prev.expense + exp });
    };
    incomeData.forEach(d => merge(d.date, d.monthStr, d.amount, 0));
    expenseData.forEach(d => merge(d.date, d.monthStr, 0, d.total));
    return Array.from(map.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({ ...d, net: d.income - d.expense }))
        .slice(-12);
};
