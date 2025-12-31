
import React, { useMemo, useState } from 'react';
import { IncomeEntry, ExpenseEntry, LedgerData } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Sankey, Layer, Rectangle } from 'recharts';
import { BadgeDollarSign, TrendingUp, TrendingDown, CreditCard, Activity, GitMerge, BarChart2, X, Percent } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { calculatePeriodTotals } from '../../services/math/financialMath';
import { transformSankeyData, transformDetailedTrendData } from '../../services/analytics/transformers';
import { AnalyticsCard, StatHighlight, StandardTooltip } from '../analytics/AnalyticsPrimitives';

interface IncomeAnalysisProps {
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  detailedExpenses?: LedgerData;
  isLoading?: boolean;
  isDarkMode?: boolean;
  selectedYear?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const SankeyNode = ({ x, y, width, height, index, payload, isDarkMode, selectedCategory, onNodeClick }: any) => {
    if (!payload || !payload.name) return null;
    const isLeft = x < 100;
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
                x={isLeft ? x + width + 8 : x - 8} y={y + height / 2} dy={4}
                textAnchor={isLeft ? 'start' : 'end'}
                fontSize={11} fill={isDarkMode ? "#e2e8f0" : "#334155"}
                fontWeight={isSelected || isTotal ? "bold" : "500"}
                style={{ pointerEvents: 'none' }}
            >
                {payload.name}
            </text>
        </Layer>
    );
};

export const IncomeAnalysis: React.FC<IncomeAnalysisProps> = ({ 
    incomeData, expenseData, detailedExpenses, isLoading = false, isDarkMode = true, selectedYear = new Date().getFullYear()
}) => {
  const [expenseFilter, setExpenseFilter] = useState<string>('All');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  const isCurrentYear = selectedYear === new Date().getFullYear();
  const periodLabel = isCurrentYear ? "YTD" : "Full Year";
  const monthsList = detailedExpenses?.months || [];

  const stats = useMemo(() => calculatePeriodTotals(incomeData, expenseData, selectedYear), [incomeData, expenseData, selectedYear]);

  const expenseCategoryKeys = useMemo(() => {
    const keys = new Set<string>();
    expenseData.forEach(e => {
        if (e.categories) {
            Object.keys(e.categories).forEach(k => keys.add(k));
        }
    });
    return Array.from(keys).sort();
  }, [expenseData]);

  const expenseChartData = useMemo(() => {
    return expenseData
        .filter(e => e.date.startsWith(String(selectedYear)))
        .map(e => ({ ...e, ...e.categories }));
  }, [expenseData, selectedYear]);

  const uniqueDetailedCategories = useMemo(() => {
      if (!detailedExpenses) return [];
      return Array.from(new Set(detailedExpenses.categories.map(c => c.name)));
  }, [detailedExpenses]);

  const sankeyData = useMemo(() => transformSankeyData(detailedExpenses, selectedMonthIndex, isDarkMode, selectedCategoryName), [detailedExpenses, selectedMonthIndex, isDarkMode, selectedCategoryName]);
  const detailedTrendData = useMemo(() => transformDetailedTrendData(detailedExpenses), [detailedExpenses]);

  // Dynamic Y-Axis formatter that handles both large and small values gracefully
  const formatYAxis = (v: number) => {
      if (v === 0) return '$0';
      if (Math.abs(v) >= 1000) return `$${(v/1000).toFixed(1)}k`;
      return `$${v}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-500 ${isLoading ? 'opacity-60' : ''}`}>
         <StatHighlight label={`Net Income ${periodLabel}`} value={stats.ytdInc - stats.ytdExp} variant="info" />
         <StatHighlight label={`Savings Rate ${periodLabel}`} value={`${stats.rate.toFixed(1)}%`} isCurrency={false} variant="success" />
         <StatHighlight label={`Total Income ${periodLabel}`} value={stats.ytdInc} variant="success" />
         <StatHighlight label={`Total Expense ${periodLabel}`} value={stats.ytdExp} variant="danger" />
      </section>

      <section className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-500 ${isLoading ? 'opacity-60' : ''}`}>
        <AnalyticsCard title={`Monthly Income (${selectedYear})`} icon={BadgeDollarSign} className="h-[400px]">
            {incomeData.filter(d => d.date.startsWith(String(selectedYear))).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeData.filter(d => d.date.startsWith(String(selectedYear)))}>
                        <CartesianGrid vertical={false} opacity={0.05} />
                        <XAxis dataKey="monthStr" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} tickFormatter={formatYAxis} />
                        <Tooltip content={<StandardTooltip isDarkMode={isDarkMode} />} cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}} />
                        <ReferenceLine y={stats.totalInc / 12} stroke="#8b5cf6" strokeDasharray="3 3" />
                        <Bar dataKey="amount" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-40 uppercase text-xs font-black">No Income Records</div>}
        </AnalyticsCard>

        <AnalyticsCard 
            title={`Expense Overview (${selectedYear})`} 
            icon={CreditCard} 
            className="h-[400px]"
            subtext={expenseFilter === 'All' ? "All Categories" : expenseFilter}
            controls={
                <select value={expenseFilter} onChange={(e) => setExpenseFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-900 text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none border border-slate-200 dark:border-slate-700">
                    <option value="All">All Categories</option>
                    {expenseCategoryKeys.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            }
        >
            {expenseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseChartData}>
                        <CartesianGrid vertical={false} opacity={0.05} />
                        <XAxis dataKey="monthStr" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} tickFormatter={formatYAxis} />
                        <Tooltip content={<StandardTooltip isDarkMode={isDarkMode} />} cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}} />
                        {expenseFilter === 'All' ? expenseCategoryKeys.map((key, idx) => <Bar key={key} dataKey={key} name={key} stackId="a" fill={COLORS[idx % COLORS.length]} />) : <Bar dataKey={expenseFilter} name={expenseFilter} fill="#3b82f6" radius={[4, 4, 0, 0]} />}
                    </BarChart>
                </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-40 uppercase text-xs font-black">No Expense Records</div>}
        </AnalyticsCard>
      </section>

      {detailedExpenses && detailedExpenses.categories.length > 0 && (
          <section className="space-y-8 border-t border-slate-200 dark:border-slate-800 pt-8 animate-fade-in">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-[500px]">
                  <AnalyticsCard 
                        title="Spending Flow" icon={GitMerge} 
                        className="h-[500px]"
                        subtext={monthsList[selectedMonthIndex] || 'Aggregate'}
                        controls={
                            <div className="flex items-center gap-3">
                                {selectedCategoryName && <button onClick={() => setSelectedCategoryName(null)} className="flex items-center gap-1 px-3 py-1.5 text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl font-black uppercase transition-all hover:bg-purple-500/20">Clear <X size={10} /></button>}
                                <select value={selectedMonthIndex} onChange={(e) => setSelectedMonthIndex(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-900 text-[10px] font-black uppercase px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">{monthsList.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}</select>
                            </div>
                        }
                    >
                        {sankeyData.links.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <Sankey
                                    data={sankeyData} margin={{ left: 10, right: 10, top: 20, bottom: 20 }}
                                    node={<SankeyNode isDarkMode={isDarkMode} selectedCategory={selectedCategoryName} onNodeClick={(n: any) => uniqueDetailedCategories.includes(n.name) ? setSelectedCategoryName(n.name === selectedCategoryName ? null : n.name) : n.name === 'Total Spending' && setSelectedCategoryName(null)} />}
                                    link={{ stroke: isDarkMode ? '#475569' : '#cbd5e1', strokeOpacity: 0.3 }} nodePadding={20}
                                >
                                    <Tooltip content={<StandardTooltip isDarkMode={isDarkMode} />} />
                                </Sankey>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-40 uppercase text-xs font-black">No Flow Data for Window</div>}
                  </AnalyticsCard>

                  <AnalyticsCard title="Category Concentration" icon={BarChart2} className="h-[500px]" subtext="Annual Trail">
                        {detailedTrendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={detailedTrendData}>
                                    <CartesianGrid vertical={false} opacity={0.05} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} tickFormatter={formatYAxis} />
                                    <Tooltip content={<StandardTooltip isDarkMode={isDarkMode} />} cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}} />
                                    <Legend iconSize={8} wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                                    {uniqueDetailedCategories.map((catName, idx) => (
                                        <Bar key={catName} dataKey={catName} name={catName} stackId="a" fill={COLORS[idx % COLORS.length]} opacity={selectedCategoryName && selectedCategoryName !== catName ? 0.2 : 1} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-40 uppercase text-xs font-black">Trend Unavailable</div>}
                  </AnalyticsCard>
              </div>
          </section>
      )}
    </div>
  );
};
