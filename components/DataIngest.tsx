
import { AlertCircle, ArrowRight, Check, CheckCircle2, Cloud, DollarSign, Download, ExternalLink, FileSpreadsheet, History, Info, Layers, Loader2, LogOut, Moon, RefreshCw, Scale, Search, Shield, ShieldCheck, Sparkles, Sun, Trash2, CalendarDays } from 'lucide-react';
import React, { memo, useEffect, useState } from 'react';
import { fetchUserProfile, initGoogleAuth, signIn, copyMasterTemplate } from '../services/authService';
import { openPicker } from '../services/pickerService';
import { validateSheetTab } from '../services/sheetService';
import { SheetConfig, UserProfile, ViewState } from '../types';
import { resetYearlyLedger } from '../services/sheetWriteService';

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

  const displayLabel = label === 'taxAccounts' ? 'Tax Records' : label;

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 hover:border-blue-400/30 transition-all group">
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider truncate mr-2 group-hover:text-blue-500 transition-colors">{displayLabel}</label>
        {isSyncing || status === 'checking' ? <Loader2 size={10} className="animate-spin" /> : 
         status === 'valid' ? <CheckCircle2 size={10} className="text-emerald-500" /> : 
         status === 'invalid' ? <AlertCircle size={10} className="text-red-500" /> : null}
      </div>
      <div className="flex gap-1.5">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent text-xs outline-none font-medium" />
        <button onClick={onSync} disabled={isSyncing || !sheetId} className="p-1.5 text-slate-400 hover:text-blue-500 disabled:opacity-30">
          <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
});

export const DataIngest: React.FC<DataIngestProps> = (props) => {
  const { config, onConfigChange, onSync, isSyncing, syncingTabs, syncStatus, sheetUrl, onSheetUrlChange, isDarkMode, toggleTheme, userProfile, onProfileChange, onSessionChange, onSignOut, onViewChange, onTourStart } = props;
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<'idle' | 'cloning' | 'syncing' | 'complete' | 'error' | 'manual'>('idle');

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

  const handleInitialize = async () => {
      if (!userProfile) return;
      setOnboardingStatus('cloning');
      try {
          const name = `Sheetsense Finance - ${new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`;
          const result = await copyMasterTemplate(MASTER_TEMPLATE_ID, name);
          setOnboardingStatus('syncing');
          onConfigChange({ ...config, sheetId: result.id });
          onSheetUrlChange(result.url);
          await new Promise(r => setTimeout(r, 2000));
          await onSync();
          setOnboardingStatus('complete');
          onTourStart();
      } catch (e: any) {
          if (e.message === 'PRIVACY_RESTRICTION') {
              setOnboardingStatus('manual');
          } else {
              setOnboardingStatus('error');
              alert(`Initialization failed: ${e.message}`);
          }
      }
  };

  const handleOpenPicker = async () => {
      try {
          const session = await signIn();
          onSessionChange(session);
          const result = await openPicker(config.clientId);
          if (result) { onConfigChange({ ...config, sheetId: result.id }); onSheetUrlChange(result.url); }
      } catch (e) { alert("Picker error"); }
  };

  const handleYearReset = async () => {
      const confirmed = confirm("WARNING: This will archive your current Income/Expense data and clear the active sheet for the new year. Ensure you have synced all local changes first. Continue?");
      if (!confirmed) return;

      setIsResetting(true);
      try {
          await resetYearlyLedger(config.sheetId, config.tabNames.income, config.tabNames.expenses);
          alert("Success! Sheets archived and active ledger reset for the new year.");
          await onSync();
      } catch (e: any) {
          alert(`Reset failed: ${e.message}`);
      } finally {
          setIsResetting(false);
      }
  };

  if (!config.sheetId) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
        
        <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="flex justify-center">
                 <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600"><FileSpreadsheet size={32} /></div>
            </div>
            
            <div className="space-y-2">
                <h2 className="text-3xl font-black">Welcome to Sheetsense</h2>
                <p className="text-slate-500">To maintain absolute privacy, Sheetsense only requests access to files you explicitly provide.</p>
            </div>

            {onboardingStatus === 'manual' ? (
                <div className="bg-blue-50 dark:bg-blue-900/30 p-8 rounded-2xl border-2 border-blue-500/50 text-left space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 text-white rounded-lg"><Info size={20} /></div>
                        <h4 className="text-lg font-bold text-blue-900 dark:text-blue-100">Privacy Restriction Notice</h4>
                    </div>
                    <p className="text-sm text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                        Because we follow Google's "Least Privilege" security standard, we cannot automatically see the Sheetsense template. Please perform this one-time manual copy:
                    </p>
                    <div className="grid gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-lg shadow-blue-500/20">1</div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Open the Template</p>
                                <a href={`https://docs.google.com/spreadsheets/d/${MASTER_TEMPLATE_ID}/edit`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-500">Open Sheetsense Master Template &rarr;</a>
                                <p className="text-[10px] text-blue-700/60 dark:text-blue-400/60">In the new tab, go to <b>File > Make a copy</b>.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-lg shadow-blue-500/20">2</div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Connect Your Copy</p>
                                <p className="text-[10px] text-blue-700/60 dark:text-blue-400/60 mb-2">Once copied, return here and select your personal version.</p>
                                <button onClick={handleOpenPicker} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-blue-500 transition-all">Select My Spreadsheet</button>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setOnboardingStatus('idle')} className="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600 dark:hover:text-slate-300">Go Back</button>
                </div>
            ) : (
                <>
                    {!userProfile ? (
                        <button onClick={handleSignIn} disabled={isAuthLoading} className="bg-blue-600 text-white font-bold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 mx-auto hover:bg-blue-500 transition-all">
                            {isAuthLoading ? <Loader2 className="animate-spin" /> : <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 bg-white rounded-full p-0.5" />}
                            Connect Google Account
                        </button>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-left group hover:border-blue-400/50 transition-colors">
                                <h4 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white"><Sparkles size={18} className="text-blue-500" /> Use Template</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Initialize a new finance sheet from our highly optimized Master Template.</p>
                                <button 
                                    onClick={handleInitialize} 
                                    disabled={onboardingStatus === 'cloning' || onboardingStatus === 'syncing'}
                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-all flex justify-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    {onboardingStatus === 'cloning' ? <Loader2 className="animate-spin" size={18} /> : 
                                     onboardingStatus === 'syncing' ? <Check size={18} /> : <Download size={18} />}
                                    {onboardingStatus === 'cloning' ? 'Starting...' : onboardingStatus === 'syncing' ? 'Syncing...' : 'Initialize From Template'}
                                </button>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-left group hover:border-emerald-400/50 transition-colors">
                                <h4 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white"><Search size={18} className="text-emerald-500" /> Link Existing</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Already have a spreadsheet from a previous session? Select it from Drive.</p>
                                <button onClick={handleOpenPicker} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Select Spreadsheet</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col justify-between min-h-[220px]">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <img src={userProfile?.picture} alt="" className="w-12 h-12 rounded-full border-2 border-slate-100 dark:border-slate-700 shadow-sm" />
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{userProfile?.name}</h4>
                        <p className="text-xs text-slate-500">{userProfile?.email}</p>
                    </div>
                </div>
                <button onClick={onSignOut} className="text-slate-400 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                    <span>Active Data Source</span>
                    <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1 hover:underline">Open in Sheets <ExternalLink size={10} /></a>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-500 truncate">ID: {config.sheetId}</div>
                    <button onClick={handleOpenPicker} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-xs hover:bg-blue-500 shadow-lg shadow-blue-500/20"><Search size={16} /></button>
                </div>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-6">
            <h4 className="text-xs font-bold uppercase text-slate-400">Preferences</h4>
            <button onClick={toggleTheme} className="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 transition-all">
                <span className="text-xs font-bold">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                {isDarkMode ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-yellow-500" />}
            </button>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                <button onClick={() => onViewChange(ViewState.PRIVACY)} className="w-full flex items-center justify-between text-[10px] font-bold text-slate-500 hover:text-blue-500 uppercase tracking-widest">Privacy Policy <ArrowRight size={10} /></button>
                <button 
                  onClick={() => { if(confirm("Wipe all local data?")) { const req = indexedDB.deleteDatabase('FinTrackDB'); req.onsuccess = () => window.location.reload(); } }}
                  className="w-full flex items-center justify-between text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest"
                >
                  Wipe Local Database <Trash2 size={10} />
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"><Layers size={20} /></div>
            <h3 className="text-sm font-bold">Tab Mappings</h3>
          </div>
          <button onClick={() => onSync()} disabled={isSyncing} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 disabled:opacity-50">
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync All Tabs
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: 'Portfolio', i: Layers, k: ['assets', 'investments', 'trades'] },
            { t: 'Flow', i: DollarSign, k: ['income', 'expenses', 'subscriptions', 'debt'] },
            { t: 'Logs & Records', i: History, k: ['accounts', 'logData', 'taxAccounts'] }
          ].map(cat => (
            <div key={cat.t} className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><cat.i size={12} /> {cat.t}</div>
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
        {syncStatus && (
          <div className={`p-3 rounded-xl border text-[11px] font-bold animate-fade-in flex items-center gap-2 ${syncStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-200 text-red-600 dark:text-red-400'}`}>
            {syncStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {syncStatus.msg}
          </div>
        )}
      </div>

      {/* Maintenance Section */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 dark:text-blue-400 border border-blue-500/20"><CalendarDays size={20} /></div>
            <div>
                <h3 className="text-sm font-bold">Annual Maintenance</h3>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">End-of-year operations</p>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">Start New Financial Year</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                    Archives your current Income and Expense sheets as historical records (e.g., "Income-24") and clears the active ledger for the next calendar year.
                </p>
            </div>
            <button 
                onClick={handleYearReset}
                disabled={isResetting || isSyncing}
                className="shrink-0 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
                {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {isResetting ? 'Processing...' : 'Reset for New Year'}
            </button>
        </div>
      </div>
    </div>
  );
};
