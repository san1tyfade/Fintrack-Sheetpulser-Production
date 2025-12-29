
import { AlertCircle, ArrowRight, Check, CheckCircle2, Cloud, DollarSign, Download, ExternalLink, FileSpreadsheet, History, Info, Layers, Loader2, LogOut, Moon, RefreshCw, Scale, Search, Shield, ShieldCheck, Sparkles, Sun, Trash2, CalendarDays, DownloadCloud, UploadCloud, Database, Clock, CloudUpload, CloudDownload, Box, HardDrive, Lock, Unlock, Zap, AlertTriangle, PartyPopper } from 'lucide-react';
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
  activeYear: number;
  onRolloverSuccess: (nextYear: number) => void;
}

const CompactTabInput = memo(({ label, value, onChange, onSync, sheetId, isSyncing }: any) => {
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

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 hover:border-blue-400/30 transition-all group">
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider truncate mr-2 group-hover:text-blue-500 transition-colors">{label}</label>
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

const RolloverStepper = ({ 
    isOpen, 
    onClose, 
    onSync, 
    sheetId, 
    incomeTab, 
    expenseTab, 
    onSuccess,
    activeYear
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSync: (tabs: any[]) => Promise<void>; 
    sheetId: string;
    incomeTab: string;
    expenseTab: string;
    onSuccess: (nextYear: number) => void;
    activeYear: number;
}) => {
    const [step, setStep] = useState<'init' | 'syncing' | 'confirm' | 'rolling' | 'done'>('init');
    const [confirmYear, setConfirmYear] = useState('');
    const nextYear = activeYear + 1;

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
        if (confirmYear !== String(activeYear)) {
            alert(`Please type ${activeYear} to confirm.`);
            return;
        }
        setStep('rolling');
        try {
            await resetYearlyLedger(sheetId, incomeTab, expenseTab);
            setStep('done');
            onSuccess(nextYear);
        } catch (e: any) {
            alert(`Rollover failed: ${e.message}`);
            setStep('confirm');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${step === 'done' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                            {step === 'done' ? <PartyPopper size={24} /> : <Zap size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Close Financial Year {activeYear}</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Year-End Maintenance Wizard</p>
                        </div>
                    </div>

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
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Synchronizing {activeYear} Records...</p>
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
                                            <li>Archives "{incomeTab}" to "{incomeTab}-{String(activeYear).slice(-2)}"</li>
                                            <li>Archives "{expenseTab}" to "{expenseTab}-{String(activeYear).slice(-2)}"</li>
                                            <li>Wipes current transactions to start {nextYear} at $0</li>
                                            <li>Historical data remains accessible via Time Machine</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Type "{activeYear}" to confirm</label>
                                    <input 
                                        type="text" 
                                        value={confirmYear} 
                                        onChange={e => setConfirmYear(e.target.value)}
                                        placeholder={String(activeYear)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-black focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-2xl">Cancel</button>
                                    <button 
                                        onClick={runRollover}
                                        disabled={confirmYear !== String(activeYear)}
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
                                    <p className="text-sm text-slate-500">Your {activeYear} data is safely archived. The active spreadsheet is now ready for {nextYear}.</p>
                                </div>
                                <button onClick={onClose} className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-4 rounded-2xl shadow-xl">
                                    Start {nextYear} Chapter
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
  const { config, onConfigChange, onSync, isSyncing, syncingTabs, syncStatus, sheetUrl, onSheetUrlChange, isDarkMode, toggleTheme, userProfile, onProfileChange, onSessionChange, onSignOut, onViewChange, onTourStart, activeYear, onRolloverSuccess } = props;
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
  }, [activeYear]);

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
    if (year === activeYear) {
        alert("You cannot delete the active financial year from local storage.");
        return;
    }
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
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col justify-between min-h-[220px]">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <img src={userProfile?.picture || ''} alt="" className="w-12 h-12 rounded-full border-2 border-slate-100 dark:border-slate-700 shadow-sm" />
                    <div><h4 className="font-bold text-slate-900 dark:text-white">{userProfile?.name}</h4><p className="text-xs text-slate-500">{userProfile?.email}</p></div>
                </div>
                <button onClick={onSignOut} className="text-slate-400 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400"><span>Active Data Source</span><a href={sheetUrl} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1 hover:underline">Open in Sheets <ExternalLink size={10} /></a></div>
                <div className="flex gap-2"><div className="flex-1 bg-slate-50 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-500 truncate">ID: {config.sheetId}</div><button onClick={handleOpenPicker} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-xs hover:bg-blue-500 shadow-lg shadow-blue-500/20"><Search size={16} /></button></div>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-6">
            <h4 className="text-xs font-bold uppercase text-slate-400">Preferences</h4>
            <button onClick={toggleTheme} className="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 transition-all">
                <span className="text-xs font-bold">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>{isDarkMode ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-yellow-500" />}
            </button>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                <button onClick={() => onViewChange(ViewState.PRIVACY)} className="w-full flex items-center justify-between text-[10px] font-bold text-slate-500 hover:text-blue-500 uppercase tracking-widest">Privacy Policy <ArrowRight size={10} /></button>
                <button onClick={() => { if(confirm("Wipe all local data?")) { const req = indexedDB.deleteDatabase('FinTrackDB'); req.onsuccess = () => window.location.reload(); } }} className="w-full flex items-center justify-between text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest">Wipe Local Database <Trash2 size={10} /></button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"><Layers size={20} /></div>
            <h3 className="text-sm font-bold">Tab Mappings</h3>
          </div>
          <button onClick={() => onSync()} disabled={isSyncing} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 shadow-lg disabled:opacity-50">
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync All Tabs
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: 'Portfolio', i: Layers, k: ['assets', 'investments', 'trades'] },
            { t: 'Flow', i: DollarSign, k: ['income', 'expenses', 'subscriptions', 'debt'] },
            { t: 'Logs & Records', i: History, k: ['accounts', 'logData', 'portfolioLog'] }
          ].map(cat => (
            <div key={cat.t} className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><cat.i size={12} /> {cat.t}</div>
              <div className="space-y-2">
                {cat.k.map(key => (
                  <CompactTabInput key={key} label={key} value={config.tabNames[key as keyof SheetConfig['tabNames']]} onChange={(v: string) => onConfigChange({ ...config, tabNames: { ...config.tabNames, [key]: v } })} onSync={() => onSync([key as any])} sheetId={config.sheetId} isSyncing={syncingTabs.has(key)} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {syncStatus && (
          <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${syncStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 text-emerald-600' : syncStatus.type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 text-amber-600' : 'bg-red-50 dark:bg-red-500/10 border-red-200 text-red-600'}`}>
            {syncStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {syncStatus.msg}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-500/20"><Box size={20} /></div>
                  <div>
                    <h3 className="text-sm font-bold">Storage & Archives</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">On-device Vault Persistence</p>
                  </div>
              </div>
              <button onClick={refreshArchives} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><RefreshCw size={14} className={isLoadingArchives ? "animate-spin" : ""} /></button>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <tr>
                          <th className="px-4 py-3">Financial Year</th>
                          <th className="px-4 py-3">Local Records</th>
                          <th className="px-4 py-3">Persistence</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {localArchives.map(archive => {
                          const isActive = archive.year === activeYear;
                          return (
                            <tr key={archive.year} className={`hover:bg-slate-50 dark:hover:bg-slate-900/30 group ${isActive ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                <td className="px-4 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CalendarDays size={14} className={isActive ? "text-blue-500" : "text-slate-400"} /> 
                                    {archive.year}
                                    {isActive && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded ml-2">ACTIVE</span>}
                                </td>
                                <td className="px-4 py-4 font-mono text-slate-500">{archive.records} objects</td>
                                <td className="px-4 py-4">
                                    <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase ${isActive ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        <HardDrive size={10} /> Local Vault
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                          onClick={() => handleDeleteArchive(archive.year)}
                                          disabled={isActive}
                                          className={`p-1.5 transition-colors ${isActive ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-300 hover:text-red-500'}`}
                                          title={isActive ? "Cannot delete active year" : "Clear local cache for this year"}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                          );
                      })}
                      {localArchives.length === 0 && (
                          <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No historical archives detected in the local vault.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border-2 border-blue-500/20 dark:border-blue-500/10 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="p-5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
                  <Zap size={32} />
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Year-End Maintenance</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Ready to start a new financial chapter? This wizard will archive your current ledger and prepare a fresh, clean spreadsheet for the upcoming year.
                  </p>
              </div>
              <button 
                onClick={() => setIsRolloverOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:scale-[0.98] whitespace-nowrap"
              >
                  Close Financial Year {activeYear}
              </button>
          </div>

          <RolloverStepper 
              isOpen={isRolloverOpen} 
              onClose={() => setIsRolloverOpen(false)} 
              onSync={async (tabs) => onSync(tabs)}
              sheetId={config.sheetId}
              incomeTab={config.tabNames.income}
              expenseTab={config.tabNames.expenses}
              activeYear={activeYear}
              onSuccess={(nextYear) => {
                  onRolloverSuccess(nextYear);
                  refreshArchives();
              }}
          />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><Cloud size={20} /></div>
                <div><h3 className="text-sm font-bold">Cloud Vault</h3><p className="text-[10px] text-emerald-500 uppercase font-bold tracking-tight">Auto-Sync IndexedDB to Drive</p></div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl flex flex-col gap-4">
                <div className="space-y-1 text-left">
                    <div className="flex justify-between items-start"><h4 className="font-bold text-slate-900 dark:text-white">Google Drive Sync</h4>{lastCloudSyncAt && (<div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800"><Clock size={10} /> Last: {new Date(lastCloudSyncAt).toLocaleDateString()}</div>)}</div>
                    <p className="text-xs text-slate-500 leading-relaxed">Securely store your local database in a hidden file on your Google Drive.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleCloudSync} disabled={isCloudSyncing} className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />} Sync to Cloud</button>
                    <button onClick={handleCloudRestore} disabled={isCloudSyncing} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} />} Restore</button>
                </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"><Database size={20} /></div>
                <div><h3 className="text-sm font-bold">Local Export</h3><p className="text-[10px] text-indigo-500 uppercase font-bold tracking-tight">Manual JSON Backups</p></div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl flex flex-col gap-4">
                <div className="space-y-1 text-left">
                    <div className="flex justify-between items-start"><h4 className="font-bold text-slate-900 dark:text-white">File Export</h4>{lastBackupAt && (<div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800"><Clock size={10} /> Last: {new Date(lastBackupAt).toLocaleDateString()}</div>)}</div>
                    <p className="text-xs text-slate-500 leading-relaxed">Export your local IndexedDB for offline safekeeping.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleExport} disabled={isBackingUp} className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />} Export</button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={isBackingUp} className="bg-blue-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} Import</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};
