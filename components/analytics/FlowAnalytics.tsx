
import React, { useMemo, useState } from 'react';
import { NormalizedTransaction, TimeFocus, CustomDateRange, IncomeEntry, ExpenseEntry } from '../../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ComposedChart, Line, Area,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { 
  LayoutGrid, Activity, PiggyBank, ArrowUpRight, ArrowDownRight, Filter, TrendingUp, TrendingDown, ArrowUpDown, Info, Zap, ChevronRight, Home, X
} from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { aggregateDimensions, aggregateComparativeTrend, getTemporalWindows, calculateTemporalVariance } from '../../services/temporalService';
import { isDateWithinFocus } from '../../services/portfolioService';

interface FlowAnalyticsProps {
  timeline: NormalizedTransaction[];
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  timeFocus: TimeFocus;
  customRange: CustomDateRange;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
];

export const FlowAnalytics: React.FC<FlowAnalyticsProps> = ({ timeline, incomeData, expenseData, timeFocus, customRange }) => {
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [sortMode, setSortMode] = useState<'TOTAL' | 'VARIANCE'>('TOTAL');

  const temporalWindows = useMemo(() => getTemporalWindows(timeFocus, customRange), [timeFocus, customRange]);

  const activeTimeline = useMemo(() => {
      return timeline.filter(t => t.date >= temporalWindows.current.start && t.date <= temporalWindows.current.end);
  }, [timeline, temporalWindows]);

  const shadowTimeline = useMemo(() => {
      return timeline.filter(t => t.date >= temporalWindows.shadow.start && t.date <= temporalWindows.shadow.end);
  }, [timeline, temporalWindows]);

  const dimensionData = useMemo(() => {
      if (sortMode === 'VARIANCE') {
          return calculateTemporalVariance(activeTimeline, shadowTimeline, drillPath, activeType, false)
            .map(v => ({ name: v.name, total: v.currentTotal, delta: v.delta, pct: v.pct, count: 0 }));
      }
      return aggregateDimensions(activeTimeline, drillPath, activeType);
  }, [activeTimeline, shadowTimeline, drillPath, activeType, sortMode]);

  const trendData = useMemo(() => {
      return aggregateComparativeTrend(activeTimeline, shadowTimeline, drillPath, activeType);
  }, [activeTimeline, shadowTimeline, drillPath, activeType]);

  const periodStats = useMemo(() => {
      /**
       * DATA SOURCE ALIGNMENT: 
       * We now calculate the period totals from incomeData and expenseData (the summary level).
       * This matches the "Expense Overview" chart and ensures untracked/residual spending 
       * captured in the spreadsheet's total calculation is reflected here.
       */
      const income = incomeData
        .filter(d => isDateWithinFocus(d.date, timeFocus, customRange))
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      
      const expense = expenseData
        .filter(d => isDateWithinFocus(d.date, timeFocus, customRange))
        .reduce((sum, d) => sum + (d.total || 0), 0);
        
      const savings = income - expense;
      const rate = income > 0 ? (savings / income) * 100 : 0;
      return { income, expense, savings, rate };
  }, [incomeData, expenseData, timeFocus, customRange]);

  const insightData = useMemo(() => {
    if (timeFocus === TimeFocus.FULL_YEAR) return null;
    const variances = calculateTemporalVariance(activeTimeline, shadowTimeline, drillPath, activeType, true);
    if (variances.length === 0) return null;
    const topMover = variances[0];
    const isIncrease = topMover.delta > 0;
    const isDesirable = activeType === 'INCOME' ? isIncrease : !isIncrease;
    return { topMover, isIncrease, isDesirable, periodLabel: temporalWindows.label };
  }, [activeTimeline, shadowTimeline, drillPath, activeType, timeFocus, temporalWindows]);

  const pacingStatus = useMemo(() => {
      if (trendData.length === 0) return null;
      const lastPoint = trendData[trendData.length - 1];
      const curr = lastPoint.current || 0;
      const shad = lastPoint.shadow || 0;
      const diff = curr - shad;
      const isAbove = diff > 0;
      let status: 'FASTER' | 'SLOWER' | 'STABLE' = 'STABLE';
      if (Math.abs(diff) > 10) status = isAbove ? 'FASTER' : 'SLOWER';
      return { status, isAbove, diff };
  }, [trendData]);

  const getBreadcrumbTotal = (path: string[]) => {
      let txs = activeTimeline.filter(t => t.type === activeType);
      if (path.length > 0) txs = txs.filter(t => t.category === path[0]);
      if (path.length > 1) txs = txs.filter(t => t.subCategory === path[1]);
      return txs.reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
            {['EXPENSE', 'INCOME'].map(type => (
                <button 
                    key={type}
                    onClick={() => { setActiveType(type as any); setDrillPath([]); }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeType === type 
                        ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    {type}S
                </button>
            ))}
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setSortMode(prev => prev === 'TOTAL' ? 'VARIANCE' : 'TOTAL')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    sortMode === 'VARIANCE' 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                    : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600'
                }`}
            >
                <ArrowUpDown size={14} />
                {sortMode === 'TOTAL' ? 'By Total' : 'By Variance'}
            </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Savings</p>
            <h3 className={`text-2xl font-black ghost-blur ${periodStats.savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatBaseCurrency(periodStats.savings)}</h3>
            <div className="flex items-center gap-2 mt-1"><PiggyBank size={14} className="text-slate-300" /><span className="text-xs font-bold text-slate-500">{periodStats.rate.toFixed(1)}% savings rate</span></div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Income</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white ghost-blur">{formatBaseCurrency(periodStats.income)}</h3>
            <div className="flex items-center gap-2 mt-1 text-emerald-500 font-bold text-xs"><ArrowUpRight size={14} /> Total Inflow</div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Spending</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white ghost-blur">{formatBaseCurrency(periodStats.expense)}</h3>
            <div className="flex items-center gap-2 mt-1 text-rose-500 font-bold text-xs"><ArrowDownRight size={14} /> Total Outflow</div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Density</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{activeTimeline.length} Points</h3>
            <div className="flex items-center gap-2 mt-1 text-blue-500 font-bold text-xs"><Activity size={14} /> Aggregated Events</div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm flex flex-col min-h-[550px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3"><LayoutGrid size={24} className="text-blue-500" />Dimensional Drill-down</h3>
                    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                        <button onClick={() => setDrillPath([])} className={`p-1.5 rounded-lg transition-colors ${drillPath.length === 0 ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}><Home size={16} /></button>
                        {drillPath.map((p, i) => (
                            <React.Fragment key={p}>
                                <ChevronRight size={14} className="text-slate-300" />
                                <button onClick={() => setDrillPath(prev => prev.slice(0, i + 1))} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${i === drillPath.length - 1 ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}>{p}<span className="opacity-50 font-mono">({formatBaseCurrency(getBreadcrumbTotal(drillPath.slice(0, i + 1)))})</span></button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                {dimensionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dimensionData} layout="vertical" margin={{ left: 20, right: 40, top: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.05} />
                            <XAxis type="number" axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                            <YAxis type="category" dataKey="name" axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} tickLine={true} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} width={110} />
                            <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{data.name}</p>
                                        <div className="flex items-center gap-3"><p className="text-lg font-black text-white font-mono">{formatBaseCurrency(data.total)}</p>{data.delta !== undefined && <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${data.delta > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{data.delta > 0 ? '+' : ''}{formatBaseCurrency(data.delta)}</span>}</div>
                                    </div>
                                );
                            }} />
                            <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={28} onClick={(data) => { if (drillPath.length === 0) setDrillPath([data.name]); }} className="cursor-pointer">
                                {dimensionData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} className="hover:fill-opacity-100 transition-opacity" />))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (<div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]"><Filter size={48} className="mb-4" /><p className="text-xs font-black uppercase tracking-widest">No dimensional data in focus</p></div>)}
            </div>
        </div>

        <div className="xl:col-span-5 flex flex-col gap-8">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm flex flex-col flex-1 min-h-[400px]">
                <div className="mb-10 flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3"><Activity size={24} className="text-blue-500 animate-pulse" />Comparative Velocity</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{drillPath.length > 0 ? `${drillPath.join(' › ')}` : `Unified ${activeType.toLowerCase()} trajectory`}</p>
                             {pacingStatus && (<div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${pacingStatus.isAbove ? (activeType === 'EXPENSE' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20') : (activeType === 'EXPENSE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20')}`}><Zap size={10} className="fill-current" />{pacingStatus.status} PACE</div>)}
                        </div>
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} tickFormatter={(val) => { if (!val) return ''; const d = new Date(val + '-02'); return isNaN(d.getTime()) ? val : d.toLocaleDateString(undefined, { month: 'short' }); }} minTickGap={20} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} domain={['auto', 'auto']} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1.2rem', padding: '16px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 900 }} />
                                <Line name="shadow" type="monotone" dataKey="shadow" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                                <Area name="current" type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={0} fill="#3b82f6" fillOpacity={0.08} />
                                <Line name="current" type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={4} dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (<div className="h-full flex flex-col items-center justify-center opacity-20 text-slate-400"><Activity size={48} className="mb-4" /><p className="text-xs font-black uppercase">No comparative data found</p></div>)}
                </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                {insightData ? (
                    <div className="relative z-10 space-y-4">
                        <h4 className="text-xl font-black flex items-center gap-2"><PiggyBank className="text-blue-400" size={24} />Period Insights</h4>
                        <p className="text-sm opacity-60 leading-relaxed font-medium">Top mover: <span className="text-white font-bold">{insightData.topMover.name}</span>. {activeType === 'EXPENSE' ? 'Spending' : 'Income'} {insightData.isIncrease ? 'up' : 'down'} by <span className={insightData.isDesirable ? 'text-emerald-400' : 'text-rose-400'}>{formatBaseCurrency(Math.abs(insightData.topMover.delta))} ({Math.abs(insightData.topMover.pct).toFixed(0)}%)</span> vs {insightData.periodLabel}.</p>
                    </div>
                ) : (<p className="text-sm text-slate-400">Select a focus period for insights.</p>)}
            </div>
        </div>
      </div>
    </div>
  );
};
