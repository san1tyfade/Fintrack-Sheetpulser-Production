
import React, { useMemo } from 'react';
import { PortfolioLogEntry, TimeFocus, CustomDateRange, NormalizedTransaction, Trade } from '../../types';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
    BarChart3, Clock, Zap, ArrowUpRight, TrendingDown, Target, Info, Sparkles,
    ShieldCheck, RefreshCw, History
} from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { processPortfolioHistory, calculateMaxDrawdown, calculateVelocity, calculatePortfolioAttribution } from '../../services/portfolioMath';

interface PortfolioAnalyticsProps {
  history: PortfolioLogEntry[];
  timeline: NormalizedTransaction[];
  trades: Trade[];
  timeFocus: TimeFocus;
  customRange: CustomDateRange;
  onFocusChange?: (focus: TimeFocus) => void;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[200px] z-[100]">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest border-b border-slate-800 pb-2">{label}</p>
            <div className="space-y-2">
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-[11px] font-bold text-slate-300">{entry.name}</span>
                        </div>
                        <span className="text-[11px] font-black text-white font-mono">{formatBaseCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total</span>
                <span className="text-sm font-black text-blue-400 font-mono">{formatBaseCurrency(total)}</span>
            </div>
        </div>
    );
};

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({ history, timeline, trades, timeFocus, customRange, onFocusChange }) => {
  const { data, accountKeys } = useMemo(() => 
    processPortfolioHistory(history, timeFocus, customRange), 
  [history, timeFocus, customRange]);

  const attribution = useMemo(() => 
    calculatePortfolioAttribution(data, timeline, timeFocus, customRange), 
  [data, timeline, timeFocus, customRange]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const current = data[data.length - 1];
    const first = data[0];
    const totalReturn = current.percentChange;
    const dollarReturn = current.totalValue - first.totalValue;
    const maxDrawdown = calculateMaxDrawdown(data);
    const dailyVelocity = calculateVelocity(data);
    return { currentValue: current.totalValue, totalReturn, dollarReturn, maxDrawdown, dailyVelocity };
  }, [data]);

  const hasAnyData = history.length > 0;

  if (data.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-40 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-slate-50 dark:bg-slate-900/20 animate-fade-in">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                {hasAnyData ? <History size={40} className="text-blue-500" /> : <Clock size={40} className="opacity-10" />}
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">
                {hasAnyData ? "Window Out of Range" : "Temporal Void"}
              </h3>
              <p className="text-sm mt-2 opacity-60 max-w-xs text-center leading-relaxed px-6">
                {hasAnyData 
                  ? `You have logs, but none fall within the selected ${timeFocus.replace('_', ' ')} window.`
                  : "No snapshot logs found in your portfoliolog tab."}
              </p>
              {hasAnyData && onFocusChange && (
                  <button 
                    onClick={() => onFocusChange(TimeFocus.FULL_YEAR)}
                    className="mt-8 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <RefreshCw size={14} /> View All Time
                  </button>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20">
        {/* Attribution Row */}
        {attribution && (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between group relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none overflow-hidden rounded-[2.5rem]">
                        <Sparkles size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Alpha Attribution</h3>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Net Worth Growth Reconciliation</p>
                                </div>
                            </div>
                            <div className="group relative">
                                <Info size={16} className="text-slate-300 cursor-help hover:text-blue-500 transition-colors" />
                                <div className="absolute right-0 bottom-full mb-4 w-72 p-4 bg-slate-900 text-white text-xs leading-relaxed rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl z-[100] translate-y-2 group-hover:translate-y-0 border border-slate-700">
                                    <p className="font-black uppercase text-[9px] text-blue-400 mb-2 tracking-widest">Accuracy Methodology</p>
                                    This model reconciles your <span className="text-blue-400 font-bold">Ledger Savings</span> against your <span className="text-emerald-400 font-bold">Net Worth Change</span>. 
                                    With exactly one year of data, results are highly precise for that period. Accuracy depends on all major savings/expenses being captured in your ledger.
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-tighter">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Capital Injected
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black text-slate-900 dark:text-white font-mono ghost-blur">{formatBaseCurrency(attribution.netContributions)}</h4>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Estimated new capital added in this window.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-tighter">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Market Alpha
                                </div>
                                <div>
                                    <h4 className={`text-3xl font-black font-mono ghost-blur ${attribution.marketAlpha >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {attribution.marketAlpha >= 0 ? '+' : ''}{formatBaseCurrency(attribution.marketAlpha)}
                                    </h4>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Growth derived strictly from asset performance.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-tighter">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Pure ROI
                                </div>
                                <div>
                                    <h4 className={`text-3xl font-black font-mono ghost-blur ${attribution.alphaPercentage >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>
                                        {attribution.alphaPercentage >= 0 ? '+' : ''}{attribution.alphaPercentage.toFixed(2)}%
                                    </h4>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Percentage return excluding new capital impact.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800" />
                                <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                            </div>
                            <p className="text-xs font-bold text-slate-500">
                                <span className="text-blue-500">{(Math.abs(attribution.netContributions) / (Math.abs(attribution.netContributions) + Math.abs(attribution.marketAlpha) || 1) * 100).toFixed(0)}%</span> of growth was self-funded
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                            <Info size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Model: Simple Dietz Reconciliation</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group flex flex-col justify-between">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none" />
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <Zap size={24} className="text-yellow-400" />
                            <h4 className="text-lg font-black uppercase tracking-widest">Alpha Insight</h4>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                            Your net worth grew by <span className="text-white font-black underline decoration-blue-500 underline-offset-4">{formatBaseCurrency(attribution.totalGrowth)}</span> this window. 
                            While <span className="text-blue-400 font-bold">{formatBaseCurrency(attribution.netContributions)}</span> came from your salary (Contributions), 
                            the remaining <span className="text-emerald-400 font-bold">{formatBaseCurrency(attribution.marketAlpha)}</span> was pure market performance (Alpha).
                        </p>
                    </div>
                    <div className="mt-8">
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500" style={{ width: `${Math.max(5, (attribution.netContributions / (attribution.totalGrowth || 1)) * 100)}%` }} />
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.max(5, (attribution.marketAlpha / (attribution.totalGrowth || 1)) * 100)}%` }} />
                        </div>
                        <div className="flex justify-between mt-2">
                             <span className="text-[9px] font-black uppercase text-slate-400">Contributions</span>
                             <span className="text-[9px] font-black uppercase text-slate-400">Market Alpha</span>
                        </div>
                    </div>
                </div>
            </section>
        )}

        {/* Momentum Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm group hover:border-blue-500/30 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Value</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white ghost-blur">
                    {formatBaseCurrency(stats?.currentValue || 0)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <Target size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-slate-500">Live Valuation</span>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm group hover:border-emerald-500/30 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Window Return</p>
                <h3 className={`text-2xl font-black ghost-blur ${stats && stats.totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats && stats.totalReturn >= 0 ? '+' : ''}{stats?.totalReturn.toFixed(2)}%
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    {stats && stats.dollarReturn >= 0 ? <ArrowUpRight size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
                    <span className="text-xs font-bold text-slate-500">{formatBaseCurrency(Math.abs(stats?.dollarReturn || 0))} P/L</span>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm group hover:border-rose-500/30 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Drawdown</p>
                <h3 className="text-2xl font-black text-rose-500 ghost-blur">{stats?.maxDrawdown.toFixed(2)}%</h3>
                <div className="flex items-center gap-2 mt-1">
                    <TrendingDown size={14} className="text-rose-400" />
                    <span className="text-xs font-bold text-slate-500">Peak-to-Trough Risk</span>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm group hover:border-indigo-500/30 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Velocity</p>
                <h3 className={`text-2xl font-black ghost-blur ${stats && stats.dailyVelocity >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatBaseCurrency(stats?.dailyVelocity || 0)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <Zap size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-slate-500">Avg. Daily Growth</span>
                </div>
            </div>
        </section>

        {/* High-Density Charts */}
        <div className="grid grid-cols-1 gap-8">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm flex flex-col h-[500px]">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <BarChart3 size={24} className="text-blue-500" />
                            Growth Stack Analysis
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cumulative Value by Account</p>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                {accountKeys.map((key, idx) => (
                                    <linearGradient key={`grad-${key}`} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0}/>
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} 
                                tickFormatter={(val) => { const d = new Date(val); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }}
                                minTickGap={40}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                            {accountKeys.map((key, idx) => (
                                <Area key={key} type="monotone" dataKey={`accounts.${key}`} name={key} stackId="1" stroke={COLORS[idx % COLORS.length]} strokeWidth={3} fillOpacity={1} fill={`url(#grad-${idx})`} animationDuration={1500} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
};
