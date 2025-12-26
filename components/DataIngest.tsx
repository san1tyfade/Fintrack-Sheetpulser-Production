
import { AlertCircle, ArrowRight, Check, CheckCircle2, Cloud, DollarSign, Download, ExternalLink, FileSpreadsheet, History, Info, Layers, Loader2, LogOut, Moon, RefreshCw, Scale, Search, Shield, ShieldCheck, Sparkles, Sun, Trash2, CalendarDays, DownloadCloud, UploadCloud, Database, Clock, CloudUpload, CloudDownload, Box, HardDrive, Lock, Unlock, Zap, AlertTriangle, PartyPopper, ChevronRight, User } from 'lucide-react';
import React, { memo, useEffect, useState, useRef } from 'react';
import { fetchUserProfile, initGoogleAuth, signIn, copyMasterTemplate } from '../services/authService';
import { openPicker } from '../services/pickerService';
import { validateSheetTab } from '../services/sheetService';
import { SheetConfig, UserProfile, ViewState, ArchiveMeta } from '../types';
import { resetYearlyLedger } from '../services/sheetWriteService';
import { exportBackup, importBackup, syncToCloud, restoreFromCloud, getArchiveManagementList, deleteLocalYear } from '../services/backupService';
import { useIndexedDB } from '../hooks/useIndexedDB';

const MASTER_TEMPLATE_ID = '12YnkmOuHSeiy5hcmbxc6ZT8e8D6ruo1SEr3LU3yEZDk'; 

interface DataIngestProps {
  config: SheetConfig;
  onConfigChange: (newConfig: SheetConfig) => void;
  onSync: (tabs?: (keyof SheetConfig['tabNames'])[]) => void;
  isSyncing: boolean;
  syncingTabs: Set<string>;
  syncStatus: {type: 'success' | 'error' | 'warning', msg: string} | null;
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
    <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 hover:border-blue-400/30 transition-all group">
      <div className="flex justify-between items-center">
        <label className="text-[9px] text-slate-500 dark:text-slate-500 uppercase font-black tracking-widest truncate mr-2 group-hover:text-blue-500 transition-colors">{displayLabel}</label>
        {isSyncing || status === 'checking' ? <Loader2 size={10} className="animate-spin text-blue-500" /> : 
         status === 'valid' ? <CheckCircle2 size={10} className="text-emerald-500" /> : 
         status === 'invalid' ? <AlertCircle size={10} className="text-red-500" /> : null}
      </div>
      <div className="flex gap-1.5">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent text-xs outline-none font-bold text-slate-700 dark:text-slate-300" />
        <button onClick={onSync} title="Sync this tab" disabled={isSyncing || !sheetId} className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-30 transition-colors">
          <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
});

const RolloverStepper = ({ 
    isOpen, 
    onClose, 
    onSync, 
    sheetId, 
    incomeTab, 
    expenseTab, 
    onSuccess 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSync: (tabs: any[]) => Promise<void>; 
    sheetId: string;
    incomeTab: string;
    expenseTab: string;
    onSuccess: () => void;
}) => {
    const [step, setStep] = useState<'init' | 'syncing' | 'confirm' | 'rolling' | 'done'>('init');
    const [confirmYear, setConfirmYear] = useState('');
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    if (!isOpen) return null;

    const startSync = async () => {
        setStep('syncing');
        try {
            await onSync(['income', 'expenses']);
            setStep('confirm');
        } catch (e) {
            alert("Sync failed before rollover. Please try again.");
            setStep('init');
        }
    };

    const runRollover = async () => {
        if (confirmYear !== String(currentYear)) {
            alert(`Please type ${currentYear} to confirm.`);
            return;
        }
        setStep('rolling');
        try {
            await resetYearlyLedger(sheetId, incomeTab, expenseTab);
            setStep('done');
            onSuccess();
        } catch (e: any) {
            alert(`Rollover failed: ${e.message}`);
            setStep('confirm');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-8 space-y-6">
                    
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${step === 'done' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                            {step === 'done' ? <PartyPopper size={24} /> : <Zap size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Close Financial Year {currentYear}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Year-End Maintenance Wizard</p>
                        </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex gap-2">
                        {['syncing', 'confirm', 'rolling', 'done'].map((s, idx) => {
                            const isActive = step === s;
                            const isPast = ['syncing', 'confirm', 'rolling', 'done'].indexOf(step) > idx;
                            return (
                                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${isPast ? 'bg-emerald-500' : isActive ? 'bg-blue-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-700'}`} />
                            );
                        })}
                    </div>

                    <div className="py-4">
                        {step === 'init' && (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Closing a financial year is a major operation. We will first synchronize your current data to ensure your archives are 100% accurate.
                                </p>
                                <button onClick={startSync} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all">
                                    Begin Preparation
                                </button>
                            </div>
                        )}

                        {step === 'syncing' && (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                <Loader2 size={48} className="text-blue-500 animate-spin" />
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Synchronizing {currentYear} Records...</p>
                                <p className="text-xs text-slate-500">Verifying local vault against Google Sheets</p>
                            </div>
                        )}

                        {step === 'confirm' && (
                            <div className="space-y-6">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex gap-3">
                                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase">What happens next?</p>
                                        <ul className="text-xs text-amber-800/80 dark:text-amber-300/80 space-y-1 list-disc pl-4">
                                            <li>Archives "{incomeTab}" to "{incomeTab}-{String(currentYear).slice(-2)}"</li>
                                            <li>Archives "{expenseTab}" to "{expenseTab}-{String(currentYear).slice(-2)}"</li>
                                            <li>Wipes current transactions to start {nextYear} at $0</li>
                                            <li>Historical data remains accessible via Time Machine</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Type "{currentYear}" to confirm</label>
                                    <input 
                                        type="text" 
                                        value={confirmYear} 
                                        onChange={e => setConfirmYear(e.target.value)}
                                        placeholder={String(currentYear)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-black focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-2xl">Cancel</button>
                                    <button 
                                        onClick={runRollover}
                                        disabled={confirmYear !== String(currentYear)}
                                        className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all"
                                    >
                                        Archive & Start {nextYear}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'rolling' && (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                <Loader2 size={48} className="text-emerald-500 animate-spin" />
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Cloning Sheets & Resetting Ledger...</p>
                                <p className="text-xs text-slate-500">Communicating with Google Sheets API</p>
                            </div>
                        )}

                        {step === 'done' && (
                            <div className="space-y-6 text-center py-4">
                                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Check size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">Rollover Successful!</h4>
                                    <p className="text-sm text-slate-500">Your {currentYear} data is safely archived. The active spreadsheet is now ready for {nextYear}.</p>
                                </div>
                                <button onClick={onClose} className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-4 rounded-2xl shadow-xl">
                                    Back to Dashboard
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DataIngest: React.FC<DataIngestProps> = (props) => {
  const { config, onConfigChange, onSync, isSyncing, syncingTabs, syncStatus, sheetUrl, onSheetUrlChange, isDarkMode, toggleTheme, userProfile, onProfileChange, onSessionChange, onSignOut, onViewChange, onTourStart } = props;
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<'idle' | 'cloning' | 'syncing' | 'complete' | 'error' | 'manual'>('idle');
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [localArchives, setLocalArchives] = useState<ArchiveMeta[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  
  const [lastBackupAt, setLastBackupAt] = useIndexedDB<string | null>('fintrack_last_backup_at', null);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useIndexedDB<string | null>('fintrack_last_cloud_sync_at', null);

  const [isRolloverOpen, setIsRolloverOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshArchives();
  }, []);

  const refreshArchives = async () => {
    setIsLoadingArchives(true);
    const list = await getArchiveManagementList();
    setLocalArchives(list);
    setIsLoadingArchives(false);
  };

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
          refreshArchives();
      } catch (e: any) {
          if (e.message === 'PRIVACY_RESTRICTION') setOnboardingStatus('manual');
          else { setOnboardingStatus('error'); alert(`Initialization failed: ${e.message}`); }
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

  const handleExport = async () => {
      setIsBackingUp(true);
      try {
          await exportBackup(userProfile?.email);
          setLastBackupAt(new Date().toISOString());
      } catch (e: any) { alert("Backup failed: " + e.message); }
      finally { setIsBackingUp(false); }
  };

  const handleCloudSync = async () => {
      setIsCloudSyncing(true);
      try {
          const timestamp = await syncToCloud(userProfile?.email);
          setLastCloudSyncAt(timestamp);
          alert("Cloud Vault updated!");
      } catch (e: any) { alert("Cloud sync failed: " + e.message); }
      finally { setIsCloudSyncing(false); }
  };

  const handleCloudRestore = async () => {
      if (!confirm("Restoring from Cloud will overwrite your local data. Proceed?")) return;
      setIsCloudSyncing(true);
      try {
          await restoreFromCloud();
          alert("Data restored! Reloading...");
          window.location.reload();
      } catch (e: any) { alert("Cloud restore failed: " + e.message); setIsCloudSyncing(false); }
  };

  const handleDeleteArchive = async (year: number) => {
    if (!confirm(`Delete all local records for ${year}? This only affects local storage.`)) return;
    await deleteLocalYear(year);
    refreshArchives();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !confirm("Overwrite current session with this backup?")) return;
      setIsBackingUp(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              await importBackup(event.target?.result as string);
              alert("Data restored! Reloading...");
              window.location.reload();
          } catch (err: any) { alert("Restore failed: " + err.message); setIsBackingUp(false); }
      };
      reader.readAsText(file);
  };

  if (!config.sheetId) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
        <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="flex justify-center"><div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600"><FileSpreadsheet size={32} /></div></div>
            <div className="space-y-2">
                <h2 className="text-3xl font-black">Welcome to Sheetsense</h2>
                <p className="text-slate-500">To maintain absolute privacy, Sheetsense only requests access to files you explicitly provide.</p>
            </div>
            {onboardingStatus === 'manual' ? (
                <div className="bg-blue-50 dark:bg-blue-900/30 p-8 rounded-2xl border-2 border-blue-500/50 text-left space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3"><div className="p-2 bg-blue-500 text-white rounded-lg"><Info size={20} /></div><h4 className="text-lg font-bold text-blue-900 dark:text-blue-100">Privacy Restriction Notice</h4></div>
                    <p className="text-sm text-blue-800/80 dark:text-blue-300/80 leading-relaxed">Please perform this one-time manual copy:</p>
                    <div className="grid gap-6">
                        <div className="flex items-start gap-4"><div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">1</div><div className="space-y-1"><p className="text-sm font-bold text-blue-900 dark:text-blue-200">Open Template</p><a href={`https://docs.google.com/spreadsheets/d/${MASTER_TEMPLATE_ID}/edit`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Open Sheetsense Master Template &rarr;</a></div></div>
                        <div className="flex items-start gap-4"><div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">2</div><div className="space-y-1"><p className="text-sm font-bold text-blue-900 dark:text-blue-200">Connect Your Copy</p><button onClick={handleOpenPicker} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold mt-2">Select My Spreadsheet</button></div></div>
                    </div>
                    <button onClick={() => setOnboardingStatus('idle')} className="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600">Go Back</button>
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
                                <button onClick={handleInitialize} disabled={onboardingStatus === 'cloning' || onboardingStatus === 'syncing'} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-all flex justify-center gap-2 shadow-lg">
                                    {onboardingStatus === 'cloning' ? <Loader2 className="animate-spin" size={18} /> : onboardingStatus === 'syncing' ? <Check size={18} /> : <Download size={18} />}
                                    {onboardingStatus === 'cloning' ? 'Starting...' : onboardingStatus === 'syncing' ? 'Syncing...' : 'Initialize From Template'}
                                </button>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-left group hover:border-emerald-400/50 transition-colors">
                                <h4 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white"><Search size={18} className="text-emerald-500" /> Link Existing</h4>
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
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-20">
      
      {/* 1. Account & UI Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-sm">
            <div className="flex items-center gap-5">
                <div className="relative">
                    <img src={userProfile?.picture} alt="" className="w-16 h-16 rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-md" />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-4 border-white dark:border-slate-850" />
                </div>
                <div className="text-center sm:text-left">
                    <h4 className="text-xl font-black text-slate-900 dark:text-white leading-none">{userProfile?.name}</h4>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest">{userProfile?.email}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={toggleTheme} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-500/30 transition-all" title="Toggle Theme">
                    {isDarkMode ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-yellow-500" />}
                </button>
                <button onClick={onSignOut} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:text-red-500 hover:border-red-500/30 transition-all" title="Sign Out">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
        <div className="bg-blue-600 dark:bg-blue-600/10 border-2 border-blue-600/10 rounded-3xl p-6 flex flex-col justify-center items-center text-center shadow-lg shadow-blue-500/10">
            <div className="p-3 bg-white/20 rounded-2xl mb-3 text-white">
                <ShieldCheck size={28} />
            </div>
            <h4 className="text-sm font-black text-white dark:text-blue-400 uppercase tracking-widest mb-1">Secure & Private</h4>
            <button onClick={() => onViewChange(ViewState.PRIVACY)} className="text-[10px] font-bold text-blue-100 dark:text-blue-500 uppercase tracking-widest hover:underline flex items-center gap-1">Review Privacy Policy <ExternalLink size={10} /></button>
        </div>
      </div>

      {/* 2. Spreadsheet Connection Section */}
      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-900/10">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><FileSpreadsheet size={24} /></div>
                <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Spreadsheet Source</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Google Sheets Connectivity</p>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <a href={sheetUrl} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md">
                    Open in Sheets <ExternalLink size={14} />
                </a>
                <button onClick={handleOpenPicker} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-md">
                    Change Source <Search size={14} />
                </button>
            </div>
        </div>
        <div className="p-8 space-y-10">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1 w-full">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Connected ID</p>
                    <div className="bg-slate-50 dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 truncate select-all">{config.sheetId}</div>
                </div>
                <div className="shrink-0 pt-6">
                    <button onClick={() => onSync()} disabled={isSyncing} className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all">
                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} Full Database Sync
                    </button>
                </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest"><Layers size={14} /> Active Tab Mappings</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.keys(config.tabNames).map(key => (
                        <CompactTabInput 
                            key={key} 
                            label={key} 
                            value={config.tabNames[key as keyof SheetConfig['tabNames']]} 
                            onChange={(v: string) => onConfigChange({ ...config, tabNames: { ...config.tabNames, [key]: v } })} 
                            onSync={() => onSync([key as any])} 
                            sheetId={config.sheetId} 
                            isSyncing={syncingTabs.has(key)} 
                        />
                    ))}
                </div>
                {syncStatus && (
                    <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-3 transition-all ${syncStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-900/30 text-emerald-600' : syncStatus.type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-900/30 text-amber-600' : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-900/30 text-red-600'}`}>
                        {syncStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {syncStatus.msg}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 3. Portability & Backup Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6 group">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform"><Cloud size={24} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Cloud Vault</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Google Drive Integration</p>
                    </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Synchronize your entire local application database to a hidden file on Google Drive for cross-device portability.</p>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button onClick={handleCloudSync} disabled={isCloudSyncing} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md disabled:opacity-50">
                        {isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />} Sync to Drive
                    </button>
                    <button onClick={handleCloudRestore} disabled={isCloudSyncing} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
                        {isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} />} Restore from Drive
                    </button>
                </div>
                {lastCloudSyncAt && (
                    <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <Clock size={10} /> Cloud Last Updated: {new Date(lastCloudSyncAt).toLocaleDateString()}
                    </div>
                )}
          </div>

          <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6 group">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-600 dark:text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform"><Database size={24} /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Local Snapshot</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">JSON Backup & Restore</p>
                    </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Download a complete snapshot of your data as a JSON file. This can be re-imported later to restore your session exactly.</p>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button onClick={handleExport} disabled={isBackingUp} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-md disabled:opacity-50">
                        {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />} Export Backup
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={isBackingUp} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
                        {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} Import Snapshot
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
                {lastBackupAt && (
                    <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <Clock size={10} /> Local Last Exported: {new Date(lastBackupAt).toLocaleDateString()}
                    </div>
                )}
          </div>
      </div>

      {/* 4. Archives & Maintenance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 border border-blue-500/20"><Box size={24} /></div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Local Archives</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Device Persistent Vaults</p>
                        </div>
                    </div>
                    <button onClick={refreshArchives} className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:text-blue-500 transition-colors shadow-sm"><RefreshCw size={16} className={isLoadingArchives ? "animate-spin" : ""} /></button>
                </div>
                <div className="flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/30">
                            <tr>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Year</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Objects</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {localArchives.map(archive => (
                                <tr key={archive.year} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-8 py-5 font-black text-slate-900 dark:text-white flex items-center gap-3"><CalendarDays size={16} className="text-blue-500" /> {archive.year}</td>
                                    <td className="px-8 py-5"><span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-200 dark:border-slate-700">{archive.records} Records</span></td>
                                    <td className="px-8 py-5 text-right">
                                        <button onClick={() => handleDeleteArchive(archive.year)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Purge local storage"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                            {localArchives.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-8 py-16 text-center text-slate-400 italic text-sm font-medium">No historical archives detected in the local vault.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
          </div>

          <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-slate-800 dark:to-slate-850 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000" />
                <div className="relative space-y-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6"><Zap size={32} /></div>
                    <h3 className="text-2xl font-black leading-tight">Year-End Maintenance</h3>
                    <p className="text-xs text-blue-100 dark:text-slate-400 leading-relaxed font-bold opacity-80">Close out your current financial year. This will archive your transactions and prepare a clean slate for the new year.</p>
                </div>
                <div className="relative pt-10">
                    <button onClick={() => setIsRolloverOpen(true)} className="w-full bg-white dark:bg-blue-600 text-blue-600 dark:text-white px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3">
                        Launch Maintenance Wizard <ChevronRight size={18} />
                    </button>
                </div>

                <RolloverStepper 
                    isOpen={isRolloverOpen} 
                    onClose={() => setIsRolloverOpen(false)} 
                    onSync={async (tabs) => onSync(tabs)}
                    sheetId={config.sheetId}
                    incomeTab={config.tabNames.income}
                    expenseTab={config.tabNames.expenses}
                    onSuccess={() => { refreshArchives(); }}
                />
          </div>
      </div>

      {/* 5. Danger Zone */}
      <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <button onClick={() => { if(confirm("ABSOLUTE DATA WIPE: This will permanently delete your entire local database (Assets, History, Keys). Google Sheets data will NOT be touched. Continue?")) { const req = indexedDB.deleteDatabase('FinTrackDB'); req.onsuccess = () => window.location.reload(); } }} className="flex items-center gap-2 text-red-500 hover:text-red-600 text-[10px] font-black uppercase tracking-widest transition-colors px-6 py-3 bg-red-50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-900/30">
                <Trash2 size={14} /> Factory Reset Application Data
            </button>
            <p className="text-[9px] text-slate-400 font-bold mt-3 uppercase tracking-tighter italic">Warning: This action is irreversible.</p>
      </div>
    </div>
  );
};
