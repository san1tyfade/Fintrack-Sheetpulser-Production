
import React, { useMemo, useState } from 'react';
import { Asset, NetWorthEntry, ExchangeRates, IncomeEntry, ExpenseEntry, TimeFocus, Trade, CustomDateRange } from '../types';
import { DollarSign, Wallet, Loader2, TrendingUp, ArrowUpRight } from 'lucide-react';
import { PRIMARY_CURRENCY } from '../services/currencyService';
import { calculateDashboardAggregates, resolveAttribution, processNetIncomeTrend } from '../services/dashboard/dashboardService';
import { StatsCard } from './dashboard/DashboardStats';
import { WealthDriversCard } from './dashboard/WealthDrivers';
import { NetWorthChart, IncomeChart, AllocationChart, DrilldownView } from './dashboard/DashboardCharts';

interface DashboardProps {
  assets: Asset[];
  trades?: Trade[];
  netWorthHistory?: NetWorthEntry[];
  incomeData?: IncomeEntry[];
  expenseData?: ExpenseEntry[];
  isLoading?: boolean;
  exchangeRates?: ExchangeRates;
  isDarkMode?: boolean;
  selectedYear?: number;
  timeFocus?: TimeFocus;
  onTimeFocusChange?: (focus: TimeFocus) => void;
  availableYears?: number[];
  onYearChange?: (year: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    assets, netWorthHistory = [], incomeData = [], expenseData = [], isLoading = false, exchangeRates, isDarkMode = true, selectedYear = new Date().getFullYear(), timeFocus = TimeFocus.FULL_YEAR, onTimeFocusChange, availableYears = [], onYearChange
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState<CustomDateRange>({ start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });
  const isHistorical = selectedYear !== new Date().getFullYear();

  const { netWorth, totalInvestments, totalCash, allocationData } = useMemo(() => 
    calculateDashboardAggregates(assets, exchangeRates),
    [assets, exchangeRates]
  );

  const attributionData = useMemo(() => 
    resolveAttribution(netWorth, netWorthHistory, incomeData, expenseData, timeFocus),
    [netWorth, netWorthHistory, incomeData, expenseData, timeFocus]
  );

  const netWorthChange = useMemo(() => {
    if (netWorthHistory.length < 1) return null;
    const sorted = [...netWorthHistory].filter(d => d.date.startsWith(String(selectedYear))).sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) return null;
    const latestLoggedValue = sorted[0].value;
    return latestLoggedValue === 0 ? null : ((netWorth - latestLoggedValue) / latestLoggedValue) * 100;
  }, [netWorth, netWorthHistory, selectedYear]);

  const netIncomeData = useMemo(() => 
    processNetIncomeTrend(incomeData, expenseData, selectedYear),
    [incomeData, expenseData, selectedYear]
  );

  const chartData = useMemo(() => [...netWorthHistory].sort((a, b) => a.date.localeCompare(b.date)), [netWorthHistory]);

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
                Dashboard
                {isLoading && (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <Loader2 className="animate-spin text-blue-500" size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Syncing Engine</span>
                    </div>
                )}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Real-time financial health index in {PRIMARY_CURRENCY}.</p>
        </div>
      </header>

      <div className={`transition-all duration-700 space-y-10 ${isLoading ? 'opacity-50 grayscale blur-[1px] pointer-events-none' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatsCard title="Atomic Net Worth" value={netWorth} icon={DollarSign} color="blue" isLoading={isLoading} change={netWorthChange} isHistorical={isHistorical} />
            <StatsCard title="Portfolio Core" value={totalInvestments} icon={ArrowUpRight} color="emerald" isLoading={isLoading} isHistorical={isHistorical} />
            <StatsCard title="Global Liquidity" value={totalCash} icon={Wallet} color="purple" isLoading={isLoading} isHistorical={isHistorical} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
                <NetWorthChart data={chartData} isDarkMode={isDarkMode} selectedYear={selectedYear} isHistorical={isHistorical} timeFocus={timeFocus} onFocusChange={onTimeFocusChange} customRange={customRange} onCustomRangeChange={setCustomRange} incomeData={incomeData} expenseData={expenseData} startValue={attributionData.startValue} availableYears={availableYears} onYearChange={onYearChange} />
            </div>
            <div className="lg:col-span-1">
                <WealthDriversCard attribution={attributionData} isLoading={isLoading} timeFocus={timeFocus} />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
                <IncomeChart data={netIncomeData} isDarkMode={isDarkMode} />
            </div>
            <div className="lg:col-span-1">
                <AllocationChart data={allocationData} selectedCategory={selectedCategory} onSelect={setSelectedCategory} isDarkMode={isDarkMode} />
            </div>
        </div>

        {selectedCategory && allocationData.length > 0 && (
            <DrilldownView category={selectedCategory} assets={assets.filter(a => (a.type || 'Other') === selectedCategory)} exchangeRates={exchangeRates} />
        )}
      </div>
    </div>
  );
};
