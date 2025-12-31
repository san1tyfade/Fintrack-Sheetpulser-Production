
import React, { useState, useEffect } from 'react';
import { Trade } from '../../types';
import { History, Save } from 'lucide-react';
import { RegistryModal } from '../information/RegistryModal';

interface TradeEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (t: Trade) => Promise<void>;
    initialData?: Trade | null;
}

export const TradeEntryModal: React.FC<TradeEntryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<Partial<Trade>>({
        date: new Date().toISOString().split('T')[0],
        type: 'BUY',
        ticker: '',
        quantity: 0,
        price: 0,
        fee: 0
    });
    
    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || {
                date: new Date().toISOString().split('T')[0],
                type: 'BUY',
                ticker: '',
                quantity: 0,
                price: 0,
                fee: 0
            });
        }
    }, [isOpen, initialData]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const displayQty = Math.abs(formData.quantity || 0);
    const displayPrice = Math.abs(formData.price || 0);
    const displayFee = Math.abs(formData.fee || 0);
    const calculatedTotal = displayQty * displayPrice + (formData.type === 'BUY' ? displayFee : -displayFee);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.ticker || !formData.quantity || !formData.price) {
            alert("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const rawQty = Math.abs(Number(formData.quantity));
            const quantity = formData.type === 'SELL' ? -rawQty : rawQty;
            
            await onSave({
                ...formData as Trade,
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex,
                ticker: formData.ticker!.toUpperCase(),
                quantity,
                total: calculatedTotal
            });
            onClose();
        } catch (err: any) {
            alert(err.message || "Failed to save trade.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <RegistryModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={initialData ? 'Edit Trade' : 'New Trade'} 
            icon={History} 
            iconColor="text-blue-500" 
            isSubmitting={isSubmitting} 
            onSubmit={handleSubmit}
            submitLabel={initialData ? 'Update Record' : 'Log Transaction'}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Trade Date</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Action</label>
                        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border-2 border-slate-200 dark:border-slate-700">
                            {['BUY', 'SELL'].map(t => (
                                <button key={t} type="button" onClick={() => setFormData({...formData, type: t as any})} className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all ${formData.type === t ? (t === 'BUY' ? 'bg-emerald-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md') : 'text-slate-500'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ticker Symbol</label>
                    <input type="text" placeholder="e.g. AAPL, BTC" value={formData.ticker} onChange={e => setFormData({...formData, ticker: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black tracking-widest outline-none focus:border-blue-500 uppercase transition-all" required />
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quantity</label>
                        <input type="number" step="any" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold font-mono outline-none" required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price / Unit</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input type="number" step="any" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-3 text-sm font-bold font-mono outline-none" required />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Total Settlement</span>
                    <span className="text-lg font-black font-mono text-blue-700 dark:text-white">${calculatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
            </div>
        </RegistryModal>
    );
};
