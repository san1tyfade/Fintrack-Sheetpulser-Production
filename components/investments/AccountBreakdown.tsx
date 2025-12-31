
import React, { memo, useMemo } from 'react';
import { Investment, Trade } from '../../types';
import { Layers, X, Zap } from 'lucide-react';
import { normalizeTicker } from '../../services/geminiService';
import { resolveCurrentPrice, calculateHoldingValue } from '../../services/investments/investmentService';

interface AccountBreakdownProps {
    name: string;
    items: Investment[];
    livePrices: Record<string, number>;
    tradesByTicker: Map<string, Trade[]>;
    isLoading: boolean;
    onClose: () => void;
}

export const AccountBreakdown = memo(({ name, items, livePrices, tradesByTicker, isLoading, onClose }: AccountBreakdownProps) => {
    
    // Calculate total value for header
    const groupTotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const ticker = normalizeTicker(item.ticker);
            const isLive = !!livePrices[ticker];
            const price = resolveCurrentPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], item.currentPrice);
            return sum + calculateHoldingValue(item.quantity, price, item.marketValue, isLive);
        }, 0);
    }, [items, livePrices, tradesByTicker]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{name}</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Holding Breakdown</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-lg font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-2xl shadow-sm ghost-blur">
                        {isLoading ? <div className="h-6 w-24 bg-slate-200 dark:bg-slate-600/50 rounded animate-pulse" /> : `$${groupTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker / Asset</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantity</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Cost</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Value</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gain/Loss</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {items.map((inv) => {
                                const ticker = normalizeTicker(inv.ticker);
                                const isLive = !!livePrices[ticker];
                                const trades = tradesByTicker.get(ticker) || [];
                                const price = resolveCurrentPrice(ticker, livePrices, trades, inv.currentPrice);
                                const val = calculateHoldingValue(inv.quantity, price, inv.marketValue, isLive);
                                const cost = inv.quantity * inv.avgPrice;
                                const gain = val - cost;
                                const gainPct = cost > 0 ? ((gain / cost) * 100).toFixed(2) : '0.00';

                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-xs font-black text-slate-400">
                                                    {inv.ticker.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                                                        {inv.ticker} 
                                                        {isLive && <Zap size={10} className="text-yellow-500 fill-yellow-500 animate-pulse" />}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{inv.name !== inv.ticker ? inv.name : inv.assetClass}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right text-slate-600 dark:text-slate-300 font-mono text-sm ghost-blur">{inv.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                        <td className="p-6 text-right text-slate-500 dark:text-slate-400 font-mono text-sm ghost-blur">{`$${inv.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className={`p-6 text-right font-bold font-mono text-sm ghost-blur ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className={`p-6 text-right font-black font-mono text-sm ghost-blur ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
                                        <td className={`p-6 text-right font-bold font-mono text-sm ghost-blur ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                            <div className="flex flex-col items-end">
                                                <span>{gain >= 0 ? '+' : ''}{gain.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                <span className="text-[10px] opacity-70 font-black">{gainPct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});
