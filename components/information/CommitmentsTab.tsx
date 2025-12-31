
import React, { useMemo, useState } from 'react';
import { Subscription, DebtEntry } from '../../types';
import { CreditCard, Flame, TrendingDown, ChevronUp, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { calculateMonthlyBurn } from '../../services/temporalUtils';

interface CommitmentsTabProps {
  subscriptions: Subscription[];
  debtEntries: DebtEntry[];
  onAdd: () => void;
  onEdit: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => Promise<void>;
  isLoading: boolean;
  isReadOnly: boolean;
}

export const CommitmentsTab: React.FC<CommitmentsTabProps> = ({ 
  subscriptions, debtEntries, onAdd, onEdit, onDelete, isLoading, isReadOnly 
}) => {
  const [showAllDebt, setShowAllDebt] = useState(false);

  const subStats = useMemo(() => {
    const active = subscriptions.filter(s => s.active);
    const cost = active.reduce((acc, s) => acc + calculateMonthlyBurn(s.cost, s.period), 0);
    return { count: active.length, monthlyCost: cost };
  }, [subscriptions]);

  const validDebtEntries = useMemo(() => 
    (debtEntries || []).filter(d => d.date && d.date.trim() !== ''), 
    [debtEntries]
  );

  const totalMonthlyBurn = useMemo(() => 
    subStats.monthlyCost + (validDebtEntries.reduce((acc, d) => acc + (d.monthlyPayment || 0), 0) || 0), 
    [subStats.monthlyCost, validDebtEntries]
  );

  const visibleDebt = showAllDebt ? validDebtEntries : validDebtEntries.slice(0, 2);

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 dark:bg-slate-850 p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
          <Flame size={120} className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700 fill-white" />
          <div className="relative z-10 space-y-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recurring Velocity</p>
              <h3 className="text-5xl font-black tracking-tighter">
                {isLoading ? "---" : formatBaseCurrency(totalMonthlyBurn)}
                <span className="text-xl text-slate-500 font-bold ml-2">/ MO</span>
              </h3>
            </div>
            <div className="flex gap-6">
              <div className="bg-white/5 px-6 py-4 rounded-3xl border border-white/5">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Subscriptions</p>
                <p className="text-lg font-black">{formatBaseCurrency(subStats.monthlyCost)}</p>
              </div>
              <div className="bg-white/5 px-6 py-4 rounded-3xl border border-white/5">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Liabilities</p>
                <p className="text-lg font-black">{formatBaseCurrency(totalMonthlyBurn - subStats.monthlyCost)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-10 rounded-[2.5rem] flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-5 mb-6">
            <div className="p-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-3xl shadow-inner"><CreditCard size={32} /></div>
            <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-none">Cash Outflow</h4>
                <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-widest">{subStats.count} Active Commitments</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Automated commitments are the silent erosion of wealth. Monthly audits ensure every dollar assigned provides maximum utility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <TrendingDown size={24} className="text-rose-500" /> Liabilities Registry
            </h3>
            {validDebtEntries.length > 2 && (
              <button 
                onClick={() => setShowAllDebt(!showAllDebt)} 
                className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2 rounded-2xl transition-all"
              >
                {showAllDebt ? <><ChevronUp size={14} /> Less</> : <><ChevronDown size={14} /> View All ({validDebtEntries.length})</>}
              </button>
            )}
          </div>
          <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-8">Account / Service</th>
                  <th className="p-8 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {visibleDebt.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-8 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{d.name}</td>
                    <td className="p-8 text-right font-black text-rose-500 font-mono text-xl">{formatBaseCurrency(d.amountOwed)}</td>
                  </tr>
                ))}
                {validDebtEntries.length === 0 && (
                  <tr><td colSpan={2} className="p-10 text-center text-xs text-slate-400 font-medium">No valid liabilities detected in spreadsheet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <CreditCard size={24} className="text-indigo-500" /> Subscription Ledger
            </h3>
            {!isReadOnly && (
              <button 
                onClick={onAdd} 
                className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <Plus size={16} className="inline mr-2" /> New Entry
              </button>
            )}
          </div>
          <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-8">Service</th>
                  <th className="p-8 text-right">Cost</th>
                  <th className="p-8 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="p-8">
                      <div className="font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight text-base">
                        {s.name} 
                        {!s.active && <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-black uppercase">Paused</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">{s.category} • {s.period}</div>
                    </td>
                    <td className="p-8 text-right font-black text-slate-900 dark:text-white font-mono text-lg">{formatBaseCurrency(s.cost)}</td>
                    <td className="p-8 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isReadOnly && (
                          <>
                            <button onClick={() => onEdit(s)} className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all active:scale-90"><Pencil size={14} /></button>
                            <button onClick={() => onDelete(s)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr><td colSpan={3} className="p-10 text-center text-xs text-slate-400 font-medium">No subscriptions logged.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
