
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { AssetsList } from './components/AssetsList';
import { InvestmentsList } from './components/InvestmentsList';
import { TradesList } from './components/TradesList';
import { IncomeView } from './components/IncomeView';
import { InformationView } from './components/InformationView';
import { DataIngest } from './components/DataIngest';
import { ViewState, Asset, Investment, Trade, Subscription, BankAccount, SheetConfig, NetWorthEntry, DebtEntry, IncomeEntry, ExpenseEntry, IncomeAndExpenses, ExchangeRates, DetailedExpenseData } from './types';
import { fetchSheetData, extractSheetId } from './services/sheetService';
import { parseRawData } from './services/geminiService';
import { fetchLiveRates } from './services/currencyService';
import { reconcileInvestments } from './services/portfolioService';
import { useIndexedDB } from './hooks/useIndexedDB';
import { Loader2 } from 'lucide-react';

// --- Configuration & Constants ---

const DEFAULT_CONFIG: SheetConfig = {
  sheetId: '',
  tabNames: {
    assets: 'Assets',
    investments: 'Investment Assets',
    trades: 'Trades',
    subscriptions: 'Subscriptions',
    accounts: 'Accounts',
    logData: 'logdata',
    debt: 'debt',
    income: 'Income',
    expenses: 'Expense' // Dedicated tab for detailed spending analysis
  }
};

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 Hours

// --- Main App Component ---

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Persistent Data State (IndexedDB)
  // We destructure [value, setValue, isLoaded] from the hook
  const [assets, setAssets] = useIndexedDB<Asset[]>('fintrack_assets', []);
  const [investments, setInvestments] = useIndexedDB<Investment[]>('fintrack_investments', []);
  const [trades, setTrades] = useIndexedDB<Trade[]>('fintrack_trades', []);
  const [subscriptions, setSubscriptions] = useIndexedDB<Subscription[]>('fintrack_subscriptions', []);
  const [accounts, setAccounts] = useIndexedDB<BankAccount[]>('fintrack_accounts', []);
  const [debtEntries, setDebtEntries] = useIndexedDB<DebtEntry[]>('fintrack_debt', []);
  const [netWorthHistory, setNetWorthHistory] = useIndexedDB<NetWorthEntry[]>('fintrack_history', []);
  const [incomeData, setIncomeData] = useIndexedDB<IncomeEntry[]>('fintrack_income', []);
  const [expenseData, setExpenseData] = useIndexedDB<ExpenseEntry[]>('fintrack_expenses', []);
  
  // Detailed Expenses State
  const [detailedExpenses, setDetailedExpenses] = useIndexedDB<DetailedExpenseData>('fintrack_detailed_expenses', { months: [], categories: [] });

  // Persistent Config State
  const [sheetConfig, setSheetConfig, configLoaded] = useIndexedDB<SheetConfig>('fintrack_sheet_config', DEFAULT_CONFIG);
  const [lastUpdatedStr, setLastUpdatedStr] = useIndexedDB<string | null>('fintrack_lastUpdated', null);
  
  // Persistent Sheet URL
  const [sheetUrl, setSheetUrl] = useIndexedDB<string>('fintrack_sheetUrl', '');

  // Theme State
  const [isDarkMode, setIsDarkMode, themeLoaded] = useIndexedDB<boolean>('fintrack_dark_mode', true);

  // Runtime State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingTabs, setSyncingTabs] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | undefined>(undefined);

  const lastUpdated = useMemo(() => lastUpdatedStr ? new Date(lastUpdatedStr) : null, [lastUpdatedStr]);

  const calculatedInvestments = useMemo(() => {
    return reconcileInvestments(investments, trades);
  }, [investments, trades]);

  // Apply Theme Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => setIsDarkMode(prev => !prev), [setIsDarkMode]);

  useEffect(() => {
    const initRates = async () => {
        const rates = await fetchLiveRates();
        setExchangeRates(rates);
    };
    initRates();
  }, []);

  // Update config when URL input changes
  useEffect(() => {
    if (!configLoaded) return;
    const id = extractSheetId(sheetUrl);
    if (id && id !== sheetConfig.sheetId) {
        setSheetConfig(prev => ({ ...prev, sheetId: id }));
    } else if (sheetConfig.sheetId && !sheetUrl) {
        // If config has ID but URL input is empty (e.g. fresh load), populate URL
        setSheetUrl(sheetConfig.sheetId); // Just showing ID is fine, or we could reconstruct URL
    }
  }, [sheetUrl, sheetConfig.sheetId, setSheetConfig, configLoaded, setSheetUrl]);

  const syncData = useCallback(async (specificTabs?: (keyof SheetConfig['tabNames'])[]) => {
    if (!sheetConfig.sheetId) return;

    // Determine what to sync: explicit list or all keys
    const allKeys = Object.keys(sheetConfig.tabNames) as (keyof SheetConfig['tabNames'])[];
    const targets = specificTabs && specificTabs.length > 0 ? specificTabs : allKeys;
    const isFullSync = targets.length === allKeys.length;

    setIsSyncing(true);
    setSyncingTabs(prev => {
        const next = new Set(prev);
        targets.forEach(t => next.add(t));
        return next;
    });
    setSyncStatus(null);
    
    // Helper to fetch and parse
    const fetchSafe = async <T,>(tabName: string, type: 'assets' | 'investments' | 'trades' | 'subscriptions' | 'accounts' | 'logData' | 'debt' | 'income' | 'detailedExpenses'): Promise<T> => {
        try {
            const txt = await fetchSheetData(sheetConfig.sheetId, tabName);
            return await parseRawData<T>(txt, type);
        } catch (e) {
            console.warn(`[Sync] ${type} failed for tab ${tabName}:`, e);
            if (type === 'income') return { income: [], expenses: [] } as unknown as T;
            if (type === 'detailedExpenses') return { months: [], categories: [] } as unknown as T;
            return [] as unknown as T;
        }
    };

    // Processor for individual keys
    const processKey = async (key: keyof SheetConfig['tabNames']) => {
        const tabName = sheetConfig.tabNames[key];
        if (!tabName) return;

        try {
            switch (key) {
                case 'assets':
                    const rawAssets = await fetchSafe<Asset[]>(tabName, 'assets');
                    setAssets(rawAssets);
                    break;
                case 'investments':
                    setInvestments(await fetchSafe(tabName, 'investments'));
                    break;
                case 'trades':
                    setTrades(await fetchSafe(tabName, 'trades'));
                    break;
                case 'subscriptions':
                    setSubscriptions(await fetchSafe(tabName, 'subscriptions'));
                    break;
                case 'accounts':
                    setAccounts(await fetchSafe(tabName, 'accounts'));
                    break;
                case 'logData':
                    setNetWorthHistory(await fetchSafe(tabName, 'logData'));
                    break;
                case 'debt':
                    setDebtEntries(await fetchSafe(tabName, 'debt'));
                    break;
                case 'income':
                    const finData = await fetchSafe<IncomeAndExpenses>(tabName, 'income');
                    setIncomeData(finData.income);
                    setExpenseData(finData.expenses);
                    break;
                case 'expenses':
                    setDetailedExpenses(await fetchSafe(tabName, 'detailedExpenses'));
                    break;
            }
        } finally {
            setSyncingTabs(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    try {
        // Execute fetches in parallel
        await Promise.all(targets.map(key => processKey(key)));
        
        // Update global status if this was a user-initiated sync (always true here)
        const now = new Date();
        if (isFullSync) {
             setLastUpdatedStr(now.toISOString());
             setSyncStatus({ type: 'success', msg: 'Full sync complete' });
        } else {
             setSyncStatus({ type: 'success', msg: 'Selected tabs updated' });
        }

    } catch (e: any) {
        setSyncStatus({ type: 'error', msg: e.message || "Sync process failed" });
    } finally {
        setIsSyncing(false);
    }
  }, [sheetConfig, setAssets, setInvestments, setTrades, setSubscriptions, setAccounts, setNetWorthHistory, setDebtEntries, setIncomeData, setExpenseData, setDetailedExpenses, setLastUpdatedStr]);

  // Auto-sync on stale
  useEffect(() => {
    if (!sheetConfig.sheetId || !configLoaded) return;
    const checkStale = () => {
        const now = new Date();
        const isStale = !lastUpdated || (now.getTime() - lastUpdated.getTime() > STALE_THRESHOLD_MS);
        if (isStale && !isSyncing) {
            syncData(); // Full sync on stale
        }
    };
    const timer = setTimeout(checkStale, 1000);
    return () => clearTimeout(timer);
  }, [sheetConfig.sheetId, lastUpdated, syncData, isSyncing, configLoaded]);

  // Wait for critical config to load from DB before rendering app
  // This prevents the "Setup" screen from flashing if data actually exists in DB
  if (!configLoaded || !themeLoaded) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
              <Loader2 className="animate-spin" size={32} />
          </div>
      );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans">
      <Navigation 
        currentView={currentView} 
        setView={setCurrentView} 
        onSync={() => syncData()}
        isSyncing={isSyncing}
        lastUpdated={lastUpdated}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      
      <main className="flex-1 overflow-y-auto h-screen relative scroll-smooth bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-96 bg-blue-100 dark:bg-blue-900/10 -z-10 blur-3xl pointer-events-none transition-colors duration-300" />
        
        <div className="max-w-7xl mx-auto p-6 md:p-12 mb-20 md:mb-0">
          {currentView === ViewState.DASHBOARD && (
            <Dashboard 
                assets={assets}
                netWorthHistory={netWorthHistory}
                incomeData={incomeData}
                expenseData={expenseData}
                isLoading={isSyncing}
                exchangeRates={exchangeRates}
                isDarkMode={isDarkMode}
            />
          )}
          {currentView === ViewState.ASSETS && (
            <AssetsList 
                assets={assets} 
                isLoading={isSyncing} 
                exchangeRates={exchangeRates}
            />
          )}
          {currentView === ViewState.INVESTMENTS && (
            <InvestmentsList 
                investments={calculatedInvestments} 
                assets={assets} 
                trades={trades} 
                isLoading={isSyncing}
                exchangeRates={exchangeRates}
            />
          )}
          {currentView === ViewState.TRADES && (
            <TradesList trades={trades} isLoading={isSyncing} />
          )}
          {currentView === ViewState.INCOME && (
            <IncomeView 
              incomeData={incomeData}
              expenseData={expenseData}
              detailedExpenses={detailedExpenses}
              isLoading={isSyncing}
              isDarkMode={isDarkMode}
            />
          )}
          {currentView === ViewState.INFORMATION && (
            <InformationView 
              subscriptions={subscriptions} 
              accounts={accounts} 
              debtEntries={debtEntries}
              isLoading={isSyncing} 
            />
          )}
          {currentView === ViewState.SETTINGS && (
            <DataIngest 
              config={sheetConfig}
              onConfigChange={setSheetConfig}
              onSync={syncData}
              isSyncing={isSyncing}
              syncingTabs={syncingTabs}
              syncStatus={syncStatus}
              sheetUrl={sheetUrl}
              onSheetUrlChange={setSheetUrl}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
