
import React, { useEffect, useState } from 'react';
import { SheetConfig } from '../types';
import { 
  Loader2, CheckCircle2, AlertCircle, Link, FileSpreadsheet, RefreshCw, 
  Layers, DollarSign, History, Sun, Moon, ShieldCheck, 
  Trash2, ExternalLink
} from 'lucide-react';
import { validateSheetTab } from '../services/sheetService';
import { clear } from '../services/dbService';

interface DataIngestProps {
  config: SheetConfig;
  onConfigChange: (newConfig: SheetConfig) => void;
  onSync: (tabs?: (keyof SheetConfig['tabNames'])[]) => void;
  isSyncing: boolean;
  syncingTabs: Set<string>;
  syncStatus: {type: 'success' | 'error', msg: string} | null;
  sheetUrl: string;
  onSheetUrlChange: (url: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const CompactTabInput: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSync: () => void;
  sheetId: string;
  isSyncing: boolean;
}> = ({ label, value, onChange, onSync, sheetId, isSyncing }) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  useEffect(() => {
    if (!sheetId || !value) {
      setStatus('idle');
      return;
    }
    const timer = setTimeout(async () => {
      setStatus('checking');
      const isValid = await validateSheetTab(sheetId, value);
      setStatus(isValid ? 'valid' : 'invalid');
    }, 800);
    return () => clearTimeout(timer);
  }, [value, sheetId]);

  const getStatusIcon = () => {
    if (isSyncing) return <Loader2 size={10} className="animate-spin text-blue-500" />;
    if (status === 'checking') return <Loader2 size={10} className="animate-spin text-blue-500" />;
    if (status === 'valid') return <CheckCircle2 size={10} className="text-emerald-500" />;
    if (status === 'invalid') return <AlertCircle size={10} className="text-red-500" />;
    return null;
  };

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 hover:border-blue-400/30 transition-all">
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider truncate mr-2">{label}</label>
        {getStatusIcon()}
      </div>
      <div className="flex gap-1.5">
        <input 
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 dark:text-slate-200 outline-none placeholder:text-slate-400"
          placeholder="Tab Name"
        />
        <button
          onClick={onSync}
          disabled={isSyncing || !sheetId}
          className="p-1 rounded-md text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-30"
          title={`Sync ${label}`}
        >
          <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
};

export const DataIngest: React.FC<DataIngestProps> = ({ 
    config, 
    onConfigChange, 
    onSync, 
    isSyncing, 
    syncingTabs,
    syncStatus,
    sheetUrl,
    onSheetUrlChange,
    isDarkMode,
    toggleTheme
}) => {
  
  const updateTab = (key: keyof SheetConfig['tabNames'], value: string) => {
    onConfigChange({ ...config, tabNames: { ...config.tabNames, [key]: value } });
  };

  const handleWipeData = async () => {
    if (confirm("Permanently wipe all local data? This cannot be undone.")) {
        await clear(); // Clear IndexedDB
        localStorage.clear(); // Clear LocalStorage
        window.location.reload();
    }
  };

  const categories = [
    { title: "Portfolio", icon: Layers, items: [{k:'assets', l:'Assets'}, {k:'investments', l:'Investments'}, {k:'trades', l:'Trades'}] },
    { title: "Flow", icon: DollarSign, items: [{k:'income', l:'Income'}, {k:'expenses', l:'Expenses'}, {k:'subscriptions', l:'Subs'}, {k:'debt', l:'Debt'}] },
    { title: "Logs", icon: History, items: [{k:'accounts', l:'Accounts'}, {k:'logData', l:'History'}] }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Quick Setup Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Link size={16} className="text-blue-500" /> Google Spreadsheet Source
            </h3>
            {sheetUrl && (
              <a 
                href={sheetUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-bold"
              >
                Open Original <ExternalLink size={10} />
              </a>
            )}
          </div>
          <input 
            type="text" 
            value={sheetUrl}
            onChange={(e) => onSheetUrlChange(e.target.value)}
            placeholder="Paste your public sheet URL here..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner"
          />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Sheet must be shared as <span className="font-bold text-slate-700 dark:text-slate-300">"Anyone with the link can view"</span>.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-full">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Sun size={16} className="text-yellow-500" /> App Interface
          </h3>
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl transition-all hover:border-blue-500/50"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div className={`p-2 rounded-lg ${isDarkMode ? 'text-yellow-500 bg-yellow-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
              {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            </div>
          </button>
        </div>
      </div>

      {/* Main Tab Configuration */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tab Mappings</h3>
              <p className="text-[10px] text-slate-500 font-medium">Connect specific spreadsheet tabs to app views.</p>
            </div>
          </div>
          <button
            onClick={() => onSync()}
            disabled={isSyncing || !config.sheetId}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all
              ${isSyncing || !config.sheetId 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}
          >
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <cat.icon size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.title}</span>
              </div>
              <div className="grid gap-2">
                {cat.items.map(item => (
                  <CompactTabInput 
                    key={item.k}
                    label={item.l}
                    value={config.tabNames[item.k as keyof SheetConfig['tabNames']]}
                    onChange={(val) => updateTab(item.k as keyof SheetConfig['tabNames'], val)}
                    onSync={() => onSync([item.k as keyof SheetConfig['tabNames']])}
                    sheetId={config.sheetId}
                    isSyncing={syncingTabs.has(item.k)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {syncStatus && (
          <div className={`mt-6 p-3 rounded-xl border text-[11px] font-bold animate-fade-in flex items-center gap-2
            ${syncStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'}`}>
            {syncStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {syncStatus.msg}
          </div>
        )}
      </div>

      {/* Footer Actions & Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-100 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex items-start gap-4">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Privacy First</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              All processing is done in your browser. Config and data never leave your local <code>IndexedDB</code>.
            </p>
          </div>
        </div>

        <div className="bg-red-50/50 dark:bg-red-500/5 p-5 rounded-2xl border border-red-200/50 dark:border-red-500/20 flex items-center justify-between group hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg group-hover:scale-110 transition-transform">
              <Trash2 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Storage</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Clear all local caches and settings.</p>
            </div>
          </div>
          <button 
            onClick={handleWipeData}
            className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            Wipe Storage
          </button>
        </div>
      </div>
    </div>
  );
};
