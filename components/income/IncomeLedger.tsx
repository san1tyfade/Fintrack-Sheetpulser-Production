
import React, { useState, useEffect, useRef } from 'react';
import { DetailedExpenseData, DetailedIncomeData } from '../../types';
import { Loader2, AlertCircle, Check, Save } from 'lucide-react';

interface IncomeLedgerProps {
  expenseData: DetailedExpenseData;
  incomeData: DetailedIncomeData;
  isLoading: boolean;
  onUpdateExpense: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
  onUpdateIncome: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
}

const EditableCell = ({ value, onSave }: { value: number, onSave: (v: number) => Promise<void> }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value.toString());
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempValue(value.toString());
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            await save();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setTempValue(value.toString());
        }
    };

    const save = async () => {
        const num = parseFloat(tempValue);
        if (isNaN(num)) {
            setTempValue(value.toString()); // Revert if invalid
            setIsEditing(false);
            return;
        }

        if (num === value) {
            setIsEditing(false);
            return;
        }

        setStatus('saving');
        setIsEditing(false); // Optimistically close input
        try {
            await onSave(num);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e) {
            setStatus('error');
            setTempValue(value.toString()); // Revert on error
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text" 
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={save}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                className="w-full h-full text-right px-2 py-1 bg-blue-50 dark:bg-blue-900/30 outline-none border border-blue-500 rounded-sm font-mono text-sm"
            />
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)}
            className={`w-full h-full px-2 py-3 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group font-mono text-sm ${
                value === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-900 dark:text-slate-200'
            }`}
        >
            {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            
            {status === 'saving' && <Loader2 size={12} className="absolute top-1 right-1 animate-spin text-blue-500" />}
            {status === 'success' && <Check size={12} className="absolute top-1 right-1 text-emerald-500" />}
            {status === 'error' && <AlertCircle size={12} className="absolute top-1 right-1 text-red-500" />}
            
            <div className="absolute inset-0 border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700 pointer-events-none" />
        </div>
    );
};

const LedgerTable = ({ title, data, themeColor, onUpdate }: { title: string, data: DetailedExpenseData | DetailedIncomeData, themeColor: 'emerald' | 'rose', onUpdate: (c: string, s: string, m: number, v: number) => Promise<void> }) => {
    
    const theme = {
        emerald: { header: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-500' },
        rose: { header: 'bg-rose-100 dark:bg-rose-900/30 text-rose-900 dark:text-rose-200', border: 'border-rose-200 dark:border-rose-800', badge: 'bg-rose-500' }
    }[themeColor];

    if (!data || data.categories.length === 0) return null;

    return (
        <div className="mb-8 last:mb-0">
            <div className={`px-4 py-2 text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${theme.header} rounded-t-xl`}>
                <div className={`w-2 h-2 rounded-full ${theme.badge}`} />
                {title}
            </div>
            <div className={`overflow-x-auto border-x border-b ${theme.border} rounded-b-xl`}>
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 min-w-[200px] sticky left-0 bg-white dark:bg-slate-900 z-20">
                                Source / Category
                            </th>
                            {data.months.map((m, idx) => (
                                <th key={idx} className="p-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 min-w-[100px]">
                                    {m}
                                </th>
                            ))}
                            <th className="p-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 min-w-[100px] bg-slate-50 dark:bg-slate-800">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {data.categories.map((cat) => (
                            <React.Fragment key={cat.name}>
                                {/* Category Header Row */}
                                <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-bold">
                                    <td className="p-3 text-sm text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                                        {cat.name}
                                    </td>
                                    {data.months.map((_, mIdx) => {
                                        const total = cat.subCategories.reduce((acc, sub) => acc + (sub.monthlyValues[mIdx] || 0), 0);
                                        return (
                                            <td key={mIdx} className="p-3 text-right text-sm text-slate-500 dark:text-slate-400 font-mono">
                                                {total > 0 ? total.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 text-right text-sm text-slate-800 dark:text-slate-200 font-mono bg-slate-100 dark:bg-slate-800/60 font-bold">
                                        {cat.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                </tr>

                                {/* Subcategory Rows */}
                                {cat.subCategories.map((sub) => (
                                    <tr key={`${cat.name}-${sub.name}`} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="pl-6 pr-3 py-0 text-sm text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 z-10 truncate max-w-[200px]" title={sub.name}>
                                            {sub.name}
                                        </td>
                                        {data.months.map((_, mIdx) => (
                                            <td key={mIdx} className="p-0 border-r border-slate-100 dark:border-slate-800 last:border-0">
                                                <EditableCell 
                                                    value={sub.monthlyValues[mIdx] || 0} 
                                                    onSave={(val) => onUpdate(cat.name, sub.name, mIdx, val)}
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-50/50 dark:bg-slate-900">
                                            {sub.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export const IncomeLedger: React.FC<IncomeLedgerProps> = ({ expenseData, incomeData, isLoading, onUpdateExpense, onUpdateIncome }) => {
    
    const hasExpense = expenseData && expenseData.categories.length > 0;
    const hasIncome = incomeData && incomeData.categories.length > 0;

    if (!hasExpense && !hasIncome) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/10">
                <p>No ledger data loaded. Check your sheet connection.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm animate-fade-in flex flex-col h-[calc(100vh-200px)]">
            <div className="flex-1 overflow-auto p-4">
                <LedgerTable title="Income Ledger" data={incomeData} themeColor="emerald" onUpdate={onUpdateIncome} />
                <LedgerTable title="Expense Ledger" data={expenseData} themeColor="rose" onUpdate={onUpdateExpense} />
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><Save size={12} /> Auto-saves on Enter/Blur</span>
                    <span>Edits are written to exact rows in sheet</span>
                </div>
                {isLoading && <span className="flex items-center gap-2 text-blue-500"><Loader2 size={12} className="animate-spin" /> Syncing...</span>}
            </div>
        </div>
    );
};