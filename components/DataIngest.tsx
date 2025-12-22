
import React, { useEffect, useState } from 'react';
import { SheetConfig, UserProfile } from '../types';
import { 
  Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, 
  Layers, DollarSign, History, Sun, Moon, ShieldCheck, 
  Trash2, ExternalLink, Key, Cloud, LogOut, Search, X
} from 'lucide-react';
import { validateSheetTab } from '../services/sheetService';
import { initGoogleAuth, signIn, fetchUserProfile, signOut } from '../services/authService';
import { listSpreadsheets, DriveFile } from '../services/driveService';

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

// --- Sheet Selector Modal ---
const SheetSelectorModal = ({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (file: DriveFile) => void }) => {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadFiles();
        }
    }, [isOpen]);

    const loadFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await listSpreadsheets();
            setFiles(list);
        } catch (e: any) {
            setError(e.message || "Failed to load files");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="text-emerald-500" size={20} /> Select Spreadsheet
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search files..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <Loader2 className="animate-spin mb-2" size={24} />
                            <span className="text-xs">Loading spreadsheets...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center text-red-500 text-sm">
                            <p className="mb-2 font-bold">Error loading files</p>
                            <p>{error}</p>
                            <button onClick={loadFiles} className="mt-4 text-blue-500 underline text-xs">Try Again</button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-sm">No spreadsheets found.</div>
                    ) : (
                        filtered.map(file => (
                            <button
                                key={file.id}
                                onClick={() => onSelect(file)}
                                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-3 group"
                            >
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                                    <FileSpreadsheet size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm">{file.name}</h4>
                                    <p className="text-[10px] text-slate-500">
                                        Last modified: {new Date(file.modifiedTime).toLocaleDateString()}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

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
  
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [isSheetSelectorOpen, setIsSheetSelectorOpen] = useState(false);

  useEffect(() => {
    if (!config.clientId) {
      setSetupMode(true);
    } else {
      setSetupMode(false);
    }
  }, [config.clientId]);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    try {
        if (!config.clientId) throw new Error("Client ID missing");
        
        initGoogleAuth(config.clientId);
        const token = await signIn(true); 
        const profile = await fetchUserProfile(token);
        
        if (profile) {
            setUserProfile(profile);
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

  const handleSignOut = () => {
      signOut();
      setUserProfile(null);
  };

  const handleOpenSelector = async () => {
      // Ensure we are signed in before opening
      try {
          if (!config.clientId) throw new Error("Client ID missing");
          await signIn(false);
          setIsSheetSelectorOpen(true);
      } catch (e: any) {
          if (e.message !== 'POPUP_CLOSED') {
             alert("Please sign in to select a sheet.");
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

  const maskKey = (key: string) => {
      if (!key || key.length < 8) return 'Missing';
      return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* Top Section: Connection & Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Connection Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Cloud size={16} className="text-blue-500" /> Account & Data Source
                </h3>
                {setupMode ? (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Setup Mode</span>
                ) : (
                     <div className="flex gap-2">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full" title="Client ID">ID: {maskKey(config.clientId)}</span>
                     </div>
                )}
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center">
                {/* 1. Setup Mode (Missing Credentials) */}
                {setupMode ? (
                    <div className="max-w-md mx-auto w-full space-y-4 animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600 dark:text-blue-400">
                                <Key size={24} />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">Configuration Required</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Enter your Google Cloud OAuth Client ID.</p>
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                OAuth Client ID
                            </label>
                            <input 
                                type="text" 
                                value={config.clientId || ''}
                                onChange={(e) => onConfigChange({ ...config, clientId: e.target.value })}
                                placeholder="...apps.googleusercontent.com"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-4"
                            />
                            
                            <p className="text-[10px] text-slate-400 mb-4">
                                Available in Google Cloud Console &gt; APIs & Services &gt; Credentials.
                            </p>
                            <button 
                                onClick={() => setSetupMode(false)}
                                disabled={!config.clientId}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save & Continue
                            </button>
                        </div>
                    </div>
                ) : (
                    /* 2. Authentication & Sheet Selection */
                    <div className="space-y-8">
                        {/* User Profile Section */}
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
                                <button onClick={() => setSetupMode(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">
                                    Update Credentials
                                </button>
                             </div>
                        ) : (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <img src={userProfile.picture} alt={userProfile.name} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">{userProfile.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-slate-500">{userProfile.email}</p>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Connected</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleSignOut} className="text-slate-400 hover:text-red-500 transition-colors p-2" title="Sign Out">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}

                        {/* Sheet Selector (Only visible if signed in) */}
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
                                        onClick={handleOpenSelector}
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
                )}
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
            ${syncStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'}`}>
            {syncStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {syncStatus.msg}
          </div>
        )}
      </div>

      <SheetSelectorModal 
        isOpen={isSheetSelectorOpen} 
        onClose={() => setIsSheetSelectorOpen(false)}
        onSelect={(file) => {
            onConfigChange({ ...config, sheetId: file.id });
            onSheetUrlChange(file.webViewLink);
            setIsSheetSelectorOpen(false);
        }}
      />
    </div>
  );
};
