import React, { useEffect, useState } from 'react';
import { SheetConfig, UserProfile, ViewState } from '../types';
import { 
  Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, 
  Layers, DollarSign, History, Sun, Moon, ShieldCheck, 
  Trash2, ExternalLink, Cloud, LogOut, Search, X, ArrowRight
} from 'lucide-react';
import { validateSheetTab } from '../services/sheetService';
import { initGoogleAuth, signIn, fetchUserProfile } from '../services/authService';
import { openPicker } from '../services/pickerService';

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
    if (!status || !sheetId || !value) {
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
    toggleTheme,
    userProfile,
    onProfileChange,
    onSessionChange,
    onSignOut,
    onViewChange
}) => {
  
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    try {
        if (!config.clientId) throw new Error("Client ID missing");
        
        initGoogleAuth(config.clientId);
        const session = await signIn(true); 
        const profile = await fetchUserProfile(session.token);
        
        if (profile) {
            onSessionChange(session);
            onProfileChange(profile);
        }
    } catch (e: any) {
        if (e.message !== 'POPUP_CLOSED') {
             console.error("Sign in failed", e);
             alert(`Sign in failed: ${e.message}`);
        }
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleOpenPicker = async () => {
      try {
          if (!config.clientId) throw new Error("Client ID missing");
          const session = await signIn(false);
          onSessionChange(session);
          
          const result = await openPicker();
          if (result) {
              onConfigChange({ ...config, sheetId: result.id });
              onSheetUrlChange(result.url);
          }
      } catch (e: any) {
          if (e.message !== 'POPUP_CLOSED') {
             alert(`Could not open picker: ${e.message}`);
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Cloud size={16} className="text-blue-500" /> Account & Data Source
                </h3>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="space-y-8">
                    {!userProfile ? (
                         <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <Cloud size={32} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Not Signed In</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Connect your Google account to access sheets.</p>
                            </div>
                            <button 
                                onClick={handleSignIn}
                                disabled={isAuthLoading}
                                className="bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 font-bold py-2.5 px-6 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all flex items-center gap-2 mx-auto shadow-sm"
                            >
                                {isAuthLoading ? <Loader2 size={18} className="animate-spin" /> : <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />}
                                <span>Sign in with Google</span>
                            </button>
                         </div>
                    ) : (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 animate-fade-in">
                            <div className="flex items-center gap-4">
                                <img src={userProfile.picture} alt={userProfile.name} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
                                <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{userProfile.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500 truncate">{userProfile.email}</p>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0"></span>
                                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Connected</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={onSignOut} className="text-slate-400 hover:text-red-500 transition-colors p-2" title="Sign Out">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {userProfile && (
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Spreadsheet</label>
                                {config.sheetId && (
                                    <a href={sheetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline">
                                        Open in Sheets <ExternalLink size={10} />
                                    </a>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative group">
                                     <input 
                                        type="text" 
                                        value={config.sheetId ? `Sheet ID: ${config.sheetId}` : ''} 
                                        readOnly 
                                        placeholder="No sheet selected"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-default"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
                                        <FileSpreadsheet size={18} />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleOpenPicker}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Search size={18} />
                                    {config.sheetId ? 'Change Sheet' : 'Select Sheet'}
                                </button>
                            </div>
                            {config.sheetId && (
                                 <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <CheckCircle2 size={12} className="text-emerald-500" /> 
                                    Ready to sync. Map your tabs below.
                                 </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

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
                    <ShieldCheck size={16} className="text-emerald-500" /> Privacy & Security
                </h3>
                <div className="space-y-3">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Data is processed locally in your browser. We use the restrictive 'drive.file' scope to access only files you select.
                    </p>
                    <button 
                        onClick={() => onViewChange(ViewState.PRIVACY)}
                        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                    >
                        View Full Privacy Policy <ArrowRight size={12} />
                    </button>
                    <button 
                        onClick={handleWipeData}
                        className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                    >
                        <Trash2 size={12} /> Wipe Local Data
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm transition-opacity duration-300 ${!config.sheetId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
                    onChange={(val) => onConfigChange({ ...config, tabNames: { ...config.tabNames, [item.k as keyof SheetConfig['tabNames']]: val } })}
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
            ${syncStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-200 text-red-600 dark:text-red-400'}`}>
            {syncStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {syncStatus.msg}
          </div>
        )}
      </div>
    </div>
  );
};