
import React, { useMemo, memo, useState, useEffect } from 'react';
import { Subscription, BankAccount, DebtEntry, TaxRecord } from '../types';
import { CreditCard, Landmark, Calendar, Tag, Loader2, TrendingDown, Flame, Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronUp, Clock, ShieldCheck } from 'lucide-react';
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
}

// --- Helper for Debt precision ---
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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

// --- View ---

export const InformationView: React.FC<InformationViewProps> = ({ 
    subscriptions, accounts, debtEntries = [], taxRecords = [], isLoading = false,
    onAddSubscription, onEditSubscription, onDeleteSubscription,
    onAddAccount, onEditAccount, onDeleteAccount,
    onAddTaxRecord, onEditTaxRecord, onDeleteTaxRecord
}) => {
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [editingAcc, setEditingAcc] = useState<BankAccount | null>(null);
  const [isAddingAcc, setIsAddingAcc] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllDebt, setShowAllDebt] = useState(false); // Collapsed by default

  const totalMonthlyCost = useMemo(() => {
    const subCost = subscriptions.reduce((acc, sub) => {
        if (!sub.active) return acc;
        if (sub.period.toLowerCase() === 'monthly') return acc + sub.cost;
        if (sub.period.toLowerCase() === 'yearly') return acc + (sub.cost / 12);
        return acc;
    }, 0);
    const debtCost = debtEntries.reduce((acc, debt) => acc + (debt.monthlyPayment || 0), 0);
    return subCost + debtCost;
  }, [subscriptions, debtEntries]);

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

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Information
            {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Tax advantages, liabilities, and account details.</p>
        </div>
        <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl flex items-center gap-4 min-w-[240px] shadow-lg">
             <div className="p-3 bg-red-500/10 rounded-lg text-red-500"><Flame size={24} /></div>
             <div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Total Monthly Burn</p>
                 <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                     {isLoading ? <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : formatBaseCurrency(totalMonthlyCost)}
                 </div>
             </div>
        </div>
      </header>
      
      <div className={`space-y-12 transition-all duration-500 ${isLoading ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
          
          {/* Taxable Room Tracker */}
          <TaxRoomTracker 
            taxRecords={taxRecords} 
            isLoading={isLoading} 
            onAddTaxRecord={onAddTaxRecord}
            onEditTaxRecord={onEditTaxRecord}
            onDeleteTaxRecord={onDeleteTaxRecord}
          />

          {/* Liabilities */}
          <div className="space-y-4">
              <div className="flex justify-between items-center mb-4 px-1">
                  <h3 className="text-xl font-bold text-slate-400 dark:text-slate-300 flex items-center gap-2">
                      <TrendingDown size={20} className="text-red-500" /> Liabilities & Debt
                  </h3>
                  {hasMultipleDebt && (
                      <button 
                        onClick={() => setShowAllDebt(!showAllDebt)}
                        className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg"
                      >
                          {showAllDebt ? (
                              <><ChevronUp size={14} /> Show Less</>
                          ) : (
                              <><ChevronDown size={14} /> Show All ({visibleEntries.length})</>
                          )}
                      </button>
                  )}
              </div>
              <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm transition-all">
                <table className="w-full text-left table-auto">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><span className="flex items-center gap-1"><Clock size={12}/> Account / Type</span></th>
                            <th className="p-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Owed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {visibleDebt.map(debt => (
                            <tr key={debt.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="p-4 text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
                                    {debt.name || '-'}
                                </td>
                                <td className="p-4 text-right font-bold text-red-500 font-mono text-sm sm:text-base">
                                    {formatDebtAmount(debt.amountOwed)}
                                </td>
                            </tr>
                        ))}
                        {visibleDebt.length === 0 && (
                            <tr>
                                <td colSpan={2} className="p-10 text-center text-slate-400 italic">No valid debt entries found. Sync the 'debt' tab to load entries.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
              </div>
          </div>

          {/* Subscriptions */}
          <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                  <h3 className="text-xl font-bold text-slate-400 dark:text-slate-300 flex items-center gap-2">
                      <CreditCard size={20} className="text-purple-500" /> Recurring Subscriptions
                  </h3>
                  {onAddSubscription && <button onClick={() => setIsAddingSub(true)} className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20"><Plus size={18} /></button>}
              </div>
              <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service</th>
                            <th className="p-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Cost</th>
                            <th className="p-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {subscriptions.map(sub => (
                            <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                <td className="p-4">
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        {sub.name} {!sub.active && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-500">Inactive</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-500">{sub.category} • {sub.period}</div>
                                </td>
                                <td className="p-4 text-right font-medium text-slate-900 dark:text-white">{formatBaseCurrency(sub.cost)}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingSub(sub)} className="p-1.5 text-slate-400 hover:text-blue-500"><Pencil size={14} /></button>
                                        <button onClick={() => handleDeleteSub(sub)} disabled={deletingId === sub.id} className="p-1.5 text-slate-400 hover:text-red-500">{deletingId === sub.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>

          {/* Accounts */}
          <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                  <h3 className="text-xl font-bold text-slate-400 dark:text-slate-300 flex items-center gap-2">
                      <Landmark size={20} className="text-emerald-500" /> Banking Accounts
                  </h3>
                  {onAddAccount && <button onClick={() => setIsAddingAcc(true)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"><Plus size={18} /></button>}
              </div>
              <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Institution</th>
                            <th className="p-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Card / Method</th>
                            <th className="p-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {accounts.map(acc => (
                            <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                <td className="p-4">
                                    <div className="font-bold text-slate-900 dark:text-white">{acc.institution}</div>
                                    <div className="text-[10px] text-slate-500">{acc.name} • {acc.type}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                        <CreditCard size={12} className="text-slate-400" /> {acc.paymentType} {acc.accountNumber && <span className="text-slate-400 font-mono">•••• {acc.accountNumber}</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingAcc(acc)} className="p-1.5 text-slate-400 hover:text-blue-500"><Pencil size={14} /></button>
                                        <button onClick={() => handleDeleteAcc(acc)} disabled={deletingId === acc.id} className="p-1.5 text-slate-400 hover:text-red-500">{deletingId === acc.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      </div>

      <SubscriptionModal isOpen={isAddingSub || !!editingSub} initialData={editingSub} onClose={() => { setIsAddingSub(false); setEditingSub(null); }} onSave={async s => editingSub ? onEditSubscription?.(s) : onAddSubscription?.(s)} />
      <AccountModal isOpen={isAddingAcc || !!editingAcc} initialData={editingAcc} onClose={() => { setIsAddingAcc(false); setEditingAcc(null); }} onSave={async a => editingAcc ? onEditAccount?.(a) : onAddAccount?.(a)} />
    </div>
  );
};
