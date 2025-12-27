
import React, { useMemo, useState, useEffect, memo } from 'react';
import { Asset, ExchangeRates } from '../types';
import { Filter, Loader2, Home, Wallet, Trash2, Plus, X, Save, Pencil, Search, LayoutGrid, List, ArrowUpDown, Sparkles, TrendingUp, TrendingDown, Info, PieChart, ExternalLink, Globe } from 'lucide-react';
import { convertToBase, formatBaseCurrency, formatNativeCurrency, PRIMARY_CURRENCY } from '../services/currencyService';
import { isInvestmentAsset, isFixedAsset, isCashAsset, getAssetIcon } from '../services/classificationService';
import { getMarketValuationLookup, MarketLookupResult } from '../services/geminiService';
import { useIndexedDB } from '../hooks/useIndexedDB';

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

// --- Sub-Component: Market Lookup Modal ---

const MarketLookupModal = ({ asset, isOpen, onClose }: { asset: Asset | null, isOpen: boolean, onClose: () => void }) => {
    const [result, setResult] = useState<MarketLookupResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && asset && !result) {
            setLoading(true);
            getMarketValuationLookup(asset).then(res => {
                setResult(res);
                setLoading(false);
            });
        }
    }, [isOpen, asset]);

    if (!isOpen || !asset) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl shadow-2xl border border-blue-500/20 dark:border-blue-500/10 overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                            <Globe size={28} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Market Research</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time data for {asset.name}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 min-h-[140px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-6">
                                <Loader2 className="animate-spin text-blue-500" size={32} />
                                <p className="text-sm font-medium text-slate-500">Browsing real estate & auto portals...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                                    {result?.text}
                                </p>
                                
                                {result?.sources && result.sources.length > 0 && (
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Market References</p>
                                        <div className="flex flex-wrap gap-2">
                                            {result.sources.map((source, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={source.uri} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:border-blue-400 transition-all shadow-sm"
                                                >
                                                    <ExternalLink size={12} />
                                                    {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => {setResult(null); onClose();}} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-2xl transition-all hover:bg-slate-200 dark:hover:bg-slate-600">Close Research</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Component: AddAssetModal ---

const AddAssetModal = ({ isOpen, onClose, onSave, initialData }: { isOpen: boolean, onClose: () => void, onSave: (a: Asset) => Promise<void>, initialData?: Asset | null }) => {
    const [formData, setFormData] = useState<Partial<Asset>>({
        name: '',
        type: 'Cash',
        value: 0,
        currency: PRIMARY_CURRENCY
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                value: initialData.value,
                currency: initialData.currency
            });
        } else if (isOpen && !initialData) {
            setFormData({ name: '', type: 'Cash', value: 0, currency: PRIMARY_CURRENCY });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.name || !formData.type || formData.value === undefined) {
            setError("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const newAsset: Asset = {
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex,
                name: formData.name,
                type: formData.type || 'Cash',
                value: Number(formData.value),
                currency: formData.currency || PRIMARY_CURRENCY,
                lastUpdated: new Date().toISOString().split('T')[0]
            };
            await onSave(newAsset);
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to save asset.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                         {initialData ? <Pencil size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                         {initialData ? 'Edit Asset' : 'New Asset'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asset Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Emergency Fund, Condo, Honda Civic"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                            <select 
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                            >
                                <option value="Cash">Cash</option>
                                <option value="Real Estate">Real Estate</option>
                                <option value="Personal Property">Personal Property</option>
                                <option value="Vehicle">Vehicle</option>
                                <option value="Crypto">Crypto</option>
                                <option value="Investment">Investment</option>
                                <option value="TFSA">TFSA</option>
                                <option value="RRSP">RRSP</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                            <select 
                                value={formData.currency}
                                onChange={e => setFormData({...formData, currency: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                            >
                                <option value="CAD">CAD</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Value</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input 
                                type="number" 
                                placeholder="0.00"
                                step="any"
                                value={formData.value || ''}
                                onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSubmitting ? 'Saving to Sheet...' : (initialData ? 'Update Asset' : 'Save Asset')}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Sub-Component: AssetCard (Gallery Mode) ---

const AssetCard = memo(({ asset, exchangeRates, isLoading, onDelete, onEdit, onLookup }: { 
    asset: Asset, 
    exchangeRates?: ExchangeRates, 
    isLoading: boolean, 
    onDelete?: (a: Asset) => Promise<void>,
    onEdit?: (a: Asset) => void,
    onLookup: (a: Asset) => void
}) => {
    const isForeign = asset.currency && asset.currency.toUpperCase() !== PRIMARY_CURRENCY;
    const baseValue = convertToBase(asset.value, asset.currency, exchangeRates);
    const [isDeleting, setIsDeleting] = useState(false);
    const canEdit = asset.rowIndex !== undefined;
    const isSearchable = isFixedAsset(asset);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDelete) return;
        if (!confirm(`Are you sure you want to delete "${asset.name}"?`)) return;
        setIsDeleting(true);
        try { await onDelete(asset); } catch (e: any) { alert(e.message); setIsDeleting(false); }
    };

    return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-blue-400/50 transition-all group animate-fade-in relative overflow-hidden flex flex-col justify-between h-full shadow-sm hover:shadow-md">
        <div className="absolute top-3 right-3 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            {isSearchable && (
                <button 
                    onClick={() => onLookup(asset)}
                    className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    title="Live Market Research"
                >
                    <Globe size={16} />
                </button>
            )}
            {canEdit && onEdit && (
                <button 
                    onClick={() => onEdit(asset)}
                    disabled={isDeleting || isLoading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                >
                    <Pencil size={16} />
                </button>
            )}
            {canEdit && onDelete && (
                <button 
                    onClick={handleDelete}
                    disabled={isDeleting || isLoading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
            )}
        </div>

        <div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
                    {getAssetIcon(asset.type)}
                </div>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[10px] rounded-full uppercase tracking-wider font-bold">
                    {asset.type}
                </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate mb-1">{asset.name}</h3>
            
            <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight ghost-blur">
                    {formatNativeCurrency(asset.value, asset.currency)}
                </p>
            </div>
        </div>

        <div>
            {isForeign && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 ghost-blur">
                    ≈ {formatBaseCurrency(baseValue)}
                </div>
            )}

            {asset.lastUpdated && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between opacity-50">
                     <p className="text-[10px] font-bold text-slate-500 uppercase">Last Updated</p>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{asset.lastUpdated}</p>
                </div>
            )}
        </div>
    </div>
  );
});

// --- Main Component ---

export const AssetsList: React.FC<AssetsListProps> = ({ 
    assets, isLoading = false, exchangeRates, onAddAsset, onEditAsset, onDeleteAsset, isReadOnly = false, isGhostMode = false 
}) => {
  const [filterType, setFilterType] = useState<string>('All');
  const [isTableView, setIsTableView] = useIndexedDB<boolean>('fintrack_assets_table_view', false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'value' | 'name' | 'type'>('value');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [researchingAsset, setResearchingAsset] = useState<Asset | null>(null);

  const filteredAndSortedAssets = useMemo(() => {
    let result = assets.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             a.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'All' || 
                             (filterType === 'Investment' && isInvestmentAsset(a)) ||
                             (filterType === 'Property' && isFixedAsset(a)) ||
                             (filterType === 'Cash' && isCashAsset(a));
        return matchesSearch && matchesFilter;
    });

    return result.sort((a, b) => {
        if (sortKey === 'value') return convertToBase(b.value, b.currency, exchangeRates) - convertToBase(a.value, a.currency, exchangeRates);
        if (sortKey === 'name') return a.name.localeCompare(b.name);
        return a.type.localeCompare(b.type);
    });
  }, [assets, searchTerm, filterType, sortKey, exchangeRates]);

  const metrics = useMemo(() => {
    let cash = 0, fixed = 0, total = 0;
    assets.forEach(a => {
        const val = convertToBase(a.value, a.currency, exchangeRates);
        total += val;
        if (isFixedAsset(a)) fixed += val;
        else cash += val; // Liquid (Cash + Invest)
    });
    return { cash, fixed, total, liquidPct: total > 0 ? (cash / total) * 100 : 0 };
  }, [assets, exchangeRates]);

  return (
    <div className={`space-y-8 animate-fade-in pb-20 ${isGhostMode ? 'ghost-mode-active' : ''}`}>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                Assets
                {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
              </h2>
              {onAddAsset && !isReadOnly && (
                  <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                      <Plus size={16} /> New Asset
                  </button>
              )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Professional asset inventory & analysis.</p>
        </div>

        {/* Analytics Strip */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-3xl flex items-center gap-6 shadow-sm min-w-[320px]">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <PieChart size={24} />
            </div>
            <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <span>Liquidity Ratio</span>
                    <span className="text-slate-900 dark:text-white">{metrics.liquidPct.toFixed(0)}% Liquid</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${metrics.liquidPct}%` }} />
                    <div className="h-full bg-blue-500" style={{ width: `${100 - metrics.liquidPct}%` }} />
                </div>
            </div>
        </div>
      </header>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50">
          <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search assets..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  />
              </div>
              <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />
              {['All', 'Investment', 'Property', 'Cash'].map(opt => (
                  <button 
                    key={opt}
                    onClick={() => setFilterType(opt)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === opt ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800'}`}
                  >
                      {opt}
                  </button>
              ))}
          </div>

          <div className="flex items-center gap-3">
              <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <button onClick={() => setIsTableView(false)} className={`p-2 rounded-xl transition-all ${!isTableView ? 'bg-blue-500 text-white shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16} /></button>
                  <button onClick={() => setIsTableView(true)} className={`p-2 rounded-xl transition-all ${isTableView ? 'bg-blue-500 text-white shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}><List size={16} /></button>
              </div>
              <select 
                value={sortKey} 
                onChange={e => setSortKey(e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
              >
                  <option value="value">Sort: Value</option>
                  <option value="name">Sort: Name</option>
                  <option value="type">Sort: Type</option>
              </select>
          </div>
      </div>

      <AddAssetModal 
         isOpen={isAddModalOpen || !!editingAsset} 
         initialData={editingAsset}
         onClose={() => { setIsAddModalOpen(false); setEditingAsset(null); }}
         onSave={async (a) => editingAsset ? onEditAsset?.(a) : onAddAsset?.(a)}
      />

      <MarketLookupModal 
        asset={researchingAsset}
        // Fixed: Removed reference to undefined 'researchMode'
        isOpen={!!researchingAsset}
        onClose={() => setResearchingAsset(null)}
      />

      <div className="transition-all duration-500">
        {/* Fixed: Removed reference to undefined 'researchMode' */}
        {isTableView ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm animate-fade-in">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Name</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Native Value</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value (CAD)</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredAndSortedAssets.map(asset => {
                            const baseVal = convertToBase(asset.value, asset.currency, exchangeRates);
                            const canEdit = asset.rowIndex !== undefined;
                            return (
                                <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="shrink-0 text-slate-400">{getAssetIcon(asset.type)}</div>
                                            <span className="font-bold text-slate-900 dark:text-white">{asset.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[9px] font-black uppercase tracking-tighter rounded-full text-slate-500">
                                            {asset.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-xs text-slate-500 ghost-blur">
                                        {formatNativeCurrency(asset.value, asset.currency)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white font-mono ghost-blur">
                                        {formatBaseCurrency(baseVal)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isFixedAsset(asset) && (
                                                <button onClick={() => setResearchingAsset(asset)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"><Globe size={14} /></button>
                                            )}
                                            {canEdit && (
                                                <>
                                                    <button onClick={() => setEditingAsset(asset)} className="p-1.5 text-slate-400 hover:text-blue-500"><Pencil size={14} /></button>
                                                    <button onClick={() => onDeleteAsset?.(asset)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
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
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedAssets.map(asset => (
                    <AssetCard 
                        key={asset.id} 
                        asset={asset} 
                        isLoading={isLoading} 
                        exchangeRates={exchangeRates} 
                        onDelete={onDeleteAsset}
                        onEdit={setEditingAsset}
                        onLookup={setResearchingAsset}
                    />
                ))}
            </div>
        )}

        {filteredAndSortedAssets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-3xl bg-slate-50 dark:bg-slate-800/10">
                <Search size={48} className="opacity-20 mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">No matching assets</p>
            </div>
        )}
      </div>
    </div>
  );
};
