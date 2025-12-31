
import React, { useMemo, useState } from 'react';
import { NormalizedTransaction, TimeFocus, CustomDateRange, IncomeEntry, ExpenseEntry } from '../../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Area, BarChart, Bar, Cell, LabelList
} from 'recharts';
import { LayoutGrid, Activity, PiggyBank, Columns, ArrowUpDown, Zap, Loader2 } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { aggregateDimensions, aggregateComparativeTrend, getTemporalWindows, calculateTemporalVariance } from '../../services/temporalService';
import { isDateWithinFocus } from '../../services/portfolioService';
import { AnalyticsCard, StatHighlight, DrillBreadcrumbs } from './AnalyticsPrimitives';

interface FlowAnalyticsProps {
  timeline: NormalizedTransaction[];
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  timeFocus: TimeFocus;
  customRange: CustomDateRange;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

export const FlowAnalytics: React.FC<FlowAnalyticsProps> = ({ timeline, incomeData, expenseData, timeFocus, customRange }) => {
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [sortMode, setSortMode] = useState<'TOTAL' | 'VARIANCE'>('TOTAL');
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  const temporalWindows = useMemo(() => getTemporalWindows(timeFocus, customRange), [timeFocus, customRange]);

  const periodStats = useMemo(() => {
      const inc = incomeData.filter(d => isDateWithinFocus(d.date, timeFocus, customRange)).reduce((s, d) => s + (d.amount || 0), 0);
      const exp = expenseData.filter(d => isDateWithinFocus(d.date, timeFocus, customRange)).reduce((s, d) => s + (d.total || 0), 0);
      const savings = inc - exp;
      return { income: inc, expense: exp, savings, rate: inc > 0 ? (savings / inc) * 100 : 0 };
  }, [incomeData, expenseData, timeFocus, customRange]);

  const activeTimeline = useMemo(() => timeline.filter(t => t.date >= temporalWindows.current.start && t.date <= temporalWindows.current.end), [timeline, temporalWindows]);
  const shadowTimeline = useMemo(() => timeline.filter(t => t.date >= temporalWindows.shadow.start && t.date <= temporalWindows.shadow.end), [timeline, temporalWindows]);

  const dimensionData = useMemo(() => {
      const current = aggregateDimensions(activeTimeline, drillPath, activeType);
      const shadow = aggregateDimensions(shadowTimeline, drillPath, activeType);
      const shadowMap = new Map(shadow.map(g => [g.name, g.total]));
      const total = activeType === 'INCOME' ? periodStats.income : periodStats.expense;

      return current.map(curr => {
          const prevTotal = shadowMap.get(curr.name) || 0;
          const delta = curr.total - prevTotal;
          const pctOfTotal = total > 0 ? (curr.total / total) * 100 : 0;
          return { ...curr, prevTotal, delta, pctOfTotal, label: `${formatBaseCurrency(Math.round(curr.total))} — ${pctOfTotal.toFixed(1)}%` };
      }).sort((a, b) => sortMode === 'VARIANCE' ? Math.abs(b.delta) - Math.abs(a.delta) : b.total - a.total);
  }, [activeTimeline, shadowTimeline, drillPath, activeType, sortMode, periodStats]);

  const trendData = useMemo(() => aggregateComparativeTrend(activeTimeline, shadowTimeline, drillPath, activeType), [activeTimeline, shadowTimeline, drillPath, activeType]);

  const insightData = useMemo(() => {
    if (timeFocus === TimeFocus.FULL_YEAR) return null;
    const v = calculateTemporalVariance(activeTimeline, shadowTimeline, drillPath, activeType, true);
    return v.length > 0 ? { topMover: v[0], isDesirable: activeType === 'INCOME' ? v[0].delta > 0 : v[0].delta < 0 } : null;
  }, [activeTimeline, shadowTimeline, drillPath, activeType, timeFocus]);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
            {['EXPENSE', 'INCOME'].map(type => (
                <button key={type} onClick={() => { setActiveType(type as any); setDrillPath([]); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeType === type ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    {type}S
                </button>
            ))}
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsComparisonMode(!isComparisonMode)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isComparisonMode ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                <Columns size={14} /> PoP Compare
            </button>
            <button onClick={() => setSortMode(p => p === 'TOTAL' ? 'VARIANCE' : 'TOTAL')} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${sortMode === 'VARIANCE' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                <ArrowUpDown size={14} /> {sortMode === 'TOTAL' ? 'By Size' : 'By Δ'}
            </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatHighlight 
            label="Savings" 
            value={periodStats.savings} 
            subValue={`${periodStats.rate.toFixed(1)}% rate`} 
            variant={periodStats.savings >= 0 ? 'success' : 'danger'}
        />
        <StatHighlight 
            label="Inflow" 
            value={periodStats.income} 
            variant="success"
        />
        <StatHighlight 
            label="Outflow" 
            value={periodStats.expense} 
            variant="danger"
        />
        <StatHighlight 
            label="Density" 
            value={activeTimeline.length} 
            subValue="Events" 
            isCurrency={false} 
            variant="info"
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <AnalyticsCard 
          title="Dimensional Drill-down" icon={LayoutGrid} className="xl:col-span-7 h-[550px]"
          info="Recursive breakdown of your cash flow. Click bars to traverse deep into category hierarchies."
          controls={<DrillBreadcrumbs path={drillPath} onReset={() => setDrillPath([])} onPop={(i) => setDrillPath(p => p.slice(0, i+1))} type={activeType} />}
        >
          {dimensionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dimensionData} layout="vertical" margin={{ left: 10, right: 100, top: 0, bottom: 20 }} barGap={2}>
                <CartesianGrid horizontal={true} vertical={false} opacity={0.05} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} width={110} />
                <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">{d.name}</p>
                        <div className="flex justify-between gap-6 text-[10px] font-black"><span className="text-slate-500 uppercase">Current</span><span className="text-white font-mono">{formatBaseCurrency(Math.round(d.total))}</span></div>
                        {isComparisonMode && <div className="flex justify-between gap-6 text-[10px] font-black"><span className="text-slate-500 uppercase">Prev</span><span className="text-slate-400 font-mono">{formatBaseCurrency(Math.round(d.prevTotal))}</span></div>}
                        <div className="flex justify-between gap-6 text-[10px] font-black border-t border-slate-800 pt-1"><span className="text-slate-500 uppercase">Weight</span><span className="text-blue-400 font-mono">{d.pctOfTotal.toFixed(1)}%</span></div>
                    </div>
                  );
                }} />
                {isComparisonMode && <Bar dataKey="prevTotal" radius={[0, 4, 4, 0]} barSize={14} fill="currentColor" className="text-slate-200 dark:text-slate-700" />}
                <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={24} onClick={(d) => drillPath.length < 2 && setDrillPath(p => [...p, d.name])} className="cursor-pointer">
                  <LabelList dataKey="label" content={(p: any) => <text x={p.x + p.width + 8} y={p.y + p.height / 2} fill="#94a3b8" textAnchor="start" dominantBaseline="middle" fontSize={10} fontWeight="bold" className="font-mono">{p.value}</text>} />
                  {dimensionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} className="hover:fill-opacity-100 transition-opacity" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : timeline.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
               <Loader2 className="animate-spin" size={32} />
               <p className="text-xs font-black uppercase tracking-[0.2em]">Assembling Engine...</p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-30">
               <LayoutGrid size={48} strokeWidth={1} />
               <p className="text-xs font-black uppercase tracking-[0.2em]">No Data in Focus</p>
            </div>
          )}
        </AnalyticsCard>

        <div className="xl:col-span-5 flex flex-col gap-8">
          <AnalyticsCard title="Temporal Velocity" icon={Activity} className="h-[400px]" subtext={drillPath.join(' › ') || `Global ${activeType.toLowerCase()} trend`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} opacity={0.05} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} tickFormatter={(v) => v ? new Date(v + '-02').toLocaleDateString(undefined, { month: 'short' }) : ''} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} tickFormatter={(v) => `$${v >= 1000 ? Math.round(v/1000) + 'k' : Math.round(v)}`} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem' }} 
                    formatter={(v: number) => [formatBaseCurrency(Math.round(v)), '']}
                />
                <Line name="prev" type="monotone" dataKey="shadow" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                <Area name="curr" type="monotone" dataKey="current" fill="#3b82f6" fillOpacity={0.08} />
                <Line name="curr" type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            {insightData ? (
              <div className="relative z-10 space-y-2">
                <h4 className="text-xl font-black flex items-center gap-2"><Zap className="text-blue-400" size={24} />Period Insight</h4>
                <p className="text-sm opacity-60 leading-relaxed font-medium">Significant movement in <span className="text-white font-bold">{insightData.topMover.name}</span>. {activeType === 'EXPENSE' ? 'Spend' : 'Income'} {insightData.topMover.delta > 0 ? 'rose' : 'dropped'} by <span className={insightData.isDesirable ? 'text-emerald-400' : 'text-rose-400'}>{formatBaseCurrency(Math.abs(Math.round(insightData.topMover.delta)))} ({Math.abs(insightData.topMover.variancePct).toFixed(0)}%)</span> PoP.</p>
              </div>
            ) : <p className="text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Select sub-annual focus for PoP insights</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
