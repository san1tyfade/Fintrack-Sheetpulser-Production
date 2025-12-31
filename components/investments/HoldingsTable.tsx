
import React, { memo } from 'react';
import { LayoutGrid, X, Zap } from 'lucide-react';

interface AggregatedHolding {
    ticker: string;
    quantity: number;
    price: number;
    totalValue: number;
    isLive: boolean;
}

interface HoldingsTableProps {
    holdings: AggregatedHolding[];
    onClose: () => void;
}

export const HoldingsTable = memo(({ holdings, onClose }: HoldingsTableProps) => (
    <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <LayoutGrid size={24} className="text-blue-500" />
                Aggregated Holdings
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                <X size={20} />
            </button>
        </div>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Quantity</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Market Price</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {holdings.map((h) => (
                            <tr key={h.ticker} className="hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors">
                                <td className="p-6 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-400 font-black">
                                        {h.ticker.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="flex items-center gap-2">
                                            {h.ticker}
                                            {h.isLive && <Zap size={10} className="text-yellow-500 fill-yellow-500 animate-pulse" />}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-6 text-right text-slate-600 dark:text-slate-300 font-mono text-sm ghost-blur">{h.quantity.toLocaleString()}</td>
                                <td className="p-6 text-right text-slate-600 dark:text-slate-300 font-mono text-sm ghost-blur">{`$${h.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                <td className={`p-6 text-right font-black font-mono text-sm ghost-blur ${h.isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${h.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
                            </tr>
                        ))}
                        {holdings.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-medium italic">No holdings found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
));
