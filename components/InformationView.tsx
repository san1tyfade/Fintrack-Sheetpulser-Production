
import React, { useMemo, memo } from 'react';
import { Subscription, BankAccount, DebtEntry } from '../types';
import { CreditCard, Landmark, Calendar, Tag, Loader2, TrendingDown, Flame } from 'lucide-react';
import { formatBaseCurrency } from '../services/currencyService';

interface InformationViewProps {
  subscriptions: Subscription[];
  accounts: BankAccount[];
  debtEntries?: DebtEntry[];
  isLoading?: boolean;
}

// --- Reusable Components ---

const SectionHeader = ({ title, icon: Icon, color }: { title: string, icon: any, color: string }) => (
    <h3 className="text-xl font-bold text-slate-400 dark:text-slate-300 flex items-center gap-2 mb-4">
        <Icon size={20} className={color} /> {title}
    </h3>
);

const EmptyRow = ({ colSpan, msg }: { colSpan: number, msg: string }) => (
    <tr><td colSpan={colSpan} className="p-8 text-center text-slate-500">{msg}</td></tr>
);

// --- Section: Liabilities ---

const DebtSection = memo(({ data, isLoading }: { data: DebtEntry[], isLoading: boolean }) => (
    <div className="space-y-4 animate-fade-in">
        <SectionHeader title="Liabilities & Debt" icon={TrendingDown} color="text-red-500 dark:text-red-400" />
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Debt Name</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Interest Rate</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Monthly Payment</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Debt Owed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {data.map((debt) => (
                            <tr key={debt.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="p-4 font-bold text-slate-900 dark:text-white text-lg">
                                    {isLoading ? <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : debt.name}
                                </td>
                                <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                                    {isLoading ? <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : 
                                        `${debt.interestRate > 1.0 ? debt.interestRate.toFixed(2) : (debt.interestRate * 100).toFixed(2)}%`
                                    }
                                </td>
                                <td className="p-4 text-right font-medium text-red-500 dark:text-red-400">
                                    {isLoading ? <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : formatBaseCurrency(debt.monthlyPayment)}
                                </td>
                                <td className="p-4 font-bold text-slate-900 dark:text-white text-lg text-right">
                                    {isLoading ? <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : formatBaseCurrency(debt.amountOwed)}
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && <EmptyRow colSpan={4} msg="No debt records found." />}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
));

// --- Section: Subscriptions ---

const SubscriptionSection = memo(({ data, isLoading }: { data: Subscription[], isLoading: boolean }) => (
    <div className="space-y-4 animate-fade-in">
        <SectionHeader title="Recurring Subscriptions" icon={CreditCard} color="text-purple-500 dark:text-purple-400" />
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Frequency</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Cost</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Method</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {data.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {sub.name}
                                    {!sub.active && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">Inactive</span>}
                                </td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">
                                    <span className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded w-fit border border-slate-200 dark:border-slate-600/50">
                                        <Tag size={12} /> {sub.category}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} className="text-slate-500" /> {sub.period}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-medium text-slate-900 dark:text-white">
                                    {isLoading ? <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : `$${sub.cost.toFixed(2)}`}
                                </td>
                                <td className="p-4 text-right text-slate-500 dark:text-slate-400 text-sm">
                                    {sub.paymentMethod || '-'}
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && <EmptyRow colSpan={5} msg="No subscriptions found." />}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
));

// --- Section: Accounts ---

const AccountSection = memo(({ data, isLoading }: { data: BankAccount[], isLoading: boolean }) => (
    <div className="space-y-4 animate-fade-in">
        <SectionHeader title="Banking Accounts" icon={Landmark} color="text-emerald-500 dark:text-emerald-400" />
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Institution</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Method</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Type</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Purpose</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {data.map((acc) => {
                             const isCredit = (acc.transactionType || '').toLowerCase().includes('credit');
                             return (
                                <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                                        {acc.institution}
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">
                                        <span className="flex items-center gap-2">
                                            <CreditCard size={14} className="text-slate-500" />
                                            {acc.paymentType || 'Card'}
                                            {acc.accountNumber && acc.accountNumber !== '****' && (
                                                <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">•••• {acc.accountNumber}</span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${
                                            isCredit 
                                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                        }`}>
                                            {isCredit ? 'Credit' : 'Debit'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right text-slate-500 dark:text-slate-300 text-sm max-w-xs truncate">
                                        {isLoading ? <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : acc.purpose}
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && <EmptyRow colSpan={4} msg="No bank accounts found." />}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
));

export const InformationView: React.FC<InformationViewProps> = ({ subscriptions, accounts, debtEntries = [], isLoading = false }) => {

  const totalMonthlyCost = useMemo(() => {
    const subCost = subscriptions.reduce((acc, sub) => {
        if (!sub.active) return acc;
        if (sub.period.toLowerCase() === 'monthly') return acc + sub.cost;
        return acc;
    }, 0);

    const debtCost = debtEntries.reduce((acc, debt) => acc + (debt.monthlyPayment || 0), 0);

    return subCost + debtCost;
  }, [subscriptions, debtEntries]);

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Information
            {isLoading && <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={24} />}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Recurring expenses, liabilities, and account details.</p>
        </div>
        
        {/* Total Burn Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl flex items-center gap-4 min-w-[240px] shadow-lg">
             <div className="p-3 bg-red-500/10 rounded-lg text-red-500 dark:text-red-400">
                <Flame size={24} />
             </div>
             <div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Total Monthly Burn</p>
                 <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                     {isLoading ? <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : formatBaseCurrency(totalMonthlyCost)}
                 </div>
             </div>
        </div>
      </header>
      
      <div className={`space-y-12 transition-all duration-500 ${isLoading ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
          <DebtSection data={debtEntries} isLoading={isLoading} />
          <SubscriptionSection data={subscriptions} isLoading={isLoading} />
          <AccountSection data={accounts} isLoading={isLoading} />
      </div>
    </div>
  );
};
