
import React, { memo } from 'react';
import { Lock, TrendingUp, TrendingDown } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';

interface StatsCardProps {
    title: string;
    value: number;
    icon: any;
    color: 'blue' | 'emerald' | 'purple';
    isLoading: boolean;
    change?: number | null;
    isHistorical: boolean;
}

export const StatsCard = memo(({ 
    title, value, icon: Icon, color, isLoading, change, isHistorical
}: StatsCardProps) => {
    const styles = {
        blue: { bg: 'bg-blue-500/20', text: 'text-blue-500 dark:text-blue-400', glow: 'bg-blue-500/10', border: 'hover:border-blue-500/30' },
        emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-500 dark:text-emerald-400', glow: 'bg-emerald-500/10', border: 'hover:border-emerald-500/30' },
        purple: { bg: 'bg-purple-500/20', text: 'text-purple-500 dark:text-purple-400', glow: 'bg-purple-500/10', border: 'hover:border-purple-500/30' },
    };
    const s = styles[color];
    const isPositive = change && change > 0;
    const isNegative = change && change < 0;

    return (
        <div className={`bg-white dark:bg-slate-800/50 p-7 rounded-3xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm relative overflow-hidden group ${s.border} transition-all shadow-sm`}>
            {isHistorical && <div className="absolute -top-1 -right-1 opacity-20"><Lock size={48} className="text-slate-400" /></div>}
            <div className={`absolute top-0 right-0 w-32 h-32 ${s.glow} rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <div className="flex flex-col space-y-4 relative z-10">
                <div className="flex items-center space-x-4">
                    <div className={`p-3 ${s.bg} rounded-2xl ${s.text} shadow-inner`}>
                        <Icon size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white min-h-[2.5rem] flex items-center ghost-blur tracking-tight">
                        {isLoading ? <div className="h-9 w-40 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" /> : formatBaseCurrency(value)}
                    </h3>
                    {isHistorical ? (
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-60">Snapshot Archive</p>
                    ) : (
                        change !== undefined && change !== null && !isLoading && (
                            <div className={`flex items-center gap-1.5 mt-2 text-xs font-black ${isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-slate-400'}`}>
                                {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : null}
                                <span className="ghost-blur">{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
                                <span className="text-slate-400 font-bold ml-1 uppercase text-[10px] tracking-tight">vs last log</span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
});
