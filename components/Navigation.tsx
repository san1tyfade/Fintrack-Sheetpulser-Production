
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Wallet, TrendingUp, History, Settings, RefreshCw, Clock, Info, Banknote, BarChart4, ShieldCheck } from 'lucide-react';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onSync: () => void;
  isSyncing: boolean;
  lastUpdated: Date | null;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  currentView, setView, onSync, isSyncing, lastUpdated
}) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, targetId: 'nav-dashboard' },
    { id: ViewState.ASSETS, label: 'Assets', icon: Wallet, targetId: 'nav-assets' },
    { id: ViewState.INVESTMENTS, label: 'Investments', icon: TrendingUp, targetId: 'nav-investments' },
    { id: ViewState.TRADES, label: 'Trades', icon: History, targetId: 'nav-trades' },
    { id: ViewState.INCOME, label: 'Income & Expense', icon: Banknote, targetId: 'nav-income' },
    { id: ViewState.ANALYTICS, label: 'Analytics', icon: BarChart4, targetId: 'nav-analytics' },
    { id: ViewState.INFORMATION, label: 'Information', icon: Info, targetId: 'nav-information' },
    { id: ViewState.SETTINGS, label: 'Settings', icon: Settings, targetId: 'nav-settings' },
  ];

  return (
    <nav className="bg-white/80 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 md:w-64 md:h-screen md:border-r md:border-b-0 flex-shrink-0 flex md:flex-col fixed md:relative z-20 w-full bottom-0 md:bottom-auto flex justify-between transition-colors duration-300">
      <div className="flex-1 flex flex-row md:flex-col overflow-hidden">
        <div className="p-6 hidden md:block">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent tracking-tighter">
                Sheetsense Money
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[8px] font-black tracking-widest border border-blue-500/20 shadow-sm">V1.1</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-60">
               <ShieldCheck size={10} className="text-emerald-500" /> Secure Protocol
            </p>
        </div>

        <div className="flex md:flex-col w-full justify-between md:justify-start px-2 md:px-4 md:space-y-1.5 py-2 md:py-0 overflow-x-auto md:overflow-visible">
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
                <button
                key={item.id}
                id={item.targetId}
                onClick={() => setView(item.id)}
                className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3.5 rounded-2xl transition-all duration-300 flex-shrink-0 relative group
                    ${isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                <Icon size={18} className={isActive ? "animate-in zoom-in-75" : "group-hover:scale-110 transition-transform"} />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest mt-1 md:mt-0">{item.label}</span>
                {isActive && <div className="absolute left-0 w-1 h-6 bg-white rounded-full hidden md:block" />}
                </button>
            );
            })}
            
            {/* Mobile Actions (Sync) */}
             <div className="md:hidden flex items-center px-2 space-x-2">
                 <button
                    onClick={onSync}
                    disabled={isSyncing}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 flex-shrink-0 min-w-[60px]
                        ${isSyncing ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10' : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white'}`}
                >
                    <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                    <span className="text-[10px] font-medium mt-1">{isSyncing ? 'Syncing' : 'Sync'}</span>
                </button>
             </div>
        </div>
      </div>

      {/* Footer Actions (Desktop) */}
      <div className="hidden md:block p-5 border-t border-slate-200 dark:border-slate-700/50 space-y-4">
        <button 
            id="desktop-sync-btn"
            onClick={onSync}
            disabled={isSyncing}
            className={`w-full flex items-center justify-center space-x-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm
            ${isSyncing ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-wait' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 active:scale-95'}`}
        >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Synchronizing" : "Refresh Data"}</span>
        </button>
        {lastUpdated && (
            <div className="flex items-center justify-center space-x-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 opacity-60">
                <Clock size={10} />
                <span>Last Sync: {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        )}
      </div>
    </nav>
  );
};
