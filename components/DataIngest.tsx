
import { AlertCircle, ArrowRight, CheckCircle2, Cloud, DollarSign, Download, ExternalLink, FileSpreadsheet, History, Info, Layers, Loader2, LogOut, Moon, RefreshCw, Search, Sparkles, Sun, Trash2, CalendarDays, DownloadCloud, UploadCloud, Database, Clock, CloudUpload, CloudDownload, Box, HardDrive, Lock, Zap, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchUserProfile, initGoogleAuth, signIn, copyMasterTemplate } from '../services/authService';
import { openPicker } from '../services/pickerService';
import { SheetConfig, UserProfile, ViewState, ArchiveMeta } from '../types';
import { exportBackup, importBackup, syncToCloud, restoreFromCloud, getArchiveManagementList, deleteLocalYear } from '../services/backupService';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { CompactTabInput } from './settings/CompactTabInput';
import { RolloverStepper } from './settings/RolloverStepper';

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

export const DataIngest: React.FC<DataIngestProps> = ({ 
  config, onConfigChange, onSync, isSyncing, syncingTabs, syncStatus, 
  sheetUrl, onSheetUrlChange, isDarkMode, toggleTheme, userProfile, 
  onProfileChange, onSessionChange, onSignOut, onViewChange, 
  onTourStart, activeYear, onRolloverSuccess 
}) => {
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<'idle' | 'cloning' | 'syncing' | 'complete' | 'error' | 'manual'>('idle');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [localArchives, setLocalArchives] = useState<ArchiveMeta[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  
  const [lastBackupAt, setLastBackupAt] = useIndexedDB<string | null>('fintrack_last_backup_at', null);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useIndexedDB<string | null>('fintrack_last_cloud_sync_at', null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshArchives = useCallback(async () => {
    setIsLoadingArchives(true);
    try {
      const list = await getArchiveManagementList();
      setLocalArchives(list);
    } catch (e) {
      console.error("Failed to load archives", e);
    } finally {
      setIsLoadingArchives(false);
    }
  }, []);

  useEffect(() => {
    refreshArchives();
  }, [activeYear, refreshArchives]);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      initGoogleAuth(config.clientId);
      const session = await signIn(true); 
      const profile = await fetchUserProfile(session.token);
      if (profile) { 
        onSessionChange(session); 
        onProfileChange(profile); 
      }
    } catch (e) { 
      alert("Sign in failed"); 
    } finally { 
      setIsAuthLoading(false); 
    }
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
          await onSync();
          setOnboardingStatus('complete');
          onTourStart();
          refreshArchives();
      } catch (e: any) {
          if (e.message === 'PRIVACY_RESTRICTION') setOnboardingStatus('manual');
          else { 
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
          if (result) { 
            onConfigChange({ ...config, sheetId: result.id }); 
            onSheetUrlChange(result.url); 
          }
      } catch (e) { 
        alert("Spreadsheet selection cancelled or failed."); 
      }
  };

  const handleExport = async () => {
      setIsBackingUp(true);
      try {
          await exportBackup(userProfile?.email);
          setLastBackupAt(new Date().toISOString());
      } catch (e: any) { 
        alert("Backup failed: " + e.message); 
      } finally { 
        setIsBackingUp(false); 
      }
  };

  const handleCloudSync = async () => {
      setIsCloudSyncing(true);
      try {
          const timestamp = await syncToCloud(userProfile?.email);
          setLastCloudSyncAt(timestamp);
          alert("Cloud Vault updated!");
      } catch (e: any) { 
        alert("Cloud sync failed: " + e.message); 
      } finally { 
        setIsCloudSyncing(false); 
      }
  };

  const handleCloudRestore = async () => {
      if (!confirm("Restoring from Cloud will overwrite your local data. Proceed?")) return;
      setIsCloudSyncing(true);
      try {
          await restoreFromCloud();
          alert("Data restored! Reloading...");
          window.location.reload();
      } catch (e: any) { 
        alert("Cloud restore failed: " + e.message); 
        setIsCloudSyncing(false); 
      }
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
          } catch (err: any) { 
            alert("Restore failed: " + err.message); 
            setIsBackingUp(false); 
          }
      };
      reader.readAsText(file);
  };

  const wipeDatabase = () => {
    if (confirm("Permanently wipe all local data? This cannot be undone.")) {
      const req = indexedDB.deleteDatabase('FinTrackDB');
      req.onsuccess = () => window.location.reload();
    }
  };

  if (!config.sheetId) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-2xl relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
        <div className="text-center space-y-8 max-w-2xl mx-auto">
            <div className="flex justify-center">
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-600 shadow-inner">
                    <FileSpreadsheet size={40} />
                </div>
            </div>
            <div className="space-y-3">
                <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Welcome to Sheetsense</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">To maintain absolute privacy, Sheetsense only requests access to files you explicitly provide.</p>
            </div>
            {onboardingStatus === 'manual' ? (
                <div className="bg-blue-50 dark:bg-blue-900/30 p-10 rounded-[2.5rem] border-2 border-blue-500/50 text-left space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20"><Info size={24} /></div>
                        <h4 className="text-xl font-black text-blue-900 dark:text-blue-100">Privacy Restriction Notice</h4>
                    </div>
                    <p className="text-sm text-blue-800/80 dark:text-blue-300/80 leading-relaxed font-medium">Please perform this one-time manual copy to continue:</p>
                    <div className="grid gap-6">
                        <div className="flex items-start gap-5 p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-blue-200 dark:border-blue-700/50">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-sm font-black shadow-md">1</div>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-blue-900 dark:text-blue-200 uppercase tracking-tight">Open Template</p>
                                <a href={`https://docs.google.com/spreadsheets/d/${MASTER_TEMPLATE_ID}/edit`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1">Open Sheetsense Master Template <ExternalLink size={10} /></a>
                            </div>
                        </div>
                        <div className="flex items-start gap-5 p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-blue-200 dark:border-blue-700/50">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-sm font-black shadow-md">2</div>
                            <div className="space-y-2">
                                <p className="text-sm font-black text-blue-900 dark:text-blue-200 uppercase tracking-tight">Connect Your Copy</p>
                                <button onClick={handleOpenPicker} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95">Select My Spreadsheet</button>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setOnboardingStatus('idle')} className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Go Back</button>
                </div>
            ) : (
                <>
                    {!userProfile ? (
                        <button onClick={handleSignIn} disabled={isAuthLoading} className="bg-blue-600 text-white font-black py-5 px-12 rounded-3xl shadow-2xl shadow-blue-500/30 flex items-center gap-4 mx-auto hover:bg-blue-500 transition-all hover:-translate-y-1 active:scale-95 text-lg">
                            {isAuthLoading ? <Loader2 className="animate-spin" /> : <img src="https://www.google.com/favicon.ico" alt="G" className="w-6 h-6 bg-white rounded-full p-1 shadow-sm" />}
                            Connect Google Account
                        </button>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-8 pt-6">
                            <div className="p-8 bg-slate-50 dark:bg-slate-850 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 space-y-6 text-left group hover:border-blue-400/50 transition-all hover:shadow-xl">
                                <div className="space-y-2">
                                    <h4 className="font-black text-lg flex items-center gap-3 text-slate-900 dark:text-white tracking-tight"><Sparkles size={22} className="text-blue-500" /> Use Template</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">Perfect for new users. We'll set up the ideal folder structure for you.</p>
                                </div>
                                <button onClick={handleInitialize} disabled={onboardingStatus === 'cloning' || onboardingStatus === 'syncing'} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all flex justify-center items-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95">
                                    {onboardingStatus === 'cloning' ? <Loader2 className="animate-spin" size={20} /> : onboardingStatus === 'syncing' ? <CheckCircle2 size={20} /> : <Download size={20} />}
                                    {onboardingStatus === 'cloning' ? 'Cloning...' : onboardingStatus === 'syncing' ? 'Syncing...' : 'Start Fresh'}
                                </button>
                            </div>
                            <div className="p-8 bg-slate-50 dark:bg-slate-850 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 space-y-6 text-left group hover:border-emerald-400/50 transition-all hover:shadow-xl">
                                <div className="space-y-2">
                                    <h4 className="font-black text-lg flex items-center gap-3 text-slate-900 dark:text-white tracking-tight"><Search size={22} className="text-emerald-500" /> Link Existing</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">Connecting an existing sheet? Pick it from your Google Drive files.</p>
                                </div>
                                <button onClick={handleOpenPicker} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95">Select Spreadsheet</button>
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
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-16">
      {/* Profile & Command Center Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] shadow-sm p-8 flex flex-col justify-between min-h-[250px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:bg-blue-500/10 transition-all duration-700"></div>
            <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <img src={userProfile?.picture || ''} alt="" className="w-16 h-16 rounded-3xl border-2 border-white dark:border-slate-700 shadow-xl" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white dark:border-slate-800 rounded-full"></div>
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{userProfile?.name}</h4>
                        <p className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-1.5 opacity-60"><Lock size={12} /> {userProfile?.email}</p>
                    </div>
                </div>
                <button onClick={onSignOut} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-90" title="Sign Out">
                    <LogOut size={20} />
                </button>
            </div>
            <div className="pt-8 border-t border-slate-100 dark:border-slate-700/50 space-y-4 relative z-10">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <span>Data Source Gateway</span>
                  <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-2 hover:underline">Launch Sheets <ExternalLink size={12} /></a>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-mono text-slate-500 truncate shadow-inner">ID: {config.sheetId}</div>
                  <button onClick={handleOpenPicker} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-4 rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:scale-95" title="Switch Spreadsheet"><Search size={20} /></button>
                </div>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm space-y-8">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">UI Preferences</h4>
            <div className="space-y-4">
                <button onClick={toggleTheme} className="w-full flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/40 transition-all group active:scale-98">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Appearance</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">{isDarkMode ? 'DARK' : 'LIGHT'}</span>
                        {isDarkMode ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-yellow-500" />}
                    </div>
                </button>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                <button onClick={() => onViewChange(ViewState.PRIVACY)} className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black text-slate-400 hover:text-blue-500 uppercase tracking-[0.2em] transition-colors group">Privacy Protocol <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" /></button>
                <button onClick={wipeDatabase} className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-[0.2em] transition-colors group">Atomic Reset <Trash2 size={12} className="group-hover:rotate-12 transition-transform" /></button>
            </div>
        </div>
      </div>

      {/* Tab Mappings Command */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[3rem] p-8 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 border-b border-slate-100 dark:border-slate-700 pb-8">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-500/10 rounded-3xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-inner">
                <Layers size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Tab Mappings</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Remote synchronization bridge</p>
            </div>
          </div>
          <button onClick={() => onSync()} disabled={isSyncing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all hover:-translate-y-0.5 active:scale-95">
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} Synchronize All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { t: 'Investment Core', i: Layers, k: ['assets', 'investments', 'trades'] },
            { t: 'Flow Ledger', i: DollarSign, k: ['income', 'expenses', 'subscriptions', 'debt'] },
            { t: 'Chronological Logs', i: History, k: ['accounts', 'logData', 'portfolioLog'] }
          ].map(cat => (
            <div key={cat.t} className="space-y-5">
              <div className="flex items-center gap-3 px-1 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  <cat.i size={14} className="text-indigo-500/50" /> {cat.t}
              </div>
              <div className="space-y-4">
                {cat.k.map(key => (
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
            </div>
          ))}
        </div>

        {syncStatus && (
          <div className={`mt-4 p-5 rounded-3xl border text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-bottom-2 ${syncStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 text-emerald-600 shadow-emerald-500/5' : syncStatus.type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 text-amber-600' : 'bg-red-50 dark:bg-red-500/10 border-red-200/50 text-red-600'}`}>
            {syncStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} 
            {syncStatus.msg}
          </div>
        )}
      </div>

      {/* Storage & Local Persistence */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[3rem] p-8 shadow-sm space-y-8">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-6">
              <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-3xl text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-inner">
                    <Box size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Local Persistence</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-2">On-device Vault Archives</p>
                  </div>
              </div>
              <button onClick={refreshArchives} className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-2xl transition-all active:scale-90" title="Refresh local list">
                <RefreshCw size={20} className={isLoadingArchives ? "animate-spin" : ""} />
              </button>
          </div>
          
          <div className="overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
              <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <tr>
                          <th className="px-8 py-5">Financial Period</th>
                          <th className="px-8 py-5">Vault Objects</th>
                          <th className="px-8 py-5">Persistence State</th>
                          <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-850">
                      {localArchives.map(archive => {
                          const isActive = archive.year === activeYear;
                          return (
                            <tr key={archive.year} className={`hover:bg-slate-50 dark:hover:bg-slate-900/30 group transition-colors ${isActive ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3 font-black text-slate-900 dark:text-white text-sm">
                                        <CalendarDays size={18} className={isActive ? "text-blue-500" : "text-slate-300 dark:text-slate-600"} /> 
                                        {archive.year}
                                        {isActive && <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full ml-3 tracking-widest">ACTIVE</span>}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="font-mono text-slate-500 font-bold">{archive.records} Records Detected</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        <HardDrive size={14} /> Local IndexedDB
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button 
                                        onClick={() => handleDeleteArchive(archive.year)}
                                        disabled={isActive}
                                        className={`p-2.5 rounded-xl transition-all ${isActive ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-90'}`}
                                        title={isActive ? "Cannot delete active year" : "Clear local cache"}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                          );
                      })}
                      {localArchives.length === 0 && (
                          <tr>
                              <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic font-medium opacity-60">No historical archives detected in the local vault.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Year-End Maintenance Experience */}
      <div className="bg-slate-900 dark:bg-slate-850 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-1000"></div>
          <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <div className="p-6 bg-blue-500/10 text-blue-400 rounded-[2rem] border border-blue-500/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
                  <Zap size={40} className="fill-blue-500/20" />
              </div>
              <div className="flex-1 text-center md:text-left space-y-3">
                  <h3 className="text-2xl font-black text-white tracking-tight">Year-End Maintenance</h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-xl font-medium">
                      Ready to start a new financial chapter? This automated wizard archives your current ledger and prepares a fresh, clean workspace for the upcoming year.
                  </p>
              </div>
              <button 
                onClick={() => setIsRolloverOpen(true)}
                className="bg-white text-slate-900 hover:bg-blue-50 font-black px-10 py-5 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-[0.98] whitespace-nowrap uppercase text-[11px] tracking-[0.2em]"
              >
                  Close Year {activeYear}
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

      {/* Recovery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-[3rem] p-8 shadow-sm flex flex-col gap-8">
            <div className="flex items-center gap-5">
                <div className="p-4 bg-emerald-500/10 rounded-[2rem] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner">
                    <Cloud size={28} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">Cloud Vault</h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-[0.2em] mt-2">Encrypted Drive Sync</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-sm">
                <div className="space-y-2 text-left">
                    <div className="flex justify-between items-start">
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Google Drive Sync</h4>
                        {lastCloudSyncAt && (
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                                <Clock size={10} /> {new Date(lastCloudSyncAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Store your local IndexedDB in a secure, hidden application file on your private Google Drive.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleCloudSync} disabled={isCloudSyncing} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">{isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />} Sync</button>
                    <button onClick={handleCloudRestore} disabled={isCloudSyncing} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">{isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} />} Restore</button>
                </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 rounded-[3rem] p-8 shadow-sm flex flex-col gap-8">
            <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-500/10 rounded-[2rem] text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-inner">
                    <Database size={28} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">Manual Export</h3>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-500 font-black uppercase tracking-[0.2em] mt-2">Offline JSON Snapshots</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-sm">
                <div className="space-y-2 text-left">
                    <div className="flex justify-between items-start">
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Offline Backup</h4>
                        {lastBackupAt && (
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                                <Clock size={10} /> {new Date(lastBackupAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Export all settings, tax records, and local data into a portable JSON file for cold storage.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleExport} disabled={isBackingUp} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50">{isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />} Export</button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={isBackingUp} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50">{isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} Import</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
            </div>
          </div>
      </div>
      
      <footer className="pt-12 pb-8 flex flex-col items-center gap-4 border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
             <ShieldCheck size={14} className="text-emerald-500" /> Sheetsense Production Build v1.1.0
          </div>
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Local-First Architecture • End-to-End Privacy</p>
      </footer>
    </div>
  );
};
