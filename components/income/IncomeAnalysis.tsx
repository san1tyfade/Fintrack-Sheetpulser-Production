
import React, { useMemo, useState } from 'react';
import { IncomeEntry, ExpenseEntry, LedgerData } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Sankey, Layer, Rectangle } from 'recharts';
import { BadgeDollarSign, TrendingUp, TrendingDown, CreditCard, Activity, GitMerge, BarChart2, X, Percent } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';

interface IncomeAnalysisProps {
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  detailedExpenses?: LedgerData;
  isLoading?: boolean;
  isDarkMode?: boolean;
  selectedYear?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const CustomTooltip = ({ active, payload, label, isDarkMode }: { active?: boolean, payload?: any[], label?: string, isDarkMode?: boolean }) => {
    if (!active || !payload || !payload.length) return null;

    const total = payload.reduce((acc: number, p: any) => acc + (Number(p.value) || 0), 0);
    const bg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textColor = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    const valColor = isDarkMode ? 'text-slate-200' : 'text-slate-900';
    const totalColor = isDarkMode ? 'text-white' : 'text-slate-900';

    return (
        <div className={`${bg} border p-3 rounded-lg shadow-xl z-50`}>
            <p className={`${textColor} font-medium mb-2 border-b border-slate-200 dark:border-slate-700 pb-1`}>{label || payload[0]?.payload?.name}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey || p.name} className="flex justify-between gap-4 text-xs mb-1">
                    <span style={{ color: p.color || (isDarkMode ? '#fff' : '#000') }}>{p.name || p.dataKey}</span>
                    <span className={`font-mono ${valColor}`}>{formatBaseCurrency(p.value)}</span>
                </div>
            ))}
            {payload.length > 1 && (
                 <div className="flex justify-between gap-4 text-sm mt-2 border-t border-slate-200 dark:border-slate-700 pt-1 font-bold">
                    <span className="text-slate-400">Total</span>
                    <span className={totalColor}>{formatBaseCurrency(total)}</span>
                </div>
            )}
        </div>
    );
};

const SankeyNode = ({ x, y, width, height, index, payload, isDarkMode, selectedCategory, onNodeClick }: any) => {
    if (!payload || !payload.name) return null;
    
    const isLeft = x < 100; // Total Spending is usually on the far left
    const isSelected = selectedCategory === payload.name;
    const isTotal = payload.name === 'Total Spending';
    
    return (
        <Layer key={`node-${index}`}>
            <Rectangle 
                x={x} y={y} width={width} height={height} 
                fill={payload.color || "#8884d8"} 
                fillOpacity={isSelected || isTotal ? 1 : 0.8} 
                radius={[4, 4, 4, 4]}
                stroke={isSelected ? (isDarkMode ? '#fff' : '#000') : 'none'}
                strokeWidth={2}
                className="cursor-pointer hover:fill-opacity-100 transition-all duration-200"
                onClick={() => onNodeClick && onNodeClick(payload)}
            />
             <text
                x={isLeft ? x + width + 8 : x - 8}
                y={y + height / 2}
                dy={4}
                textAnchor={isLeft ? 'start' : 'end'}
                fontSize={11}
                fill={isDarkMode ? "#e2e8f0" : "#334155"}
                fontWeight={isSelected || isTotal ? "bold" : "500"}
                style={{ textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.8)' : 'none', pointerEvents: 'none' }}
            >
                {payload.name}
            </text>
        </Layer>
    );
};

const StatCard = ({ title, value, isPercent, icon: Icon, color, isLoading }: { title: string, value: number, isPercent?: boolean, icon: any, color: 'blue' | 'emerald' | 'red' | 'purple' | 'orange', isLoading: boolean }) => {
    const styles = {
        emerald: { bg: "bg-emerald-500/20", text: "text-emerald-500 dark:text-emerald-400", glow: "bg-emerald-500" },
        blue: { bg: "bg-blue-500/20", text: "text-blue-500 dark:text-blue-400", glow: "bg-blue-500" },
        purple: { bg: "bg-purple-500/20", text: "text-purple-500 dark:text-purple-400", glow: "bg-purple-500" },
        red: { bg: "bg-red-500/20", text: "text-red-500 dark:text-red-400", glow: "bg-red-500" },
        orange: { bg: "bg-orange-500/20", text: "text-orange-500 dark:text-orange-400", glow: "bg-orange-500" },
    };
    const s = styles[color] || styles.blue;

    return (
        <div className={`bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none opacity-20 ${s.glow}`}></div>
            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-xl ${s.bg} ${s.text}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {isLoading ? (
                          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" />
                        ) : (
                          isPercent ? `${value.toFixed(1)}%` : formatBaseCurrency(value)
                        )}
                    </h3>
                </div>
            </div>
        </div>
    );
};

const ChartContainer: React.FC<{ title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode; subTitle?: string; controls?: React.ReactNode; }> = ({ title, icon: Icon, iconColor, children, subTitle, controls }) => (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl flex flex-col h-full overflow-hidden shadow-sm hover:shadow-md transition-shadow">
       <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
           <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-300 flex items-center gap-2 truncate">
                  <Icon size={20} className={iconColor} /> {title}
              </h3>
              {subTitle && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{subTitle}</span>}
           </div>
           {controls && <div className="shrink-0">{controls}</div>}
       </div>
       <div className="flex-1 min-h-[300px] w-full relative">{children}</div>
    </div>
);

const EmptyState = ({ msg = "No data available." }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-xl m-2 bg-slate-50 dark:bg-slate-800/20">
        <p className="text-sm">{msg}</p>
    </div>
);

export const IncomeAnalysis: React.FC<IncomeAnalysisProps> = ({ 
    incomeData, 
    expenseData, 
    detailedExpenses, 
    isLoading = false, 
    isDarkMode = true,
    selectedYear = new Date().getFullYear()
}) => {
  const [expenseFilter, setExpenseFilter] = useState<string>('All');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  const todayISO = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const monthsList = detailedExpenses?.months || [];

  const expenseCategoryKeys = useMemo(() => {
    const keys = new Set<string>();
    expenseData.forEach(e => Object.keys(e.categories).forEach(k => keys.add(k)));
    return Array.from(keys).sort();
  }, [expenseData]);

  const incomeStats = useMemo(() => {
    let total = 0, ytd = 0, count = 0;
    for (const entry of incomeData) {
        if (!entry.date.startsWith(String(selectedYear))) continue;
        const amt = entry.amount || 0;
        total += amt;
        if (amt > 0) count++;
        // If current year, only count up to today. If historical year, count full year.
        const isCurrentYear = selectedYear === new Date().getFullYear();
        if (!isCurrentYear || entry.date <= todayISO) {
            ytd += amt;
        }
    }
    return { 
        totalAnnual: total, 
        ytd: ytd, 
        average: count > 0 ? total / count : 0 
    };
  }, [incomeData, selectedYear, todayISO]);

  const expenseStats = useMemo(() => {
    let total = 0, ytd = 0, count = 0;
    
    const chartData = expenseData
        .filter(e => e.date.startsWith(String(selectedYear)))
        .map(e => {
            const flattened: any = { ...e, ...e.categories };
            let relevantTotal = 0;
            if (expenseFilter === 'All') relevantTotal = e.total; 
            else relevantTotal = e.categories[expenseFilter] || 0;
            
            total += relevantTotal;
            if (relevantTotal > 0) count++;
            
            const isCurrentYear = selectedYear === new Date().getFullYear();
            if (!isCurrentYear || e.date <= todayISO) ytd += relevantTotal;
            
            return flattened;
        });

    return {
        totalAnnual: total,
        ytd: ytd,
        average: count > 0 ? total / count : 0,
        chartData
    };
  }, [expenseData, selectedYear, todayISO, expenseFilter]);

  const savingsRate = useMemo(() => {
    if (incomeStats.ytd === 0) return 0;
    return ((incomeStats.ytd - expenseStats.ytd) / incomeStats.ytd) * 100;
  }, [incomeStats.ytd, expenseStats.ytd]);

  const uniqueDetailedCategories = useMemo(() => {
      if (!detailedExpenses) return [];
      const names = new Set(detailedExpenses.categories.map(c => c.name));
      return Array.from(names);
  }, [detailedExpenses]);

  const sankeyData = useMemo(() => {
      if (!detailedExpenses || !detailedExpenses.categories.length) {
          return { nodes: [], links: [] };
      }

      const nodes: { name: string, color?: string }[] = [{ name: 'Total Spending', color: isDarkMode ? '#1e293b' : '#334155' }]; 
      const links: { source: number, target: number, value: number }[] = [];
      let nextId = 1;
      const MAX_SUB_CATEGORIES = selectedCategoryName ? 25 : 8; 

      detailedExpenses.categories.forEach((cat, cIdx) => {
          if (selectedCategoryName && cat.name !== selectedCategoryName) return;

          const activeSubs = cat.subCategories
                .map(sub => ({ name: sub.name, value: sub.monthlyValues[selectedMonthIndex] || 0 }))
                .filter(item => item.value > 0)
                .sort((a, b) => b.value - a.value);

          if (activeSubs.length === 0) return;

          const catTotal = activeSubs.reduce((sum, item) => sum + item.value, 0);
          const catColor = COLORS[cIdx % COLORS.length];
          const catNodeIdx = nextId++;
          
          nodes.push({ name: cat.name, color: catColor });
          links.push({ source: 0, target: catNodeIdx, value: catTotal });

          const displayedSubs = activeSubs.slice(0, MAX_SUB_CATEGORIES);
          const otherSubs = activeSubs.slice(MAX_SUB_CATEGORIES);
          const otherTotal = otherSubs.reduce((sum, item) => sum + item.value, 0);

          displayedSubs.forEach(sub => {
              const subNodeIdx = nextId++;
              nodes.push({ name: sub.name, color: catColor }); 
              links.push({ source: catNodeIdx, target: subNodeIdx, value: sub.value });
          });

          if (otherTotal > 0) {
              const otherNodeIdx = nextId++;
              nodes.push({ name: `${cat.name} (Other)`, color: catColor });
              links.push({ source: catNodeIdx, target: otherNodeIdx, value: otherTotal });
          }
      });

      return { nodes, links };
  }, [detailedExpenses, selectedMonthIndex, isDarkMode, selectedCategoryName]);

  const detailedTrendData = useMemo(() => {
      if (!detailedExpenses) return [];
      return detailedExpenses.months.map((month, mIdx) => {
          const catTotals: Record<string, number> = {};
          detailedExpenses.categories.forEach(cat => {
               let catMonthTotal = 0;
               cat.subCategories.forEach(sub => {
                   catMonthTotal += (sub.monthlyValues[mIdx] || 0);
               });
               catTotals[cat.name] = (catTotals[cat.name] || 0) + catMonthTotal;
          });
          return { name: month, ...catTotals };
      });
  }, [detailedExpenses]);

  const chartTheme = useMemo(() => ({
      axis: isDarkMode ? '#94a3b8' : '#64748b',
      grid: isDarkMode ? '#334155' : '#e2e8f0'
  }), [isDarkMode]);

  const handleSankeyClick = (data: any) => {
    const nodeName = data?.name || data?.payload?.name;
    if (!nodeName) return;
    if (nodeName === 'Total Spending' || nodeName === selectedCategoryName) {
        setSelectedCategoryName(null);
    } else if (uniqueDetailedCategories.includes(nodeName)) {
        setSelectedCategoryName(nodeName);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
       {/* Stats Summary */}
      <section className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-500 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
         <StatCard title="Net Income YTD" value={incomeStats.ytd - expenseStats.ytd} icon={Activity} color="blue" isLoading={isLoading} />
         <StatCard title="Savings Rate YTD" value={savingsRate} isPercent icon={Percent} color="purple" isLoading={isLoading} />
         <StatCard title="Total Income YTD" value={incomeStats.ytd} icon={TrendingUp} color="emerald" isLoading={isLoading} />
         <StatCard title="Total Expense YTD" value={expenseStats.ytd} icon={TrendingDown} color="red" isLoading={isLoading} />
      </section>

      {/* Main Trends */}
      <section className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-500 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
        <ChartContainer title={`Monthly Income (${selectedYear})`} icon={BadgeDollarSign} iconColor="text-emerald-500 dark:text-emerald-400">
            {incomeData.filter(d => d.date.startsWith(String(selectedYear))).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeData.filter(d => d.date.startsWith(String(selectedYear)))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                        <XAxis dataKey="monthStr" stroke={chartTheme.axis} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                        <YAxis stroke={chartTheme.axis} tick={{fontSize: 11}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} cursor={{fill: chartTheme.grid, opacity: 0.2}} />
                        <ReferenceLine y={incomeStats.average} stroke="#8b5cf6" strokeDasharray="3 3" label={{ value: 'Avg', position: 'right', fill: '#8b5cf6', fontSize: 10 }} />
                        <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} animationDuration={1000} />
                    </BarChart>
                </ResponsiveContainer>
            ) : <EmptyState />}
        </ChartContainer>

        <ChartContainer 
            title={`Expense Overview (${selectedYear})`} 
            icon={CreditCard} 
            iconColor="text-orange-500 dark:text-orange-400" 
            subTitle={expenseFilter === 'All' ? "By Payment Type" : `${expenseFilter}`}
            controls={
                <select 
                    value={expenseFilter} 
                    onChange={(e) => setExpenseFilter(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 max-w-[120px]"
                >
                    <option value="All">All Expenses</option>
                    {expenseCategoryKeys.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            }
        >
            {expenseStats.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseStats.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                        <XAxis dataKey="monthStr" stroke={chartTheme.axis} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                        <YAxis stroke={chartTheme.axis} tick={{fontSize: 11}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} cursor={{fill: chartTheme.grid, opacity: 0.2}} />
                        <Legend wrapperStyle={{paddingTop: '10px'}} iconSize={8} fontSize={10} />
                        
                        {expenseFilter === 'All' ? (
                             expenseCategoryKeys.map((key, idx) => (
                                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[idx % COLORS.length]} maxBarSize={60} animationDuration={1000} />
                             ))
                        ) : (
                             <Bar dataKey={expenseFilter} stackId="a" fill="#3b82f6" maxBarSize={60} animationDuration={1000} />
                        )}
                    </BarChart>
                </ResponsiveContainer>
            ) : <EmptyState />}
        </ChartContainer>
      </section>

      {detailedExpenses && detailedExpenses.categories.length > 0 && (
          <section className="space-y-8 border-t border-slate-200 dark:border-slate-700/50 pt-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                  <GitMerge size={20} className="text-purple-500 dark:text-purple-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Category Breakdown</h3>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-[500px]">
                  <ChartContainer 
                        title="Spending Flow" 
                        icon={GitMerge} 
                        iconColor="text-purple-500 dark:text-purple-400"
                        subTitle={`Flow Analysis: ${monthsList[selectedMonthIndex] || 'Selected Month'}`}
                        controls={
                            <div className="flex items-center gap-3">
                                {selectedCategoryName && (
                                    <button 
                                        onClick={() => setSelectedCategoryName(null)}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-md font-bold uppercase transition-all hover:bg-purple-500/20"
                                    >
                                        Clear Filter <X size={10} />
                                    </button>
                                )}
                                <select 
                                    value={selectedMonthIndex} 
                                    onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    {monthsList.map((m, idx) => (
                                        <option key={idx} value={idx}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        }
                    >
                        {sankeyData.links.length > 0 ? (
                            <div className="h-full flex flex-col">
                                {selectedCategoryName && (
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">
                                        Filtering by: <span className="text-purple-500">{selectedCategoryName}</span>
                                    </p>
                                )}
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <Sankey
                                            data={sankeyData}
                                            margin={{ left: 10, right: 10, top: 20, bottom: 20 }}
                                            node={<SankeyNode isDarkMode={isDarkMode} selectedCategory={selectedCategoryName} onNodeClick={handleSankeyClick} />}
                                            link={{ stroke: isDarkMode ? '#475569' : '#cbd5e1', strokeOpacity: 0.3 }}
                                            nodePadding={20}
                                        >
                                            <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                                        </Sankey>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[9px] text-slate-400 text-center italic mt-2">
                                    Click a category node to filter. Click 'Total' or the active node to reset.
                                </p>
                            </div>
                        ) : <EmptyState msg={`No spending data for ${monthsList[selectedMonthIndex] || 'selected year'}.`} />}
                  </ChartContainer>

                  <ChartContainer title="Category Trends" icon={BarChart2} iconColor="text-pink-500 dark:text-pink-400" subTitle="Annual Distribution">
                        {detailedTrendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={detailedTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                                    <XAxis dataKey="name" stroke={chartTheme.axis} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                    <YAxis stroke={chartTheme.axis} tick={{fontSize: 10}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} cursor={{fill: chartTheme.grid, opacity: 0.2}} />
                                    <Legend iconSize={8} wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                                    {uniqueDetailedCategories.map((catName, idx) => (
                                        <Bar 
                                            key={catName} 
                                            dataKey={catName} 
                                            stackId="a" 
                                            fill={COLORS[idx % COLORS.length]} 
                                            maxBarSize={50}
                                            animationDuration={1000}
                                            opacity={selectedCategoryName && selectedCategoryName !== catName ? 0.3 : 1}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState />}
                  </ChartContainer>
              </div>
          </section>
      )}
    </div>
  );
};
