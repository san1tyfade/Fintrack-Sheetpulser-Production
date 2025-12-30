
import React, { useState } from 'react';
import { Asset, NetWorthEntry, Trade, TimeFocus, Investment, NormalizedTransaction, CustomDateRange, PortfolioLogEntry, AnalyticsSubView, IncomeEntry, ExpenseEntry } from '../types';
import { BarChart4, Receipt, TrendingUp, Sparkles, LayoutGrid } from 'lucide-react';
import { TimeFocusSelector } from './TimeFocusSelector';
import { FlowAnalytics } from './analytics/FlowAnalytics';
import { PortfolioAnalytics } from './analytics/PortfolioAnalytics';

interface AnalyticsViewProps {
  assets: Asset[];
  trades: Trade[];
  investments: Investment[];
  netWorthHistory: NetWorthEntry[];
  portfolioHistory: PortfolioLogEntry[];
  timeline: NormalizedTransaction[];
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  isLoading?: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ 
  timeline, portfolioHistory, incomeData, expenseData, trades, isLoading, assets 
}) => {
  const [subView, setSubView] = useState<AnalyticsSubView>('FLOW');
  const [timeFocus, setTimeFocus] = useState<TimeFocus>(TimeFocus.ROLLING_12M);
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
              <BarChart4 size={24} />
           </div>
           <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sheetscope Analytics</h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">A lens to your financial picture</p>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                <button 
                    onClick={() => setSubView('FLOW')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'FLOW' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <Receipt size={14} /> Flow
                </button>
                <button 
                    onClick={() => setSubView('PORTFOLIO')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'PORTFOLIO' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <TrendingUp size={14} /> Performance
                </button>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block mx-2" />
            <TimeFocusSelector 
                current={timeFocus} 
                onChange={setTimeFocus} 
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
            />
        </div>
      </header>

      <div className={`transition-all duration-500 ${isLoading ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
          {subView === 'FLOW' ? (
              <FlowAnalytics 
                  timeline={timeline} 
                  incomeData={incomeData}
                  expenseData={expenseData}
                  timeFocus={timeFocus} 
                  customRange={customRange} 
              />
          ) : (
              <PortfolioAnalytics 
                  history={portfolioHistory} 
                  trades={trades}
                  timeFocus={timeFocus} 
                  customRange={customRange} 
              />
          )}
      </div>
      
      <footer className="pt-12 flex justify-center opacity-30 grayscale pointer-events-none">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">
             <Sparkles size={10} /> Intelligence by Sheetsense
          </div>
      </footer>
    </div>
  );
};
