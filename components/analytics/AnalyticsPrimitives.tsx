
import React from 'react';
import { Info, ChevronRight, Home } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';

interface CardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  controls?: React.ReactNode;
  subtext?: string;
  className?: string;
  info?: string;
}

export const AnalyticsCard: React.FC<CardProps> = ({ title, icon: Icon, children, controls, subtext, className = "", info }) => (
  <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col ${className}`}>
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <div className="space-y-1">
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
          <Icon size={20} className="text-blue-500" />
          {title}
          {info && (
            <div className="group relative">
              <Info size={14} className="text-slate-300 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                {info}
              </div>
            </div>
          )}
        </h3>
        {subtext && <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{subtext}</p>}
      </div>
      {controls && <div className="shrink-0">{controls}</div>}
    </div>
    <div className="flex-1 min-h-0 w-full relative">
      {children}
    </div>
  </div>
);

interface StatHighlightProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  isCurrency?: boolean;
  variant?: 'default' | 'success' | 'danger' | 'info';
}

export const StatHighlight: React.FC<StatHighlightProps> = ({ 
  label, value, subValue, trend, isCurrency = true, variant = 'default' 
}) => {
  const isPos = trend && trend > 0;
  
  const variantStyles = {
    default: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    success: "bg-emerald-50 dark:bg-emerald-500/[0.08] border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/5",
    danger: "bg-rose-50 dark:bg-rose-500/[0.08] border-rose-500/20 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-rose-500/5",
    info: "bg-blue-50 dark:bg-blue-500/[0.08] border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-blue-500/5"
  };

  const labelColor = variant === 'default' ? 'text-slate-400' : 'text-current opacity-70';
  const valueColor = variant === 'default' ? 'text-slate-900 dark:text-white' : 'text-current';

  return (
    <div className={`p-6 rounded-3xl border shadow-sm transition-all duration-300 ${variantStyles[variant]}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${labelColor}`}>{label}</p>
      <h3 className={`text-2xl font-black ghost-blur ${valueColor}`}>
        {typeof value === 'number' && isCurrency ? formatBaseCurrency(value) : value}
      </h3>
      {(subValue || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && (
            <span className={`text-[10px] font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isPos ? '+' : ''}{trend.toFixed(1)}%
            </span>
          )}
          {subValue && <span className={`text-[10px] font-bold uppercase tracking-tighter ${variant === 'default' ? 'text-slate-400' : 'text-current opacity-60'}`}>{subValue}</span>}
        </div>
      )}
    </div>
  );
};

export const StandardTooltip = ({ active, payload, isDarkMode }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl space-y-2">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        {payload[0].payload.name || payload[0].payload.date || payload[0].payload.label}
      </p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-6 text-[10px] font-black">
          <span className="text-slate-500 uppercase">{p.name || p.dataKey}</span>
          <span className="text-white font-mono">
            {typeof p.value === 'number' ? formatBaseCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const DrillBreadcrumbs: React.FC<{ path: string[]; onReset: () => void; onPop: (idx: number) => void; type: string }> = ({ path, onReset, onPop, type }) => (
  <nav className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
    <button onClick={onReset} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${path.length === 0 ? 'text-blue-600 bg-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}>
      <Home size={12} /> ALL {type}S
    </button>
    {path.map((p, i) => (
      <React.Fragment key={i}>
        <ChevronRight size={10} className="text-slate-300 shrink-0" />
        <button onClick={() => onPop(i)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${i === path.length - 1 ? 'text-blue-600 bg-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}>
          {p}
        </button>
      </React.Fragment>
    ))}
  </nav>
);
