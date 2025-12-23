

import React, { useMemo, useState, useEffect, memo } from 'react';
import { Investment, Asset, Trade, ExchangeRates } from '../types';
import { Layers, Shield, Home, Coins, PieChart as PieIcon, Loader2, Radio, Zap, ArrowUpRight, GraduationCap, Lock, Landmark, Briefcase } from 'lucide-react';
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

// --- Sub-Components ---

const AllocationCard = memo(({ title, value, total, icon: Icon, colorClass, isLoading }: { title: string, value: number, total: number, icon: any, colorClass: string, isLoading: boolean }) => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm">
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg bg-opacity-20 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
                <Icon size={20} />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{percent.toFixed(1)}% of Net Worth</span>
        </div>
        <div>
            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h4>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 min-h-[2rem] flex items-center">
                {isLoading ? <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
    </div>
  );
});

const HoldingsTable = memo(({ holdings }: { holdings: any[] }) => (
    <div className="space-y-4 animate-fade-in">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon size={20} className="text-purple-500 dark:text-purple-400" /> Holdings by Ticker
        </h3>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ticker</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Net Quantity</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Market Price</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Total Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {holdings.map((h) => (
                            <tr key={h.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {h.ticker}
                                    {h.isLive && <Zap size={12} className="text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400 animate-pulse" />}
                                </td>
                                <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-mono">{h.quantity.toLocaleString()}</td>
                                <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-mono">{`$${h.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                <td className={`p-4 text-right font-bold font-mono ${h.isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${h.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
                            </tr>
                        ))}
                        {holdings.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No holdings found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
));

const AccountGroup = memo(({ name, items, livePrices, tradesByTicker, isLoading }: { name: string, items: Investment[], livePrices: Record<string, number>, tradesByTicker: Map<string, Trade[]>, isLoading: boolean }) => {
    
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
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers size={20} className="text-slate-400 dark:text-slate-500" /> {name}
                </h3>
                <div className="text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[100px] flex justify-end">
                    {isLoading ? <div className="h-4 w-20 bg-slate-200 dark:bg-slate-600/50 rounded animate-pulse" /> : `$${groupTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ticker / Asset</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Quantity</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Avg Cost</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Market Price</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Value</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Gain/Loss</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                {inv.ticker} 
                                                {isLive && <Zap size={10} className="text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400 animate-pulse" />}
                                            </div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-normal mt-0.5">{inv.name !== inv.ticker ? inv.name : inv.assetClass}</div>
                                        </td>
                                        <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-mono">{inv.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                        <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-mono">{`$${inv.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className={`p-4 text-right font-medium font-mono ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className={`p-4 text-right font-bold font-mono ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{`$${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</td>
                                        <td className={`p-4 text-right font-medium font-mono ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                            <div className="flex flex-col items-end">
                                                <span>{gain >= 0 ? '+' : ''}{gain.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                <span className="text-[10px] opacity-70">{gainPct}%</span>
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

  // 3. Prepare All Investments (Reconciled + Synthetic)
  const allInvestments = useMemo<Investment[]>(() => {
    const sheetTickers = new Set(investments.map(i => normalizeTicker(i.ticker)));
    const synthetic: Investment[] = [];
    
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

            synthetic.push({
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

    return [...investments, ...synthetic];
  }, [investments, tradesByTicker]);

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

  // 5. Aggregated Holdings
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

  // 6. Allocations
  const netWorth = useMemo(() => {
    return assets.reduce((sum, item) => sum + convertToBase(item.value, item.currency, exchangeRates), 0);
  }, [assets, exchangeRates]);

  const allocations = useMemo(() => {
      const invStats = { tfsa: 0, fhsa: 0, rrsp: 0, resp: 0, lira: 0, pension: 0, crypto: 0 };
      const assetStats = { tfsa: 0, fhsa: 0, rrsp: 0, resp: 0, lira: 0, pension: 0, crypto: 0 };

      // Helper to classify
      const check = (str: string) => str.toLowerCase();

      allInvestments.forEach(inv => {
          const ticker = normalizeTicker(inv.ticker);
          const isLive = !!livePrices[ticker];
          const price = getPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], inv.currentPrice);
          const val = getValue(inv.quantity, price, inv.marketValue, isLive);

          const combined = check((inv.accountName || '') + " " + (inv.assetClass || '') + " " + (inv.name || ''));
          
          if (combined.includes('tfsa')) invStats.tfsa += val;
          else if (combined.includes('fhsa') || combined.includes('first home')) invStats.fhsa += val;
          else if (combined.includes('rrsp') || combined.includes('retirement') || combined.includes('rsp')) invStats.rrsp += val;
          else if (combined.includes('resp') || combined.includes('education')) invStats.resp += val;
          else if (combined.includes('lira') || combined.includes('locked')) invStats.lira += val;
          else if (combined.includes('pension')) invStats.pension += val;
          
          const tk = check(ticker);
          if (combined.includes('crypto') || ['btc','eth','sol'].includes(tk)) invStats.crypto += val;
      });

      assets.forEach(asset => {
          const val = convertToBase(asset.value, asset.currency, exchangeRates);
          const combined = check((asset.type || '') + " " + (asset.name || ''));

          if (combined.includes('tfsa')) assetStats.tfsa += val;
          else if (combined.includes('fhsa') || combined.includes('first home')) assetStats.fhsa += val;
          else if (combined.includes('rrsp') || combined.includes('retirement') || combined.includes('rsp')) assetStats.rrsp += val;
          else if (combined.includes('resp') || combined.includes('education')) assetStats.resp += val;
          else if (combined.includes('lira') || combined.includes('locked')) assetStats.lira += val;
          else if (combined.includes('pension')) assetStats.pension += val;

          if (combined.includes('crypto')) assetStats.crypto += val;
      });

      return {
          tfsa: Math.max(invStats.tfsa, assetStats.tfsa),
          fhsa: Math.max(invStats.fhsa, assetStats.fhsa),
          rrsp: Math.max(invStats.rrsp, assetStats.rrsp),
          resp: Math.max(invStats.resp, assetStats.resp),
          lira: Math.max(invStats.lira, assetStats.lira),
          pension: Math.max(invStats.pension, assetStats.pension),
          crypto: Math.max(invStats.crypto, assetStats.crypto) 
      };
  }, [allInvestments, assets, livePrices, tradesByTicker, exchangeRates]);

  const secondCardConfig = useMemo(() => {
      const { fhsa, rrsp, resp, lira, pension } = allocations;
      if (fhsa > 0) return { title: "FHSA Allocation", value: fhsa, icon: Home, color: "text-blue-500 dark:text-blue-400" };
      if (rrsp > 0) return { title: "RRSP Allocation", value: rrsp, icon: Briefcase, color: "text-yellow-500 dark:text-yellow-400" };
      if (resp > 0) return { title: "RESP Allocation", value: resp, icon: GraduationCap, color: "text-indigo-500 dark:text-indigo-400" };
      if (lira > 0) return { title: "LIRA Allocation", value: lira, icon: Lock, color: "text-slate-500 dark:text-slate-400" };
      if (pension > 0) return { title: "Pension Allocation", value: pension, icon: Landmark, color: "text-slate-500 dark:text-slate-400" };
      
      // Default to FHSA if nothing else
      return { title: "FHSA Allocation", value: 0, icon: Home, color: "text-blue-500 dark:text-blue-400" };
  }, [allocations]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Investments
            {isLoading && <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={24} />}
            {isFetchingPrices && !isLoading && (
                 <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                     <Radio size={10} className="animate-pulse" /> Live Updating
                 </span>
            )}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Portfolio holdings breakdown and performance.</p>
        </div>
        {lastPriceUpdate && (
            <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Live Prices Updated</p>
                <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400">{lastPriceUpdate.toLocaleTimeString()}</p>
            </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AllocationCard title="TFSA Allocation" value={allocations.tfsa} total={netWorth} icon={Shield} colorClass="text-emerald-500 dark:text-emerald-400" isLoading={isLoading} />
        
        {/* Dynamic Second Card */}
        <AllocationCard 
            title={secondCardConfig.title} 
            value={secondCardConfig.value} 
            total={netWorth} 
            icon={secondCardConfig.icon} 
            colorClass={secondCardConfig.color} 
            isLoading={isLoading} 
        />

        <AllocationCard title="Crypto Allocation" value={allocations.crypto} total={netWorth} icon={Coins} colorClass="text-orange-500 dark:text-orange-400" isLoading={isLoading} />
      </div>

      <HoldingsTable holdings={aggregatedHoldings} />

      <div className="border-t border-slate-200 dark:border-slate-800 my-4" />

      {groupedInvestments.map(([accountName, items]) => (
        <AccountGroup 
            key={accountName} 
            name={accountName} 
            items={items} 
            livePrices={livePrices} 
            tradesByTicker={tradesByTicker} 
            isLoading={isLoading} 
        />
      ))}

      {!investments.length && !allInvestments.length && (
         <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
            <ArrowUpRight size={48} className="mx-auto mb-4 opacity-20" />
            <p>No investment data found.</p>
            <p className="text-xs mt-1">Connect your Google Sheet or add Trade history.</p>
        </div>
      )}
    </div>
  );
};
