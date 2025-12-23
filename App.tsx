
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { AssetsList } from './components/AssetsList';
import { InvestmentsList } from './components/InvestmentsList';
import { TradesList } from './components/TradesList';
import { IncomeView } from './components/IncomeView';
import { InformationView } from './components/InformationView';
import { DataIngest } from './components/DataIngest';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { ViewState, Asset, Investment, Trade, Subscription, BankAccount, SheetConfig, NetWorthEntry, DebtEntry, IncomeEntry, ExpenseEntry, IncomeAndExpenses, ExchangeRates, LedgerData, UserProfile, PriceCache } from './types';
import { fetchSheetData, extractSheetId } from './services/sheetService';
import { parseRawData, normalizeTicker } from './services/geminiService';
import { fetchLiveRates, PRIMARY_CURRENCY } from './services/currencyService';
import { reconcileInvestments } from './services/portfolioService';
import { useIndexedDB } from './hooks/useIndexedDB';
import { initGoogleAuth, isAuthInitialized, restoreSession, signOut, getAccessToken, signIn } from './services/authService';
import { fetchLivePrices } from './services/priceService';
import { 
  addTradeToSheet, deleteRowFromSheet, updateTradeInSheet, 
  addAssetToSheet, updateAssetInSheet,
  addSubscriptionToSheet, updateSubscriptionInSheet,
  addAccountToSheet, updateAccountInSheet,
  updateLedgerValue
} from './services/sheetWriteService';
import { Moon, Sun } from 'lucide-react';

// --- Configuration & Constants ---

const OAUTH_CLIENT_ID = '953749430238-3d0q078koppal8i2qs92ctfe5dbon994.apps.googleusercontent.com';
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_CONFIG: SheetConfig = {
  sheetId: '',
  clientId: OAUTH_CLIENT_ID,
  tabNames: {
    assets: 'Assets',
    investments: 'Investment Assets',
    trades: 'Trades',
    subscriptions: 'Subscriptions',
    accounts: 'Accounts',
    logData: 'logdata',
    debt: 'debt',
    income: 'Income',
    expenses: 'Expense'
  }
};

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Detect Standalone Page Mode
  const { isStandalonePrivacy, isStandaloneTerms } = useMemo(() => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page');
        return {
          isStandalonePrivacy: page === 'privacy',
          isStandaloneTerms: page === 'terms'
        };
    }
    return { isStandalonePrivacy: false, isStandaloneTerms: false };
  }, []);

  const [assets, setAssets] = useIndexedDB<Asset[]>('fintrack_assets', []);
  const [investments, setInvestments] = useIndexedDB<Investment[]>('fintrack_investments', []);
  const [trades, setTrades] = useIndexedDB<Trade[]>('fintrack_trades', []);
  const [subscriptions, setSubscriptions] = useIndexedDB<Subscription[]>('fintrack_subscriptions', []);
  const [accounts, setAccounts] = useIndexedDB<BankAccount[]>('fintrack_accounts', []);
  const [debtEntries, setDebtEntries] = useIndexedDB<DebtEntry[]>('fintrack_debt', []);
  const [netWorthHistory, setNetWorthHistory] = useIndexedDB<NetWorthEntry[]>('fintrack_history', []);
  const [incomeData, setIncomeData] = useIndexedDB<IncomeEntry[]>('fintrack_income', []);
  const [expenseData, setExpenseData] = useIndexedDB<ExpenseEntry[]>('fintrack_expenses', []);
  const [detailedExpenses, setDetailedExpenses] = useIndexedDB<LedgerData>('fintrack_detailed_expenses', { months: [], categories: [] });
  const [detailedIncome, setDetailedIncome] = useIndexedDB<LedgerData>('fintrack_detailed_income', { months: [], categories: [] });

  const [sheetConfig, setSheetConfig, configLoaded] = useIndexedDB<SheetConfig>('fintrack_sheet_config', DEFAULT_CONFIG);
  const [lastUpdatedStr, setLastUpdatedStr] = useIndexedDB<string | null>('fintrack_lastUpdated', null);
  const [sheetUrl, setSheetUrl] = useIndexedDB<string>('fintrack_sheetUrl', '');
  const [isDarkMode, setIsDarkMode] = useIndexedDB<boolean>('fintrack_dark_mode', true);
  
  // Persisted Auth State
  const [userProfile, setUserProfile, profileLoaded] = useIndexedDB<UserProfile | null>('fintrack_user_profile', null);
  const [authSession, setAuthSession, sessionLoaded] = useIndexedDB<{token: string, expires: number} | null>('fintrack_auth_session', null);

  // Persistent Price Cache
  const [priceCache, setPriceCache, priceCacheLoaded] = useIndexedDB<PriceCache>('fintrack_price_cache', {});
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingTabs, setSyncingTabs] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | undefined>(undefined);

  const lastUpdated = useMemo(() => lastUpdatedStr ? new Date(lastUpdatedStr) : null, [lastUpdatedStr]);
  const calculatedInvestments = useMemo(() => reconcileInvestments(investments, trades), [investments, trades]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => setIsDarkMode(prev => !prev), [setIsDarkMode]);

  useEffect(() => {
    const initRates = async () => { setExchangeRates(await fetchLiveRates()); };
    if (!isStandalonePrivacy && !isStandaloneTerms) initRates();
  }, [isStandalonePrivacy, isStandaloneTerms]);

  // Optimized Non-Blocking Google Auth Initialization & Session Recovery
  useEffect(() => {
    if (!configLoaded || !sessionLoaded || isStandalonePrivacy || isStandaloneTerms) return;

    if (authSession) {
        restoreSession(authSession.token, authSession.expires);
    }

    const tryInit = () => {
      if (window.google) {
        // Force the hardcoded Client ID
        initGoogleAuth(OAUTH_CLIENT_ID);
        return true;
      }
      return false;
    };

    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [configLoaded, sessionLoaded, isStandalonePrivacy, isStandaloneTerms, authSession]);

  // Global Price Refresh logic
  useEffect(() => {
    if (!priceCacheLoaded || isStandalonePrivacy || isStandaloneTerms) return;

    const refreshPrices = async () => {
      // Find all unique tickers from investments and trades
      const tickers = new Set<string>();
      calculatedInvestments.forEach(i => tickers.add(normalizeTicker(i.ticker)));
      trades.forEach(t => tickers.add(normalizeTicker(t.ticker)));
      
      const tickerList = Array.from(tickers).filter(t => t && t !== 'UNKNOWN');
      if (tickerList.length === 0) return;

      // Filter for tickers that are missing OR stale (older than TTL)
      const now = Date.now();
      const staleTickers = tickerList.filter(t => {
        const cached = priceCache[t];
        return !cached || (now - cached.timestamp > PRICE_CACHE_TTL);
      });

      if (staleTickers.length === 0) return;

      setIsFetchingPrices(true);
      try {
        const newPrices = await fetchLivePrices(staleTickers, PRIMARY_CURRENCY);
        const update: PriceCache = { ...priceCache };
        Object.entries(newPrices).forEach(([ticker, price]) => {
          update[ticker] = { price, timestamp: Date.now() };
        });
        setPriceCache(update);
      } catch (e) {
        console.warn("Price refresh failed", e);
      } finally {
        setIsFetchingPrices(false);
      }
    };

    refreshPrices();
    const interval = setInterval(refreshPrices, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [priceCacheLoaded, calculatedInvestments, trades, isStandalonePrivacy, isStandaloneTerms]);

  useEffect(() => {
    if (!configLoaded) return;
    const id = extractSheetId(sheetUrl);
    if (id && id !== sheetConfig.sheetId) setSheetConfig(prev => ({ ...prev, sheetId: id }));
  }, [sheetUrl, sheetConfig.sheetId, setSheetConfig, configLoaded]);

  const syncData = useCallback(async (specificTabs?: (keyof SheetConfig['tabNames'])[]) => {
    if (!sheetConfig.sheetId) return;
    
    // Ensure we have a valid token before proceeding
    let token = getAccessToken();
    if (!token) {
        try {
            const session = await signIn();
            token = session.token;
        } catch (e) {
            setSyncStatus({ type: 'error', msg: "Sign-in required to sync data." });
            return;
        }
    }

    setIsSyncing(true);
    setSyncStatus(null);
    const allKeys = Object.keys(sheetConfig.tabNames) as (keyof SheetConfig['tabNames'])[];
    const targets = specificTabs && specificTabs.length > 0 ? specificTabs : allKeys;
    const isFullSync = targets.length === allKeys.length;
    setSyncingTabs(prev => { const next = new Set(prev); targets.forEach(t => next.add(t)); return next; });
    
    const fetchSafe = async <T,>(tabName: string, type: any): Promise<T> => {
        try { 
            const rows = await fetchSheetData(sheetConfig.sheetId, tabName); 
            return await parseRawData<T>(rows, type); 
        } catch (e) { 
            console.error(`Sync error for ${type}:`, e);
            if (type === 'income') return { income: [], expenses: [] } as any; 
            if (type === 'detailedExpenses') return { months: [], categories: [] } as any; 
            if (type === 'detailedIncome') return { months: [], categories: [] } as any; 
            return [] as any; 
        }
    };

    const processKey = async (key: keyof SheetConfig['tabNames']) => {
        const tabName = sheetConfig.tabNames[key];
        if (!tabName) return;
        try {
            switch (key) {
                case 'assets': setAssets(await fetchSafe<Asset[]>(tabName, 'assets')); break;
                case 'investments': setInvestments(await fetchSafe(tabName, 'investments')); break;
                case 'trades': setTrades(await fetchSafe(tabName, 'trades')); break;
                case 'subscriptions': setSubscriptions(await fetchSafe(tabName, 'subscriptions')); break;
                case 'accounts': setAccounts(await fetchSafe(tabName, 'accounts')); break;
                case 'logData': setNetWorthHistory(await fetchSafe(tabName, 'logData')); break;
                case 'debt': setDebtEntries(await fetchSafe(tabName, 'debt')); break;
                case 'income': 
                    const finData = await fetchSafe<IncomeAndExpenses>(tabName, 'income'); 
                    setIncomeData(finData.income); 
                    setExpenseData(finData.expenses);
                    setDetailedIncome(await fetchSafe<LedgerData>(tabName, 'detailedIncome'));
                    break;
                case 'expenses': setDetailedExpenses(await fetchSafe(tabName, 'detailedExpenses')); break;
            }
        } finally { setSyncingTabs(prev => { const next = new Set(prev); next.delete(key); return next; }); }
    };
    try { await Promise.all(targets.map(key => processKey(key))); setLastUpdatedStr(new Date().toISOString()); setSyncStatus({ type: 'success', msg: isFullSync ? 'Full sync complete' : 'Updated' }); }
    catch (e: any) { setSyncStatus({ type: 'error', msg: e.message || "Sync failed" }); }
    finally { setIsSyncing(false); }
  }, [sheetConfig, setAssets, setInvestments, setTrades, setSubscriptions, setAccounts, setNetWorthHistory, setDebtEntries, setIncomeData, setExpenseData, setDetailedExpenses, setDetailedIncome, setLastUpdatedStr]);

  const handleDeleteGeneric = useCallback(async (item: any, tabName: string, setter: (val: any | ((prev: any[]) => any[])) => void) => {
    if (!sheetConfig.sheetId || !tabName) throw new Error("Config missing.");
    if (item.rowIndex === undefined) throw new Error("Row index missing. Please sync first.");
    await deleteRowFromSheet(sheetConfig.sheetId, tabName, item.rowIndex);
    setter(prev => prev.filter(i => i.id !== item.id).map(i => i.rowIndex !== undefined && i.rowIndex > item.rowIndex ? { ...i, rowIndex: i.rowIndex - 1 } : i));
  }, [sheetConfig]);

  const handleEditGeneric = useCallback(async (item: any, tabName: string, updateFn: any, setter: (val: any | ((prev: any[]) => any[])) => void) => {
    if (!sheetConfig.sheetId || !tabName) throw new Error("Config missing.");
    if (item.rowIndex === undefined) throw new Error("Row index missing.");
    await updateFn(sheetConfig.sheetId, tabName, item.rowIndex, item);
    setter(prev => prev.map(i => i.id === item.id ? item : i));
  }, [sheetConfig]);

  const handleSignOut = () => {
      signOut();
      setAuthSession(null);
      setUserProfile(null);
  };

  // --- RENDER: Standalone Mode (Privacy/Terms) ---
  if (isStandalonePrivacy || isStandaloneTerms) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
             <div className="max-w-4xl mx-auto p-6 md:p-12">
                 <div className="flex justify-end mb-8">
                    <button 
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                        title="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                 </div>
                 {isStandalonePrivacy && <PrivacyPolicy isStandalone={true} />}
                 {isStandaloneTerms && <TermsOfService isStandalone={true} />}
                 <div className="mt-12 text-center pt-8 border-t border-slate-200 dark:border-slate-800">
                     <a href="/" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                         Return to App
                     </a>
                 </div>
             </div>
          </div>
      );
  }

  // --- RENDER: Main Application ---
  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans">
      <Navigation currentView={currentView} setView={setCurrentView} onSync={() => syncData()} isSyncing={isSyncing} lastUpdated={lastUpdated} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
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
              priceCache={priceCache}
            />
          )}
          {currentView === ViewState.ASSETS && <AssetsList assets={assets} isLoading={isSyncing} exchangeRates={exchangeRates} onAddAsset={a => addAssetToSheet(sheetConfig.sheetId, sheetConfig.tabNames.assets, a).then(() => syncData(['assets']))} onEditAsset={a => handleEditGeneric(a, sheetConfig.tabNames.assets, updateAssetInSheet, setAssets)} onDeleteAsset={a => handleDeleteGeneric(a, sheetConfig.tabNames.assets, setAssets)} />}
          {currentView === ViewState.INVESTMENTS && (
            <InvestmentsList 
              investments={calculatedInvestments} 
              assets={assets} 
              trades={trades} 
              isLoading={isSyncing} 
              exchangeRates={exchangeRates} 
              priceCache={priceCache}
              isFetchingPrices={isFetchingPrices}
            />
          )}
          {currentView === ViewState.TRADES && <TradesList trades={trades} isLoading={isSyncing} onAddTrade={t => addTradeToSheet(sheetConfig.sheetId, sheetConfig.tabNames.trades, t).then(() => syncData(['trades']))} onEditTrade={t => handleEditGeneric(t, sheetConfig.tabNames.trades, updateTradeInSheet, setTrades)} onDeleteTrade={t => handleDeleteGeneric(t, sheetConfig.tabNames.trades, setTrades)} />}
          {currentView === ViewState.INCOME && (
            <IncomeView 
                incomeData={incomeData} 
                expenseData={expenseData} 
                detailedExpenses={detailedExpenses}
                detailedIncome={detailedIncome} 
                isLoading={isSyncing} 
                isDarkMode={isDarkMode}
                onUpdateExpense={async (category, subCategory, monthIndex, value) => {
                    if (!sheetConfig.sheetId || !sheetConfig.tabNames.expenses) throw new Error("Missing config for expenses tab.");
                    await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.expenses, category, subCategory, monthIndex, value);
                    syncData(['expenses']);
                }}
                onUpdateIncome={async (category, subCategory, monthIndex, value) => {
                    if (!sheetConfig.sheetId || !sheetConfig.tabNames.income) throw new Error("Missing config for income tab.");
                    await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.income, category, subCategory, monthIndex, value);
                    syncData(['income']);
                }}
            />
          )}
          {currentView === ViewState.INFORMATION && (
            <InformationView 
              subscriptions={subscriptions} accounts={accounts} debtEntries={debtEntries} isLoading={isSyncing}
              onAddSubscription={s => addSubscriptionToSheet(sheetConfig.sheetId, sheetConfig.tabNames.subscriptions, s).then(() => syncData(['subscriptions']))}
              onEditSubscription={s => handleEditGeneric(s, sheetConfig.tabNames.subscriptions, updateSubscriptionInSheet, setSubscriptions)}
              onDeleteSubscription={s => handleDeleteGeneric(s, sheetConfig.tabNames.subscriptions, setSubscriptions)}
              onAddAccount={a => addAccountToSheet(sheetConfig.sheetId, sheetConfig.tabNames.accounts, a).then(() => syncData(['accounts']))}
              onEditAccount={a => handleEditGeneric(a, sheetConfig.tabNames.accounts, updateAccountInSheet, setAccounts)}
              onDeleteAccount={a => handleDeleteGeneric(a, sheetConfig.tabNames.accounts, setAccounts)}
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
              userProfile={userProfile}
              onProfileChange={setUserProfile}
              onSessionChange={setAuthSession}
              onSignOut={handleSignOut}
              onViewChange={setCurrentView}
            />
          )}
          {currentView === ViewState.PRIVACY && (
            <PrivacyPolicy onBack={() => setCurrentView(ViewState.SETTINGS)} />
          )}
          {currentView === ViewState.TERMS && (
            <TermsOfService onBack={() => setCurrentView(ViewState.SETTINGS)} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
