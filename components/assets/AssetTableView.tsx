
import React, { memo } from 'react';
import { Asset, ExchangeRates } from '../../types';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { convertToBase, formatBaseCurrency, formatNativeCurrency } from '../../services/currencyService';
import { getAssetIcon } from '../../services/classificationService';

interface AssetTableViewProps {
    assets: Asset[];
    exchangeRates?: ExchangeRates;
    onEdit: (a: Asset) => void;
    onDelete: (a: Asset) => void;
    isLoading: boolean;
}

export const AssetTableView = memo(({ assets, exchangeRates, onEdit, onDelete, isLoading }: AssetTableViewProps) => (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm animate-fade-in">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Name</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Native Value</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value (CAD)</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {assets.map(asset => {
                        const baseVal = convertToBase(asset.value, asset.currency, exchangeRates);
                        const canEdit = asset.rowIndex !== undefined;
                        return (
                            <tr key={asset.id} className="hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors group tabular-nums">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="shrink-0 text-slate-400 opacity-60">{getAssetIcon(asset.type)}</div>
                                        <span className="font-black text-slate-900 dark:text-white tracking-tight">{asset.name}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-[9px] font-black uppercase tracking-tighter rounded-lg text-slate-500 dark:text-slate-400">
                                        {asset.type}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right font-mono text-sm text-slate-500 ghost-blur">
                                    {formatNativeCurrency(asset.value, asset.currency)}
                                </td>
                                <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white font-mono text-sm ghost-blur">
                                    {formatBaseCurrency(baseVal)}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canEdit && (
                                            <>
                                                <button onClick={() => onEdit(asset)} className="p-2 text-slate-400 hover:text-blue-500 rounded-xl transition-all"><Pencil size={14} /></button>
                                                <button onClick={() => onDelete(asset)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
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
    </div>
));
