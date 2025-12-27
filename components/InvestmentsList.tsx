
import React, { useMemo, useState, useEffect, memo } from 'react';
import { Investment, Asset, Trade, ExchangeRates } from '../types';
import { Layers, Shield, Home, Coins, PieChart as PieIcon, Loader2, Radio, Zap, ArrowUpRight, GraduationCap, Lock, Landmark, Briefcase, ChevronRight, X, LayoutGrid, Wallet } from 'lucide-react';
import { normalizeTicker } from '../services/geminiService';
import { convertToBase, PRIMARY_CURRENCY } from '../services/currencyService';
import { fetchLivePrices } from '../services/priceService';

interface InvestmentsListProps {
  investments: Investment[]; 
  assets?: Asset[];
  trades?: Trade[];
  isLoading?: boolean;
  exchangeRates?: ExchangeRates;
}

// --- Helper Functions (Pure) ---

const getPrice = (ticker: string, livePrices: Record<string, number>, trades: Trade[], fallback: number) => {
    if (livePrices[ticker]) return livePrices[ticker];

    if (trades && trades.length > 0) {
        const tradeWithPrice = trades.find(t => (t.marketPrice || 0) > 0);
        if (tradeWithPrice) return tradeWithPrice.marketPrice!;
        
        if (trades[0].price) return Math.abs(trades[0].price);
    }
    return fallback || 0;
};

const getValue = (quantity: number, price: number, manualMarketValue?: number, isLive?: boolean) => {
    if (Math.abs(quantity) < 0.000001) return 0;
    if (isLive) return quantity * price;
    if ((manualMarketValue || 0) > 0) return manualMarketValue!;
    return quantity * price;
};

const getAccountVisuals = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('TFSA')) return { icon: Shield, color: 'text-emerald-600 dark:text-emerald-400' };
    if (n.includes('FHSA')) return { icon: Home, color: 'text-blue-600 dark:text-blue-400' };
    if (n.includes('RRSP') || n.includes('RSP')) return { icon: Briefcase, color: 'text-yellow-600 dark:text-yellow-400' };
    if (n.includes('RESP')) return { icon: GraduationCap, color: 'text-indigo-600 dark:text-indigo-400' };
    if (n.includes('LIRA') || n.includes('LOCKED')) return { icon: Lock, color: 'text-slate-600 dark:text-slate-400' };
    if (n.includes('PENSION') || n.includes('LAPP')) return { icon: Landmark, color: 'text-rose-600 dark:text-rose-400' };
    if (n.includes('CRYPTO')) return { icon: Coins, color: 'text-orange-600 dark:text-orange-400' };
    return { icon: Wallet, color: 'text-blue-500 dark:text-blue-300' };
};

// --- Sub-Components ---

const AllocationCard = memo(({ 
    title, value, total, icon: Icon, colorClass, isLoading, onClick, isSelected 
}: { 
    title: string, value: number, total: number, icon: any, colorClass: string, isLoading: boolean, onClick: () => void, isSelected: boolean 
}) => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <button 
        onClick={onClick}
        className={`w-full text-left bg-white dark:bg-slate-800/50 border p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden group active:scale-[0.98] ${
            isSelected 
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg -translate-y-1' 
            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/40 shadow-sm hover:shadow-md'
        }`}
    >
        {isSelected && (
            <div className="absolute top-0 right-0 p-2 text-blue-500">
                <ChevronRight size={20} className="rotate-90" />
            </div>
        )}
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl bg-opacity-15 transition-transform duration-300 group-hover:scale-110 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
                <Icon size={24} />
            </div>
            <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">Allocation</span>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{percent.toFixed(1)}%</p>
            </div>
        </div>
        <div className="space-y-1">
            <h4 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-tighter truncate pr-4" title={title}>{title}</h4>
            <div className="text-2xl font-black text-slate-900 dark:text-white min-h-[2rem] flex items-center tracking-tight">
                {isLoading ? <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
    </button>
  );
});

const HoldingsTable = memo(({ holdings, onClose }: { holdings: any[], onClose: () => void }) => (
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
                            <tr key={h.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-6 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-400">
                                        {h.ticker.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="flex items-center gap-2">
                                            {h.ticker}
                                            {h.isLive && <Zap size={10} className="text-yellow-500 fill-yellow-500 animate-pulse" />}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-6 text-right text-slate-600 dark:text-slate-300 font-mono text-sm">{h.quantity.toLocaleString()}</td>
                                <td className="p-6 text-right text-slate-600 dark:text-slate-300 font-mono text-sm">{`$${h.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                <td className={`p-6 text-right font-black font-mono text-sm ${h.isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${h.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
                            </tr>
                        ))}
                        {holdings.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-medium italic">No holdings found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
));

const AccountGroup = memo(({ name, items, livePrices, tradesByTicker, isLoading, onClose }: { name: string, items: Investment[], livePrices: Record<string, number>, tradesByTicker: Map<string, Trade[]>, isLoading: boolean, onClose: () => void }) => {
    
    // Calculate total value for header
    const groupTotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const ticker = normalizeTicker(item.ticker);
            const isLive = !!livePrices[ticker];
            const price = getPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], item.currentPrice);
            return sum + getValue(item.quantity, price, item.marketValue, isLive);
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
                    <div className="text-lg font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-2xl shadow-sm">
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
                                const price = getPrice(ticker, livePrices, trades, inv.currentPrice);
                                const val = getValue(inv.quantity, price, inv.marketValue, isLive);
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
                                        <td className="p-6 text-right text-slate-600 dark:text-slate-300 font-mono text-sm">{inv.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                        <td className="p-6 text-right text-slate-500 dark:text-slate-400 font-mono text-sm">{`$${inv.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className={`p-6 text-right font-bold font-mono text-sm ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className={`p-6 text-right font-black font-mono text-sm ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
                                        <td className={`p-6 text-right font-bold font-mono text-sm ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
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


// --- Main Component ---

export const InvestmentsList: React.FC<InvestmentsListProps> = ({ investments, assets = [], trades = [], isLoading = false, exchangeRates }) => {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  
  // Selection State
  const [selectedContext, setSelectedContext] = useState<string | 'TOTAL' | null>(null);

  // 1. Trades Lookup Map (Optimized)
  const tradesByTicker = useMemo(() => {
      const map = new Map<string, Trade[]>();
      trades.forEach(t => {
          const ticker = normalizeTicker(t.ticker);
          if (ticker === 'UNKNOWN') return;
          if (!map.has(ticker)) map.set(ticker, []);
          map.get(ticker)?.push(t);
      });
      // Sort each list descending by date
      map.forEach(list => list.sort((a,b) => b.date.localeCompare(a.date)));
      return map;
  }, [trades]);

  // 2. Live Price Fetching
  useEffect(() => {
    const uniqueTickers = new Set<string>();
    investments.forEach(i => uniqueTickers.add(normalizeTicker(i.ticker)));
    tradesByTicker.forEach((_, t) => uniqueTickers.add(t));
    
    const tickerList = Array.from(uniqueTickers).filter(t => t !== 'UNKNOWN');
    if (tickerList.length === 0) return;

    const updatePrices = async () => {
        setIsFetchingPrices(true);
        try {
            const newPrices = await fetchLivePrices(tickerList, PRIMARY_CURRENCY);
            setLivePrices(prev => ({ ...prev, ...newPrices }));
            setLastPriceUpdate(new Date());
        } catch (e) {
            console.error("Price update failed", e);
        } finally {
            setIsFetchingPrices(false);
        }
    };

    updatePrices();
    const interval = setInterval(updatePrices, 60000); // 60s poll
    return () => clearInterval(interval);
  }, [investments, tradesByTicker]);

  // 3. Unify Data Source: Combine Investments, Trades, and relevant Assets
  const allInvestments = useMemo<Investment[]>(() => {
    const sheetTickers = new Set(investments.map(i => normalizeTicker(i.ticker)));
    const unified: Investment[] = [...investments];
    
    // Add synthetic holdings from trade history
    tradesByTicker.forEach((tickerTrades, ticker) => {
        if (!sheetTickers.has(ticker)) {
            const netQty = tickerTrades.reduce((acc, t) => {
                 const type = (t.type || 'BUY').toUpperCase().trim();
                 return acc + (type === 'SELL' ? -Math.abs(t.quantity) : Math.abs(t.quantity));
            }, 0);
            
            if (Math.abs(netQty) < 0.000001) return;

            const buyTrades = tickerTrades.filter(t => (t.type || 'BUY').toUpperCase().trim() === 'BUY');
            const totalCost = buyTrades.reduce((sum, t) => sum + Math.abs(t.total), 0);
            const totalBuyQty = buyTrades.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
            const avgPrice = totalBuyQty > 0 ? totalCost / totalBuyQty : 0;
            const currentPrice = tickerTrades[0] ? (tickerTrades[0].marketPrice || Math.abs(tickerTrades[0].price)) : 0;

            let account = 'Uncategorized';
            let assetClass = 'Trade Derived';
            const tLower = ticker.toLowerCase();
            if (['btc', 'eth', 'sol', 'ada', 'xrp', 'doge', 'ltc', 'dot', 'usdt', 'usdc'].includes(tLower)) {
                account = 'Crypto Wallet';
                assetClass = 'Crypto';
            }

            unified.push({
                id: `synthetic-${ticker}`,
                ticker: tickerTrades[0].ticker, 
                name: tickerTrades[0].ticker,
                quantity: netQty,
                avgPrice,
                currentPrice,
                accountName: account,
                assetClass,
                marketValue: netQty * currentPrice
            });
        }
    });

    // Add uninvested cash / summary assets from Assets tab to avoid discrepancy
    // But ONLY if the account isn't already heavily represented by holdings 
    // OR if the asset is explicitly labeled as uninvested.
    const activeAccountNames = new Set(unified.map(u => (u.accountName || '').toUpperCase().trim()));

    assets.forEach(asset => {
        const lowerName = (asset.name || '').toLowerCase();
        const lowerType = (asset.type || '').toLowerCase();
        
        let targetAccount = '';
        if (lowerName.includes('tfsa') || lowerType.includes('tfsa')) targetAccount = 'TFSA';
        else if (lowerName.includes('fhsa') || lowerType.includes('fhsa')) targetAccount = 'FHSA';
        else if (lowerName.includes('rrsp') || lowerType.includes('rrsp')) targetAccount = 'RRSP';
        else if (lowerName.includes('resp') || lowerType.includes('resp')) targetAccount = 'RESP';
        else if (lowerName.includes('lira') || lowerType.includes('lira')) targetAccount = 'LIRA';
        
        if (targetAccount) {
            // FIX: Only add if this looks like a specific "Cash" or "Account Summary" row 
            // and we don't want to double count. If detailed holdings already exist for this account,
            // we skip adding the high-level summary from Assets tab.
            if (!activeAccountNames.has(targetAccount.toUpperCase()) || lowerName.includes('cash') || lowerName.includes('uninvested')) {
                unified.push({
                    id: `asset-${asset.id}`,
                    ticker: 'CASH',
                    name: asset.name,
                    quantity: 1,
                    avgPrice: convertToBase(asset.value, asset.currency, exchangeRates),
                    currentPrice: convertToBase(asset.value, asset.currency, exchangeRates),
                    accountName: targetAccount,
                    assetClass: 'Cash & Summary',
                    marketValue: convertToBase(asset.value, asset.currency, exchangeRates)
                });
            }
        }
    });

    return unified;
  }, [investments, tradesByTicker, assets, exchangeRates]);

  // 4. Group by Account
  const groupedInvestments = useMemo(() => {
    const groups: Record<string, Investment[]> = {};
    
    allInvestments.forEach(inv => {
      let account = (inv.accountName || '').trim();
      
      if (!account || ['uncategorized', 'null', 'unknown'].includes(account.toLowerCase())) {
          const lowerName = (inv.name || '').toLowerCase();
          const lowerClass = (inv.assetClass || '').toLowerCase();
          
          if (lowerName.includes('tfsa') || lowerClass.includes('tfsa')) account = 'TFSA';
          else if (lowerName.includes('fhsa') || lowerClass.includes('fhsa')) account = 'FHSA';
          else if (lowerName.includes('rrsp') || lowerClass.includes('rrsp')) account = 'RRSP';
          else if (lowerName.includes('crypto') || lowerClass.includes('crypto')) account = 'Crypto';
          else account = 'Uncategorized';
      }
      
      if (!groups[account]) groups[account] = [];
      groups[account].push(inv);
    });
    
    return Object.entries(groups).sort((a, b) => {
        if (a[0] === 'Uncategorized') return 1;
        if (b[0] === 'Uncategorized') return -1;
        return a[0].localeCompare(b[0]);
    });
  }, [allInvestments]);

  // 5. Derive Card Data strictly from the grouped result to ensure parity
  const dynamicAccountAllocations = useMemo(() => {
      return groupedInvestments.map(([name, items]) => {
          const totalVal = items.reduce((sum, item) => {
            const ticker = normalizeTicker(item.ticker);
            const isLive = !!livePrices[ticker];
            const price = getPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], item.currentPrice);
            return sum + getValue(item.quantity, price, item.marketValue, isLive);
          }, 0);
          return [name, totalVal] as [string, number];
      }).filter(([name, value]) => name !== 'Uncategorized' && value > 0.01)
        .sort((a, b) => b[1] - a[1]);
  }, [groupedInvestments, livePrices, tradesByTicker]);

  // 6. Aggregated Holdings
  const aggregatedHoldings = useMemo(() => {
    const map = new Map<string, { ticker: string, quantity: number, price: number, totalValue: number, isLive: boolean }>();

    allInvestments.forEach(inv => {
        const ticker = normalizeTicker(inv.ticker);
        const isLive = !!livePrices[ticker];
        const price = getPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], inv.currentPrice);
        const value = getValue(inv.quantity, price, inv.marketValue, isLive);

        if (!map.has(ticker)) {
            map.set(ticker, { ticker: inv.ticker, quantity: 0, price, totalValue: 0, isLive });
        }
        
        const entry = map.get(ticker)!;
        entry.quantity += inv.quantity;
        entry.totalValue += value;
    });

    return Array.from(map.values())
        .filter(h => Math.abs(h.quantity) > 0.000001 || h.totalValue > 0.01)
        .sort((a, b) => b.totalValue - a.totalValue);
  }, [allInvestments, livePrices, tradesByTicker]);

  // 7. Total NW Calculation
  const netWorth = useMemo(() => {
    return assets.reduce((sum, item) => sum + convertToBase(item.value, item.currency, exchangeRates), 0);
  }, [assets, exchangeRates]);

  const toggleContext = (context: string) => {
    setSelectedContext(prev => prev === context ? null : context);
  };

  const totalPortfolioValue = useMemo(() => aggregatedHoldings.reduce((sum, h) => sum + h.totalValue, 0), [aggregatedHoldings]);

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
            Investments
            {isLoading && <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={28} />}
            {isFetchingPrices && !isLoading && (
                 <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                     <Radio size={12} className="animate-pulse" /> Live Prices
                 </span>
            )}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Select an account to explore individual holdings.</p>
        </div>
        {lastPriceUpdate && (
            <div className="bg-white/50 dark:bg-slate-800/30 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black text-center mb-0.5">Last Quote Refresh</p>
                <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 text-center">{lastPriceUpdate.toLocaleTimeString()}</p>
            </div>
        )}
      </header>

      {/* Account Navigation Grid (Parity Guaranteed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AllocationCard 
            title="Total Portfolio" 
            value={totalPortfolioValue} 
            total={netWorth} 
            icon={ArrowUpRight} 
            colorClass="text-blue-600 dark:text-blue-400" 
            isLoading={isLoading} 
            isSelected={selectedContext === 'TOTAL'}
            onClick={() => toggleContext('TOTAL')}
        />

        {dynamicAccountAllocations.map(([accName, accValue]) => {
            const visuals = getAccountVisuals(accName);
            return (
                <AllocationCard 
                    key={accName}
                    title={accName} 
                    value={accValue} 
                    total={netWorth} 
                    icon={visuals.icon} 
                    colorClass={visuals.color} 
                    isLoading={isLoading} 
                    isSelected={selectedContext === accName}
                    onClick={() => toggleContext(accName)}
                />
            );
        })}
      </div>

      {/* Revealed Drill-down Section */}
      <div className="min-h-[400px]">
          {selectedContext === 'TOTAL' ? (
              <HoldingsTable holdings={aggregatedHoldings} onClose={() => setSelectedContext(null)} />
          ) : selectedContext ? (
              <div className="animate-fade-in-up">
                  {groupedInvestments
                    .filter(([name]) => name.toLowerCase().includes(selectedContext!.toLowerCase()))
                    .map(([accountName, items]) => (
                        <AccountGroup 
                            key={accountName} 
                            name={accountName} 
                            items={items} 
                            livePrices={livePrices} 
                            tradesByTicker={tradesByTicker} 
                            isLoading={isLoading} 
                            onClose={() => setSelectedContext(null)}
                        />
                    ))
                  }
                  {groupedInvestments.filter(([name]) => name.toLowerCase().includes(selectedContext!.toLowerCase())).length === 0 && (
                      <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                          <X size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                          <p className="text-slate-500 font-bold uppercase text-sm tracking-widest">No matching records found in spreadsheet.</p>
                      </div>
                  )}
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800/50 rounded-3xl opacity-60">
                   <LayoutGrid size={48} className="mb-4 opacity-20" />
                   <p className="text-sm font-bold uppercase tracking-widest">Select a card to view holdings</p>
              </div>
          )}
      </div>

      {!investments.length && !allInvestments.length && !isLoading && (
         <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/10">
            <ArrowUpRight size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-sm">No portfolio data detected.</p>
            <p className="text-xs mt-1">Ensure your Google Sheet is connected and has valid ticker symbols.</p>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
