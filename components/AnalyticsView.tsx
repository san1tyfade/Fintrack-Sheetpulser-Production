
import React, { useMemo, useState } from 'react';
import { Asset, NetWorthEntry, Trade, TimeFocus, Investment, NormalizedTransaction, CustomDateRange, PortfolioLogEntry, AnalyticsSubView, IncomeEntry, ExpenseEntry } from '../types';
import { 
  BarChart4, Receipt, TrendingUp, Sparkles
} from 'lucide-react';
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
  timeline, portfolioHistory, trades, incomeData, expenseData, isLoading 
}) => {
  const [subView, setSubView] = useState<AnalyticsSubView>('FLOW');
  const [timeFocus, setTimeFocus] = useState<TimeFocus>(TimeFocus.ROLLING_12M);
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="space-y-10 animate-fade-in pb-24">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                <BarChart4 size={28} />
             </div>
             <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Analytics</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Institutional-grade data visualization engine</p>
             </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner w-fit">
              <button 
                  onClick={() => setSubView('FLOW')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      subView === 'FLOW' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                  <Receipt size={16} /> Cash Flow
              </button>
              <button 
                  onClick={() => setSubView('PORTFOLIO')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      subView === 'PORTFOLIO' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                  <TrendingUp size={16} /> Performance
              </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
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
                  timeline={timeline}
                  trades={trades}
                  timeFocus={timeFocus} 
                  customRange={customRange} 
                  onFocusChange={setTimeFocus}
              />
          )}
      </div>
      
      <div className="pt-20 flex justify-center opacity-20 grayscale pointer-events-none">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
             <Sparkles size={12} /> Powered by Sheetsense AI
          </div>
      </div>
    </div>
  );
};
