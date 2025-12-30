
import React, { useMemo, useState, useEffect } from 'react';
import { PortfolioLogEntry, TimeFocus, CustomDateRange, Trade } from '../../types';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar, Cell, LabelList
} from 'recharts';
import { BarChart3, Zap, Target, LineChart as ChartIcon, Loader2 } from 'lucide-react';
import { formatBaseCurrency, PRIMARY_CURRENCY } from '../../services/currencyService';
import { processPortfolioHistory, calculateMaxDrawdown, calculateVelocity, calculatePortfolioAttribution } from '../../services/portfolioMath';
import { fetchHistoricalPrices } from '../../services/priceService';
import { AnalyticsCard, StatHighlight } from './AnalyticsPrimitives';

interface PortfolioAnalyticsProps {
  history: PortfolioLogEntry[];
  trades: Trade[];
  timeFocus: TimeFocus;
  customRange: CustomDateRange;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
const BENCHMARKS = [{ id: 'SPY', name: 'S&P 500', color: '#10b981' }, { id: 'XIU.TO', name: 'TSX 60', color: '#ef4444' }, { id: 'QQQ', name: 'Nasdaq 100', color: '#8b5cf6' }];

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({ history, trades, timeFocus, customRange }) => {
  const [selectedBenchmark, setSelectedBenchmark] = useState('SPY');
  const [selectedAccount, setSelectedAccount] = useState('TOTAL');
  const [benchmarkHistory, setBenchmarkHistory] = useState<{date: string, price: number}[]>([]);
  const [isFetchingBenchmark, setIsFetchingBenchmark] = useState(false);

  const { data: rawData, accountKeys } = useMemo(() => processPortfolioHistory(history, timeFocus, customRange), [history, timeFocus, customRange]);
  const accountAwareData = useMemo(() => {
    if (rawData.length === 0 || selectedAccount === 'TOTAL') return rawData;
    const anchor = rawData[0]?.accounts[selectedAccount] || 0;
    return rawData.map(e => ({ ...e, totalValue: e.accounts[selectedAccount] || 0, percentChange: anchor > 0 ? ((e.accounts[selectedAccount] - anchor) / anchor) * 100 : 0 }));
  }, [rawData, selectedAccount]);

  const stats = useMemo(() => {
    if (accountAwareData.length === 0) return null;
    const cur = accountAwareData[accountAwareData.length - 1];
    return { currentValue: cur.totalValue, totalReturn: cur.percentChange, maxDrawdown: calculateMaxDrawdown(accountAwareData), velocity: calculateVelocity(accountAwareData) };
  }, [accountAwareData]);

  const attribution = useMemo(() => calculatePortfolioAttribution(accountAwareData, trades, timeFocus, customRange), [accountAwareData, trades, timeFocus, customRange]);

  const waterfallData = useMemo(() => {
    if (!attribution) return [];
    const { startValue, contributions, withdrawals, marketAlpha, endValue } = attribution;
    const peak = startValue + contributions;
    return [
        { name: 'Start', range: [0, startValue], actual: startValue, type: 'anchor', display: 'Initial' },
        { name: 'Inflow', range: [startValue, peak], actual: contributions, type: 'inflow', display: 'Buy-ins' },
        { name: 'Outflow', range: [peak - withdrawals, peak], actual: -withdrawals, type: 'outflow', display: 'Sells' },
        { name: 'Yield', range: [Math.min(peak-withdrawals, endValue), Math.max(peak-withdrawals, endValue)], actual: marketAlpha, type: 'yield', display: 'Market' },
        { name: 'Current', range: [0, endValue], actual: endValue, type: 'anchor', display: 'End' }
    ];
  }, [attribution]);

  useEffect(() => {
    if (accountAwareData.length === 0) return;
    setIsFetchingBenchmark(true);
    fetchHistoricalPrices(selectedBenchmark, accountAwareData[0].date).then(p => { setBenchmarkHistory(p); setIsFetchingBenchmark(false); });
  }, [selectedBenchmark, accountAwareData]);

  const comparisonData = useMemo(() => {
    if (accountAwareData.length < 2 || benchmarkHistory.length < 2) return [];
    const firstB = benchmarkHistory[0].price;
    const firstP = accountAwareData[0].totalValue;
    return accountAwareData.map(e => {
        const b = benchmarkHistory.find(bh => bh.date === e.date);
        return { date: e.date, portfolio: firstP > 0 ? ((e.totalValue / firstP) - 1) * 100 : 0, benchmark: b && firstB > 0 ? ((b.price / firstB) - 1) * 100 : 0 };
    });
  }, [accountAwareData, benchmarkHistory]);

  const renderWaterfallLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const item = waterfallData[index];
    if (!item) return null;
    
    // Position logic: Put label above the bar
    // Since range is [bottom, top], the visual top is the higher value
    const topOfBar = Math.min(y, y + height);
    
    return (
      <g>
        <text 
            x={x + width / 2} 
            y={topOfBar - 12} 
            fill="#94a3b8" 
            textAnchor="middle" 
            fontSize={10} 
            fontWeight="900" 
            className="uppercase tracking-tighter"
        >
          {item.name}
        </text>
        <text 
            x={x + width / 2} 
            y={topOfBar - 26} 
            fill="currentColor" 
            textAnchor="middle" 
            fontSize={11} 
            fontWeight="bold"
            className={`${item.actual >= 0 ? 'text-emerald-500' : 'text-rose-500'} font-mono`}
        >
          {formatBaseCurrency(Math.abs(item.actual))}
        </text>
      </g>
    );
  };

  if (rawData.length === 0) return <div className="py-40 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] opacity-40 uppercase font-black text-xs">Window Out of Bounds</div>;

  return (
    <div className="space-y-10">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatHighlight label="Valuation" value={stats?.currentValue || 0} variant="info" />
            <StatHighlight 
                label="Window P/L" 
                value={`${stats?.totalReturn.toFixed(2)}%`} 
                trend={stats?.totalReturn} 
                isCurrency={false} 
                variant={(stats?.totalReturn || 0) >= 0 ? 'success' : 'danger'}
            />
            <StatHighlight label="Max Drawdown" value={`${stats?.maxDrawdown.toFixed(2)}%`} isCurrency={false} variant="danger" />
            <StatHighlight label="Avg Velocity" value={stats?.velocity || 0} subValue="/ day" variant="info" />
        </section>

        <AnalyticsCard 
            title="Performance Waterfall" icon={Zap} className="h-[550px]"
            subtext={`${selectedAccount} Allocation Bridge`}
            controls={
                <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="bg-slate-100 dark:bg-slate-900 text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none border border-slate-200 dark:border-slate-700">
                    <option value="TOTAL">Full Portfolio</option>
                    {accountKeys.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
            }
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 50, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid vertical={false} opacity={0.05} />
                    <XAxis dataKey="name" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                            <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-700">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{d.display}</p>
                                <p className={`text-sm font-black font-mono ${d.actual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatBaseCurrency(Math.abs(d.actual))}</p>
                            </div>
                        );
                    }} />
                    <Bar dataKey="range" radius={[4, 4, 4, 4]}>
                        <LabelList dataKey="range" content={renderWaterfallLabel} />
                        {waterfallData.map((e, i) => <Cell key={i} fill={e.type === 'anchor' ? '#3b82f6' : e.type === 'inflow' || (e.type === 'yield' && e.actual >= 0) ? '#10b981' : '#ef4444'} fillOpacity={0.9} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </AnalyticsCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnalyticsCard title="Relative Benchmarking" icon={Target} className="h-[450px]"
                controls={
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                        {BENCHMARKS.map(b => <button key={b.id} onClick={() => setSelectedBenchmark(b.id)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedBenchmark === b.id ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-400'}`}>{b.name}</button>)}
                    </div>
                }
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData}>
                        <CartesianGrid vertical={false} opacity={0.05} />
                        <XAxis dataKey="date" hide />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem' }} 
                            formatter={(value: number, name: string) => [`${Math.round(value)}%`, name]}
                        />
                        <Line type="monotone" dataKey="portfolio" name="Our Strategy" stroke="#3b82f6" strokeWidth={4} dot={false} />
                        <Line type="monotone" dataKey="benchmark" name="Index" stroke={BENCHMARKS.find(b=>b.id===selectedBenchmark)?.color} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </AnalyticsCard>

            <AnalyticsCard title="Equity Trail" icon={BarChart3} className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={accountAwareData}>
                        <CartesianGrid vertical={false} opacity={0.05} />
                        <XAxis dataKey="date" hide />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem' }} />
                        {selectedAccount === 'TOTAL' ? accountKeys.map((k, i) => <Area key={k} type="monotone" dataKey={`accounts.${k}`} name={k} stackId="1" fill={COLORS[i % COLORS.length]} fillOpacity={0.1} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />) : <Area type="monotone" dataKey="totalValue" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={3} />}
                    </AreaChart>
                </ResponsiveContainer>
            </AnalyticsCard>
        </div>
    </div>
  );
};
