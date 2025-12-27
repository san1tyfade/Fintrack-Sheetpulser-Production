
import React, { useState, useRef, useEffect } from 'react';
import { IncomeEntry, ExpenseEntry, LedgerData } from '../types';
import { IncomeAnalysis } from './income/IncomeAnalysis';
import { IncomeLedger } from './income/IncomeLedger';
import { BarChart3, Table2, ChevronDown, Calendar, History, Sparkles, Check, LogOut } from 'lucide-react';

interface IncomeViewProps {
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  detailedExpenses?: LedgerData;
  detailedIncome?: LedgerData;
  isLoading?: boolean;
  isDarkMode?: boolean;
  isReadOnly?: boolean;
  selectedYear?: number;
  onUpdateExpense?: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
  onUpdateIncome?: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
  availableYears?: number[];
  onYearChange?: (year: number) => void;
  activeYear?: number;
}

type ViewMode = 'ANALYSIS' | 'LEDGER';

export const IncomeView: React.FC<IncomeViewProps> = ({ 
    incomeData, 
    expenseData, 
    detailedExpenses, 
    detailedIncome,
    isLoading = false, 
    isDarkMode = true,
    isReadOnly = false,
    selectedYear = new Date().getFullYear(),
    onUpdateExpense,
    onUpdateIncome,
    availableYears = [],
    onYearChange,
    activeYear
}) => {
  const [mode, setMode] = useState<ViewMode>('ANALYSIS');
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
            setIsYearPickerOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-full flex flex-col space-y-8">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-3">
               <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center">
                   Income & Expense
                   <span className="mx-3 text-slate-300 dark:text-slate-700 font-light text-2xl">›</span>
                   <div className="flex items-center gap-3">
                        <div className="relative" ref={pickerRef}>
                            <button 
                                onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl text-xl font-black transition-all ${
                                    isReadOnly 
                                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-inner' 
                                    : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                }`}
                            >
                                {selectedYear}
                                <ChevronDown size={20} className={`transition-transform duration-300 ${isYearPickerOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isYearPickerOpen && (
                                <div className="absolute top-full left-0 mt-3 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-3 flex items-center gap-2">
                                        <History size={12}/> Financial Chapters
                                    </p>
                                    <div className="space-y-1">
                                        {availableYears.map(year => (
                                            <button
                                                key={year}
                                                onClick={() => { onYearChange?.(year); setIsYearPickerOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                                    selectedYear === year 
                                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {year}
                                                    {year === activeYear && (
                                                        <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Current</span>
                                                    )}
                                                </div>
                                                {selectedYear === year && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {isReadOnly && activeYear && (
                            <button 
                                onClick={() => onYearChange?.(activeYear)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                                title="Exit Chronos Mode and return to active year"
                            >
                                <LogOut size={14} className="rotate-180" /> Exit Archive
                            </button>
                        )}
                   </div>
               </h2>
           </div>

           <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
               <button
                   onClick={() => setMode('ANALYSIS')}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                       mode === 'ANALYSIS' 
                       ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                       : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                   }`}
               >
                   <BarChart3 size={16} /> Analysis
               </button>
               <button
                   onClick={() => setMode('LEDGER')}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                       mode === 'LEDGER' 
                       ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                       : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                   }`}
               >
                   <Table2 size={16} /> Ledger
               </button>
           </div>
       </header>

       <div className="flex-1 min-h-0">
           {mode === 'ANALYSIS' ? (
               <IncomeAnalysis 
                 incomeData={incomeData} 
                 expenseData={expenseData} 
                 detailedExpenses={detailedExpenses} 
                 isLoading={isLoading} 
                 isDarkMode={isDarkMode} 
                 selectedYear={selectedYear}
               />
           ) : (
               <IncomeLedger 
                   expenseData={detailedExpenses || { months: [], categories: [] }} 
                   incomeData={detailedIncome || { months: [], categories: [] }}
                   isLoading={isLoading} 
                   isReadOnly={isReadOnly}
                   selectedYear={selectedYear}
                   activeYear={activeYear}
                   onYearChange={onYearChange}
                   onUpdateExpense={async (cat, sub, m, v) => {
                       if (onUpdateExpense) await onUpdateExpense(cat, sub, m, v);
                   }} 
                   onUpdateIncome={async (cat, sub, m, v) => {
                       if (onUpdateIncome) await onUpdateIncome(cat, sub, m, v);
                   }}
                />
           )}
       </div>
    </div>
  );
};
