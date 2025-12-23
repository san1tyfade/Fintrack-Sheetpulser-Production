
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
import { GuidedTour } from './components/GuidedTour';
import { ViewState, Asset, Investment, Trade, Subscription, BankAccount, SheetConfig, NetWorthEntry, DebtEntry, IncomeEntry, ExpenseEntry, IncomeAndExpenses, ExchangeRates, LedgerData, UserProfile, TourStep } from './types';
import { fetchSheetData, extractSheetId } from './services/sheetService';
import { parseRawData } from './services/geminiService';
import { fetchLiveRates } from './services/currencyService';
import { reconcileInvestments } from './services/portfolioService';
import { useIndexedDB } from './hooks/useIndexedDB';
import { initGoogleAuth, signIn, restoreSession, signOut } from './services/authService';
import { 
  addTradeToSheet, deleteRowFromSheet, updateTradeInSheet, 
  addAssetToSheet, updateAssetInSheet,
  addSubscriptionToSheet, updateSubscriptionInSheet,
  addAccountToSheet, updateAccountInSheet,
  updateLedgerValue
} from './services/sheetWriteService';
import { Moon, Sun } from 'lucide-react';

const OAUTH_CLIENT_ID = '953749430238-3d0q078koppal8i2qs92ctfe5dbon994.apps.googleusercontent.com';

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

const TOUR_STEPS: TourStep[] = [
    { targetId: 'nav-dashboard', title: 'Your Dashboard', content: 'Get a bird\'s eye view of your financial health, net worth history, and monthly savings rate.', view: ViewState.DASHBOARD },
    { targetId: 'nav-assets', title: 'Asset Inventory', content: 'Track everything you own—from bank accounts and cash to real estate and cars.', view: ViewState.ASSETS },
    { targetId: 'nav-investments', title: 'Investment Tracker', content: 'See your stock and crypto performance with live-updating market prices and account allocations.', view: ViewState.INVESTMENTS },
    { targetId: 'nav-trades', title: 'Trade History', content: 'Log your buys and sells. We\'ll automatically update your holdings based on this history.', view: ViewState.TRADES },
    { targetId: 'nav-income', title: 'Cash Flow Ledger', content: 'Manage your monthly budget and view a "Sankey" flow of where your money actually goes.', view: ViewState.INCOME },
    { targetId: 'nav-information', title: 'Recurring Burn', content: 'Track subscriptions, debt balances, and account details in one place.', view: ViewState.INFORMATION },
    { targetId: 'nav-settings', title: 'Control Center', content: 'Connect different sheets, wipe local data, or adjust your tab mappings.', view: ViewState.SETTINGS },
];

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  const { isStandalonePrivacy, isStandaloneTerms } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    return { isStandalonePrivacy: page === 'privacy', isStandaloneTerms: page === 'terms' };
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
  
  const [userProfile, setUserProfile, profileLoaded] = useIndexedDB<UserProfile | null>('fintrack_user_profile', null);
  const [authSession, setAuthSession, sessionLoaded] = useIndexedDB<{token: string, expires: number} | null>('fintrack_auth_session', null);
  const [hasCompletedTour, setHasCompletedTour] = useIndexedDB<boolean>('fintrack_tour_completed', false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingTabs, setSyncingTabs] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | undefined>(undefined);
  const [isTourActive, setIsTourActive] = useState(false);

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

  useEffect(() => {
    if (!configLoaded || !sessionLoaded || isStandalonePrivacy || isStandaloneTerms) return;
    if (authSession) restoreSession(authSession.token, authSession.expires);
    const tryInit = () => {
      if (window.google) {
        initGoogleAuth(OAUTH_CLIENT_ID);
        return true;
      }
      return false;
    };
    if (!tryInit()) {
      const interval = setInterval(() => { if (tryInit()) clearInterval(interval); }, 200);
      return () => clearInterval(interval);
    }
  }, [configLoaded, sessionLoaded, isStandalonePrivacy, isStandaloneTerms, authSession]);

  const syncData = useCallback(async (specificTabs?: (keyof SheetConfig['tabNames'])[]) => {
    if (!sheetConfig.sheetId) return;
    setIsSyncing(true);
    setSyncStatus(null);
    
    try {
        const session = await signIn();
        setAuthSession(session);
    } catch (e: any) {
        console.error("Auth failed during sync:", e);
        setSyncStatus({ type: 'error', msg: "Authentication failed. Please check your settings." });
        setIsSyncing(false);
        return;
    }

    const allKeys = Object.keys(sheetConfig.tabNames) as (keyof SheetConfig['tabNames'])[];
    const targets = specificTabs && specificTabs.length > 0 ? specificTabs : allKeys;
    const isFullSync = targets.length === allKeys.length;
    setSyncingTabs(prev => { const next = new Set(prev); targets.forEach(t => next.add(t)); return next; });
    
    const fetchSafe = async <T,>(tabName: string, type: any): Promise<T> => {
        try { 
          const rawData = await fetchSheetData(sheetConfig.sheetId, tabName); 
          return await parseRawData<T>(rawData, type); 
        } catch (e: any) { 
            console.error(`Sync error for ${type}:`, e);
            throw e;
        }
    };

    try {
        await Promise.all(targets.map(async key => {
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
        }));
        setLastUpdatedStr(new Date().toISOString());
        setSyncStatus({ type: 'success', msg: isFullSync ? 'Full sync complete' : 'Updated' });
    } catch (e: any) { 
        console.error("Sync catch block:", e);
        const errorMsg = e.message.includes('ACCESS_DENIED') 
            ? "Access Denied: Re-select sheet in Settings" 
            : (e.message || "Sync failed. Check tab names.");
        setSyncStatus({ type: 'error', msg: errorMsg }); 
    } finally { setIsSyncing(false); }
  }, [sheetConfig, setAssets, setInvestments, setTrades, setSubscriptions, setAccounts, setNetWorthHistory, setDebtEntries, setIncomeData, setExpenseData, setDetailedExpenses, setDetailedIncome, setLastUpdatedStr, setAuthSession]);

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

  const handleSignOut = () => { signOut(); setAuthSession(null); setUserProfile(null); };

  if (isStandalonePrivacy || isStandaloneTerms) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
             <div className="max-w-4xl mx-auto p-6 md:p-12">
                 <div className="flex justify-end mb-8">
                    <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                 </div>
                 {isStandalonePrivacy && <PrivacyPolicy isStandalone={true} />}
                 {isStandaloneTerms && <TermsOfService isStandalone={true} />}
                 <div className="mt-12 text-center pt-8 border-t border-slate-200 dark:border-slate-800">
                     <a href="/" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Return to App</a>
                 </div>
             </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans">
      <Navigation currentView={currentView} setView={setCurrentView} onSync={() => syncData()} isSyncing={isSyncing} lastUpdated={lastUpdated} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto p-6 md:p-12 mb-20 md:mb-0">
          {currentView === ViewState.DASHBOARD && <Dashboard assets={assets} netWorthHistory={netWorthHistory} incomeData={incomeData} expenseData={expenseData} isLoading={isSyncing} exchangeRates={exchangeRates} isDarkMode={isDarkMode} />}
          {currentView === ViewState.ASSETS && <AssetsList assets={assets} isLoading={isSyncing} exchangeRates={exchangeRates} onAddAsset={a => addAssetToSheet(sheetConfig.sheetId, sheetConfig.tabNames.assets, a).then(() => syncData(['assets']))} onEditAsset={a => handleEditGeneric(a, sheetConfig.tabNames.assets, updateAssetInSheet, setAssets)} onDeleteAsset={a => handleDeleteGeneric(a, sheetConfig.tabNames.assets, setAssets)} />}
          {currentView === ViewState.INVESTMENTS && <InvestmentsList investments={calculatedInvestments} assets={assets} trades={trades} isLoading={isSyncing} exchangeRates={exchangeRates} />}
          {currentView === ViewState.TRADES && <TradesList trades={trades} isLoading={isSyncing} onAddTrade={t => addTradeToSheet(sheetConfig.sheetId, sheetConfig.tabNames.trades, t).then(() => syncData(['trades']))} onEditTrade={t => handleEditGeneric(t, sheetConfig.tabNames.trades, updateTradeInSheet, setTrades)} onDeleteTrade={t => handleDeleteGeneric(t, sheetConfig.tabNames.trades, setTrades)} />}
          {currentView === ViewState.INCOME && (
            <IncomeView 
                incomeData={incomeData} expenseData={expenseData} detailedExpenses={detailedExpenses} detailedIncome={detailedIncome} isLoading={isSyncing} isDarkMode={isDarkMode}
                onUpdateExpense={async (category, subCategory, monthIndex, value) => {
                    await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.expenses, category, subCategory, monthIndex, value);
                    syncData(['expenses']);
                }}
                onUpdateIncome={async (category, subCategory, monthIndex, value) => {
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
              config={sheetConfig} onConfigChange={setSheetConfig} onSync={syncData} isSyncing={isSyncing} syncingTabs={syncingTabs} syncStatus={syncStatus} sheetUrl={sheetUrl} onSheetUrlChange={setSheetUrl} isDarkMode={isDarkMode} toggleTheme={toggleTheme} userProfile={userProfile} onProfileChange={setUserProfile} onSessionChange={setAuthSession} onSignOut={handleSignOut} onViewChange={setCurrentView}
              onTourStart={() => setIsTourActive(true)}
            />
          )}
          {currentView === ViewState.PRIVACY && <PrivacyPolicy onBack={() => setCurrentView(ViewState.SETTINGS)} />}
          {currentView === ViewState.TERMS && <TermsOfService onBack={() => setCurrentView(ViewState.SETTINGS)} />}
        </div>
      </main>

      {isTourActive && (
          <GuidedTour 
              steps={TOUR_STEPS} 
              onComplete={() => { setIsTourActive(false); setHasCompletedTour(true); }} 
              onStepChange={(view) => setCurrentView(view)}
          />
      )}
    </div>
  );
}

export default App;
