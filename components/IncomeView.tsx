
import React, { useState } from 'react';
import { IncomeEntry, ExpenseEntry, DetailedExpenseData, DetailedIncomeData } from '../types';
import { IncomeAnalysis } from './income/IncomeAnalysis';
import { IncomeLedger } from './income/IncomeLedger';
import { Loader2, BarChart3, Table2 } from 'lucide-react';

interface IncomeViewProps {
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  detailedExpenses?: DetailedExpenseData;
  detailedIncome?: DetailedIncomeData;
  isLoading?: boolean;
  isDarkMode?: boolean;
  onUpdateExpense?: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
  onUpdateIncome?: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
}

type ViewMode = 'ANALYSIS' | 'LEDGER';

export const IncomeView: React.FC<IncomeViewProps> = ({ 
    incomeData, 
    expenseData, 
    detailedExpenses, 
    detailedIncome,
    isLoading = false, 
    isDarkMode = true,
    onUpdateExpense,
    onUpdateIncome
}) => {
  const [mode, setMode] = useState<ViewMode>('ANALYSIS');

  return (
    <div className="h-full flex flex-col">
       {/* Top Toolbar */}
       <div className="flex justify-between items-end mb-6">
           <div>
               {/* Header is handled inside sub-components for specific context, or we can unify here */}
           </div>
           
           <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
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
       </div>

       {/* Content Area */}
       <div className="flex-1 min-h-0">
           {mode === 'ANALYSIS' ? (
               <IncomeAnalysis 
                   incomeData={incomeData} 
                   expenseData={expenseData} 
                   detailedExpenses={detailedExpenses} 
                   isLoading={isLoading} 
                   isDarkMode={isDarkMode} 
                />
           ) : (
               <IncomeLedger 
                   expenseData={detailedExpenses || { months: [], categories: [] }} 
                   incomeData={detailedIncome || { months: [], categories: [] }}
                   isLoading={isLoading} 
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