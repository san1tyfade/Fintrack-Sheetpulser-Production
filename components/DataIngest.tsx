
import React, { useEffect, useState, memo } from 'react';
import { SheetConfig, UserProfile, ViewState } from '../types';
import { 
  Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, 
  Layers, DollarSign, History, Sun, Moon, ShieldCheck, 
  Trash2, ExternalLink, Cloud, LogOut, Search, ArrowRight, Scale,
  Sparkles, Download, Check
} from 'lucide-react';
import { validateSheetTab } from '../services/sheetService';
import { initGoogleAuth, signIn, fetchUserProfile, copyMasterTemplate } from '../services/authService';
import { openPicker } from '../services/pickerService';

const MASTER_TEMPLATE_ID = '12YnkmOuHSeiy5hcmbxc6ZT8e8D6ruo1SEr3LU3yEZDk';

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
  userProfile: UserProfile | null;
  onProfileChange: (profile: UserProfile | null) => void;
  onSessionChange: (session: {token: string, expires: number} | null) => void;
  onSignOut: () => void;
  onViewChange: (view: ViewState) => void;
  onTourStart: () => void;
}

const CompactTabInput = memo(({ label, value, onChange, onSync, sheetId, isSyncing }: any) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  useEffect(() => {
    if (!sheetId || !value) return setStatus('idle');
    const timer = setTimeout(async () => {
      setStatus('checking');
      const isValid = await validateSheetTab(sheetId, value);
      setStatus(isValid ? 'valid' : 'invalid');
    }, 800);
    return () => clearTimeout(timer);
  }, [value, sheetId]);

  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 hover:border-blue-400/30 transition-all">
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <span>{label}</span>
        {isSyncing || status === 'checking' ? <Loader2 size={10} className="animate-spin" /> : 
         status === 'valid' ? <CheckCircle2 size={10} className="text-emerald-500" /> : 
         status === 'invalid' ? <AlertCircle size={10} className="text-red-500" /> : null}
      </div>
      <div className="flex gap-2">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent text-xs outline-none font-medium" />
        <button onClick={onSync} disabled={isSyncing || !sheetId} className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-30">
          <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
});

export const DataIngest: React.FC<DataIngestProps> = (props) => {
  const { config, onConfigChange, onSync, isSyncing, syncingTabs, syncStatus, sheetUrl, onSheetUrlChange, isDarkMode, toggleTheme, userProfile, onProfileChange, onSessionChange, onSignOut, onViewChange, onTourStart } = props;
  const [status, setStatus] = useState<'idle' | 'cloning' | 'syncing' | 'error'>('idle');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      initGoogleAuth(config.clientId);
      const session = await signIn(true);
      const profile = await fetchUserProfile(session.token);
      if (profile) { onSessionChange(session); onProfileChange(profile); }
    } catch (e) { alert("Sign in failed"); }
    finally { setIsAuthLoading(false); }
  };

  const handleInit = async () => {
    setStatus('cloning');
    try {
      const name = `Sheetsense - ${new Date().toLocaleDateString()}`;
      const result = await copyMasterTemplate(MASTER_TEMPLATE_ID, name);
      setStatus('syncing');
      onConfigChange({ ...config, sheetId: result.id });
      onSheetUrlChange(result.url);
      await new Promise(r => setTimeout(r, 2000));
      await onSync();
      onTourStart();
    } catch (e) { setStatus('error'); alert("Setup failed."); }
  };

  const handlePicker = async () => {
    try {
      const session = await signIn();
      onSessionChange(session);
      const result = await openPicker(config.clientId);
      if (result) { onConfigChange({ ...config, sheetId: result.id }); onSheetUrlChange(result.url); }
    } catch (e) { alert("Selection failed."); }
  };

  if (!config.sheetId) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl text-center space-y-8 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600"><FileSpreadsheet size={32} /></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black">Welcome to Sheetsense</h2>
          <p className="text-slate-500">Initialize your private finance dashboard by connecting a Google Sheet.</p>
        </div>
        {!userProfile ? (
          <button onClick={handleSignIn} disabled={isAuthLoading} className="bg-blue-600 text-white font-bold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 mx-auto hover:bg-blue-500 transition-all">
            {isAuthLoading ? <Loader2 className="animate-spin" /> : <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />}
            Connect Google Account
          </button>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 pt-4">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-left">
              <h4 className="font-bold flex items-center gap-2"><Sparkles size={18} className="text-blue-500" /> Create New</h4>
              <p className="text-xs text-slate-500">Clones the Sheetsense Master Template to your personal Google Drive.</p>
              <button onClick={handleInit} disabled={status !== 'idle' && status !== 'error'} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-all flex justify-center gap-2">
                {status === 'cloning' ? <Loader2 className="animate-spin" /> : status === 'syncing' ? <Check /> : <Download size={18} />}
                {status === 'cloning' ? 'Cloning...' : status === 'syncing' ? 'Syncing...' : 'Initialize From Template'}
              </button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-left">
              <h4 className="font-bold flex items-center gap-2"><Search size={18} className="text-emerald-500" /> Link Existing</h4>
              <p className="text-xs text-slate-500">Already have a Sheetsense spreadsheet? Select it from your Drive.</p>
              <button onClick={handlePicker} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Select Spreadsheet</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <img src={userProfile?.picture} className="w-12 h-12 rounded-full border-2 border-slate-100" alt="" />
              <div>
                <h4 className="font-bold">{userProfile?.name}</h4>
                <p className="text-xs text-slate-500">{userProfile?.email}</p>
              </div>
            </div>
            <button onClick={onSignOut} className="text-slate-400 hover:text-red-500"><LogOut size={18} /></button>
          </div>
          <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
              <span>Active Source</span>
              <a href={sheetUrl} target="_blank" className="text-blue-500 flex items-center gap-1 hover:underline">View Sheet <ExternalLink size={10} /></a>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-500 truncate">ID: {config.sheetId}</div>
              <button onClick={handlePicker} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-xs hover:bg-blue-500"><Search size={16} /></button>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-400">Preferences</h4>
            <button onClick={toggleTheme} className="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              {isDarkMode ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-yellow-500" />}
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-col gap-2">
            <button onClick={() => onViewChange(ViewState.PRIVACY)} className="flex items-center justify-between text-[10px] font-bold text-slate-500 hover:text-blue-500">Privacy Policy <ArrowRight size={10} /></button>
            {/* Fix: indexedDB.deleteDatabase returns an IDBOpenDBRequest, not a Promise. Use onsuccess event handler. */}
            <button onClick={() => { if(confirm("Wipe all local data?")) { const req = indexedDB.deleteDatabase('FinTrackDB'); req.onsuccess = () => window.location.reload(); } }} className="flex items-center justify-between text-[10px] font-bold text-red-500 hover:text-red-600 mt-2">Wipe Local Storage <Trash2 size={10} /></button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Layers size={18} /></div>
            <h4 className="font-bold">Tab Mappings</h4>
          </div>
          <button onClick={() => onSync()} disabled={isSyncing} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 disabled:opacity-50">
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync All
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: 'Portfolio', i: Layers, k: ['assets', 'investments', 'trades'] },
            { t: 'Cash Flow', i: DollarSign, k: ['income', 'expenses', 'subscriptions', 'debt'] },
            { t: 'Reference', i: History, k: ['accounts', 'logData'] }
          ].map(cat => (
            <div key={cat.t} className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><cat.i size={12} /> {cat.t}</div>
              <div className="space-y-2">
                {cat.k.map(key => (
                  <CompactTabInput 
                    key={key} label={key} value={config.tabNames[key as keyof SheetConfig['tabNames']]} 
                    onChange={(v: string) => onConfigChange({ ...config, tabNames: { ...config.tabNames, [key]: v } })} 
                    onSync={() => onSync([key as any])} sheetId={config.sheetId} isSyncing={syncingTabs.has(key)} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
