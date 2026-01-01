
import React, { useMemo, useState } from 'react';
import { Asset, ExchangeRates } from '../types';
import { Loader2, Plus, Search, LayoutGrid, List, X } from 'lucide-react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { filterAssets, sortAssets, AssetSortKey } from '../services/assets/assetService';
import { AssetCard } from './assets/AssetCard';
import { AssetTableView } from './assets/AssetTableView';
import { AssetEntryModal } from './assets/AssetEntryModal';

interface AssetsListProps {
  assets: Asset[];
  isLoading?: boolean;
  exchangeRates?: ExchangeRates;
  onAddAsset?: (asset: Asset) => Promise<void>;
  onEditAsset?: (asset: Asset) => Promise<void>;
  onDeleteAsset?: (asset: Asset) => Promise<void>;
  isReadOnly?: boolean;
  isGhostMode?: boolean;
}

export const AssetsList: React.FC<AssetsListProps> = ({ 
    assets, isLoading = false, exchangeRates, onAddAsset, onEditAsset, onDeleteAsset, isReadOnly = false, isGhostMode = false 
}) => {
  const [filterType, setFilterType] = useState<string>('All');
  const [isTableView, setIsTableView] = useIndexedDB<boolean>('fintrack_assets_table_view', false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<AssetSortKey>('value');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const processedAssets = useMemo(() => {
    const filtered = filterAssets(assets, searchTerm, filterType);
    return sortAssets(filtered, sortKey, exchangeRates);
  }, [assets, searchTerm, filterType, sortKey, exchangeRates]);

  return (
    <div className={`space-y-8 animate-fade-in pb-20 ${isGhostMode ? 'ghost-mode-active' : ''}`}>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-5">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
                Assets
                {isLoading && <Loader2 className="animate-spin text-blue-500" size={28} />}
              </h2>
              {onAddAsset && !isReadOnly && (
                  <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:-translate-y-0.5 active:scale-95">
                      <Plus size={16} /> New Asset
                  </button>
              )}
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800/40 p-5 rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search identifiers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-56 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                  {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
              </div>
              <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 mx-1 hidden md:block" />
              <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                {['All', 'Investment', 'Property', 'Cash'].map(opt => (
                    <button key={opt} onClick={() => setFilterType(opt)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === opt ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>{opt}</button>
                ))}
              </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="flex bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-100 dark:border-slate-800 shadow-inner">
                  <button onClick={() => setIsTableView(false)} className={`p-2.5 rounded-lg transition-all ${!isTableView ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16} /></button>
                  <button onClick={() => setIsTableView(true)} className={`p-2.5 rounded-lg transition-all ${isTableView ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><List size={16} /></button>
              </div>
              <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="value">Sort: Value</option>
                  <option value="name">Sort: Name</option>
                  <option value="type">Sort: Type</option>
              </select>
          </div>
      </div>

      <AssetEntryModal isOpen={isAddModalOpen || !!editingAsset} initialData={editingAsset} onClose={() => { setIsAddModalOpen(false); setEditingAsset(null); }} onSave={async (a) => editingAsset ? onEditAsset?.(a) : onAddAsset?.(a)} />

      <div className="transition-all duration-500">
        {isTableView ? (
            <AssetTableView assets={processedAssets} exchangeRates={exchangeRates} isLoading={isLoading} onEdit={setEditingAsset} onDelete={a => onDeleteAsset?.(a)} />
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {processedAssets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} isLoading={isLoading} exchangeRates={exchangeRates} onDelete={onDeleteAsset} onEdit={setEditingAsset} />
                ))}
            </div>
        )}

        {processedAssets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-slate-900/10">
                <LayoutGrid size={64} className="opacity-10 mb-6" />
                <p className="font-black uppercase tracking-[0.2em] text-xs text-slate-400">Inventory Empty</p>
            </div>
        )}
      </div>
    </div>
  );
};
