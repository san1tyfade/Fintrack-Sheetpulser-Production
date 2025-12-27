
import React, { useMemo, useState, memo } from 'react';
import { Asset, NetWorthEntry, ExchangeRates, IncomeEntry, ExpenseEntry, TimeFocus, Trade } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, ReferenceLine, Line } from 'recharts';
import { ArrowUpRight, DollarSign, Wallet, X, Loader2, TrendingUp, TrendingDown, Scale, PieChart as PieIcon, Lock, Calendar, PiggyBank, BarChart3, Info, ArrowRight, Minus } from 'lucide-react';
import { convertToBase, formatBaseCurrency, formatNativeCurrency, PRIMARY_CURRENCY } from '../services/currencyService';
import { isSafeKey } from '../services/geminiService';
import { isInvestmentAsset, isCashAsset } from '../services/classificationService';
import { TimeFocusSelector } from './TimeFocusSelector';
import { calculateAttribution, isDateWithinFocus } from '../services/portfolioService';

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
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const parseISOToLocal = (isoStr: string): Date => {
    if (!isoStr) return new Date();
    const parts = isoStr.split('-');
    if (parts.length !== 3) return new Date(isoStr);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
};

const StatsCard = memo(({ 
    title, value, icon: Icon, color, isLoading, change,
    isHistorical
}: { 
    title: string, 
    value: number, 
    icon: any, 
    color: 'blue' | 'emerald' | 'purple', 
    isLoading: boolean,
    change?: number | null,
    isHistorical: boolean
}) => {
    const styles = {
        blue: { bg: 'bg-blue-500/20', text: 'text-blue-500 dark:text-blue-400', glow: 'bg-blue-500/10', border: 'hover:border-blue-500/30' },
        emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-500 dark:text-emerald-400', glow: 'bg-emerald-500/10', border: 'hover:border-emerald-500/30' },
        purple: { bg: 'bg-purple-500/20', text: 'text-purple-500 dark:text-purple-400', glow: 'bg-purple-500/10', border: 'hover:border-purple-500/30' },
    };
    const s = styles[color];

    const isPositive = change && change > 0;
    const isNegative = change && change < 0;

    return (
        <div className={`bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm relative overflow-hidden group ${s.border} transition-colors shadow-sm`}>
            {isHistorical && <div className="absolute -top-1 -right-1 opacity-20"><Lock size={48} className="text-slate-400" /></div>}
            <div className={`absolute top-0 right-0 w-32 h-32 ${s.glow} rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <div className="flex flex-col space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2.5 ${s.bg} rounded-xl ${s.text} shadow-inner`}>
                            <Icon size={20} />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
                    </div>
                </div>
                
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white min-h-[2rem] flex items-center">
                            {isLoading ? <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : formatBaseCurrency(value)}
                        </h3>
                        {isHistorical ? (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Snapshot State</p>
                        ) : (
                            change !== undefined && change !== null && !isLoading && (
                                <div className={`flex items-center gap-1.5 mt-1 text-xs font-bold ${
                                    isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-slate-400'
                                }`}>
                                    {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : null}
                                    <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
                                    <span className="text-slate-400 font-medium ml-1">vs. last log</span>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

const WealthDriversCard = memo(({ 
    attribution, 
    isLoading,
    timeFocus
}: { 
    attribution: any, 
    isLoading: boolean,
    timeFocus: TimeFocus
}) => {
    const isGain = attribution.marketGain >= 0;
    const isContributionPositive = attribution.netContributions >= 0;
    
    // Clean up the text by replacing underscores with spaces
    const cleanFocus = timeFocus.replace(/_/g, ' ');

    // Calculate visualization segments
    // We normalize everything against the highest absolute value to ensure consistent layout
    const maxReference = Math.max(attribution.startValue + Math.abs(attribution.netContributions) + Math.abs(attribution.marketGain), attribution.endValue, 1);
    
    const startW = (attribution.startValue / maxReference) * 100;
    const savingsW = (Math.abs(attribution.netContributions) / maxReference) * 100;
    const gainW = (Math.abs(attribution.marketGain) / maxReference) * 100;

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-sm flex flex-col h-full group hover:border-blue-400/20 transition-all">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-500" />
                        Wealth Drivers
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        Source of Growth
                    </p>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                        {cleanFocus}
                    </span>
                </div>
            </div>

            <div className="space-y-8 flex-1">
                {/* Visual Waterfall-style Bar */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Asset Distribution</span>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isGain ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                            {isGain ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                            {isGain ? '+' : ''}{attribution.percentageReturn.toFixed(1)}% Return
                        </div>
                    </div>
                    <div className="h-6 w-full bg-slate-100 dark:bg-slate-900/50 rounded-xl overflow-hidden flex shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                        <div 
                            className="h-full bg-blue-500/90 transition-all duration-1000 relative group/seg border-r border-white/10" 
                            style={{ width: `${Math.max(2, startW)}%` }}
                        >
                             <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/seg:opacity-100 transition-opacity" />
                        </div>
                        <div 
                            className={`h-full transition-all duration-1000 relative group/seg border-r border-white/10 ${isContributionPositive ? 'bg-indigo-500/90' : 'bg-rose-500/90'}`}
                            style={{ width: `${Math.max(2, savingsW)}%` }}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/seg:opacity-100 transition-opacity" />
                        </div>
                        <div 
                            className={`h-full transition-all duration-1000 relative group/seg ${isGain ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}
                            style={{ width: `${Math.max(2, gainW)}%` }}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/seg:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <div className="flex gap-4 justify-start px-1">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Base</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-indigo-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Savings</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-emerald-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Growth</span></div>
                    </div>
                </div>

                {/* Primary Metrics */}
                <div className="grid grid-cols-1 gap-5">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 group/row hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl group-hover/row:scale-110 transition-transform">
                                <PiggyBank size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">New Savings</p>
                                <p className="text-xs font-bold text-slate-500">From Cash Flow</p>
                            </div>
                        </div>
                        <p className={`text-lg font-black font-mono ${isContributionPositive ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
                            {isLoading ? '---' : formatBaseCurrency(attribution.netContributions)}
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 group/row hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl group-hover/row:scale-110 transition-transform ${isGain ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                                <TrendingUp size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Market Gain</p>
                                <p className="text-xs font-bold text-slate-500">Capital Impact</p>
                            </div>
                        </div>
                        <p className={`text-lg font-black font-mono ${isGain ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isLoading ? '---' : (isGain ? '+' : '') + formatBaseCurrency(attribution.marketGain)}
                        </p>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 group/info relative">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Initial Capital</span>
                            <Info size={10} className="text-slate-300 cursor-help" />
                            <div className="absolute bottom-full mb-3 left-0 w-56 p-3 bg-slate-900 text-white text-[10px] leading-relaxed rounded-xl opacity-0 group-hover/info:opacity-100 pointer-events-none transition-all shadow-2xl z-50 translate-y-2 group-hover/info:translate-y-0">
                                Your total wealth at the anchor date ({cleanFocus}). All subsequent changes are measured against this baseline.
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                            {isLoading ? '---' : formatBaseCurrency(attribution.startValue)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Ending Balance</span>
                         <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                            {isLoading ? '---' : formatBaseCurrency(attribution.endValue)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

const NetWorthChart = memo(({ 
    data, 
    isDarkMode, 
    selectedYear, 
    isHistorical, 
    timeFocus, 
    onFocusChange,
    incomeData = [],
    expenseData = [],
    startValue = 0
}: { 
    data: NetWorthEntry[], 
    isDarkMode: boolean, 
    selectedYear: number, 
    isHistorical: boolean, 
    timeFocus: TimeFocus, 
    onFocusChange?: (focus: TimeFocus) => void,
    incomeData: IncomeEntry[],
    expenseData: ExpenseEntry[],
    startValue: number
}) => {
    const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
    const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDarkMode ? '#334155' : '#cbd5e1';

    // Hide principal line for MTD and QTD as it is conceptually misleading in those short windows
    const showPrincipal = timeFocus !== TimeFocus.MTD && timeFocus !== TimeFocus.QTD;

    const filteredData = useMemo(() => {
        const yearFiltered = data.filter(d => d.date.startsWith(String(selectedYear)));
        // Logic: Time focusing (MTD/YTD) only makes sense relative to "today". 
        // If we are looking at a historical archive, show the whole year regardless.
        const windowData = (isHistorical || timeFocus === TimeFocus.FULL_YEAR) 
            ? yearFiltered 
            : yearFiltered.filter(d => isDateWithinFocus(d.date, timeFocus));
        
        // Calculate cumulative savings for each point to show "Principal" vs "Gain"
        const sortedIncome = [...incomeData].sort((a,b) => a.date.localeCompare(b.date));
        const sortedExpense = [...expenseData].sort((a,b) => a.date.localeCompare(b.date));
        
        return windowData.map(entry => {
            const date = entry.date;
            // Savings = Income up to this date - Expenses up to this date
            const incomeToDate = sortedIncome.filter(i => i.date <= date && i.date.startsWith(String(selectedYear))).reduce((sum, i) => sum + i.amount, 0);
            const expenseToDate = sortedExpense.filter(e => e.date <= date && e.date.startsWith(String(selectedYear))).reduce((sum, e) => sum + e.total, 0);
            
            const principal = startValue + (incomeToDate - expenseToDate);
            return {
                ...entry,
                principal: Math.max(0, principal),
                gain: Math.max(0, entry.value - principal)
            };
        });
    }, [data, selectedYear, isHistorical, timeFocus, incomeData, expenseData, startValue]);

    const formatAxisDate = (str: string) => {
        const d = parseISOToLocal(str);
        return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    
    const formatTooltipDate = (label: string) => {
         const d = parseISOToLocal(label);
         return isNaN(d.getTime()) ? label : d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatYAxis = (val: number) => {
        if (val >= 1000000) return `$${(val/1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val/1000).toFixed(0)}k`;
        return `$${val}`;
    };

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-[480px] shadow-sm transition-colors relative overflow-hidden group">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-500 dark:text-emerald-400" />
                        Net Worth History
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {showPrincipal ? "Principal vs. Market Growth" : "Market Valuation Trend"}
                    </p>
                </div>
                {!isHistorical && onFocusChange && (
                    <TimeFocusSelector current={timeFocus} onChange={onFocusChange} />
                )}
                {isHistorical && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Calendar size={12} /> {selectedYear} ARCHIVE
                    </div>
                )}
            </div>
            <div className="flex-1 w-full min-h-0 relative z-10">
                {filteredData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                                </linearGradient>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={formatAxisDate}
                                stroke={axisColor}
                                tick={{fontSize: 11, fill: axisColor}}
                                tickMargin={10}
                                minTickGap={40}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                stroke={axisColor}
                                tick={{fontSize: 11, fill: axisColor}}
                                tickFormatter={formatYAxis}
                                domain={['auto', 'auto']}
                                axisLine={false}
                                tickLine={false}
                                width={50}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '0.8rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid ' + tooltipBorder }}
                                itemStyle={{ fontWeight: 600 }}
                                labelStyle={{ color: axisColor, marginBottom: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}
                                formatter={(value: number, name: string) => {
                                    if (name === 'value') return [formatBaseCurrency(value), "Total NW"];
                                    if (name === 'principal') return [formatBaseCurrency(value), "Principal"];
                                    return [formatBaseCurrency(value), name];
                                }}
                                labelFormatter={formatTooltipDate}
                                cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            {showPrincipal && (
                                <Area 
                                    type="monotone" 
                                    dataKey="principal" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    fillOpacity={1} 
                                    fill="url(#colorPrincipal)" 
                                    animationDuration={1000}
                                    activeDot={false}
                                />
                            )}
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={isHistorical ? "#94a3b8" : "#10b981"} 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorValue)" 
                                animationDuration={1500}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                        <TrendingUp className="opacity-20 mb-3" size={48} />
                        <p className="font-medium text-center px-4">Insufficient data for {timeFocus} window.</p>
                        <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Log more Net Worth snapshots to see trends.</p>
                    </div>
                )}
            </div>
        </div>
    );
});

const IncomeChart = memo(({ data, isDarkMode, isHistorical }: { data: any[], isDarkMode: boolean, isHistorical: boolean }) => {
    const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
    const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDarkMode ? '#334155' : '#cbd5e1';
    const tooltipText = isDarkMode ? '#f1f5f9' : '#0f172a';

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 h-[380px] flex flex-col shadow-sm transition-colors relative overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Scale size={20} className="text-blue-500 dark:text-blue-400" />
                Net Income Trend {isHistorical && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">ARCHIVE</span>}
            </h3>
            <div className="flex-1 w-full min-h-0">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis dataKey="monthStr" stroke={axisColor} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                            <YAxis stroke={axisColor} tick={{fontSize: 11}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '0.5rem'}}
                                itemStyle={{ color: tooltipText, fontWeight: 600 }}
                                labelStyle={{ color: axisColor, marginBottom: '4px', fontSize: '12px' }}
                                formatter={(val: number) => [formatBaseCurrency(val), 'Net Income']}
                                cursor={{fill: gridColor, opacity: 0.3}} 
                            />
                            <ReferenceLine y={0} stroke="#64748b" />
                            <Bar dataKey="net" maxBarSize={40} radius={[4, 4, 0, 0]} animationDuration={1000}>
                                {data.map((e, i) => (
                                    <Cell key={i} fill={e.net >= 0 ? (isHistorical ? '#64748b' : '#10b981') : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                        <Scale className="opacity-20 mb-3" size={48} />
                        <p className="font-medium">No income data available.</p>
                    </div>
                )}
            </div>
        </div>
    );
});

const AllocationChart = memo(({ data, selectedCategory, onSelect, isDarkMode }: { data: any[], selectedCategory: string | null, onSelect: (name: string | null) => void, isDarkMode: boolean }) => {
    const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDarkMode ? '#334155' : '#cbd5e1';
    const tooltipText = isDarkMode ? '#f1f5f9' : '#0f172a';
    const labelColor = isDarkMode ? '#94a3b8' : '#64748b';

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-[380px] shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieIcon size={20} className="text-purple-500 dark:text-purple-400" /> Asset Allocation
                </h3>
                {selectedCategory && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSelect(null); }}
                        className="text-[10px] flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                    >
                        {selectedCategory} <X size={10} />
                    </button>
                )}
            </div>
            
            <div className="flex-1 w-full min-h-0 relative">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                                onClick={(entry) => onSelect(entry.name === selectedCategory ? null : entry.name)}
                                className="cursor-pointer focus:outline-none"
                            >
                                {data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]} 
                                        stroke={entry.name === selectedCategory ? (isDarkMode ? '#fff' : '#000') : 'none'}
                                        strokeWidth={2}
                                        opacity={selectedCategory && selectedCategory !== entry.name ? 0.3 : 1}
                                    />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '0.5rem' }}
                                itemStyle={{ color: tooltipText, fontWeight: 600 }}
                                labelStyle={{ color: labelColor }}
                                formatter={(value: number) => {
                                    const total = data.reduce((acc, c) => acc + c.value, 0);
                                    return [`${formatBaseCurrency(value)} (${((value/total)*100).toFixed(1)}%)`];
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/10">
                        <PieIcon className="opacity-20 mb-3" size={48} />
                        <p className="font-medium">No asset data found.</p>
                    </div>
                )}
                
                {data.length > 0 && !selectedCategory && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">Total</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {formatBaseCurrency(data.reduce((acc, c) => acc + c.value, 0))}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

const DrilldownView = memo(({ category, assets, exchangeRates }: { category: string, assets: Asset[], exchangeRates?: ExchangeRates }) => (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in mt-6 shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700/50 pb-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                {category} Breakdown
            </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map(asset => {
                const baseValue = convertToBase(asset.value, asset.currency, exchangeRates);
                const isForeign = asset.currency && asset.currency.toUpperCase() !== PRIMARY_CURRENCY;
                return (
                    <div key={asset.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:shadow-md group">
                        <div className="flex justify-between items-start">
                            <div className="min-w-0 pr-3">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={asset.name}>{asset.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-medium border border-slate-100 dark:border-slate-700">
                                        {asset.currency || PRIMARY_CURRENCY}
                                    </span>
                                    {isForeign && (
                                         <span className="text-[10px] text-slate-500 dark:text-slate-600">
                                            {formatNativeCurrency(asset.value, asset.currency)}
                                         </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    {formatBaseCurrency(baseValue)}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
));

export const Dashboard: React.FC<DashboardProps> = ({ 
    assets, 
    trades = [],
    netWorthHistory = [], 
    incomeData = [], 
    expenseData = [], 
    isLoading = false, 
    exchangeRates,
    isDarkMode = true,
    selectedYear = new Date().getFullYear(),
    timeFocus = TimeFocus.FULL_YEAR,
    onTimeFocusChange
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isHistorical = selectedYear !== new Date().getFullYear();

  const { netWorth, totalInvestments, totalCash, allocationData } = useMemo(() => {
    let nw = 0, inv = 0, cash = 0;
    const groups: Record<string, number> = {};

    assets.forEach(asset => {
      const baseVal = convertToBase(asset.value, asset.currency, exchangeRates);
      nw += baseVal;
      if (isInvestmentAsset(asset)) inv += baseVal;
      if (isCashAsset(asset)) cash += baseVal;
      
      const type = asset.type || 'Other';
      if (isSafeKey(type)) {
        groups[type] = (groups[type] || 0) + baseVal;
      }
    });

    const alloc = Object.entries(groups)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
      netWorth: nw,
      totalInvestments: inv,
      totalCash: cash,
      allocationData: alloc
    };
  }, [assets, exchangeRates]);

  const attributionData = useMemo(() => {
    return calculateAttribution(netWorth, netWorthHistory, incomeData, expenseData, timeFocus);
  }, [netWorth, netWorthHistory, incomeData, expenseData, timeFocus]);

  const netWorthChange = useMemo(() => {
    if (netWorthHistory.length < 1) return null;
    const sorted = [...netWorthHistory]
        .filter(d => d.date.startsWith(String(selectedYear)))
        .sort((a, b) => b.date.localeCompare(a.date));
    
    if (sorted.length === 0) return null;
    const latestLoggedValue = sorted[0].value;
    if (latestLoggedValue === 0) return null;
    
    return ((netWorth - latestLoggedValue) / latestLoggedValue) * 100;
  }, [netWorth, netWorthHistory, selectedYear]);

  const netIncomeData = useMemo(() => {
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
  }, [incomeData, expenseData, selectedYear]);

  const selectedAssets = useMemo(() => {
      return selectedCategory ? assets.filter(a => (a.type || 'Other') === selectedCategory) : [];
  }, [assets, selectedCategory]);

  const chartData = useMemo(() => {
      return [...netWorthHistory].sort((a, b) => a.date.localeCompare(b.date));
  }, [netWorthHistory]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-2">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Dashboard
            {isLoading && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={18} />
                    <span className="text-xs font-medium text-blue-500 dark:text-blue-400">Updating...</span>
                </div>
            )}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">Overview for {selectedYear} in {PRIMARY_CURRENCY}.</p>
      </header>

      <div className={`transition-all duration-500 space-y-6 ${isLoading ? 'opacity-60 grayscale-[0.3] pointer-events-none' : 'opacity-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard title="Year-End Net Worth" value={netWorth} icon={DollarSign} color="blue" isLoading={isLoading} change={netWorthChange} isHistorical={isHistorical} />
            <StatsCard title="Total Portfolio" value={totalInvestments} icon={ArrowUpRight} color="emerald" isLoading={isLoading} isHistorical={isHistorical} />
            <StatsCard title="Total Liquidity" value={totalCash} icon={Wallet} color="purple" isLoading={isLoading} isHistorical={isHistorical} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <NetWorthChart 
                    data={chartData} 
                    isDarkMode={isDarkMode} 
                    selectedYear={selectedYear} 
                    isHistorical={isHistorical}
                    timeFocus={timeFocus}
                    onFocusChange={onTimeFocusChange}
                    incomeData={incomeData}
                    expenseData={expenseData}
                    startValue={attributionData.startValue}
                />
            </div>
            <div className="lg:col-span-1">
                <WealthDriversCard 
                    attribution={attributionData}
                    isLoading={isLoading}
                    timeFocus={timeFocus}
                />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <IncomeChart data={netIncomeData} isDarkMode={isDarkMode} isHistorical={isHistorical} />
            </div>
            <div className="lg:col-span-1">
                <AllocationChart 
                    data={allocationData} 
                    selectedCategory={selectedCategory} 
                    onSelect={setSelectedCategory} 
                    isDarkMode={isDarkMode}
                />
            </div>
        </div>

        {selectedCategory && selectedAssets.length > 0 && (
            <DrilldownView 
                category={selectedCategory} 
                assets={selectedAssets} 
                exchangeRates={exchangeRates} 
            />
        )}
      </div>
    </div>
  );
};
