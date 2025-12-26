
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LedgerData } from '../../types';
import { Loader2, AlertCircle, Check, Save, ChevronLeft, ChevronRight, Calendar, RefreshCw, Lock, FileX } from 'lucide-react';

interface IncomeLedgerProps {
  expenseData: LedgerData;
  incomeData: LedgerData;
  isLoading: boolean;
  isReadOnly?: boolean;
  selectedYear?: number;
  onUpdateExpense: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
  onUpdateIncome: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
}

const EditableCell = ({ value, onSave, isReadOnly = false }: { value: number, onSave: (v: number) => Promise<void>, isReadOnly?: boolean }) => {
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
            setTempValue(value.toString());
            setIsEditing(false);
            return;
        }

        if (num === value) {
            setIsEditing(false);
            return;
        }

        setStatus('saving');
        setIsEditing(false);
        try {
            await onSave(num);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e) {
            setStatus('error');
            setTempValue(value.toString());
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    if (isEditing && !isReadOnly) {
        return (
            <input
                ref={inputRef}
                type="text" 
                inputMode="decimal"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={save}
                onKeyDown={handleKeyDown}
                className={`w-full h-full text-right px-2 py-1 bg-blue-50 dark:bg-blue-900/40 outline-none border-2 border-blue-500 rounded-lg font-mono text-sm shadow-inner`}
            />
        );
    }

    return (
        <div 
            onClick={() => !isReadOnly && setIsEditing(true)}
            className={`w-full h-full px-3 py-4 text-right transition-colors relative group font-mono text-sm ${
                isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
            } ${value === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-900 dark:text-slate-200'}`}
        >
            {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            
            {status === 'saving' && <Loader2 size={10} className="absolute top-1 right-1 animate-spin text-blue-500" />}
            {status === 'success' && <Check size={10} className="absolute top-1 right-1 text-emerald-500" />}
            {status === 'error' && <AlertCircle size={10} className="absolute top-1 right-1 text-red-500" />}
            
            {!isReadOnly && <div className="absolute inset-0 border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700 pointer-events-none" />}
        </div>
    );
};

const LedgerTable = ({ 
    title, 
    data, 
    themeColor, 
    onUpdate, 
    visibleMonthIndex,
    isReadOnly
}: { 
    title: string, 
    data: LedgerData, 
    themeColor: 'emerald' | 'rose', 
    onUpdate: (c: string, s: string, m: number, v: number) => Promise<void>,
    visibleMonthIndex: number | null,
    isReadOnly: boolean
}) => {
    
    const theme = {
        emerald: { 
            header: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', 
            border: 'border-slate-200 dark:border-slate-800', 
            badge: 'bg-emerald-500' 
        },
        rose: { 
            header: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', 
            border: 'border-slate-200 dark:border-slate-800', 
            badge: 'bg-rose-500' 
        }
    }[themeColor];

    if (!data || data.categories.length === 0) return null;
    const isMonthView = visibleMonthIndex !== null;

    return (
        <div className="mb-10 last:mb-0">
            <div className={`px-4 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme.header} rounded-t-2xl border-x border-t`}>
                <div className={`w-1.5 h-4 rounded-full ${theme.badge}`} />
                {title}
            </div>
            <div className={`overflow-x-auto border-x border-b ${theme.border} rounded-b-2xl shadow-sm bg-white dark:bg-slate-900/50`}>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-850/80">
                            <th className="p-4 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-r border-slate-200 dark:border-slate-700 min-w-[160px] sticky left-0 bg-slate-50 dark:bg-slate-850 z-20">
                                Source / Category
                            </th>
                            {data.months.map((m, idx) => {
                                if (isMonthView && idx !== visibleMonthIndex) return null;
                                return (
                                    <th key={idx} className="p-4 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 min-w-[100px]">
                                        {m}
                                    </th>
                                );
                            })}
                            {!isMonthView && (
                                <th className="p-4 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 min-w-[100px] bg-slate-100/50 dark:bg-slate-800">
                                    Total
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {data.categories.map((cat) => (
                            <React.Fragment key={cat.name}>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/60 font-bold group">
                                    <td className="p-4 text-sm text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                                        {cat.name}
                                    </td>
                                    {data.months.map((_, mIdx) => {
                                        if (isMonthView && mIdx !== visibleMonthIndex) return null;
                                        const total = cat.subCategories.reduce((acc, sub) => acc + (sub.monthlyValues[mIdx] || 0), 0);
                                        return (
                                            <td key={mIdx} className="p-4 text-right text-sm text-slate-900 dark:text-slate-100 font-mono">
                                                {total > 0 ? total.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}
                                            </td>
                                        );
                                    })}
                                    {!isMonthView && (
                                        <td className="p-4 text-right text-sm text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800/80 font-bold">
                                            {cat.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                    )}
                                </tr>

                                {cat.subCategories.map((sub) => (
                                    <tr key={`${cat.name}-${sub.name}`} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="pl-8 pr-4 py-3 text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 z-10 truncate max-w-[200px]" title={sub.name}>
                                            {sub.name}
                                        </td>
                                        {data.months.map((_, mIdx) => {
                                            if (isMonthView && mIdx !== visibleMonthIndex) return null;
                                            return (
                                                <td key={mIdx} className="p-0 border-r border-slate-100 dark:border-slate-800 last:border-0 h-full">
                                                    <EditableCell 
                                                        value={sub.monthlyValues[mIdx] || 0} 
                                                        isReadOnly={isReadOnly}
                                                        onSave={(val) => onUpdate(cat.name, sub.name, mIdx, val)}
                                                    />
                                                </td>
                                            );
                                        })}
                                        {!isMonthView && (
                                            <td className="p-4 text-right text-xs font-bold text-slate-400 dark:text-slate-500 font-mono bg-slate-50/30 dark:bg-slate-900/30">
                                                {sub.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                        )}
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

export const IncomeLedger: React.FC<IncomeLedgerProps> = ({ expenseData, incomeData, isLoading, isReadOnly = false, selectedYear = new Date().getFullYear(), onUpdateExpense, onUpdateIncome }) => {
    const [focusedMonthIndex, setFocusedMonthIndex] = useState<number>(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const months = incomeData.months.length > 0 ? incomeData.months : expenseData.months;
    
    useEffect(() => {
        if (months.length > 0) setFocusedMonthIndex(months.length - 1);
    }, [months.length]);

    if (!(incomeData?.categories.length > 0 || expenseData?.categories.length > 0)) {
        if (isReadOnly) {
            return (
                <div className="flex flex-col items-center justify-center p-16 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/10">
                    <FileX size={48} className="opacity-20 mb-4" />
                    <p className="font-bold text-slate-900 dark:text-white">Archive Not Found</p>
                    <p className="text-sm mt-1 max-w-sm text-center">No data found for {selectedYear} in local storage or your Google Sheet. Did you archive this year using the "Reset for New Year" button?</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center p-16 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/10">
                <Calendar size={48} className="opacity-20 mb-4" />
                <p className="font-medium">No ledger data found.</p>
                <p className="text-xs mt-1">Connect your sheet or sync data to see your cash flow.</p>
            </div>
        );
    }

    const nextMonth = () => setFocusedMonthIndex(prev => Math.min(prev + 1, months.length - 1));
    const prevMonth = () => setFocusedMonthIndex(prev => Math.max(prev - 1, 0));

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-220px)]">
            {isMobile && months.length > 0 && (
                <div className="flex items-center justify-between mb-6 px-1">
                    <button onClick={prevMonth} disabled={focusedMonthIndex === 0} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm disabled:opacity-30"><ChevronLeft size={20} /></button>
                    <div className="text-center">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-widest">{months[focusedMonthIndex]}</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Month {focusedMonthIndex + 1}</p>
                    </div>
                    <button onClick={nextMonth} disabled={focusedMonthIndex === months.length - 1} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm disabled:opacity-30"><ChevronRight size={20} /></button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pb-10 custom-scrollbar">
                <LedgerTable title="Income Ledger" data={incomeData} themeColor="emerald" isReadOnly={isReadOnly} onUpdate={onUpdateIncome} visibleMonthIndex={isMobile ? focusedMonthIndex : null} />
                <LedgerTable title="Expense Ledger" data={expenseData} themeColor="rose" isReadOnly={isReadOnly} onUpdate={onUpdateExpense} visibleMonthIndex={isMobile ? focusedMonthIndex : null} />
            </div>
            
            <div className="mt-auto p-4 bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-medium">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                    {isReadOnly ? (
                        <span className="flex items-center gap-1.5 text-amber-500 font-bold"><Lock size={12} /> ARCHIVE MODE: READ-ONLY</span>
                    ) : (
                        <span className="flex items-center gap-1.5"><Save size={12} className="text-blue-500" /> Auto-saves on Enter / Blur</span>
                    )}
                </div>
                {isLoading && (
                    <span className="flex items-center gap-2 text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full animate-pulse">
                        <RefreshCw size={12} className="animate-spin" /> Syncing...
                    </span>
                )}
            </div>
        </div>
    );
};
