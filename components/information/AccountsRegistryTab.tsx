
import React from 'react';
import { BankAccount } from '../../types';
import { Landmark, Plus, Pencil, Trash2, Wallet } from 'lucide-react';

interface AccountsRegistryTabProps {
  accounts: BankAccount[];
  onAdd: () => void;
  onEdit: (acc: BankAccount) => void;
  onDelete: (acc: BankAccount) => Promise<void>;
  isReadOnly: boolean;
}

export const AccountsRegistryTab: React.FC<AccountsRegistryTabProps> = ({ accounts, onAdd, onEdit, onDelete, isReadOnly }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4">
          <Landmark size={28} className="text-emerald-500" /> Institution Vault
        </h3>
        {!isReadOnly && (
          <button 
            onClick={onAdd} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
          >
            <Plus size={18} className="inline mr-2" /> New Bank
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm hover:border-emerald-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReadOnly && (
                <div className="flex gap-1">
                  <button onClick={() => onEdit(acc)} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg active:scale-90 transition-all">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDelete(acc)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg active:scale-90 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-3xl group-hover:bg-emerald-500/10 transition-colors">
                <Landmark size={24} className="text-slate-400 group-hover:text-emerald-500" />
              </div>
              <div>
                <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">{acc.institution}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{acc.type}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Wallet size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{acc.paymentType}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">•••• {acc.accountNumber}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed italic truncate" title={acc.purpose}>
                {acc.purpose || 'No description provided'}
              </p>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] opacity-40 uppercase font-black text-xs tracking-widest">
            No accounts mapped in registry
          </div>
        )}
      </div>
    </div>
  );
};
