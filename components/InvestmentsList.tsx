import React, { useMemo, useState, useEffect, memo } from 'react';
import { Investment, Asset, Trade, ExchangeRates } from '../types';
import { Layers, Shield, Radio, Loader2, Zap, Briefcase, Table2, BarChart3, Landmark, Coins } from 'lucide-react';
import { normalizeTicker } from '../services/geminiService';
import { convertToBase, PRIMARY_CURRENCY } from '../services/currencyService';
import { fetchLivePrices } from '../services/priceService';
import { InvestmentAnalysis } from './investments/InvestmentAnalysis';

interface InvestmentsListProps {
  investments: Investment[]; 
  assets?: Asset[];
  trades?: Trade[];
  isLoading?: boolean;
  isDarkMode?: boolean;
  exchangeRates?: ExchangeRates;
}

type ViewMode = 'OVERVIEW' | 'ANALYSIS';

// --- Helper Functions ---

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

const AllocationCard = memo(({ title, value, total, icon: Icon, colorClass, isLoading, details }: { title: string, value: number, total: number, icon: any, colorClass: string, isLoading: boolean, details?: { label: string, value: number }[] }) => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm group relative overflow-hidden">
        <div className="flex justify-between items-start mb-2 transition-opacity group-hover:opacity-10">
            <div className={`p-2 rounded-lg bg-opacity-20 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
                <Icon size={20} />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{percent.toFixed(1)}%</span>
        </div>
        <div className="transition-opacity group-hover:opacity-10">
            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h4>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 min-h-[2rem] flex items-center">
                {isLoading ? <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </div>
        </div>

        {/* Hover Breakdown Overlay */}
        {details && details.length > 0 && !isLoading && (
            <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-5 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <div className={`${colorClass} p-1 rounded-md bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
                         <Icon size={12} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Individual Breakdown</p>
                </div>
                <div className="space-y-2">
                    {details.map(d => (
                        <div key={d.label} className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{d.label}</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                                ${d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Total</span>
                        <span className={`text-xs font-black font-mono ${colorClass}`}>
                            ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
});

const HoldingsTable = memo(({ holdings }: { holdings: any[] }) => (
    <div className="space-y-4 animate-fade-in">
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
                                    {h.isLive && <Zap size={12} className="text-yellow-500 fill-yellow-500 animate-pulse" />}
                                </td>
                                <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-mono">{h.quantity.toLocaleString()}</td>
                                <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-mono">{`$${h.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                <td className={`p-4 text-right font-bold font-mono ${h.isLive ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{`$${h.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
));

const AccountGroup = memo(({ name, items, livePrices, tradesByTicker, isLoading }: { name: string, items: Investment[], livePrices: Record<string, number>, tradesByTicker: Map<string, Trade[]>, isLoading: boolean }) => {
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
                    <Layers size={20} className="text-slate-400" /> {name}
                </h3>
                <div className="text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : `$${groupTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ticker / Asset</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Quantity</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Market Price</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {items.map((inv) => {
                                const ticker = normalizeTicker(inv.ticker);
                                const isLive = !!livePrices[ticker];
                                const price = getPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], inv.currentPrice);
                                const val = getValue(inv.quantity, price, inv.marketValue, isLive);
                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                                            {inv.ticker} {isLive && <Zap size={10} className="text-yellow-500 fill-yellow-500 inline" />}
                                            <div className="text-[10px] text-slate-500 font-normal">{inv.name}</div>
                                        </td>
                                        <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-mono">{inv.quantity.toLocaleString()}</td>
                                        <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-mono">{`$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className="p-4 text-right font-bold font-mono">{`$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</td>
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

export const InvestmentsList: React.FC<InvestmentsListProps> = ({ investments, assets = [], trades = [], isLoading = false, isDarkMode = true, exchangeRates }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('OVERVIEW');
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);

  const tradesByTicker = useMemo(() => {
      const map = new Map<string, Trade[]>();
      trades.forEach(t => {
          const ticker = normalizeTicker(t.ticker);
          if (ticker === 'UNKNOWN') return;
          if (!map.has(ticker)) map.set(ticker, []);
          map.get(ticker)?.push(t);
      });
      return map;
  }, [trades]);

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
        } catch (e) { console.error("Price update failed", e); }
        finally { setIsFetchingPrices(false); }
    };
    updatePrices();
    const interval = setInterval(updatePrices, 60000);
    return () => clearInterval(interval);
  }, [investments, tradesByTicker]);

  const allInvestments = useMemo<Investment[]>(() => {
    const sheetTickers = new Set(investments.map(i => normalizeTicker(i.ticker)));
    const synthetic: Investment[] = [];
    tradesByTicker.forEach((tickerTrades, ticker) => {
        if (!sheetTickers.has(ticker)) {
            const netQty = tickerTrades.reduce((acc, t) => acc + (t.type === 'SELL' ? -Math.abs(t.quantity) : Math.abs(t.quantity)), 0);
            if (Math.abs(netQty) < 0.000001) return;
            synthetic.push({
                id: `synthetic-${ticker}`, ticker: tickerTrades[0].ticker, name: tickerTrades[0].ticker,
                quantity: netQty, avgPrice: 0, currentPrice: 0, accountName: 'Uncategorized', assetClass: 'Other',
                marketValue: 0
            });
        }
    });
    return [...investments, ...synthetic];
  }, [investments, tradesByTicker]);

  const groupedInvestments = useMemo(() => {
    const groups: Record<string, Investment[]> = {};
    allInvestments.forEach(inv => {
      const account = inv.accountName || 'Uncategorized';
      if (!groups[account]) groups[account] = [];
      groups[account].push(inv);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allInvestments]);

  const aggregatedHoldings = useMemo(() => {
    const map = new Map<string, { ticker: string, quantity: number, price: number, totalValue: number, isLive: boolean }>();
    allInvestments.forEach(inv => {
        const ticker = normalizeTicker(inv.ticker);
        const isLive = !!livePrices[ticker];
        const price = getPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], inv.currentPrice);
        const value = getValue(inv.quantity, price, inv.marketValue, isLive);
        if (!map.has(ticker)) map.set(ticker, { ticker: inv.ticker, quantity: 0, price, totalValue: 0, isLive });
        const entry = map.get(ticker)!;
        entry.quantity += inv.quantity;
        entry.totalValue += value;
    });
    return Array.from(map.values()).filter(h => Math.abs(h.quantity) > 0.000001).sort((a, b) => b.totalValue - a.totalValue);
  }, [allInvestments, livePrices, tradesByTicker]);

  const investmentStats = useMemo(() => {
    let tfsa = 0, fhsa = 0, rrsp = 0, crypto = 0;
    
    // 1. Scan specific portfolio investments
    allInvestments.forEach(inv => {
        const ticker = normalizeTicker(inv.ticker);
        const isLive = !!livePrices[ticker];
        const price = getPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], inv.currentPrice);
        const val = getValue(inv.quantity, price, inv.marketValue, isLive);
        
        const acc = (inv.accountName || '').toUpperCase();
        const cls = (inv.assetClass || '').toUpperCase();
        
        if (acc.includes('TFSA')) tfsa += val;
        else if (acc.includes('FHSA')) fhsa += val;
        else if (acc.includes('RRSP')) rrsp += val;
        
        if (cls.includes('CRYPTO') || ['BTC', 'ETH', 'SOL', 'DOGE'].includes(ticker)) crypto += val;
    });

    // 2. Scan general assets (Account-based holdings/cash)
    assets.forEach(asset => {
        const val = convertToBase(asset.value, asset.currency, exchangeRates);
        const type = (asset.type || '').toUpperCase();
        const name = (asset.name || '').toUpperCase();

        if (type.includes('TFSA') || name.includes('TFSA')) tfsa += val;
        else if (type.includes('FHSA') || name.includes('FHSA')) fhsa += val;
        else if (type.includes('RRSP') || name.includes('RRSP')) rrsp += val;

        if (type.includes('CRYPTO') || name.includes('CRYPTO')) crypto += val;
    });

    return { tfsa, fhsa, rrsp, crypto, total: tfsa + fhsa + rrsp + crypto };
  }, [allInvestments, assets, livePrices, tradesByTicker, exchangeRates]);

  const treemapData = useMemo(() => {
      return aggregatedHoldings.map(h => ({
          name: h.ticker,
          ticker: h.ticker,
          value: h.totalValue,
          price: h.price,
          quantity: h.quantity,
          isLive: h.isLive
      }));
  }, [aggregatedHoldings]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Investments
            {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Portfolio holdings breakdown and performance.</p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
            <button
                onClick={() => setViewMode('OVERVIEW')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === 'OVERVIEW' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
                <Table2 size={16} /> Overview
            </button>
            <button
                onClick={() => setViewMode('ANALYSIS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === 'ANALYSIS' 
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
                <BarChart3 size={16} /> Analysis
            </button>
        </div>
      </header>

      {viewMode === 'ANALYSIS' ? (
          <InvestmentAnalysis 
              treemapData={treemapData}
              isLoading={isLoading} 
              isDarkMode={isDarkMode} 
          />
      ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AllocationCard 
                    title="TFSA & FHSA Assets" 
                    value={investmentStats.tfsa + investmentStats.fhsa} 
                    total={investmentStats.total} 
                    icon={Landmark} 
                    colorClass="text-emerald-500" 
                    isLoading={isLoading} 
                    details={[
                        { label: 'TFSA Holdings', value: investmentStats.tfsa },
                        { label: 'FHSA Holdings', value: investmentStats.fhsa }
                    ]}
                />
                <AllocationCard 
                    title="RRSP Portfolio" 
                    value={investmentStats.rrsp} 
                    total={investmentStats.total} 
                    icon={Briefcase} 
                    colorClass="text-blue-500" 
                    isLoading={isLoading} 
                    details={[{ label: 'RRSP Holdings', value: investmentStats.rrsp }]}
                />
                <AllocationCard 
                    title="Crypto Holdings" 
                    value={investmentStats.crypto} 
                    total={investmentStats.total} 
                    icon={Coins} 
                    colorClass="text-orange-500" 
                    isLoading={isLoading} 
                    details={[{ label: 'Total Digital Assets', value: investmentStats.crypto }]}
                />
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
          </>
      )}
    </div>
  );
};