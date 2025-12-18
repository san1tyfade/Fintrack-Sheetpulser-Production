
import React, { useMemo, useState, memo } from 'react';
import { Asset, ExchangeRates } from '../types';
import { Filter, Loader2, Home, Wallet } from 'lucide-react';
import { convertToBase, formatBaseCurrency, formatNativeCurrency, PRIMARY_CURRENCY } from '../services/currencyService';
import { isInvestmentAsset, isFixedAsset, isCashAsset, getAssetIcon } from '../services/classificationService';

interface AssetsListProps {
  assets: Asset[];
  isLoading?: boolean;
  exchangeRates?: ExchangeRates;
}

// --- Sub-Component: AssetCard (Memoized) ---

const AssetCard = memo(({ asset, exchangeRates, isLoading }: { asset: Asset, exchangeRates?: ExchangeRates, isLoading: boolean }) => {
    const isForeign = asset.currency && asset.currency.toUpperCase() !== PRIMARY_CURRENCY;
    const baseValue = convertToBase(asset.value, asset.currency, exchangeRates);
    
    return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-blue-400/50 transition-colors group animate-fade-in relative overflow-hidden flex flex-col justify-between h-full shadow-sm hover:shadow-md">
        <div>
            {isForeign && (
                <div className="absolute top-0 right-0 px-2 py-1 bg-yellow-500/10 rounded-bl-lg border-l border-b border-yellow-500/20">
                    <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500">{asset.currency}</span>
                </div>
            )}
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                    {getAssetIcon(asset.type)}
                </div>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs rounded-full uppercase tracking-wider font-semibold max-w-[120px] truncate text-right">
                    {asset.type}
                </span>
            </div>
            
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1 truncate pr-6" title={asset.name}>{asset.name}</h3>
            
            <div className="flex items-baseline gap-2 mt-2">
                {isLoading ? (
                    <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse my-0.5" />
                ) : (
                    <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {formatNativeCurrency(asset.value, asset.currency)}
                    </p>
                )}
            </div>
        </div>

        <div>
            {isForeign && (
                <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-1 min-h-[1.25rem]">
                    {isLoading ? (
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" />
                    ) : (
                        `≈ ${formatBaseCurrency(baseValue)}`
                    )}
                </div>
            )}

            {asset.lastUpdated && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                     <p className="text-xs text-slate-500">Last Updated</p>
                     <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{asset.lastUpdated}</p>
                </div>
            )}
        </div>
    </div>
  );
});

// --- Main Component ---

export const AssetsList: React.FC<AssetsListProps> = ({ assets, isLoading = false, exchangeRates }) => {
  const [filterType, setFilterType] = useState<string>('All');

  const FILTER_OPTIONS = [
    { id: 'All', label: 'All Assets' },
    { id: 'Investment', label: 'Investments' },
    { id: 'Property', label: 'Property & Vehicles' },
    { id: 'Cash', label: 'Liquid Cash' },
  ];

  // 1. Calculate Global Stats (Always shows total portfolio value, regardless of filter)
  const globalStats = useMemo(() => {
      let fin = 0;
      let fix = 0;
      
      assets.forEach(asset => {
          const val = convertToBase(asset.value, asset.currency, exchangeRates);
          if (isFixedAsset(asset)) fix += val;
          else fin += val; // Financial = Cash + Investments
      });

      return {
          financial: fin,
          fixed: fix,
          netWorth: fin + fix
      };
  }, [assets, exchangeRates]);

  // 2. Filter and Split Assets for Display
  const { visibleFinancial, visibleFixed } = useMemo(() => {
    const fin: Asset[] = [];
    const fix: Asset[] = [];

    assets.forEach(asset => {
        // Filter Check
        let pass = false;
        if (filterType === 'All') pass = true;
        else if (filterType === 'Investment') pass = isInvestmentAsset(asset);
        else if (filterType === 'Property') pass = isFixedAsset(asset);
        else if (filterType === 'Cash') pass = isCashAsset(asset);

        if (!pass) return;

        // Grouping Check
        if (isFixedAsset(asset)) {
            fix.push(asset);
        } else {
            fin.push(asset);
        }
    });

    return { visibleFinancial: fin, visibleFixed: fix };
  }, [assets, filterType]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Assets
            {isLoading && <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={24} />}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Complete asset inventory valuation in {PRIMARY_CURRENCY}.</p>
        </div>
        
        {/* Global Summary Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl text-right min-w-[160px] shadow-sm">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Financial Assets</p>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex justify-end mt-1">
                    {isLoading ? <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : formatBaseCurrency(globalStats.financial)}
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl text-right min-w-[160px] shadow-sm">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Property & Fixed</p>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 flex justify-end mt-1">
                    {isLoading ? <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : formatBaseCurrency(globalStats.fixed)}
                </div>
            </div>
             <div className="bg-slate-800 dark:bg-slate-800 border border-slate-700 dark:border-slate-700 px-5 py-3 rounded-xl text-right min-w-[160px] shadow-sm ring-1 ring-slate-600/50">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Net Worth</p>
                <div className="text-xl font-bold text-white flex justify-end mt-1">
                    {isLoading ? <div className="h-7 w-28 bg-slate-700/50 rounded animate-pulse" /> : formatBaseCurrency(globalStats.netWorth)}
                </div>
            </div>
        </div>
      </header>

      {/* Filter Controls */}
      <div className={`flex flex-wrap gap-2 items-center bg-slate-100 dark:bg-slate-800/40 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/50 w-fit transition-all duration-300 ${isLoading ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 px-3 text-slate-500 text-xs font-bold uppercase tracking-wide">
             <Filter size={14} /> Filter
          </div>
          {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilterType(opt.id)}
                 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filterType === opt.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                 }`}
              >
                  {opt.label}
              </button>
          ))}
      </div>

      <div className="transition-all duration-500 space-y-10">
        
        {/* Fixed Assets Section */}
        {visibleFixed.length > 0 && (
            <section className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4 px-1">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 dark:text-blue-400">
                        <Home size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Property & Fixed Assets</h3>
                    <span className="text-xs font-mono text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                        {visibleFixed.length}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {visibleFixed.map(asset => (
                        <AssetCard 
                            key={asset.id} 
                            asset={asset} 
                            isLoading={isLoading} 
                            exchangeRates={exchangeRates} 
                        />
                    ))}
                </div>
            </section>
        )}

        {/* Financial Assets Section */}
        {visibleFinancial.length > 0 && (
            <section className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4 px-1">
                     <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 dark:text-emerald-400">
                        <Wallet size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Liquid & Financial Assets</h3>
                    <span className="text-xs font-mono text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                        {visibleFinancial.length}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {visibleFinancial.map(asset => (
                        <AssetCard 
                            key={asset.id} 
                            asset={asset} 
                            isLoading={isLoading} 
                            exchangeRates={exchangeRates} 
                        />
                    ))}
                </div>
            </section>
        )}

        {/* Empty State */}
        {visibleFinancial.length === 0 && visibleFixed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-2xl bg-slate-50 dark:bg-slate-800/10">
                <Filter size={48} className="opacity-20 mb-4" />
                <p className="font-medium">No assets match the selected filter.</p>
                <button 
                    onClick={() => setFilterType('All')}
                    className="mt-4 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-sm font-medium hover:underline"
                >
                    Clear Filter
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
