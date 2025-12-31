
import React, { useMemo, useState } from 'react';
import { Investment, Asset, Trade, ExchangeRates } from '../types';
import { Shield, Home, Coins, Loader2, Radio, ArrowUpRight, GraduationCap, Lock, Landmark, Briefcase, LayoutGrid, Wallet, X } from 'lucide-react';
import { normalizeTicker } from '../services/geminiService';
import { convertToBase, PRIMARY_CURRENCY } from '../services/currencyService';
import { buildSyntheticPortfolio, resolveCurrentPrice, calculateHoldingValue } from '../services/investments/investmentService';
import { usePriceEngine } from '../hooks/usePriceEngine';
import { InvestmentAllocationCard } from './investments/InvestmentAllocationCard';
import { HoldingsTable } from './investments/HoldingsTable';
import { AccountBreakdown } from './investments/AccountBreakdown';

interface InvestmentsListProps {
  investments: Investment[]; 
  assets?: Asset[];
  trades?: Trade[];
  isLoading?: boolean;
  exchangeRates?: ExchangeRates;
}

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

export const InvestmentsList: React.FC<InvestmentsListProps> = ({ investments, assets = [], trades = [], isLoading = false, exchangeRates }) => {
  const [selectedContext, setSelectedContext] = useState<string | 'TOTAL' | null>(null);

  // 1. Trades Lookup Map for Drilldowns
  const tradesByTicker = useMemo(() => {
      const map = new Map<string, Trade[]>();
      trades.forEach(t => {
          const ticker = normalizeTicker(t.ticker);
          if (ticker === 'UNKNOWN') return;
          if (!map.has(ticker)) map.set(ticker, []);
          map.get(ticker)?.push(t);
      });
      map.forEach(list => list.sort((a,b) => b.date.localeCompare(a.date)));
      return map;
  }, [trades]);

  // 2. Ticker Synthesis for Pricing
  const allTickers = useMemo(() => {
    const tickers = new Set<string>();
    investments.forEach(i => tickers.add(normalizeTicker(i.ticker)));
    tradesByTicker.forEach((_, t) => tickers.add(t));
    return Array.from(tickers).filter(t => t !== 'UNKNOWN' && t !== 'CASH');
  }, [investments, tradesByTicker]);

  // 3. Live Price Engine
  const { livePrices, isFetching: isFetchingPrices, lastUpdated: lastPriceUpdate } = usePriceEngine(allTickers);

  // 4. Data Synthesis Logic (Extracted to Service)
  const allInvestments = useMemo<Investment[]>(() => 
    buildSyntheticPortfolio(investments, trades, assets, exchangeRates),
    [investments, trades, assets, exchangeRates]
  );

  // 5. Categorization Logic
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

  // 6. Stats & Allocations
  const aggregatedHoldings = useMemo(() => {
    const map = new Map<string, { ticker: string, quantity: number, price: number, totalValue: number, isLive: boolean }>();
    allInvestments.forEach(inv => {
        const ticker = normalizeTicker(inv.ticker);
        const isLive = !!livePrices[ticker];
        const price = resolveCurrentPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], inv.currentPrice);
        const value = calculateHoldingValue(inv.quantity, price, inv.marketValue, isLive);
        if (!map.has(ticker)) map.set(ticker, { ticker: inv.ticker, quantity: 0, price, totalValue: 0, isLive });
        const entry = map.get(ticker)!;
        entry.quantity += inv.quantity;
        entry.totalValue += value;
    });
    return Array.from(map.values())
        .filter(h => Math.abs(h.quantity) > 0.000001 || h.totalValue > 0.01)
        .sort((a, b) => b.totalValue - a.totalValue);
  }, [allInvestments, livePrices, tradesByTicker]);

  const dynamicAccountAllocations = useMemo(() => {
      return groupedInvestments.map(([name, items]) => {
          const totalVal = items.reduce((sum, item) => {
            const ticker = normalizeTicker(item.ticker);
            const isLive = !!livePrices[ticker];
            const price = resolveCurrentPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], item.currentPrice);
            return sum + calculateHoldingValue(item.quantity, price, item.marketValue, isLive);
          }, 0);
          return [name, totalVal] as [string, number];
      }).filter(([name, value]) => name !== 'Uncategorized' && value > 0.01)
        .sort((a, b) => b[1] - a[1]);
  }, [groupedInvestments, livePrices, tradesByTicker]);

  const netWorth = useMemo(() => assets.reduce((sum, item) => sum + convertToBase(item.value, item.currency, exchangeRates), 0), [assets, exchangeRates]);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <InvestmentAllocationCard 
            title="Total Portfolio" value={totalPortfolioValue} total={netWorth} icon={ArrowUpRight} 
            colorClass="text-blue-600 dark:text-blue-400" isLoading={isLoading} 
            isSelected={selectedContext === 'TOTAL'} onClick={() => setSelectedContext(prev => prev === 'TOTAL' ? null : 'TOTAL')}
        />
        {dynamicAccountAllocations.map(([accName, accValue]) => {
            const visuals = getAccountVisuals(accName);
            return (
                <InvestmentAllocationCard 
                    key={accName} title={accName} value={accValue} total={netWorth} icon={visuals.icon} 
                    colorClass={visuals.color} isLoading={isLoading} isSelected={selectedContext === accName}
                    onClick={() => setSelectedContext(prev => prev === accName ? null : accName)}
                />
            );
        })}
      </div>

      <div className="min-h-[400px]">
          {selectedContext === 'TOTAL' ? (
              <HoldingsTable holdings={aggregatedHoldings} onClose={() => setSelectedContext(null)} />
          ) : selectedContext ? (
              <div className="animate-fade-in-up">
                  {groupedInvestments
                    .filter(([name]) => name.toUpperCase() === selectedContext!.toUpperCase())
                    .map(([accountName, items]) => (
                        <AccountBreakdown 
                            key={accountName} name={accountName} items={items} 
                            livePrices={livePrices} tradesByTicker={tradesByTicker} 
                            isLoading={isLoading} onClose={() => setSelectedContext(null)}
                        />
                    ))
                  }
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
