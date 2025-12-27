
import React, { useMemo, memo, useState, useEffect } from 'react';
import { Subscription, BankAccount, DebtEntry, TaxRecord } from '../types';
import { CreditCard, Landmark, Calendar, Tag, Loader2, TrendingDown, Flame, Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronUp, Clock, ShieldCheck, Briefcase, Wallet, Receipt } from 'lucide-react';
import { formatBaseCurrency, PRIMARY_CURRENCY } from '../services/currencyService';
import { TaxRoomTracker } from './TaxRoomTracker';

interface InformationViewProps {
  subscriptions: Subscription[];
  accounts: BankAccount[];
  debtEntries?: DebtEntry[];
  taxRecords?: TaxRecord[];
  isLoading?: boolean;
  onAddSubscription?: (sub: Subscription) => Promise<void>;
  onEditSubscription?: (sub: Subscription) => Promise<void>;
  onDeleteSubscription?: (sub: Subscription) => Promise<void>;
  onAddAccount?: (acc: BankAccount) => Promise<void>;
  onEditAccount?: (acc: BankAccount) => Promise<void>;
  onDeleteAccount?: (acc: BankAccount) => Promise<void>;
  onAddTaxRecord?: (rec: TaxRecord) => Promise<void>;
  onEditTaxRecord?: (rec: TaxRecord) => Promise<void>;
  onDeleteTaxRecord?: (rec: TaxRecord) => Promise<void>;
  isReadOnly?: boolean;
}

type InfoTab = 'tax' | 'commitments' | 'accounts';

const formatDebtAmount = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { 
        style: 'currency', 
        currency: PRIMARY_CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
    }).format(amount);
};

// --- Modals ---

const SubscriptionModal = ({ isOpen, onClose, onSave, initialData }: { isOpen: boolean, onClose: () => void, onSave: (s: Subscription) => Promise<void>, initialData?: Subscription | null }) => {
    const [formData, setFormData] = useState<Partial<Subscription>>({
        name: '', cost: 0, period: 'Monthly', category: 'General', active: true, paymentMethod: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) setFormData(initialData);
        else if (isOpen) setFormData({ name: '', cost: 0, period: 'Monthly', category: 'General', active: true, paymentMethod: '' });
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                ...formData as Subscription,
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex
            });
            onClose();
        } catch (e) { alert(e); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        {initialData ? <Pencil size={18} /> : <Plus size={18} />}
                        {initialData ? 'Edit Subscription' : 'New Subscription'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monthly Cost</label>
                            <input type="number" step="any" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequency</label>
                            <select value={formData.period} onChange={e => setFormData({...formData, period: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="Monthly">Monthly</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                        <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Entertainment, Software" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                        <input type="text" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Visa 1234" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="rounded text-blue-500" />
                        <label className="text-xs font-bold text-slate-500 uppercase">Active Subscription</label>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {initialData ? 'Update' : 'Save'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const AccountModal = ({ isOpen, onClose, onSave, initialData }: { isOpen: boolean, onClose: () => void, onSave: (a: BankAccount) => Promise<void>, initialData?: BankAccount | null }) => {
    const [formData, setFormData] = useState<Partial<BankAccount>>({
        institution: '', name: '', type: 'Checking', paymentType: 'Card', accountNumber: '', transactionType: 'Debit', currency: PRIMARY_CURRENCY, purpose: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) setFormData(initialData);
        else if (isOpen) setFormData({ institution: '', name: '', type: 'Checking', paymentType: 'Card', accountNumber: '', transactionType: 'Debit', currency: PRIMARY_CURRENCY, purpose: '' });
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                ...formData as BankAccount,
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex
            });
            onClose();
        } catch (e) { alert(e); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        {initialData ? <Pencil size={18} /> : <Plus size={18} />}
                        {initialData ? 'Edit Account' : 'New Account'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Institution</label>
                            <input type="text" value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Number</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="e.g. Primary Checking" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Type</label>
                            <input type="text" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="e.g. Checking, Savings" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last 4 Digits</label>
                            <input type="text" maxLength={4} value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none font-mono" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Method Type</label>
                            <select value={formData.transactionType} onChange={e => setFormData({...formData, transactionType: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none">
                                <option value="Debit">Debit</option>
                                <option value="Credit">Credit</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none">
                                <option value="CAD">CAD</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purpose / Note</label>
                        <textarea value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none min-h-[80px]" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {initialData ? 'Update Account' : 'Save Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Main View ---

export const InformationView: React.FC<InformationViewProps> = ({ 
    subscriptions, accounts, debtEntries = [], taxRecords = [], isLoading = false,
    onAddSubscription, onEditSubscription, onDeleteSubscription,
    onAddAccount, onEditAccount, onDeleteAccount,
    onAddTaxRecord, onEditTaxRecord, onDeleteTaxRecord,
    isReadOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<InfoTab>('tax');
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [editingAcc, setEditingAcc] = useState<BankAccount | null>(null);
  const [isAddingAcc, setIsAddingAcc] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllDebt, setShowAllDebt] = useState(false);

  const subStats = useMemo(() => {
    const activeSubs = subscriptions.filter(s => s.active);
    const monthlyCost = activeSubs.reduce((acc, sub) => {
        if (sub.period.toLowerCase() === 'monthly') return acc + sub.cost;
        if (sub.period.toLowerCase() === 'yearly') return acc + (sub.cost / 12);
        if (sub.period.toLowerCase() === 'weekly') return acc + (sub.cost * 4.33);
        return acc;
    }, 0);
    return { count: activeSubs.length, monthlyCost };
  }, [subscriptions]);

  const totalMonthlyCost = useMemo(() => {
    const debtCost = debtEntries.reduce((acc, debt) => acc + (debt.monthlyPayment || 0), 0);
    return subStats.monthlyCost + debtCost;
  }, [subStats.monthlyCost, debtEntries]);

  const handleDeleteSub = async (sub: Subscription) => {
      if (!onDeleteSubscription || !confirm(`Delete subscription "${sub.name}"?`)) return;
      setDeletingId(sub.id);
      try { await onDeleteSubscription(sub); } catch (e) { alert(e); }
      finally { setDeletingId(null); }
  };

  const handleDeleteAcc = async (acc: BankAccount) => {
      if (!onDeleteAccount || !confirm(`Delete account "${acc.institution} - ${acc.name}"?`)) return;
      setDeletingId(acc.id);
      try { await onDeleteAccount(acc); } catch (e) { alert(e); }
      finally { setDeletingId(null); }
  };

  const visibleEntries = useMemo(() => {
    return debtEntries
      .slice(1) 
      .filter(debt => Math.abs(debt.amountOwed) > 0.001); 
  }, [debtEntries]);

  const visibleDebt = showAllDebt ? visibleEntries : visibleEntries.slice(0, 1);
  const hasMultipleDebt = visibleEntries.length > 1;

  const TabButton = ({ id, label, icon: Icon }: { id: InfoTab, label: string, icon: any }) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === id 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-y-[-2px]' 
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
        }`}
    >
        <Icon size={16} />
        {label}
    </button>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            Information
            {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Detailed financial registry and commitment tracking.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <TabButton id="tax" label="Tax Advantage" icon={ShieldCheck} />
            <TabButton id="commitments" label="Commitments" icon={Receipt} />
            <TabButton id="accounts" label="Accounts" icon={Landmark} />
        </div>
      </header>
      
      <div className={`transition-all duration-500 ${isLoading ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
          
          {/* Tab Content: Tax Advantage */}
          {activeTab === 'tax' && (
            <div className="animate-fade-in">
              <TaxRoomTracker 
                taxRecords={taxRecords} 
                isLoading={isLoading} 
                onAddTaxRecord={onAddTaxRecord}
                onEditTaxRecord={onEditTaxRecord}
                onDeleteTaxRecord={onDeleteTaxRecord}
              />
            </div>
          )}

          {/* Tab Content: Commitments */}
          {activeTab === 'commitments' && (
            <div className="space-y-10 animate-fade-in">
                {/* Commitment Hero Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-red-500 to-rose-600 p-8 rounded-3xl shadow-xl shadow-red-500/20 text-white relative overflow-hidden group">
                        <Flame size={120} className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Monthly Burn</p>
                            <h3 className="text-4xl font-black tracking-tighter mb-6">
                                {isLoading ? "---" : formatBaseCurrency(totalMonthlyCost)}
                            </h3>
                            <div className="flex gap-4">
                                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl">
                                    <p className="text-[8px] font-black uppercase opacity-60">Subscriptions</p>
                                    <p className="text-sm font-bold">{formatBaseCurrency(subStats.monthlyCost)}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl">
                                    <p className="text-[8px] font-black uppercase opacity-60">Debt Service</p>
                                    <p className="text-sm font-bold">{formatBaseCurrency(totalMonthlyCost - subStats.monthlyCost)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl"><CreditCard size={24} /></div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-none">Subscription Health</h4>
                                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">{subStats.count} Active Services</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Recurring costs represent your "leakage". Review these services monthly to ensure you're getting value from every dollar spent.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Liabilities */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <TrendingDown size={20} className="text-red-500" /> Liabilities & Debt
                            </h3>
                            {hasMultipleDebt && (
                                <button 
                                    onClick={() => setShowAllDebt(!showAllDebt)}
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-2 rounded-xl transition-all"
                                >
                                    {showAllDebt ? <><ChevronUp size={14} /> Less</> : <><ChevronDown size={14} /> More ({visibleEntries.length})</>}
                                </button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-900/30">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account / Loan</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {visibleDebt.map(debt => (
                                        <tr key={debt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-6 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                                                {debt.name || '-'}
                                            </td>
                                            <td className="p-6 text-right font-black text-red-500 font-mono text-lg">
                                                {formatDebtAmount(debt.amountOwed)}
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleDebt.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="p-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest italic opacity-50">No debt entries detected.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Subscriptions */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <CreditCard size={20} className="text-purple-500" /> Recurring Burn
                            </h3>
                            {onAddSubscription && !isReadOnly && (
                                <button onClick={() => setIsAddingSub(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                                    <Plus size={16} /> New Service
                                </button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 dark:bg-slate-900/30">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cost</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {subscriptions.map(sub => (
                                            <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="p-6">
                                                    <div className="font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                                                        {sub.name} {!sub.active && <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-500 font-black uppercase">Inactive</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{sub.category} • {sub.period}</div>
                                                </td>
                                                <td className="p-6 text-right font-black text-slate-900 dark:text-white font-mono text-base">{formatBaseCurrency(sub.cost)}</td>
                                                <td className="p-6 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!isReadOnly && <button onClick={() => setEditingSub(sub)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"><Pencil size={14} /></button>}
                                                        {!isReadOnly && <button onClick={() => handleDeleteSub(sub)} disabled={deletingId === sub.id} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all">{deletingId === sub.id ? <Loader2 className="animate-spin text-red-500" size={14} /> : <Trash2 size={14} />}</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* Tab Content: Accounts */}
          {activeTab === 'accounts' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center px-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                      <Landmark size={24} className="text-emerald-500" /> Banking Institutions
                  </h3>
                  {onAddAccount && !isReadOnly && (
                    <button onClick={() => setIsAddingAcc(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                        <Plus size={16} /> New Institution
                    </button>
                  )}
              </div>
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/30">
                        <tr>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution / Brand</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Card / Method</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {accounts.map(acc => (
                            <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="p-6">
                                    <div className="font-black text-slate-900 dark:text-white tracking-tight text-base">{acc.institution}</div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{acc.name} • {acc.type}</div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 w-fit px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <Wallet size={14} className="text-slate-400" /> 
                                        {acc.paymentType} 
                                        {acc.accountNumber && <span className="text-slate-400 font-mono tracking-tighter ml-1">•••• {acc.accountNumber}</span>}
                                    </div>
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!isReadOnly && <button onClick={() => setEditingAcc(acc)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"><Pencil size={14} /></button>}
                                        {!isReadOnly && <button onClick={() => handleDeleteAcc(acc)} disabled={deletingId === acc.id} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all">{deletingId === acc.id ? <Loader2 className="animate-spin text-red-500" size={14} /> : <Trash2 size={14} />}</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>
          )}
      </div>

      <SubscriptionModal isOpen={isAddingSub || !!editingSub} initialData={editingSub} onClose={() => { setIsAddingSub(false); setEditingSub(null); }} onSave={async s => editingSub ? onEditSubscription?.(s) : onAddSubscription?.(s)} />
      <AccountModal isOpen={isAddingAcc || !!editingAcc} initialData={editingAcc} onClose={() => { setIsAddingAcc(false); setEditingAcc(null); }} onSave={async a => editingAcc ? onEditAccount?.(a) : onAddAccount?.(a)} />
    </div>
  );
};
