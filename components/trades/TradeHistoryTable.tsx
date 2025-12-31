
import React, { useState, memo } from 'react';
import { Trade } from '../../types';
import { ArrowDownLeft, ArrowUpRight, Loader2, Pencil, Trash2 } from 'lucide-react';

interface TradeHistoryTableProps {
    trades: Trade[];
    isLoading: boolean;
    onDelete?: (t: Trade) => Promise<void>;
    onEdit: (t: Trade) => void;
    isReadOnly: boolean;
    compact?: boolean;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = memo(({ 
    trades, isLoading, onDelete, onEdit, isReadOnly, compact = false 
}) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (trade: Trade) => {
        if (!onDelete || isReadOnly) return;
        if (!confirm(`Permanently delete this ${trade.type} trade for ${trade.ticker}?`)) return;
        setDeletingId(trade.id);
        try { await onDelete(trade); } catch (e: any) { alert(e.message); } finally { setDeletingId(null); }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        {!compact && <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker</th>}
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantity</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                        <th className="p-4 w-20"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {trades.map((trade) => {
                        const isBuy = (trade.type || 'BUY').trim().toUpperCase() === 'BUY';
                        const isDeleting = deletingId === trade.id;
                        return (
                            <tr key={trade.id} className="hover:bg-blue-500/5 transition-colors group/row tabular-nums">
                                <td className="p-4 whitespace-nowrap text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">{trade.date}</td>
                                {!compact && <td className="p-4 text-xs font-black text-slate-900 dark:text-white">{trade.ticker}</td>}
                                <td className="p-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        isBuy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500 dark:text-red-400'
                                    }`}>
                                        {isBuy ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                        {trade.type}
                                    </div>
                                </td>
                                <td className="p-4 text-right text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {Math.abs(trade.quantity).toLocaleString()}
                                </td>
                                <td className="p-4 text-right text-xs font-mono text-slate-400 dark:text-slate-500">
                                    ${Math.abs(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right text-xs font-mono font-black text-slate-900 dark:text-white">
                                    ${Math.abs(trade.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                        {!isReadOnly && (
                                            <>
                                                <button onClick={() => onEdit(trade)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-all"><Pencil size={14} /></button>
                                                <button onClick={() => handleDelete(trade)} disabled={isDeleting} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all">
                                                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});
