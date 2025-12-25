
import React, { useState } from 'react';
import { IncomeEntry, ExpenseEntry, LedgerData } from '../types';
import { IncomeAnalysis } from './income/IncomeAnalysis';
import { IncomeLedger } from './income/IncomeLedger';
import { BarChart3, Table2 } from 'lucide-react';

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
    onUpdateIncome
}) => {
  const [mode, setMode] = useState<ViewMode>('ANALYSIS');

  return (
    <div className="h-full flex flex-col">
       <div className="flex justify-between items-end mb-6">
           <div></div>
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
