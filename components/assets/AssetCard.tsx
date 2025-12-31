
import React, { useState, memo } from 'react';
import { Asset, ExchangeRates } from '../../types';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { convertToBase, formatBaseCurrency, formatNativeCurrency, PRIMARY_CURRENCY } from '../../services/currencyService';
import { getAssetIcon } from '../../services/classificationService';

interface AssetCardProps {
    asset: Asset;
    exchangeRates?: ExchangeRates;
    isLoading: boolean;
    onDelete?: (a: Asset) => Promise<void>;
    onEdit?: (a: Asset) => void;
}

export const AssetCard = memo(({ asset, exchangeRates, isLoading, onDelete, onEdit }: AssetCardProps) => {
    const isForeign = asset.currency && asset.currency.toUpperCase() !== PRIMARY_CURRENCY;
    const baseValue = convertToBase(asset.value, asset.currency, exchangeRates);
    const [isDeleting, setIsDeleting] = useState(false);
    const canEdit = asset.rowIndex !== undefined;

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDelete) return;
        if (!confirm(`Are you sure you want to delete "${asset.name}"?`)) return;
        setIsDeleting(true);
        try { await onDelete(asset); } catch (e: any) { alert(e.message); setIsDeleting(false); }
    };

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 hover:border-blue-400/50 transition-all group animate-fade-in relative overflow-hidden flex flex-col justify-between h-full shadow-sm hover:shadow-md">
            <div className="absolute top-4 right-4 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                {canEdit && onEdit && (
                    <button onClick={() => onEdit(asset)} disabled={isDeleting || isLoading} className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all disabled:opacity-50"><Pencil size={14} /></button>
                )}
                {canEdit && onDelete && (
                    <button onClick={handleDelete} disabled={isDeleting || isLoading} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50">{isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button>
                )}
            </div>

            <div>
                <div className="flex justify-between items-start mb-5">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">{getAssetIcon(asset.type)}</div>
                    <span className="px-3 py-1 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[9px] rounded-full uppercase tracking-[0.2em] font-black border border-slate-100 dark:border-slate-800">{asset.type}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white truncate mb-1 tracking-tight">{asset.name}</h3>
                <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter ghost-blur font-mono">{formatNativeCurrency(asset.value, asset.currency)}</p>
                </div>
            </div>

            <div className="mt-6">
                {isForeign && <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest ghost-blur">≈ {formatBaseCurrency(baseValue)}</div>}
                {asset.lastUpdated && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between opacity-50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logged State</p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono font-bold">{asset.lastUpdated}</p>
                    </div>
                )}
            </div>
        </div>
    );
});
