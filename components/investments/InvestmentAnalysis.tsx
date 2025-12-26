import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { HoldingsTreemap } from './HoldingsTreemap';

interface TreemapData {
    name: string;
    ticker: string;
    value: number;
    price: number;
    quantity: number;
    isLive: boolean;
}

interface InvestmentAnalysisProps {
  treemapData: TreemapData[];
  isLoading: boolean;
  isDarkMode: boolean;
}

export const InvestmentAnalysis: React.FC<InvestmentAnalysisProps> = ({ 
    treemapData,
    isLoading: isAppLoading,
    isDarkMode
}) => {
    const stats = useMemo(() => {
        const current = treemapData.reduce((acc, item) => acc + item.value, 0);
        const tickerCount = treemapData.length;
        const liveCount = treemapData.filter(d => d.isLive).length;
        return { current, tickerCount, liveCount };
    }, [treemapData]);

    if (isAppLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
                <Loader2 className="animate-spin text-blue-500" size={64} />
                <p className="text-slate-900 dark:text-white font-bold text-lg">Loading Composition Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Aggregate Market Value</p>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{formatBaseCurrency(stats.current)}</div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Active Tickers</p>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.tickerCount}</div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Live Feed Accuracy</p>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-500">
                        {stats.tickerCount > 0 ? Math.round((stats.liveCount / stats.tickerCount) * 100) : 0}%
                    </div>
                </div>
            </div>

            <HoldingsTreemap data={treemapData} isDarkMode={isDarkMode} />
        </div>
    );
};