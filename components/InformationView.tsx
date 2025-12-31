
import React, { useState, useEffect } from 'react';
import { Subscription, BankAccount, DebtEntry, TaxRecord } from '../types';
import { Landmark, Loader2, ShieldCheck, Receipt } from 'lucide-react';
import { PRIMARY_CURRENCY } from '../services/currencyService';
import { TaxRoomTracker } from './information/TaxRoomTracker';
import { RegistryModal } from './information/RegistryModal';
import { CommitmentsTab } from './information/CommitmentsTab';
import { AccountsRegistryTab } from './information/AccountsRegistryTab';

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

export const InformationView: React.FC<InformationViewProps> = ({ 
    subscriptions, accounts, debtEntries = [], taxRecords = [], isLoading = false,
    onAddSubscription, onEditSubscription, onDeleteSubscription,
    onAddAccount, onEditAccount, onDeleteAccount,
    onAddTaxRecord, onEditTaxRecord, onDeleteTaxRecord,
    isReadOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<InfoTab>('tax');
  const [modalState, setModalState] = useState<{ type: 'sub' | 'acc' | null, data: any | null }>({ type: null, data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for RegistryModals
  const [subForm, setSubForm] = useState<Partial<Subscription>>({});
  const [accForm, setAccForm] = useState<Partial<BankAccount>>({});

  useEffect(() => {
    if (modalState.type === 'sub') {
        setSubForm(modalState.data || { name: '', cost: 0, period: 'Monthly', category: 'General', active: true });
    }
    if (modalState.type === 'acc') {
        setAccForm(modalState.data || { institution: '', name: '', type: 'Checking', paymentType: 'Card', transactionType: 'Debit', currency: PRIMARY_CURRENCY });
    }
  }, [modalState]);

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const payload = { ...subForm as Subscription, id: modalState.data?.id || crypto.randomUUID(), rowIndex: modalState.data?.rowIndex };
      modalState.data ? await onEditSubscription?.(payload) : await onAddSubscription?.(payload);
      setModalState({ type: null, data: null });
    } catch (e: any) { alert(e.message || e); } finally { setIsSubmitting(false); }
  };

  const handleAccSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const payload = { ...accForm as BankAccount, id: modalState.data?.id || crypto.randomUUID(), rowIndex: modalState.data?.rowIndex };
      modalState.data ? await onEditAccount?.(payload) : await onAddAccount?.(payload);
      setModalState({ type: null, data: null });
    } catch (e: any) { alert(e.message || e); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
            Registry
            {isLoading && <Loader2 className="animate-spin text-blue-500" size={28} />}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Comprehensive financial inventory and asset management hub.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-inner">
            {[ 
              { id:'tax', l:'Tax Matrix', i:ShieldCheck }, 
              { id:'commitments', l:'Commitments', i:Receipt }, 
              { id:'accounts', l:'Institutions', i:Landmark } 
            ].map(t => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id as any)} 
                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === t.id 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl translate-y-[-2px]' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <t.i size={16} />{t.l}
              </button>
            ))}
        </div>
      </header>

      <div className={`transition-all duration-700 ${isLoading ? 'opacity-50 blur-[2px] pointer-events-none' : ''}`}>
        {activeTab === 'tax' && (
          <TaxRoomTracker 
            taxRecords={taxRecords} 
            isLoading={isLoading} 
            onAddTaxRecord={onAddTaxRecord} 
            onEditTaxRecord={onEditTaxRecord} 
            onDeleteTaxRecord={onDeleteTaxRecord} 
          />
        )}
        
        {activeTab === 'commitments' && (
          <CommitmentsTab 
            subscriptions={subscriptions} 
            debtEntries={debtEntries} 
            isLoading={isLoading} 
            isReadOnly={isReadOnly} 
            onAdd={() => setModalState({type: 'sub', data: null})} 
            onEdit={(s) => setModalState({type:'sub', data:s})} 
            onDelete={onDeleteSubscription || (async () => {})} 
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsRegistryTab 
            accounts={accounts} 
            isReadOnly={isReadOnly}
            onAdd={() => setModalState({type: 'acc', data: null})} 
            onEdit={(acc) => setModalState({type:'acc', data:acc})} 
            onDelete={onDeleteAccount || (async () => {})} 
          />
        )}
      </div>

      <RegistryModal 
        isOpen={modalState.type === 'sub'} 
        onClose={() => setModalState({type:null, data:null})} 
        title={modalState.data ? 'Edit Commitment' : 'New Commitment'} 
        icon={Receipt} 
        iconColor="text-indigo-500" 
        isSubmitting={isSubmitting} 
        onSubmit={handleSubSubmit}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Name</label>
            <input type="text" value={subForm.name || ''} onChange={e => setSubForm({...subForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount</label>
              <input type="number" step="any" value={subForm.cost || ''} onChange={e => setSubForm({...subForm, cost: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold font-mono outline-none" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Period</label>
              <select value={subForm.period} onChange={e => setSubForm({...subForm, period: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none appearance-none">
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <input type="checkbox" checked={subForm.active} onChange={e => setSubForm({...subForm, active: e.target.checked})} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600" />
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Commitment</label>
          </div>
        </div>
      </RegistryModal>

      <RegistryModal 
        isOpen={modalState.type === 'acc'} 
        onClose={() => setModalState({type:null, data:null})} 
        title={modalState.data ? 'Edit Institution' : 'New Institution'} 
        icon={Landmark} 
        iconColor="text-emerald-500" 
        isSubmitting={isSubmitting} 
        onSubmit={handleAccSubmit}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bank Name</label>
              <input type="text" value={accForm.institution || ''} onChange={e => setAccForm({...accForm, institution: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Label</label>
              <input type="text" value={accForm.name || ''} onChange={e => setAccForm({...accForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="e.g. Primary" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account Type</label>
              <input type="text" value={accForm.type || ''} onChange={e => setAccForm({...accForm, type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Last 4</label>
              <input type="text" maxLength={4} value={accForm.accountNumber || ''} onChange={e => setAccForm({...accForm, accountNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black font-mono outline-none" />
            </div>
          </div>
        </div>
      </RegistryModal>
    </div>
  );
};
