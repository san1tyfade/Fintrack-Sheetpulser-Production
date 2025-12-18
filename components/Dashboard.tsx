
import React, { useMemo, useState, memo } from 'react';
import { Asset, NetWorthEntry, ExchangeRates, IncomeEntry, ExpenseEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, ReferenceLine } from 'recharts';
import { ArrowUpRight, DollarSign, Wallet, X, Loader2, TrendingUp, TrendingDown, Scale, PieChart as PieIcon } from 'lucide-react';
import { convertToBase, formatBaseCurrency, formatNativeCurrency, PRIMARY_CURRENCY } from '../services/currencyService';
import { isSafeKey } from '../services/geminiService';
import { isInvestmentAsset, isCashAsset } from '../services/classificationService';

interface DashboardProps {
  assets: Asset[];
  netWorthHistory?: NetWorthEntry[];
  incomeData?: IncomeEntry[];
  expenseData?: ExpenseEntry[];
  isLoading?: boolean;
  exchangeRates?: ExchangeRates;
  isDarkMode?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// --- Sub-Components ---

const StatsCard = memo(({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    isLoading, 
    change 
}: { 
    title: string, 
    value: number, 
    icon: any, 
    color: 'blue' | 'emerald' | 'purple', 
    isLoading: boolean,
    change?: number | null 
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
                        {change !== undefined && change !== null && !isLoading && (
                            <div className={`flex items-center gap-1.5 mt-1 text-xs font-bold ${
                                isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-slate-400'
                            }`}>
                                {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : null}
                                <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
                                <span className="text-slate-400 font-medium ml-1">vs. last log</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

const NetWorthChart = memo(({ data, isDarkMode }: { data: NetWorthEntry[], isDarkMode: boolean }) => {
    const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
    const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDarkMode ? '#334155' : '#cbd5e1';
    const tooltipText = isDarkMode ? '#f1f5f9' : '#0f172a';

    const formatAxisDate = (str: string) => {
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    
    const formatTooltipDate = (label: string) => {
         const d = new Date(label);
         return isNaN(d.getTime()) ? label : d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatYAxis = (val: number) => {
        if (val >= 1000000) return `$${(val/1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val/1000).toFixed(0)}k`;
        return `$${val}`;
    };

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-[420px] shadow-sm transition-colors">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-500 dark:text-emerald-400" />
                Net Worth History
            </h3>
            <div className="flex-1 w-full min-h-0">
                {data.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
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
                                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                itemStyle={{ color: '#10b981' }}
                                formatter={(value: number) => [formatBaseCurrency(value), "Net Worth"]}
                                labelFormatter={formatTooltipDate}
                                cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#10b981" 
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
                        <p className="font-medium">Insufficient historical data.</p>
                        <p className="text-xs mt-1 text-slate-600">Sync 'Net Worth Log' tab to view trends.</p>
                    </div>
                )}
            </div>
        </div>
    );
});

const IncomeChart = memo(({ data, isDarkMode }: { data: any[], isDarkMode: boolean }) => {
    const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
    const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDarkMode ? '#334155' : '#cbd5e1';

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 h-[380px] flex flex-col shadow-sm transition-colors">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Scale size={20} className="text-blue-500 dark:text-blue-400" />
                Net Income Trend
            </h3>
            <div className="flex-1 w-full min-h-0">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis dataKey="monthStr" stroke={axisColor} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                            <YAxis stroke={axisColor} tick={{fontSize: 11}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '0.5rem', color: isDarkMode ? '#fff' : '#0f172a'}}
                                formatter={(val: number) => [formatBaseCurrency(val), 'Net Income']}
                                cursor={{fill: gridColor, opacity: 0.3}} 
                            />
                            <ReferenceLine y={0} stroke="#64748b" />
                            <Bar dataKey="net" maxBarSize={40} radius={[4, 4, 0, 0]} animationDuration={1000}>
                                {data.map((e, i) => (
                                    <Cell key={i} fill={e.net >= 0 ? '#10b981' : '#ef4444'} />
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
                                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '0.5rem' }}
                                itemStyle={{ color: tooltipText }}
                                formatter={(value: number) => {
                                    const total = data.reduce((acc, c) => acc + c.value, 0);
                                    return [`${formatBaseCurrency(value)} (${((value/total)*100).toFixed(1)}%)`];
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                        <PieIcon className="opacity-20 mb-3" size={48} />
                        <p className="font-medium">No asset data found.</p>
                    </div>
                )}
                
                {/* Center Text Overlay */}
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

// --- Main Component ---

export const Dashboard: React.FC<DashboardProps> = ({ 
    assets, 
    netWorthHistory = [], 
    incomeData = [], 
    expenseData = [], 
    isLoading = false, 
    exchangeRates,
    isDarkMode = true
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // --- Aggregations ---
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

  // --- Percentage Change Calculation ---
  const netWorthChange = useMemo(() => {
    if (netWorthHistory.length < 1) return null;
    const sorted = [...netWorthHistory].sort((a, b) => b.date.localeCompare(a.date));
    const latestLoggedValue = sorted[0].value;
    if (latestLoggedValue === 0) return null;
    
    // Compare current calculated net worth with latest historical entry
    return ((netWorth - latestLoggedValue) / latestLoggedValue) * 100;
  }, [netWorth, netWorthHistory]);

  // --- Net Income Data ---
  const netIncomeData = useMemo(() => {
      const map = new Map<string, { date: string, monthStr: string, income: number, expense: number }>();

      const merge = (date: string, monthStr: string, inc: number, exp: number) => {
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
  }, [incomeData, expenseData]);


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
        <p className="text-slate-500 dark:text-slate-400">Welcome back. Financial overview in {PRIMARY_CURRENCY}.</p>
      </header>

      <div className={`transition-all duration-500 space-y-6 ${isLoading ? 'opacity-60 grayscale-[0.3] pointer-events-none' : 'opacity-100'}`}>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard title="Total Net Worth" value={netWorth} icon={DollarSign} color="blue" isLoading={isLoading} change={netWorthChange} />
            <StatsCard title="Investments Holdings" value={totalInvestments} icon={ArrowUpRight} color="emerald" isLoading={isLoading} />
            <StatsCard title="Liquid Cash" value={totalCash} icon={Wallet} color="purple" isLoading={isLoading} />
        </div>

        {/* Top Row: Net Worth (Wide) */}
        <NetWorthChart data={chartData} isDarkMode={isDarkMode} />

        {/* Middle Row: Net Income & Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <IncomeChart data={netIncomeData} isDarkMode={isDarkMode} />
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

        {/* Bottom Row: Drilldown Details */}
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
