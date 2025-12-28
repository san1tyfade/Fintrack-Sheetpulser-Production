
import React, { useMemo, useState } from 'react';
import { Asset, NetWorthEntry, Trade, TimeFocus, Investment, NormalizedTransaction, CustomDateRange } from '../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ComposedChart, Line, Area,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  Calendar, Layers, TrendingUp, ChevronRight, Home, LayoutGrid, Activity, PiggyBank, ArrowUpRight, ArrowDownRight, Filter, Clock
} from 'lucide-react';
import { formatBaseCurrency } from '../services/currencyService';
import { TimeFocusSelector } from './TimeFocusSelector';
import { isDateWithinFocus } from '../services/portfolioService';
import { aggregateDimensions, aggregateTemporalTrend } from '../services/temporalService';

interface AnalyticsViewProps {
  assets: Asset[];
  trades: Trade[];
  investments: Investment[];
  netWorthHistory: NetWorthEntry[];
  timeline: NormalizedTransaction[];
  isLoading?: boolean;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ 
  timeline, isLoading 
}) => {
  const [timeFocus, setTimeFocus] = useState<TimeFocus>(TimeFocus.ROLLING_12M);
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // 1. Unified Temporal Data Filtering
  const activeTimeline = useMemo(() => {
      return timeline.filter(t => isDateWithinFocus(t.date, timeFocus, customRange));
  }, [timeline, timeFocus, customRange]);

  // 2. Multi-Dimensional Engine Compute
  const dimensionData = useMemo(() => {
      return aggregateDimensions(activeTimeline, drillPath, activeType);
  }, [activeTimeline, drillPath, activeType]);

  // 3. Temporal Trend Compute (Velocity of selected dimension)
  const trendData = useMemo(() => {
      return aggregateTemporalTrend(activeTimeline, drillPath, activeType);
  }, [activeTimeline, drillPath, activeType]);

  // 4. Period Stats (Savings Intelligence)
  const periodStats = useMemo(() => {
      const income = activeTimeline.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      const expense = activeTimeline.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
      const savings = income - expense;
      const rate = income > 0 ? (savings / income) * 100 : 0;
      
      return { income, expense, savings, rate };
  }, [activeTimeline]);

  // 5. Dynamic Period Label
  const periodLabel = useMemo(() => {
    if (timeFocus === TimeFocus.FULL_YEAR) return 'All-Time History';
    if (timeFocus === TimeFocus.CUSTOM) return `${customRange.start} — ${customRange.end}`;
    
    const now = new Date();
    if (timeFocus === TimeFocus.MTD) return now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (timeFocus === TimeFocus.YTD) return `Year ${now.getFullYear()}`;
    if (timeFocus === TimeFocus.ROLLING_12M) {
        const lastYear = new Date();
        lastYear.setFullYear(now.getFullYear() - 1);
        return `${lastYear.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} to Present`;
    }
    return timeFocus.replace('_', ' ');
  }, [timeFocus, customRange]);

  return (
    <div className="space-y-10 animate-fade-in pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-1">
             <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Temporal Intelligence</h2>
             <span className="text-[10px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20 font-black uppercase tracking-widest">Aggregate Engine</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Contiguous multidimensional analysis across historical boundaries.</p>
        </div>
        <div className="flex flex-col gap-3 items-end">
            <TimeFocusSelector 
                current={timeFocus} 
                onChange={setTimeFocus} 
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
            />
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
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Savings</p>
            <h3 className={`text-2xl font-black ghost-blur ${periodStats.savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatBaseCurrency(periodStats.savings)}
            </h3>
            <div className="flex items-center gap-2 mt-1">
                <PiggyBank size={14} className="text-slate-300" />
                <span className="text-xs font-bold text-slate-500">{periodStats.rate.toFixed(1)}% savings rate</span>
            </div>
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
        {/* Multi-Dimensional Bar Chart */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm flex flex-col min-h-[550px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <LayoutGrid size={24} className="text-blue-500" />
                        Dimensional Drill-down
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                            <button onClick={() => setDrillPath([])} className={`p-1.5 rounded-lg transition-colors ${drillPath.length === 0 ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}>
                                <Home size={16} />
                            </button>
                            {drillPath.map((p, i) => (
                                <React.Fragment key={p}>
                                    <ChevronRight size={14} className="text-slate-300" />
                                    <button 
                                        onClick={() => setDrillPath(prev => prev.slice(0, i + 1))}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                            i === drillPath.length - 1 ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                           <Clock size={12} /> {periodLabel}
                        </div>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Interactive Dimensions
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                {dimensionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dimensionData} layout="vertical" margin={{ left: 20, right: 40, top: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.05} />
                            <XAxis 
                                type="number" 
                                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                tickLine={false}
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                            />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                tickLine={true} 
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} 
                                width={110}
                            />
                            <Tooltip 
                                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{data.name}</p>
                                            <p className="text-lg font-black text-white font-mono">{formatBaseCurrency(data.total)}</p>
                                            <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">{data.count} Occurrences in period</p>
                                            {drillPath.length === 0 && <p className="text-[8px] text-blue-400 mt-3 uppercase font-black animate-pulse">Click to explore sub-dimensions</p>}
                                        </div>
                                    );
                                }}
                            />
                            <Bar 
                                dataKey="total" 
                                radius={[0, 8, 8, 0]} 
                                barSize={28}
                                onClick={(data) => { if (drillPath.length === 0) setDrillPath([data.name]); }}
                                className="cursor-pointer"
                            >
                                {dimensionData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} className="hover:fill-opacity-100 transition-opacity" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                        <Filter size={48} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">No dimensional data in focus</p>
                    </div>
                )}
            </div>
        </div>

        {/* Temporal Velocity Analyzer */}
        <div className="xl:col-span-5 flex flex-col gap-8">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm flex flex-col flex-1 min-h-[400px]">
                <div className="mb-10">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <TrendingUp size={20} className="text-emerald-500" />
                        Temporal Velocity
                    </h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                        {drillPath.length > 0 ? `Trend for ${drillPath.join(' > ')}` : `Unified ${activeType.toLowerCase()} velocity`}
                    </p>
                </div>

                <div className="flex-1 min-h-0">
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fill: '#94a3b8'}}
                                    tickFormatter={(val) => {
                                        const [y, m] = val.split('-');
                                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                        return `${monthNames[parseInt(m)-1]} '${y.slice(2)}`;
                                    }}
                                />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem', padding: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}
                                    formatter={(val: number) => [formatBaseCurrency(val), 'Volume']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.05} />
                                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center opacity-20"><Activity size={40} /></div>
                    )}
                </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <ArrowUpRight size={140} className="absolute -right-8 -bottom-8 opacity-5 group-hover:scale-110 transition-transform duration-1000" />
                <div className="relative z-10 space-y-4">
                    <h4 className="text-xl font-black flex items-center gap-2">
                        <PiggyBank className="text-blue-400" size={24} />
                        Period Insights
                    </h4>
                    <p className="text-sm opacity-60 leading-relaxed font-medium">
                        The Temporal Engine has successfully mapped <span className="text-white font-bold">{activeTimeline.length} events</span> for this window. 
                        Your top {activeType.toLowerCase()} driver is <span className="text-blue-400 font-bold">"{dimensionData[0]?.name || 'N/A'}"</span>.
                    </p>
                    <div className="pt-2">
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                            <div className={`w-2 h-2 rounded-full ${periodStats.savings >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Temporal Health: {periodStats.savings >= 0 ? 'Positive' : 'Deficit'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
