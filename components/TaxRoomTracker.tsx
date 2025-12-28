
import React, { useMemo, memo, useState, useEffect } from 'react';
import { TaxRecord } from '../types';
import { ShieldCheck, Landmark, Sparkles, History, Plus, Pencil, Trash2, X, Save, Loader2, ArrowUpRight, ArrowDownRight, Coins, GraduationCap, Lock } from 'lucide-react';
import { formatBaseCurrency } from '../services/currencyService';

interface TaxRoomTrackerProps {
  taxRecords: TaxRecord[];
  isLoading?: boolean;
  onAddTaxRecord?: (rec: TaxRecord) => Promise<void>;
  onEditTaxRecord?: (rec: TaxRecord) => Promise<void>;
  onDeleteTaxRecord?: (rec: TaxRecord) => Promise<void>;
}

const ACCOUNTS = ['TFSA', 'RRSP', 'FHSA', 'LAPP', 'RESP'];
const SUMMARY_ACCOUNTS = ['TFSA', 'RRSP', 'FHSA']; 

const LIMIT_TYPES = ['LIMIT', 'LIMIT INCREASE', 'OPENING BALANCE', 'INCREASE'];
const CONTRIBUTION_TYPES = ['CONTRIBUTION', 'DEPOSIT'];
const WITHDRAWAL_TYPES = ['WITHDRAWAL', 'WITHDRAW'];

// --- Sub-Component: CircularProgress (Refined for smoothness) ---

const CircularProgress = ({ percentage, color, size = 64 }: { percentage: number, color: string, size?: number }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg 
                className="transform -rotate-90 w-full h-full drop-shadow-sm" 
                viewBox="0 0 100 100"
            >
                {/* Background Track - Always smooth, using currentColor for theme integration */}
                <circle
                    className="text-slate-100 dark:text-slate-700/40"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                />
                {/* Progress Bar - Rounded caps and clean path data for anti-aliasing */}
                <circle
                    stroke={color}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    style={{ 
                        strokeDashoffset, 
                        transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        strokeLinecap: 'round'
                    }}
                    strokeOpacity="1"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-slate-900 dark:text-white tracking-tighter">
                    {Math.round(percentage)}%
                </span>
            </div>
        </div>
    );
};

// --- Sub-Component: TaxRecordModal ---

const TaxRecordModal = ({ isOpen, onClose, onSave, initialData, defaultAccount }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (r: TaxRecord) => Promise<void>, 
    initialData?: TaxRecord | null,
    defaultAccount: string
}) => {
    const [formData, setFormData] = useState<Partial<TaxRecord>>({
        recordType: defaultAccount,
        transactionType: 'Contribution',
        date: new Date().toISOString().split('T')[0],
        value: 0,
        description: '',
        accountFund: defaultAccount
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
            } else {
                setFormData({
                    recordType: defaultAccount,
                    transactionType: 'Contribution',
                    date: new Date().toISOString().split('T')[0],
                    value: 0,
                    description: '',
                    accountFund: defaultAccount
                });
            }
        }
    }, [isOpen, initialData, defaultAccount]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                ...formData as TaxRecord,
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex
            });
            onClose();
        } catch (e: any) { 
            alert(e.message || "Failed to save record"); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-3">
                        {initialData ? <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Pencil size={18} /></div> : <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500"><Plus size={18} /></div>}
                        {initialData ? 'Edit Record' : 'New Record'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account</label>
                            <select 
                                value={formData.recordType} 
                                onChange={e => setFormData({...formData, recordType: e.target.value, accountFund: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                            >
                                {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none font-medium" required />
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Transaction Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Contribution', 'Withdrawal', 'Limit', 'Increase'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({...formData, transactionType: type})}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                        formData.transactionType === type
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs group-focus-within:text-blue-500 transition-colors">$</span>
                            <input 
                                type="number" 
                                step="any" 
                                value={formData.value || ''} 
                                onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-8 pr-4 py-4 text-lg font-black font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" 
                                placeholder="0.00"
                                required 
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description / Memo</label>
                        <textarea 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-medium outline-none min-h-[100px] focus:ring-2 focus:ring-blue-500 transition-all" 
                            placeholder="Optional notes e.g. 'Bonus Contribution'..."
                        />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {initialData ? 'Update Entry' : 'Add to Ledger'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Sub-Component: Room Summary Card ---

const RoomCard = memo(({ 
    label, used, remaining, totalLimit, color 
}: { 
    label: string, used: number, remaining: number, totalLimit: number, color: string 
}) => {
    const pctUsed = totalLimit > 0 ? (used / totalLimit) * 100 : 0;
    
    const getIcon = () => {
        const l = label.toUpperCase();
        if (l === 'TFSA') return <ShieldCheck size={24} />;
        if (l === 'FHSA') return <Landmark size={24} />;
        if (l === 'RRSP') return <Sparkles size={24} />;
        if (l === 'RESP') return <GraduationCap size={24} />;
        if (l === 'LAPP' || l === 'PENSION') return <Coins size={24} />;
        return <Landmark size={24} />;
    };

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 flex flex-col shadow-sm transition-all hover:border-blue-400/30 group">
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl transition-colors group-hover:bg-blue-500/10" style={{ color: pctUsed > 0 ? color : undefined }}>
                        {getIcon()}
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white leading-none">{label}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Contribution Room</p>
                    </div>
                </div>
                {/* Refined Custom Indicator: Hardware accelerated, smooth curves, no aliasing */}
                <CircularProgress percentage={pctUsed} color={color} size={64} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Used</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatBaseCurrency(used)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Available</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatBaseCurrency(remaining)}</p>
                </div>
            </div>

            <div className="pt-5 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Limit</p>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">{formatBaseCurrency(totalLimit)}</p>
                </div>
            </div>
        </div>
    );
});

// --- Main View Component ---

export const TaxRoomTracker: React.FC<TaxRoomTrackerProps> = ({ 
    taxRecords, 
    isLoading = false, 
    onAddTaxRecord, 
    onEditTaxRecord, 
    onDeleteTaxRecord 
}) => {
    const [activeTab, setActiveTab] = useState<string>('TFSA');
    const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);
    const [isAddingRecord, setIsAddingRecord] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const accountStats = useMemo(() => {
        const stats: Record<string, { used: number, totalLimit: number, remaining: number }> = {};
        
        ACCOUNTS.forEach(acc => {
            const records = taxRecords.filter(r => (r.recordType || '').toUpperCase().includes(acc));
            
            let limit = 0;
            let contributions = 0;
            let withdrawals = 0;

            records.forEach(r => {
                const type = (r.transactionType || '').toUpperCase().trim();
                const value = Math.abs(r.value || 0);

                if (LIMIT_TYPES.includes(type)) {
                    limit += value;
                } else if (CONTRIBUTION_TYPES.includes(type)) {
                    contributions += value;
                } else if (WITHDRAWAL_TYPES.includes(type)) {
                    withdrawals += value;
                }
            });

            const used = contributions - withdrawals;
            stats[acc] = {
                used,
                totalLimit: limit,
                remaining: Math.max(0, limit - used)
            };
        });

        return stats;
    }, [taxRecords]);

    const activeRecords = useMemo(() => {
        return taxRecords
            .filter(r => (r.recordType || '').toUpperCase().includes(activeTab))
            .sort((a, b) => {
                if (b.date === a.date) return (b.rowIndex || 0) - (a.rowIndex || 0);
                return b.date.localeCompare(a.date);
            });
    }, [taxRecords, activeTab]);

    const getAccountColor = (acc: string) => {
        if (acc === 'TFSA') return '#10b981';
        if (acc === 'RRSP') return '#f59e0b';
        if (acc === 'FHSA') return '#3b82f6';
        if (acc === 'LAPP') return '#ef4444';
        if (acc === 'RESP') return '#8b5cf6';
        return '#64748b';
    };

    const handleDelete = async (record: TaxRecord) => {
        if (!onDeleteTaxRecord || !confirm(`Delete this ${record.transactionType} entry for ${record.date}?`)) return;
        setDeletingId(record.id);
        try { await onDeleteTaxRecord(record); } catch (e: any) { alert(e.message); } finally { setDeletingId(null); }
    };

    return (
        <div className="space-y-12 animate-fade-in pb-20">
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ${isLoading ? 'opacity-60 blur-[1px]' : ''}`}>
                {SUMMARY_ACCOUNTS.map(acc => (
                    <RoomCard 
                        key={acc}
                        label={acc}
                        used={accountStats[acc]?.used || 0}
                        totalLimit={accountStats[acc]?.totalLimit || 0}
                        remaining={accountStats[acc]?.remaining || 0}
                        color={getAccountColor(acc)}
                    />
                ))}
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto max-w-full no-scrollbar">
                        {ACCOUNTS.map(acc => (
                            <button
                                key={acc}
                                onClick={() => setActiveTab(acc)}
                                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                                    activeTab === acc 
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-lg' 
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            >
                                {acc}
                            </button>
                        ))}
                    </div>

                    {!isLoading && onAddTaxRecord && (
                        <button 
                            onClick={() => setIsAddingRecord(true)}
                            className="bg-blue-600 dark:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] px-10 py-5 rounded-[1.5rem] shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                        >
                            <Plus size={18} strokeWidth={3} /> New Entry
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <History size={20} className="text-slate-400" />
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{activeTab} Ledger Detail</h4>
                            <div className="group relative flex items-center">
                                <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-tighter">
                                    <Lock size={10} /> Private Vault
                                </span>
                                <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-tight">
                                    This ledger is stored locally in your browser and backed up via Cloud Vault. It is not synced to Google Sheets.
                                </div>
                            </div>
                        </div>
                        <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 w-fit">
                            {activeRecords.length} Items Found
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Type</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-6 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {activeRecords.map(record => {
                                    const rawType = (record.transactionType || '').toUpperCase();
                                    const isLimit = LIMIT_TYPES.includes(rawType);
                                    const isWithdrawal = WITHDRAWAL_TYPES.includes(rawType);
                                    const isDeleting = deletingId === record.id;
                                    
                                    return (
                                        <tr key={record.id} className="hover:bg-blue-500/[0.03] transition-colors group">
                                            <td className="px-10 py-6 text-sm font-bold text-slate-500 dark:text-slate-400 font-mono">{record.date}</td>
                                            <td className="px-6 py-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                                    isLimit ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                                                    isWithdrawal ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                                                    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                    {isWithdrawal ? <ArrowDownRight size={12} /> : isLimit ? <Landmark size={12} /> : <ArrowUpRight size={12} />}
                                                    {record.transactionType}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-6 text-right font-black font-mono text-base ${isWithdrawal ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                                {formatBaseCurrency(record.value)}
                                            </td>
                                            <td className="px-10 py-6 text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-sm" title={record.description}>
                                                {record.description || <span className="opacity-30 italic">No notes</span>}
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingRecord(record)} className="p-2 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-blue-500/10 transition-all" title="Edit entry"><Pencil size={14} /></button>
                                                    <button onClick={() => handleDelete(record)} disabled={isDeleting} className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-all" title="Delete entry">
                                                        {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {activeRecords.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-28 text-center text-slate-400 font-medium opacity-60">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                    <History size={48} className="opacity-20" />
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-[0.3em]">No {activeTab} transactions detected</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <TaxRecordModal 
                isOpen={isAddingRecord || !!editingRecord} 
                initialData={editingRecord}
                defaultAccount={activeTab}
                onClose={() => { setIsAddingRecord(false); setEditingRecord(null); }} 
                onSave={async r => {
                    if (editingRecord && onEditTaxRecord) {
                        await onEditTaxRecord(r);
                    } else if (onAddTaxRecord) {
                        await onAddTaxRecord(r);
                    }
                }} 
            />
        </div>
    );
};
