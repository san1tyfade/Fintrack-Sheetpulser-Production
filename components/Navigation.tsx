
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Wallet, TrendingUp, History, Settings, RefreshCw, Clock, Info, Banknote } from 'lucide-react';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onSync: () => void;
  isSyncing: boolean;
  lastUpdated: Date | null;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView, onSync, isSyncing, lastUpdated }) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.ASSETS, label: 'Assets', icon: Wallet },
    { id: ViewState.INVESTMENTS, label: 'Investments', icon: TrendingUp },
    { id: ViewState.TRADES, label: 'Trades', icon: History },
    { id: ViewState.INCOME, label: 'Income & Expense', icon: Banknote },
    { id: ViewState.INFORMATION, label: 'Information', icon: Info },
    { id: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white/80 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 md:w-64 md:h-screen md:border-r md:border-b-0 flex-shrink-0 flex md:flex-col fixed md:relative z-20 w-full bottom-0 md:bottom-auto flex justify-between transition-colors duration-300">
      <div className="flex-1 flex flex-row md:flex-col overflow-hidden">
        <div className="p-6 hidden md:block">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Sheetsense
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Making sense of your finances</p>
        </div>

        <div className="flex md:flex-col w-full justify-between md:justify-start px-2 md:px-4 md:space-y-2 py-2 md:py-0 overflow-x-auto md:overflow-visible">
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
                <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-200 flex-shrink-0
                    ${isActive 
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-600/20 dark:text-blue-400 dark:border-blue-600/30' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                <Icon size={20} />
                <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">{item.label}</span>
                </button>
            );
            })}
            
            {/* Mobile Actions (Sync) */}
             <div className="md:hidden flex items-center px-2">
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

      {/* Sync Status / Manual Refresh (Desktop) */}
      <div className="hidden md:block p-4 border-t border-slate-200 dark:border-slate-700/50 space-y-3">
        <button 
            onClick={onSync}
            disabled={isSyncing}
            className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg text-sm font-medium transition-all
            ${isSyncing ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-wait' : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400'}`}
        >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Syncing..." : "Refresh Data"}</span>
        </button>
        {lastUpdated && (
            <div className="mt-2 flex items-center justify-center space-x-1 text-[10px] text-slate-500 dark:text-slate-500">
                <Clock size={10} />
                <span>Updated: {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        )}
      </div>
    </nav>
  );
};
