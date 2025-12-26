
import React, { useMemo, memo, useState, useEffect } from 'react';
import { TaxRecord } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ShieldCheck, Landmark, Sparkles, Briefcase, History, Info, AlertCircle, TrendingUp, Plus, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import { formatBaseCurrency } from '../services/currencyService';

interface TaxRoomTrackerProps {
  taxRecords: TaxRecord[];
  isLoading?: boolean;
  onAddTaxRecord?: (rec: TaxRecord) => Promise<void>;
  onEditTaxRecord?: (rec: TaxRecord) => Promise<void>;
  onDeleteTaxRecord?: (rec: TaxRecord) => Promise<void>;
}

interface AccountStat {
    used: number;
    remaining: number;
    totalLimit: number;
    withdrawalsThisYear: number;
}

// --- Modals ---

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
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen) {
            setFormData({
                recordType: defaultAccount,
                transactionType: 'Contribution',
                date: new Date().toISOString().split('T')[0],
                value: 0,
                description: '',
                accountFund: defaultAccount
            });
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
        } catch (e) { alert(e); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        {initialData ? <Pencil size={18} /> : <Plus size={18} />}
                        {initialData ? 'Edit Record' : 'New Record'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Type</label>
                            <select 
                                value={formData.recordType} 
                                onChange={e => setFormData({...formData, recordType: e.target.value, accountFund: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
                            >
                                <option value="TFSA">TFSA</option>
                                <option value="FHSA">FHSA</option>
                                <option value="RRSP">RRSP</option>
                                <option value="PENSION">Pension</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transaction Type</label>
                        <select 
                            value={formData.transactionType} 
                            onChange={e => setFormData({...formData, transactionType: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
                        >
                            <option value="Contribution">Contribution</option>
                            <option value="Withdrawal">Withdrawal</option>
                            <option value="Limit Increase">Limit Increase</option>
                            <option value="Opening Balance">Opening Balance</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Value</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <input 
                                type="number" 
                                step="any" 
                                value={formData.value || ''} 
                                onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-mono outline-none" 
                                required 
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 italic">Use negative values for literal withdrawals if tracking spent capital.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none min-h-[60px]" 
                            placeholder="Details about this transaction..."
                        />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-slate-900 dark:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {initialData ? 'Update Record' : 'Add Record'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Sub-Components ---

const AccountRoomCard = memo(({ 
    label, 
    used, 
    remaining, 
    totalLimit, 
    color 
}: { 
    label: string, 
    used: number, 
    remaining: number, 
    totalLimit: number, 
    color: string 
}) => {
    const data = [
        { name: 'Used', value: Math.max(0, used) },
        { name: 'Remaining', value: Math.max(0, remaining) }
    ];
    const pctUsed = totalLimit > 0 ? (used / totalLimit) * 100 : 0;
    
    const getIcon = () => {
        const l = label.toUpperCase();
        if (l.includes('TFSA')) return <ShieldCheck size={24} />;
        if (l.includes('FHSA')) return <Landmark size={24} />;
        if (l.includes('RRSP')) return <Sparkles size={24} />;
        return <Briefcase size={24} />;
    };

    return (
        <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col shadow-sm dark:shadow-lg transition-all hover:border-blue-400/30 dark:hover:border-slate-700">
            <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500" style={{ color: pctUsed > 0 ? color : undefined }}>
                        {getIcon()}
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white leading-none">{label}</h4>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Room Tracker</p>
                    </div>
                </div>
                <div className="relative w-16 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                innerRadius={22}
                                outerRadius={28}
                                paddingAngle={0}
                                dataKey="value"
                                startAngle={90}
                                endAngle={450}
                                stroke="none"
                            >
                                <Cell fill={color} />
                                <Cell fill="currentColor" className="text-slate-100 dark:text-slate-800" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black text-slate-900 dark:text-white">{Math.round(pctUsed)}%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Used</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatBaseCurrency(used)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Remaining</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-500 font-mono">{formatBaseCurrency(remaining)}</p>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Max Lifetime Limit</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">{formatBaseCurrency(totalLimit)}</p>
            </div>
        </div>
    );
});

export const TaxRoomTracker: React.FC<TaxRoomTrackerProps> = ({ taxRecords, isLoading, onAddTaxRecord, onEditTaxRecord, onDeleteTaxRecord }) => {
    const [activeTab, setActiveTab] = useState<string>('TFSA');
    const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);
    const [isAddingRecord, setIsAddingRecord] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const stats = useMemo<Record<string, AccountStat>>(() => {
        const currentYear = new Date().getFullYear();
        const accounts = ['TFSA', 'FHSA', 'RRSP', 'PENSION'];
        const results: Record<string, AccountStat> = {};

        accounts.forEach((acc: string) => {
            const records = taxRecords.filter(r => {
                const rType = r.recordType.toUpperCase();
                if (acc === 'PENSION') return rType.includes('LAPP') || rType.includes('PENSION');
                return rType === acc;
            });
            
            let totalLimit = 0;
            let totalUsed = 0;
            let withdrawalsThisYear = 0;

            records.forEach(r => {
                const type = (r.transactionType || '').trim().toUpperCase();
                const desc = (r.description || '').toUpperCase();
                const val = r.value || 0;
                const year = new Date(r.date).getFullYear();

                const isLimit = type.includes('LIMIT') || type.includes('INCREASE') || desc.includes('LIMIT') || desc.includes('INCREASE');
                const isWithdrawal = type.includes('WITHDRAW');

                if (isLimit) {
                    totalLimit += Math.abs(val);
                } else {
                    totalUsed += val;
                    if (isWithdrawal && year === currentYear) {
                        withdrawalsThisYear += Math.abs(val);
                    }
                }
            });

            results[acc] = {
                used: totalUsed,
                remaining: Math.max(0, totalLimit - totalUsed),
                totalLimit,
                withdrawalsThisYear
            };
        });

        return results;
    }, [taxRecords]);

    const activeRecords = useMemo(() => {
        return taxRecords.filter(r => {
            const rType = r.recordType.toUpperCase();
            if (activeTab === 'PENSION') return rType.includes('LAPP') || rType.includes('PENSION');
            return rType === activeTab;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [taxRecords, activeTab]);

    const getColor = (label: string) => {
        if (label.includes('TFSA')) return '#10b981'; // Emerald
        if (label.includes('FHSA')) return '#3b82f6'; // Blue
        if (label.includes('RRSP')) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red for Pension/LAPP
    };

    const handleDeleteRecord = async (record: TaxRecord) => {
        if (!onDeleteTaxRecord || !confirm(`Are you sure you want to delete this ${record.transactionType} record?`)) return;
        setDeletingId(record.id);
        try {
            await onDeleteTaxRecord(record);
        } catch (e) {
            alert(e);
        } finally {
            setDeletingId(null);
        }
    };

    if (!taxRecords.length && !isLoading) return null;

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['TFSA', 'FHSA', 'RRSP'].map(acc => (
                    <AccountRoomCard 
                        key={acc}
                        label={acc}
                        used={stats[acc]?.used || 0}
                        remaining={stats[acc]?.remaining || 0}
                        totalLimit={stats[acc]?.totalLimit || 0}
                        color={getColor(acc)}
                    />
                ))}
            </div>

            {/* Tab Navigation + Add Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex p-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit shadow-sm">
                    {['TFSA', 'FHSA', 'RRSP', 'PENSION'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                
                {onAddTaxRecord && (
                    <button 
                        onClick={() => setIsAddingRecord(true)}
                        className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-md active:scale-95"
                    >
                        <Plus size={16} /> New Record
                    </button>
                )}
            </div>

            {/* Ledger Detail Table */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="flex items-center gap-3">
                        <History size={20} className="text-slate-400 dark:text-slate-500" />
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                            {activeTab} Ledger Detail
                        </h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                            {activeRecords.length} Entries Found
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/30">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Value</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Description</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {activeRecords.map((record) => {
                                const type = (record.transactionType || '').toUpperCase();
                                const desc = (record.description || '').toUpperCase();
                                const isWithdrawal = type.includes('WITHDRAW');
                                const isLimit = type.includes('LIMIT') || type.includes('INCREASE') || desc.includes('LIMIT') || desc.includes('INCREASE');
                                const canEdit = record.rowIndex !== undefined;
                                const isDeleting = deletingId === record.id;
                                
                                return (
                                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400 font-mono uppercase">{record.date}</td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                isWithdrawal ? 'text-red-500' : isLimit ? 'text-blue-500 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-500'
                                            }`}>
                                                {record.transactionType || 'Entry'}
                                            </span>
                                        </td>
                                        <td className={`px-8 py-5 text-right text-sm font-bold font-mono ${record.value < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                            {formatBaseCurrency(record.value)}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase truncate max-w-xs">
                                            {record.description}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canEdit && onEditTaxRecord && (
                                                    <button 
                                                        onClick={() => setEditingRecord(record)} 
                                                        className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                )}
                                                {canEdit && onDeleteTaxRecord && (
                                                    <button 
                                                        onClick={() => handleDeleteRecord(record)} 
                                                        disabled={isDeleting}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        {isDeleting ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {activeRecords.length === 0 && (
                        <div className="py-24 flex flex-col items-center justify-center text-center px-8">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6 border border-slate-100 dark:border-slate-700">
                                <Info size={32} />
                            </div>
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-bold italic max-w-md">
                                No {activeTab} records detected. Verify the "Taxable Accounts" sheet has relevant rows.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <TaxRecordModal 
                isOpen={isAddingRecord || !!editingRecord} 
                initialData={editingRecord}
                defaultAccount={activeTab === 'PENSION' ? 'PENSION' : activeTab}
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
