
import React, { useState, memo } from 'react';
import { Trade } from '../../types';
import { TradeGroup } from '../../services/trades/tradeService';
import { ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { TradeHistoryTable } from './TradeHistoryTable';

interface TradeAssetAccordionProps {
    group: TradeGroup;
    isLoading: boolean;
    onDelete?: (t: Trade) => Promise<void>;
    onEdit: (t: Trade) => void;
    isReadOnly: boolean;
}

export const TradeAssetAccordion: React.FC<TradeAssetAccordionProps> = memo(({ 
    group, isLoading, onDelete, onEdit, isReadOnly 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { ticker, trades, stats } = group;

    return (
        <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm transition-all hover:border-blue-500/30 ${stats.isExited ? 'opacity-60 grayscale-[0.4]' : ''}`}>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-left"
            >
                <div className="flex items-center gap-6">
                    <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl text-slate-400 border border-slate-200 dark:border-slate-700">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest">{ticker}</h3>
                            {stats.isExited && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                                    <Archive size={10} /> Exited
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{trades.length} Positions Logged</p>
                    </div>
                </div>

                <div className="flex gap-10 lg:gap-16 text-right tabular-nums">
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Held</p>
                        <p className="font-mono font-black text-slate-900 dark:text-white">{stats.netQty.toLocaleString()} units</p>
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Cost</p>
                        <p className="font-mono font-black text-slate-900 dark:text-white">${stats.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Allocation</p>
                        <p className="font-mono font-black text-emerald-600 dark:text-emerald-400">${stats.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </button>

            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/10 animate-fade-in">
                    <TradeHistoryTable 
                        trades={trades} 
                        isLoading={isLoading} 
                        onDelete={onDelete} 
                        onEdit={onEdit} 
                        isReadOnly={isReadOnly} 
                        compact={true}
                    />
                </div>
            )}
        </div>
    );
});
