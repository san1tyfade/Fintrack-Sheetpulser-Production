
import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';

interface InvestmentAllocationCardProps {
    title: string;
    value: number;
    total: number;
    icon: any;
    colorClass: string;
    isLoading: boolean;
    onClick: () => void;
    isSelected: boolean;
}

export const InvestmentAllocationCard = memo(({ 
    title, value, total, icon: Icon, colorClass, isLoading, onClick, isSelected 
}: InvestmentAllocationCardProps) => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  const bgColor = colorClass.replace('text-', 'bg-');
  
  return (
    <button 
        onClick={onClick}
        className={`w-full text-left bg-white dark:bg-slate-800/50 border p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden group active:scale-[0.98] ${
            isSelected 
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg -translate-y-1' 
            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/40 shadow-sm hover:shadow-md'
        }`}
    >
        {isSelected && (
            <div className="absolute top-0 right-0 p-2 text-blue-500 animate-in fade-in slide-in-from-top-1">
                <ChevronRight size={20} className="rotate-90" />
            </div>
        )}
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl bg-opacity-15 transition-transform duration-300 group-hover:scale-110 ${bgColor} ${colorClass}`}>
                <Icon size={24} />
            </div>
            <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">Allocation</span>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{percent.toFixed(1)}%</p>
            </div>
        </div>
        <div className="space-y-1">
            <h4 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-tighter truncate pr-4" title={title}>{title}</h4>
            <div className="text-2xl font-black text-slate-900 dark:text-white min-h-[2rem] flex items-center tracking-tight ghost-blur">
                {isLoading ? <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${bgColor}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
    </button>
  );
});
