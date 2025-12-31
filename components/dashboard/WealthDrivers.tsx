
import React, { memo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { TimeFocus } from '../../types';

interface WealthDriversCardProps {
    attribution: any;
    isLoading: boolean;
    timeFocus: TimeFocus;
}

export const WealthDriversCard = memo(({ attribution, isLoading, timeFocus }: WealthDriversCardProps) => {
    const isGain = attribution.marketGain >= 0;
    const isContributionPositive = attribution.netContributions >= 0;
    const cleanFocus = timeFocus.replace(/_/g, ' ');
    const maxReference = Math.max(attribution.startValue + Math.abs(attribution.netContributions) + Math.abs(attribution.marketGain), attribution.endValue, 1);
    
    const startW = (attribution.startValue / maxReference) * 100;
    const savingsW = (Math.abs(attribution.netContributions) / maxReference) * 100;
    const gainW = (Math.abs(attribution.marketGain) / maxReference) * 100;

    return (
        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-sm flex flex-col h-full group hover:border-blue-400/20 transition-all">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3"><BarChart3 size={24} className="text-blue-500" />Wealth Drivers</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Component Attribution</p>
                </div>
                <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-tighter">{cleanFocus}</span>
                </div>
            </div>
            
            <div className="space-y-10 flex-1">
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Contribution Mix</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isGain ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                            {isGain ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                            <span className="ghost-blur">{isGain ? '+' : ''}{attribution.percentageReturn.toFixed(1)}% Return</span>
                        </div>
                    </div>
                    <div className="h-8 w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden flex shadow-inner border border-slate-100 dark:border-slate-800/50">
                        <div className="h-full bg-blue-500/90 transition-all duration-1000 relative border-r border-white/10" style={{ width: `${Math.max(2, startW)}%` }} title="Principal" />
                        <div className={`h-full transition-all duration-1000 relative border-r border-white/10 ${isContributionPositive ? 'bg-indigo-500/90' : 'bg-rose-500/90'}`} style={{ width: `${Math.max(2, savingsW)}%` }} title="Savings" />
                        <div className={`h-full transition-all duration-1000 relative ${isGain ? 'bg-emerald-500/90' : 'bg-red-500/90'}`} style={{ width: `${Math.max(2, gainW)}%` }} title="Market Gains" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl shadow-inner"><PiggyBank size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">New Savings</p>
                                <p className="text-xs font-bold text-slate-500">Flow Residual</p>
                            </div>
                        </div>
                        <p className={`text-xl font-black font-mono ghost-blur ${isContributionPositive ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
                            {isLoading ? '---' : formatBaseCurrency(attribution.netContributions)}
                        </p>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl shadow-inner ${isGain ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}><TrendingUp size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Market Gain</p>
                                <p className="text-xs font-bold text-slate-500">Appreciation</p>
                            </div>
                        </div>
                        <p className={`text-xl font-black font-mono ghost-blur ${isGain ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isLoading ? '---' : (isGain ? '+' : '') + formatBaseCurrency(attribution.marketGain)}
                        </p>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-[0.2em]">Net Change</span>
                         <span className="text-lg font-black text-slate-900 dark:text-white font-mono ghost-blur">
                            {isLoading ? '---' : formatBaseCurrency(attribution.endValue - attribution.startValue)}
                         </span>
                    </div>
                </div>
            </div>
        </div>
    );
});
