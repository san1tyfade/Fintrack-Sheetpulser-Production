
import React, { memo } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTabValidation } from '../../hooks/useTabValidation';

interface CompactTabInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSync: () => void;
  sheetId: string;
  isSyncing: boolean;
}

export const CompactTabInput = memo(({ label, value, onChange, onSync, sheetId, isSyncing }: CompactTabInputProps) => {
  const status = useTabValidation(sheetId, value);

  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 hover:border-blue-400/40 transition-all group shadow-sm">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.1em] truncate mr-2 group-hover:text-blue-500 transition-colors">
          {label}
        </label>
        <div className="flex items-center gap-2">
            {isSyncing || status === 'checking' ? (
            <Loader2 size={12} className="animate-spin text-blue-500" />
            ) : status === 'valid' ? (
            <CheckCircle2 size={12} className="text-emerald-500" />
            ) : status === 'invalid' ? (
            <AlertCircle size={12} className="text-red-500" />
            ) : null}
        </div>
      </div>
      <div className="flex gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 p-1 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="flex-1 bg-transparent px-3 py-1.5 text-xs outline-none font-bold text-slate-900 dark:text-slate-200" 
        />
        <button 
          onClick={onSync} 
          disabled={isSyncing || !sheetId} 
          className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-30 transition-all active:scale-90"
          title="Sync this tab only"
        >
          <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
});
