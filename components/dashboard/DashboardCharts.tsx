
import React, { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieIcon, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatBaseCurrency, formatNativeCurrency, PRIMARY_CURRENCY } from '../../services/currencyService';
import { convertToBase } from '../../services/currencyService';
import { useChartTheme } from '../../hooks/useChartTheme';
import { NetWorthEntry, TimeFocus, CustomDateRange, IncomeEntry, ExpenseEntry, Asset, ExchangeRates } from '../../types';
import { isDateWithinFocus } from '../../services/portfolioService';
import { TimeFocusSelector } from '../TimeFocusSelector';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const parseISOToLocal = (isoStr: string): Date => {
    if (!isoStr) return new Date();
    const parts = isoStr.split('-');
    if (parts.length !== 3) return new Date(isoStr);
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
};

export const NetWorthChart = memo(({ 
    data, isDarkMode, selectedYear, isHistorical, timeFocus, onFocusChange, customRange, onCustomRangeChange, incomeData = [], expenseData = [], startValue = 0, availableYears = [], onYearChange
}: any) => {
    const theme = useChartTheme(isDarkMode);
    const isFullHistory = timeFocus === TimeFocus.FULL_YEAR;
    const showPrincipal = !isFullHistory && timeFocus !== TimeFocus.MTD && timeFocus !== TimeFocus.QTD;

    const filteredData = useMemo(() => {
        const baseData = isFullHistory ? [...data].sort((a,b) => a.date.localeCompare(b.date)) : data.filter((d: any) => d.date.startsWith(String(selectedYear)));
        const windowData = (isHistorical || isFullHistory) ? baseData : baseData.filter((d: any) => isDateWithinFocus(d.date, timeFocus, customRange));
        
        const sortedIncome = [...incomeData].sort((a,b) => a.date.localeCompare(b.date));
        const sortedExpense = [...expenseData].sort((a,b) => a.date.localeCompare(b.date));
        
        return windowData.map((entry: any) => {
            const date = entry.date;
            const incomeToDate = sortedIncome.filter(i => i.date <= date && i.date.startsWith(String(selectedYear))).reduce((sum, i) => sum + i.amount, 0);
            const expenseToDate = sortedExpense.filter(e => e.date <= date && e.date.startsWith(String(selectedYear))).reduce((sum, e) => sum + e.total, 0);
            const principal = startValue + (incomeToDate - expenseToDate);
            return { ...entry, principal: Math.max(0, principal), gain: Math.max(0, entry.value - principal) };
        });
    }, [data, selectedYear, isHistorical, timeFocus, customRange, incomeData, expenseData, startValue, isFullHistory]);

    return (
        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 flex flex-col h-[520px] shadow-sm relative group overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <TrendingUp size={24} className="text-emerald-500" />
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Net Worth Trajectory</h3>
                        {!isFullHistory && availableYears.length > 0 && (
                            <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl p-0.5 border border-slate-100 dark:border-slate-700 ml-3">
                                <button onClick={() => onYearChange(availableYears[availableYears.indexOf(selectedYear) + 1])} disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg disabled:opacity-20 transition-all"><ChevronLeft size={16}/></button>
                                <span className="px-3 text-[11px] font-black text-slate-900 dark:text-white">{selectedYear}</span>
                                <button onClick={() => onYearChange(availableYears[availableYears.indexOf(selectedYear) - 1])} disabled={availableYears.indexOf(selectedYear) === 0} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg disabled:opacity-20 transition-all"><ChevronRight size={16}/></button>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isFullHistory ? "Lifetime Valuation Index" : "Snapshot Performance"}</p>
                </div>
                {!isHistorical && onFocusChange && <TimeFocusSelector current={timeFocus} onChange={onFocusChange} customRange={customRange} onCustomRangeChange={onCustomRangeChange} />}
            </div>
            <div className="flex-1 w-full min-h-0 relative z-10">
                {filteredData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={theme.primary} stopOpacity={0.3}/><stop offset="95%" stopColor={theme.primary} stopOpacity={0.05}/></linearGradient>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isHistorical ? theme.warning : theme.success} stopOpacity={0.3}/><stop offset="95%" stopColor={isHistorical ? theme.warning : theme.success} stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke={theme.gridColor} vertical={false} opacity={0.6} />
                            <XAxis dataKey="date" tickFormatter={(str) => { const d = parseISOToLocal(str); return isFullHistory ? d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }} stroke={theme.axisColor} tick={{fontSize: 10, fontWeight: 800, fill: theme.axisColor}} tickMargin={12} minTickGap={40} axisLine={false} tickLine={false} />
                            <YAxis stroke={theme.axisColor} tick={{fontSize: 10, fontWeight: 800, fill: theme.axisColor}} tickFormatter={(val) => val >= 1000000 ? `$${(val/1000000).toFixed(1)}M` : val >= 1000 ? `$${(val/1000).toFixed(0)}k` : `$${val}`} domain={['auto', 'auto']} axisLine={false} tickLine={false} width={45} />
                            <Tooltip contentStyle={{ backgroundColor: theme.tooltipBg, borderColor: theme.tooltipBorder, borderRadius: '1.25rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)' }} itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }} labelStyle={{ color: theme.muted, marginBottom: '8px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} formatter={(v: number, n: string) => [<span className="ghost-blur font-mono">{formatBaseCurrency(v)}</span>, n === 'value' ? "Total NW" : "Principal"]} labelFormatter={(l: string) => parseISOToLocal(l).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} cursor={{ stroke: theme.primary, strokeWidth: 1, strokeDasharray: '6 6' }} />
                            {showPrincipal && <Area type="monotone" dataKey="principal" stroke={theme.primary} strokeWidth={2} strokeDasharray="6 4" fillOpacity={1} fill="url(#colorPrincipal)" animationDuration={1000} activeDot={false} />}
                            <Area type="monotone" dataKey="value" stroke={isHistorical ? theme.warning : theme.success} strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl"><TrendingUp className="opacity-10 mb-4" size={64} /><p className="font-black uppercase tracking-[0.2em] text-[10px]">Contextual Data Insufficient</p></div>}
            </div>
        </div>
    );
});

export const IncomeChart = memo(({ data, isDarkMode }: any) => {
    const theme = useChartTheme(isDarkMode);
    return (
        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 flex flex-col h-[420px] shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/10"><BarChart3 size={24} /></div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Flow Volatility</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Monthly Inflow vs Outflow</p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }} barGap={6}>
                            <CartesianGrid strokeDasharray="4 4" stroke={theme.gridColor} vertical={false} opacity={0.6} />
                            <XAxis dataKey="monthStr" stroke={theme.axisColor} tick={{fontSize: 10, fill: theme.axisColor, fontWeight: 800}} axisLine={false} tickLine={false} tickMargin={10} />
                            <YAxis stroke={theme.axisColor} tick={{fontSize: 10, fill: theme.axisColor, fontWeight: 800}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} width={40} />
                            <Tooltip cursor={{ fill: theme.surface }} contentStyle={{ backgroundColor: theme.tooltipBg, border: 'none', borderRadius: '1.25rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} labelStyle={{ color: theme.muted, marginBottom: '8px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} formatter={(v: number) => [<span className="ghost-blur font-mono font-bold">{formatBaseCurrency(v)}</span>, ""]} />
                            <Bar dataKey="income" name="Income" fill={theme.success} radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="expense" name="Expense" fill={theme.danger} radius={[6, 6, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-40 uppercase text-[10px] font-black">Archive Context Required</div>}
            </div>
        </div>
    );
});

export const AllocationChart = memo(({ data, selectedCategory, onSelect, isDarkMode }: any) => {
    const theme = useChartTheme(isDarkMode);
    const total = useMemo(() => data.reduce((acc: number, curr: any) => acc + curr.value, 0), [data]);
    
    return (
        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 flex flex-col h-[420px] shadow-sm relative group">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/10"><PieIcon size={24} /></div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Asset Distribution</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Portfolio Weighting</p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} innerRadius={80} outerRadius={105} paddingAngle={4} dataKey="value" onMouseEnter={(_, index) => onSelect(data[index].name)} onClick={(e, index) => { e.stopPropagation?.(); onSelect(data[index].name === selectedCategory ? null : data[index].name); }} className="outline-none">
                                {data.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" style={{ filter: selectedCategory === data[index].name ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.4))' : 'none', opacity: !selectedCategory || selectedCategory === data[index].name ? 1 : 0.4, cursor: 'pointer' }} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: theme.tooltipBg, border: 'none', borderRadius: '1.25rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} formatter={(v: number, n: string) => [<span className="ghost-blur font-mono font-bold">{formatBaseCurrency(v)}</span>, n]} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-40 uppercase text-[10px] font-black italic">No Assets Logged</div>}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-14">
                <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Total</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white ghost-blur tracking-tighter">{formatBaseCurrency(total)}</p>
                </div>
            </div>
        </div>
    );
});

export const DrilldownView = memo(({ category, assets, exchangeRates }: any) => (
    <div className="bg-white dark:bg-slate-800/50 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in-up">
        <div className="flex items-center justify-between mb-10">
            <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight"><ArrowRight size={28} className="text-blue-500" />{category} Core</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Individual Constituent Metrics</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {assets.map((asset: any) => {
                const baseVal = convertToBase(asset.value, asset.currency, exchangeRates);
                return (
                    <div key={asset.id} className="p-7 bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-blue-500/20 transition-all group shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{asset.name}</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white ghost-blur leading-none font-mono tracking-tighter">{formatNativeCurrency(asset.value, asset.currency)}</p>
                        {asset.currency !== PRIMARY_CURRENCY && (
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">Spot</span>
                                <p className="text-[11px] text-emerald-600 font-black ghost-blur">≈ {formatBaseCurrency(baseVal)}</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
));
