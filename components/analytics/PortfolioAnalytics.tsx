
import React, { useMemo, useState, useEffect } from 'react';
import { PortfolioLogEntry, TimeFocus, CustomDateRange, Trade, Investment } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, LabelList } from 'recharts';
import { Zap, Target, BarChart3 } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { processPortfolioHistory, calculatePortfolioAttribution } from '../../services/portfolioMath';
import { calculateMaxDrawdown, calculateGrowthVelocity } from '../../services/math/financialMath';
import { transformWaterfallData, transformBenchmarkComparison } from '../../services/analytics/transformers';
import { fetchHistoricalPrices } from '../../services/priceService';
import { normalizeTicker } from '../../services/geminiService';
import { AnalyticsCard, StatHighlight, StandardTooltip } from './AnalyticsPrimitives';

interface PortfolioAnalyticsProps {
  history: PortfolioLogEntry[];
  trades: Trade[];
  investments: Investment[];
  timeFocus: TimeFocus;
  customRange: CustomDateRange;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
const BENCHMARKS = [{ id: 'SPY', name: 'S&P 500', color: '#10b981' }, { id: 'XIU.TO', name: 'TSX 60', color: '#ef4444' }, { id: 'QQQ', name: 'Nasdaq 100', color: '#8b5cf6' }];

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({ history, trades, investments, timeFocus, customRange }) => {
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
    return { 
        currentValue: cur.totalValue, 
        totalReturn: cur.percentChange, 
        maxDrawdown: calculateMaxDrawdown(accountAwareData), 
        velocity: calculateGrowthVelocity(accountAwareData) 
    };
  }, [accountAwareData]);

  // Account-Specific Trade Filtering
  // This prevents global trades from affecting individual account waterfall bridges.
  const accountTrades = useMemo(() => {
    if (selectedAccount === 'TOTAL') return trades;
    
    // 1. Identify all tickers held in this specific account
    const tickersInAccount = new Set(
        investments
            .filter(i => (i.accountName || '').toUpperCase() === selectedAccount.toUpperCase())
            .map(i => normalizeTicker(i.ticker))
    );
    
    // 2. Filter trades to only include those relevant tickers
    return trades.filter(t => tickersInAccount.has(normalizeTicker(t.ticker)));
  }, [trades, selectedAccount, investments]);

  const attribution = useMemo(() => 
    calculatePortfolioAttribution(accountAwareData, accountTrades, timeFocus, customRange), 
    [accountAwareData, accountTrades, timeFocus, customRange]
  );

  const waterfallData = useMemo(() => transformWaterfallData(attribution), [attribution]);

  useEffect(() => {
    if (accountAwareData.length === 0) return;
    setIsFetchingBenchmark(true);
    fetchHistoricalPrices(selectedBenchmark, accountAwareData[0].date).then(p => { 
        setBenchmarkHistory(p); 
        setIsFetchingBenchmark(false); 
    });
  }, [selectedBenchmark, accountAwareData]);

  const comparisonData = useMemo(() => transformBenchmarkComparison(accountAwareData, benchmarkHistory), [accountAwareData, benchmarkHistory]);

  const renderWaterfallLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const item = waterfallData[index];
    if (!item) return null;
    return (
      <g>
        <text x={x + width / 2} y={y - 12} fill="#94a3b8" textAnchor="middle" fontSize={10} fontWeight="900" className="uppercase tracking-tighter">{item.name}</text>
        <text x={x + width / 2} y={y - 26} fill="currentColor" textAnchor="middle" fontSize={11} fontWeight="bold" className={`${item.actual >= 0 ? 'text-emerald-500' : 'text-rose-500'} font-mono`}>{formatBaseCurrency(Math.abs(Math.round(item.actual)))}</text>
      </g>
    );
  };

  if (rawData.length === 0) return <div className="py-40 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] opacity-40 uppercase font-black text-xs">Window Out of Bounds</div>;

  return (
    <div className="space-y-10">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatHighlight label="Valuation" value={stats?.currentValue || 0} variant="info" />
            <StatHighlight label="Window P/L" value={`${stats?.totalReturn.toFixed(2)}%`} trend={stats?.totalReturn} isCurrency={false} variant={(stats?.totalReturn || 0) >= 0 ? 'success' : 'danger'} />
            <StatHighlight label="Max Drawdown" value={`${stats?.maxDrawdown.toFixed(2)}%`} isCurrency={false} variant="danger" />
            <StatHighlight label="Avg Velocity" value={stats?.velocity || 0} subValue="/ day" variant="info" />
        </section>

        <AnalyticsCard title="Performance Waterfall" icon={Zap} className="h-[550px]" subtext={`${selectedAccount} Allocation Bridge`}
            controls={<select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="bg-slate-100 dark:bg-slate-900 text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none border border-slate-200 dark:border-slate-700">{accountKeys.map(k => <option key={k} value={k}>{k}</option>).concat(<option key="TOTAL" value="TOTAL">Full Portfolio</option>)}</select>}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 50, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid vertical={false} opacity={0.05} />
                    <XAxis dataKey="name" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                    <Bar dataKey="range" radius={[4, 4, 4, 4]}>
                        <LabelList dataKey="range" content={renderWaterfallLabel} />
                        {waterfallData.map((e, i) => <Cell key={i} fill={e.type === 'anchor' ? '#3b82f6' : e.type === 'inflow' || (e.type === 'yield' && e.actual >= 0) ? '#10b981' : '#ef4444'} fillOpacity={0.9} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </AnalyticsCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnalyticsCard title="Relative Benchmarking" icon={Target} className="h-[450px]"
                controls={<div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">{BENCHMARKS.map(b => <button key={b.id} onClick={() => setSelectedBenchmark(b.id)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedBenchmark === b.id ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-400'}`}>{b.name}</button>)}</div>}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData}>
                        <CartesianGrid vertical={false} opacity={0.05} />
                        <XAxis dataKey="date" hide />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <Tooltip content={<StandardTooltip />} formatter={(v: number) => [`${Math.round(v)}%`, 'Return']} />
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
                        <Tooltip content={<StandardTooltip />} />
                        {selectedAccount === 'TOTAL' ? accountKeys.map((k, i) => <Area key={k} type="monotone" dataKey={`accounts.${k}`} name={k} stackId="1" fill={COLORS[i % COLORS.length]} fillOpacity={0.1} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />) : <Area type="monotone" dataKey="totalValue" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={3} />}
                    </AreaChart>
                </ResponsiveContainer>
            </AnalyticsCard>
        </div>
    </div>
  );
};
