
import React, { useMemo, useState, memo } from 'react';
import { Trade } from '../types';
import { History, TrendingUp, TrendingDown, Search, X, Loader2, Calendar, DollarSign, Hash } from 'lucide-react';

interface TradesListProps {
  trades: Trade[];
  isLoading?: boolean;
}

// --- Sub-Component: TradeGroup (Memoized) ---

const TradeGroup = memo(({ ticker, trades, isLoading }: { ticker: string, trades: Trade[], isLoading: boolean }) => {
    
    // Optimize stats calculation
    const stats = useMemo(() => {
        let boughtQty = 0;
        let boughtCost = 0;
        let soldQty = 0;

        for (const t of trades) {
            const qty = Math.abs(t.quantity || 0);
            const total = Math.abs(t.total || 0);
            const type = (t.type || 'BUY').toUpperCase().trim();

            if (type === 'BUY') {
                boughtQty += qty;
                boughtCost += total;
            } else {
                soldQty += qty;
            }
        }

        return {
            avgBuyPrice: boughtQty > 0 ? boughtCost / boughtQty : 0,
            netQuantity: boughtQty - soldQty
        };
    }, [trades]);

    return (
        <div className="space-y-3 animate-fade-in group">
            <div className="flex items-center justify-between px-3 pt-3 pb-1 border-t border-slate-200 dark:border-slate-700/30 group-first:border-0">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500 dark:text-blue-400 border border-blue-500/20">
                        <History size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{ticker}</h3>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{trades.length} Transactions</p>
                    </div>
                </div>
                <div className="flex gap-6 text-sm text-right">
                    <div className="hidden sm:block">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Avg. Buy</p>
                        <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                            {isLoading ? <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : `$${stats.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Net Qty</p>
                        <div className={`font-mono font-bold ${stats.netQuantity < 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isLoading ? <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : stats.netQuantity.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32"><span className="flex items-center gap-1"><Calendar size={12}/> Date</span></th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Type</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"><span className="flex items-center gap-1 justify-end"><Hash size={12}/> Qty</span></th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"><span className="flex items-center gap-1 justify-end"><DollarSign size={12}/> Price</span></th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Total Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {trades.map((trade) => {
                                const isBuy = (trade.type || 'BUY').trim().toUpperCase() === 'BUY';
                                const dateObj = new Date(trade.date);
                                const dateDisplay = isNaN(dateObj.getTime()) ? trade.date : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

                                return (
                                    <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group/row">
                                        <td className="p-4 text-slate-700 dark:text-slate-300 whitespace-nowrap text-sm font-medium">{dateDisplay}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                isBuy 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                : 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'
                                            }`}>
                                                {isBuy ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                {trade.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-slate-700 dark:text-slate-300 font-mono text-sm">
                                            {isLoading ? <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : Math.abs(trade.quantity).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right text-slate-500 dark:text-slate-400 font-mono text-sm group-hover/row:text-slate-900 dark:group-hover/row:text-white transition-colors">
                                            {isLoading ? <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : `$${Math.abs(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </td>
                                        <td className="p-4 text-right text-slate-900 dark:text-white font-bold font-mono text-sm">
                                            {isLoading ? <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : `$${Math.abs(trade.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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

// --- Main Component ---

export const TradesList: React.FC<TradesListProps> = ({ trades, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Group trades by Ticker and sort within groups
  const groupedTrades = useMemo(() => {
    const groups: { [ticker: string]: Trade[] } = {};
    
    trades.forEach(trade => {
      const ticker = (trade.ticker || 'UNKNOWN').toUpperCase();
      if (!groups[ticker]) groups[ticker] = [];
      groups[ticker].push(trade);
    });

    Object.values(groups).forEach(list => {
        list.sort((a, b) => b.date.localeCompare(a.date));
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [trades]);

  // 2. Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedTrades;
    const lowerTerm = searchTerm.toLowerCase();
    return groupedTrades.filter(([ticker]) => ticker.toLowerCase().includes(lowerTerm));
  }, [groupedTrades, searchTerm]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Trades
            {isLoading && <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={24} />}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Historical transaction log grouped by asset.</p>
        </div>
        
        {/* Search Bar */}
        <div className={`relative w-full md:w-72 transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
             <input
                type="text"
                placeholder="Search by ticker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full placeholder:text-slate-400 transition-all shadow-sm focus:shadow-md"
             />
             {searchTerm && (
                 <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 rounded-full p-0.5"
                 >
                     <X size={14} />
                 </button>
             )}
        </div>
      </header>

      <div className={`transition-all duration-500 space-y-8 ${isLoading ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
        {filteredGroups.map(([ticker, tickerTrades]) => (
            <TradeGroup 
                key={ticker} 
                ticker={ticker} 
                trades={tickerTrades} 
                isLoading={isLoading} 
            />
        ))}

        {trades.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-2xl bg-slate-50 dark:bg-slate-800/20">
                <History size={48} className="opacity-20 mb-4" />
                <p className="font-medium">No trade history found.</p>
                <p className="text-sm mt-1">Import your trades via the 'Import Data' tab.</p>
            </div>
        )}

        {trades.length > 0 && filteredGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-2xl">
                <Search size={32} className="opacity-20 mb-3" />
                <p>No results for "<span className="text-slate-700 dark:text-slate-300 font-semibold">{searchTerm}</span>"</p>
            </div>
        )}
      </div>
    </div>
  );
};
