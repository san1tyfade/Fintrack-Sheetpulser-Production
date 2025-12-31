
import React, { useState, useEffect } from 'react';
import { Asset } from '../../types';
import { Plus, Pencil, Wallet } from 'lucide-react';
import { PRIMARY_CURRENCY } from '../../services/currencyService';
import { RegistryModal } from '../information/RegistryModal';

interface AssetEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (a: Asset) => Promise<void>;
    initialData?: Asset | null;
}

export const AssetEntryModal: React.FC<AssetEntryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<Partial<Asset>>({
        name: '',
        type: 'Cash',
        value: 0,
        currency: PRIMARY_CURRENCY
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || { name: '', type: 'Cash', value: 0, currency: PRIMARY_CURRENCY });
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.type || formData.value === undefined) {
            alert("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData as Asset,
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex,
                lastUpdated: new Date().toISOString().split('T')[0]
            });
            onClose();
        } catch (err: any) {
            alert(err.message || "Failed to save asset.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <RegistryModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={initialData ? 'Edit Asset' : 'New Asset'} 
            icon={initialData ? Pencil : Plus} 
            iconColor="text-blue-500" 
            isSubmitting={isSubmitting} 
            onSubmit={handleSubmit}
            submitLabel={initialData ? 'Update Record' : 'Register Asset'}
        >
            <div className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Asset Identity</label>
                    <input type="text" placeholder="e.g. Primary Checking, Condo, Tesla Model 3" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" required />
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Classification</label>
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none appearance-none">
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
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Currency</label>
                        <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                            <option value="CAD">CAD</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Valuation</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input type="number" step="any" value={formData.value || ''} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-3 text-sm font-bold font-mono outline-none" placeholder="0.00" required />
                    </div>
                </div>
            </div>
        </RegistryModal>
    );
};
