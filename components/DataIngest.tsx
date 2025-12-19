
import React, { useEffect, useState } from 'react';
import { SheetConfig } from '../types';
import { 
  Loader2, CheckCircle2, AlertCircle, Link, FileSpreadsheet, RefreshCw, 
  Layers, DollarSign, History, Sun, Moon, ShieldCheck, 
  Trash2, ExternalLink, Key, Info, Cloud, Wifi, WifiOff, Lock
} from 'lucide-react';
import { validateSheetTab } from '../services/sheetService';
import { initGoogleAuth, signIn } from '../services/authService';

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
    if (status === 'checking') return <Loader2 size={10} className="animate-spin text-slate-400" />;
    if (status === 'valid') return <CheckCircle2 size={10} className="text-emerald-500" />;
    if (status === 'invalid') return <AlertCircle size={10} className="text-red-500" />;
    return null;
  };

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 hover:border-blue-400/30 transition-all group">
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider truncate mr-2 group-hover:text-blue-500 transition-colors">{label}</label>
        {getStatusIcon()}
      </div>
      <div className="flex gap-1.5">
        <input 
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 dark:text-slate-200 outline-none placeholder:text-slate-400 font-medium"
          placeholder="Tab Name"
        />
        <button
          onClick={onSync}
          disabled={isSyncing || !sheetId}
          className="p-1.5 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-30"
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
  
  const [connectionState, setConnectionState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    details?: string;
  }>({ status: 'idle' });

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const updateTab = (key: keyof SheetConfig['tabNames'], value: string) => {
    onConfigChange({ ...config, tabNames: { ...config.tabNames, [key]: value } });
  };

  const handleConnect = async () => {
      setConnectionState({ status: 'loading' });
      try {
          if (!config.clientId) throw new Error("Client ID is required to connect.");
          
          // Init Auth
          const initialized = initGoogleAuth(config.clientId);
          if (!initialized) throw new Error("Could not initialize Google Auth script.");

          // Request Token (Trigger Popup)
          const token = await signIn();
          
          // Verify API Access
          if (config.sheetId) {
             const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}?fields=properties.title`, {
                 headers: { Authorization: `Bearer ${token}` }
             });
             
             if (!res.ok) {
                 if (res.status === 403) throw new Error("Permission denied. Please enable 'Google Sheets API' in your Cloud Console and ensure the Sheet is shared with your email.");
                 if (res.status === 404) throw new Error("Sheet not found. Please check your Sheet URL/ID.");
                 throw new Error(`API Error (${res.status}): Unable to access Sheet.`);
             }
             
             const data = await res.json();
             setConnectionState({ 
                 status: 'success', 
                 message: 'Connected Successfully',
                 details: `Linked to: ${data.properties?.title}`
             });
          } else {
             setConnectionState({ 
                 status: 'success', 
                 message: 'Authenticated', 
                 details: 'Write access token acquired. Add a Sheet URL to complete setup.' 
             });
          }
      } catch (e: any) {
          const msg = e.message || "Unknown error occurred.";
          if (msg.includes('popup_closed')) {
               setConnectionState({ status: 'idle' }); // User just cancelled
          } else {
              setConnectionState({ 
                  status: 'error', 
                  message: 'Connection Failed', 
                  details: msg
              });
          }
      }
  };

  const handleWipeData = async () => {
    if (confirm("Permanently wipe all local data? This cannot be undone.")) {
        const req = indexedDB.deleteDatabase('FinTrackDB');
        req.onsuccess = () => window.location.reload();
        req.onerror = () => window.location.reload();
    }
  };

  const categories = [
    { title: "Portfolio", icon: Layers, items: [{k:'assets', l:'Assets'}, {k:'investments', l:'Investments'}, {k:'trades', l:'Trades'}] },
    { title: "Flow", icon: DollarSign, items: [{k:'income', l:'Income'}, {k:'expenses', l:'Expenses'}, {k:'subscriptions', l:'Subs'}, {k:'debt', l:'Debt'}] },
    { title: "Logs", icon: History, items: [{k:'accounts', l:'Accounts'}, {k:'logData', l:'History'}] }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* Top Section: Connection & Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Connection Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Cloud size={16} className="text-blue-500" /> API Connection
                </h3>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                    connectionState.status === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                    : connectionState.status === 'error'
                    ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'
                }`}>
                    {connectionState.status === 'success' ? <Wifi size={10} /> : connectionState.status === 'error' ? <WifiOff size={10} /> : <Lock size={10} />}
                    {connectionState.status === 'success' ? 'Connected' : connectionState.status === 'error' ? 'Error' : 'Not Connected'}
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sheet URL Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                            Google Sheet URL <Link size={10} />
                        </label>
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={sheetUrl}
                                onChange={(e) => onSheetUrlChange(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            {sheetUrl && (
                                <a href={sheetUrl} target="_blank" rel="noreferrer" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors">
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                            ID: <span className="font-mono text-slate-500 dark:text-slate-300">{config.sheetId || 'Not detected'}</span>
                        </p>
                    </div>

                    {/* Client ID Input */}
                    <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                            OAuth Client ID <Key size={10} />
                        </label>
                        <input 
                            type="text" 
                            value={config.clientId || ''}
                            onChange={(e) => onConfigChange({ ...config, clientId: e.target.value })}
                            placeholder="...apps.googleusercontent.com"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                         <p className="text-[10px] text-slate-400">
                            Required for write access.
                        </p>
                    </div>
                </div>

                {/* Connection Action & Status Area */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                     <button 
                        onClick={handleConnect}
                        disabled={connectionState.status === 'loading' || !config.clientId}
                        className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm
                        ${connectionState.status === 'success' 
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                    >
                        {connectionState.status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : connectionState.status === 'success' ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
                        {connectionState.status === 'loading' ? 'Connecting...' : connectionState.status === 'success' ? 'Verified' : 'Connect & Verify'}
                    </button>

                    <div className="flex-1 min-w-0 w-full text-center md:text-left">
                        {connectionState.status === 'idle' && (
                            <p className="text-xs text-slate-500">Enter Client ID and click connect to enable write access.</p>
                        )}
                        {connectionState.status === 'loading' && (
                            <p className="text-xs text-blue-500 font-medium animate-pulse">Authenticating with Google...</p>
                        )}
                        {connectionState.status === 'success' && (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                <p className="font-bold">{connectionState.message}</p>
                                <p className="opacity-80 truncate">{connectionState.details}</p>
                            </div>
                        )}
                         {connectionState.status === 'error' && (
                            <div className="text-xs text-red-500">
                                <p className="font-bold">{connectionState.message}</p>
                                <p className="opacity-80">{connectionState.details}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Setup Helpers (Collapsible/Small) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-500/5 border border-yellow-200 dark:border-yellow-500/20 rounded-xl flex gap-3">
                        <Info size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                             <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-200 mb-1">Origin Config</p>
                             <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">Add to "Authorized JavaScript origins":</p>
                             <code className="bg-white/50 dark:bg-black/20 px-1 py-0.5 rounded text-[10px] font-mono break-all select-all">{currentOrigin}</code>
                        </div>
                    </div>
                     <div className="p-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl flex gap-3">
                        <Cloud size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                             <p className="text-[10px] font-bold text-blue-800 dark:text-blue-200 mb-1">Cloud Console</p>
                             <p className="text-[10px] text-slate-600 dark:text-slate-400">
                                 Enable <strong>Google Sheets API</strong> for your project and add your email as a Test User if in testing mode.
                             </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Theme & Meta Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm flex flex-col gap-6 h-full">
             <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sun size={16} className="text-yellow-500" /> Interface
                </h3>
                <button 
                    onClick={toggleTheme}
                    className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl transition-all hover:border-blue-500/50 group"
                >
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                    </span>
                    <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-yellow-500 bg-yellow-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                    {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                    </div>
                </button>
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" /> Privacy
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    Data is processed locally in your browser. Credentials and configuration are stored securely in IndexedDB.
                </p>
                 <button 
                    onClick={handleWipeData}
                    className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                >
                    <Trash2 size={12} /> Wipe Local Data
                </button>
            </div>
        </div>
      </div>

      {/* Tab Mapping Configuration */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sheet Mapping</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Map spreadsheet tabs to application views.</p>
            </div>
          </div>
          <button
            onClick={() => onSync()}
            disabled={isSyncing || !config.sheetId}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm
              ${isSyncing || !config.sheetId 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}
          >
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isSyncing ? 'Syncing Data...' : 'Sync All Tabs'}
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
    </div>
  );
};
