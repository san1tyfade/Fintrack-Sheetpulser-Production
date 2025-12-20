
import React, { useMemo, useState, useEffect, memo } from 'react';
import { Asset, ExchangeRates } from '../types';
import { Filter, Loader2, Home, Wallet, Trash2, Plus, X, Save, Pencil } from 'lucide-react';
import { convertToBase, formatBaseCurrency, formatNativeCurrency, PRIMARY_CURRENCY } from '../services/currencyService';
import { isInvestmentAsset, isFixedAsset, isCashAsset, getAssetIcon } from '../services/classificationService';

interface AssetsListProps {
  assets: Asset[];
  isLoading?: boolean;
  exchangeRates?: ExchangeRates;
  onAddAsset?: (asset: Asset) => Promise<void>;
  onEditAsset?: (asset: Asset) => Promise<void>;
  onDeleteAsset?: (asset: Asset) => Promise<void>;
}

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

    // Pre-fill form when editing
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
                rowIndex: initialData?.rowIndex, // Preserve row index for updates
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

// --- Sub-Component: AssetCard (Memoized) ---

const AssetCard = memo(({ asset, exchangeRates, isLoading, onDelete, onEdit }: { 
    asset: Asset, 
    exchangeRates?: ExchangeRates, 
    isLoading: boolean, 
    onDelete?: (a: Asset) => Promise<void>,
    onEdit?: (a: Asset) => void
}) => {
    const isForeign = asset.currency && asset.currency.toUpperCase() !== PRIMARY_CURRENCY;
    const baseValue = convertToBase(asset.value, asset.currency, exchangeRates);
    const [isDeleting, setIsDeleting] = useState(false);
    const canEdit = asset.rowIndex !== undefined;

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDelete) return;
        if (!confirm(`Are you sure you want to delete "${asset.name}"? This will remove the row from your Sheet.`)) return;
        
        setIsDeleting(true);
        try {
            await onDelete(asset);
        } catch (e: any) {
            alert(e.message);
            setIsDeleting(false);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEdit) onEdit(asset);
    };
    
    return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-blue-400/50 transition-colors group animate-fade-in relative overflow-hidden flex flex-col justify-between h-full shadow-sm hover:shadow-md">
        
        {/* Actions (Visible on Hover) - Increased Z-Index to stay above currency badge */}
        <div className="absolute top-3 right-3 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && onEdit && (
                <button 
                    onClick={handleEdit}
                    disabled={isDeleting || isLoading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                    title="Edit Asset"
                >
                    <Pencil size={16} />
                </button>
            )}
            {canEdit && onDelete && (
                <button 
                    onClick={handleDelete}
                    disabled={isDeleting || isLoading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Delete Asset"
                >
                    {isDeleting ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} />}
                </button>
            )}
        </div>

        <div>
            {isForeign && (
                <div className="absolute top-0 right-0 px-2 py-1 bg-yellow-500/10 rounded-bl-lg border-l border-b border-yellow-500/20 z-10 pointer-events-none">
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

export const AssetsList: React.FC<AssetsListProps> = ({ assets, isLoading = false, exchangeRates, onAddAsset, onEditAsset, onDeleteAsset }) => {
  const [filterType, setFilterType] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

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
           <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                Assets
                {isLoading && <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={24} />}
              </h2>
              {onAddAsset && (
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                  >
                      <Plus size={16} /> Add Asset
                  </button>
              )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Complete asset inventory valuation in {PRIMARY_CURRENCY}.</p>
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

      <AddAssetModal 
         isOpen={isAddModalOpen || !!editingAsset} 
         initialData={editingAsset}
         onClose={() => { setIsAddModalOpen(false); setEditingAsset(null); }}
         onSave={async (a) => {
             if (editingAsset && onEditAsset) {
                 await onEditAsset(a);
             } else if (onAddAsset) {
                 await onAddAsset(a);
             }
         }}
      />

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
                            onDelete={onDeleteAsset}
                            onEdit={setEditingAsset}
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
                            onDelete={onDeleteAsset}
                            onEdit={setEditingAsset}
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