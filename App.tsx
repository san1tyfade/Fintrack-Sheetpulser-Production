
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
import { ViewState, Asset, Investment, Trade, Subscription, BankAccount, SheetConfig, NetWorthEntry, DebtEntry, IncomeEntry, ExpenseEntry, IncomeAndExpenses, ExchangeRates, LedgerData, UserProfile, TourStep, TaxRecord, ArchiveMeta } from './types';
import { fetchSheetData } from './services/sheetService';
import { parseRawData } from './services/geminiService';
import { fetchLiveRates } from './services/currencyService';
import { reconcileInvestments } from './services/portfolioService';
import { useIndexedDB } from './hooks/useIndexedDB';
import { initGoogleAuth, signIn, restoreSession, signOut } from './services/authService';
import { getArchiveManagementList } from './services/backupService';
import { Lock, History, AlertCircle, RefreshCw, Loader2 as Spinner } from 'lucide-react';
import { 
  addTradeToSheet, deleteRowFromSheet, updateTradeInSheet, 
  addAssetToSheet, updateAssetInSheet,
  addSubscriptionToSheet, updateSubscriptionInSheet,
  addAccountToSheet, updateAccountInSheet,
  addTaxRecordToSheet, updateTaxRecordInSheet,
  updateLedgerValue
} from './services/sheetWriteService';

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
    expenses: 'Expense',
    taxAccounts: 'Taxable Accounts'
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
  
  const [activeYear, setActiveYear] = useIndexedDB<number>('fintrack_active_year', new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<number>(activeYear);
  const [discoveryAttempted, setDiscoveryAttempted] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setSelectedYear(activeYear);
  }, [activeYear]);

  // Global Config & Auth
  const [sheetConfig, setSheetConfig, configLoaded] = useIndexedDB<SheetConfig>('fintrack_sheet_config', DEFAULT_CONFIG);
  const [userProfile, setUserProfile, profileLoaded] = useIndexedDB<UserProfile | null>('fintrack_user_profile', null);
  const [authSession, setAuthSession, sessionLoaded] = useIndexedDB<{token: string, expires: number} | null>('fintrack_auth_session', null);
  const [isDarkMode, setIsDarkMode] = useIndexedDB<boolean>('fintrack_dark_mode', true);
  const [sheetUrl, setSheetUrl] = useIndexedDB<string>('fintrack_sheetUrl', '');

  // Year-Agnostic Data (Always Live)
  const [assets, setAssets] = useIndexedDB<Asset[]>('fintrack_assets', []);
  const [investments, setInvestments] = useIndexedDB<Investment[]>('fintrack_investments', []);
  const [trades, setTrades] = useIndexedDB<Trade[]>('fintrack_trades', []);
  const [subscriptions, setSubscriptions] = useIndexedDB<Subscription[]>('fintrack_subscriptions', []);
  const [accounts, setAccounts] = useIndexedDB<BankAccount[]>('fintrack_accounts', []);
  const [debtEntries, setDebtEntries] = useIndexedDB<DebtEntry[]>('fintrack_debt', []);
  const [taxRecords, setTaxRecords] = useIndexedDB<TaxRecord[]>('fintrack_tax_records', []);
  const [netWorthHistory, setNetWorthHistory] = useIndexedDB<NetWorthEntry[]>('fintrack_history', []);
  
  // Contextual Data (Year Dependent)
  const [incomeData, setIncomeData] = useIndexedDB<IncomeEntry[]>(`fintrack_income_${selectedYear}`, []);
  const [expenseData, setExpenseData] = useIndexedDB<ExpenseEntry[]>(`fintrack_expenses_${selectedYear}`, []);
  const [detailedExpenses, setDetailedExpenses] = useIndexedDB<LedgerData>(`fintrack_detailed_expenses_${selectedYear}`, { months: [], categories: [] });
  const [detailedIncome, setDetailedIncome] = useIndexedDB<LedgerData>(`fintrack_detailed_income_${selectedYear}`, { months: [], categories: [] });

  const [lastUpdatedStr, setLastUpdatedStr] = useIndexedDB<string | null>('fintrack_lastUpdated', null);
  const [hasCompletedTour, setHasCompletedTour] = useIndexedDB<boolean>('fintrack_tour_completed', false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingTabs, setSyncingTabs] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<{type: 'success' | 'error' | 'warning', msg: string} | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | undefined>(undefined);
  const [isTourActive, setIsTourActive] = useState(false);
  
  const [availableArchives, setAvailableArchives] = useState<number[]>([]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => setIsDarkMode(prev => !prev), [setIsDarkMode]);

  const refreshArchiveMeta = async () => {
      const archives = await getArchiveManagementList();
      setAvailableArchives(archives.map(a => a.year));
  };

  useEffect(() => {
    const initData = async () => {
      setExchangeRates(await fetchLiveRates());
      await refreshArchiveMeta();
    };
    initData();
  }, [isSyncing, activeYear]);

  useEffect(() => {
    if (!configLoaded || !sessionLoaded) return;
    if (authSession) restoreSession(authSession.token, authSession.expires);
    if (window.google) initGoogleAuth(OAUTH_CLIENT_ID);
  }, [configLoaded, sessionLoaded, authSession]);

  const syncData = useCallback(async (specificTabs?: (keyof SheetConfig['tabNames'])[], targetYear: number = selectedYear) => {
    if (!sheetConfig.sheetId) return;
    setIsSyncing(true);
    setSyncStatus(null);
    
    try {
        const session = await signIn();
        setAuthSession(session);
    } catch (e: any) {
        setSyncStatus({ type: 'error', msg: "Authentication failed." });
        setIsSyncing(false);
        return;
    }

    const allKeys = Object.keys(sheetConfig.tabNames) as (keyof SheetConfig['tabNames'])[];
    const targets = specificTabs && specificTabs.length > 0 ? specificTabs : allKeys;
    setSyncingTabs(prev => { const next = new Set(prev); targets.forEach(t => next.add(t)); return next; });
    
    const getTabName = (baseKey: keyof SheetConfig['tabNames']) => {
        const baseName = sheetConfig.tabNames[baseKey];
        if (targetYear === activeYear) return baseName;
        if (['income', 'expenses'].includes(baseKey)) {
            return `${baseName}-${String(targetYear).slice(-2)}`;
        }
        return baseName;
    };

    const fetchSafe = async <T,>(tabName: string, type: any): Promise<T> => {
        const rawData = await fetchSheetData(sheetConfig.sheetId, tabName); 
        return await parseRawData<T>(rawData, type); 
    };

    try {
        let missingArchives = false;
        await Promise.all(targets.map(async key => {
            const actualTabName = getTabName(key);
            try {
                switch (key) {
                    case 'assets': setAssets(await fetchSafe<Asset[]>(actualTabName, 'assets')); break;
                    case 'investments': setInvestments(await fetchSafe(actualTabName, 'investments')); break;
                    case 'trades': setTrades(await fetchSafe(actualTabName, 'trades')); break;
                    case 'subscriptions': setSubscriptions(await fetchSafe(actualTabName, 'subscriptions')); break;
                    case 'accounts': setAccounts(await fetchSafe(actualTabName, 'accounts')); break;
                    case 'logData': setNetWorthHistory(await fetchSafe(actualTabName, 'logData')); break;
                    case 'debt': setDebtEntries(await fetchSafe(actualTabName, 'debt')); break;
                    case 'taxAccounts': setTaxRecords(await fetchSafe(actualTabName, 'taxAccounts')); break;
                    case 'income': 
                        const finData = await fetchSafe<IncomeAndExpenses>(actualTabName, 'income'); 
                        setIncomeData(finData.income); 
                        setExpenseData(finData.expenses);
                        setDetailedIncome(await fetchSafe<LedgerData>(actualTabName, 'detailedIncome'));
                        break;
                    case 'expenses': setDetailedExpenses(await fetchSafe(actualTabName, 'detailedExpenses')); break;
                }
            } catch (e: any) {
                if (e.message.includes('NOT_FOUND')) {
                    if (targetYear !== activeYear) missingArchives = true;
                } else throw e;
            } finally { setSyncingTabs(prev => { const next = new Set(prev); next.delete(key); return next; }); }
        }));
        setLastUpdatedStr(new Date().toISOString());
        setSyncStatus(missingArchives ? { type: 'warning', msg: `Sheet archive for ${targetYear} not found.` } : { type: 'success', msg: 'Sync complete' });
        setDiscoveryAttempted(prev => ({ ...prev, [targetYear]: true }));
        if (!missingArchives) refreshArchiveMeta();
    } catch (e: any) { setSyncStatus({ type: 'error', msg: e.message || "Sync failed." }); }
    finally { setIsSyncing(false); }
  }, [sheetConfig, selectedYear, activeYear, setAssets, setInvestments, setTrades, setSubscriptions, setAccounts, setNetWorthHistory, setDebtEntries, setTaxRecords, setIncomeData, setExpenseData, setDetailedExpenses, setDetailedIncome, setLastUpdatedStr, setAuthSession]);

  useEffect(() => {
    if (sheetConfig.sheetId && incomeData.length === 0 && !isSyncing && !discoveryAttempted[selectedYear]) {
        syncData(['income', 'expenses']);
    }
  }, [selectedYear, sheetConfig.sheetId]);

  const handleDeleteGeneric = useCallback(async (item: any, tabName: string, setter: (val: any | ((prev: any[]) => any[])) => void) => {
    if (selectedYear !== activeYear) return;
    await deleteRowFromSheet(sheetConfig.sheetId, tabName, item.rowIndex);
    setter(prev => prev.filter(i => i.id !== item.id).map(i => i.rowIndex !== undefined && i.rowIndex > item.rowIndex ? { ...i, rowIndex: i.rowIndex - 1 } : i));
  }, [sheetConfig, selectedYear, activeYear]);

  const handleEditGeneric = useCallback(async (item: any, tabName: string, updateFn: any, setter: (val: any | ((prev: any[]) => any[])) => void) => {
    if (selectedYear !== activeYear) return;
    await updateFn(sheetConfig.sheetId, tabName, item.rowIndex, item);
    setter(prev => prev.map(i => i.id === item.id ? item : i));
  }, [sheetConfig, selectedYear, activeYear]);

  const handleSignOut = useCallback(() => { signOut(); setUserProfile(null); setAuthSession(null); setCurrentView(ViewState.SETTINGS); }, [setUserProfile, setAuthSession]);

  const handleRolloverSuccess = useCallback((nextYear: number) => {
      setActiveYear(nextYear);
      setSelectedYear(nextYear);
      setIncomeData([]);
      setExpenseData([]);
      setDetailedExpenses({ months: [], categories: [] });
      setDetailedIncome({ months: [], categories: [] });
      syncData(['income', 'expenses'], nextYear);
  }, [setActiveYear, syncData, setIncomeData, setExpenseData, setDetailedExpenses, setDetailedIncome]);

  const timeMachineYears = useMemo(() => {
    const current = new Date().getFullYear();
    const years = new Set([activeYear, current, ...availableArchives]);
    return Array.from(years).sort((a,b) => b - a);
  }, [activeYear, availableArchives]);

  const lastUpdated = useMemo(() => lastUpdatedStr ? new Date(lastUpdatedStr) : null, [lastUpdatedStr]);
  const calculatedInvestments = useMemo(() => reconcileInvestments(investments, trades), [investments, trades]);

  const isHistorical = selectedYear !== activeYear;

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans">
      <Navigation currentView={currentView} setView={setCurrentView} onSync={() => syncData()} isSyncing={isSyncing} lastUpdated={lastUpdated} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto p-6 md:p-12 mb-20 md:mb-0 relative">
          
          {/* Phase 4: Chronos Mode Banner */}
          {isHistorical && (currentView !== ViewState.SETTINGS) && (
              <div className="flex items-center justify-between mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-in slide-in-from-top duration-500">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20"><Lock size={18} /></div>
                      <div>
                          <p className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Chronos Mode: Read-Only Archive</p>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Viewing data from financial year {selectedYear}. Mutations are disabled.</p>
                      </div>
                  </div>
                  <button onClick={() => setSelectedYear(activeYear)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md">Return to {activeYear}</button>
              </div>
          )}

          {/* Year Context Control (Time Machine) */}
          {(currentView === ViewState.DASHBOARD || currentView === ViewState.INCOME) && (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                  <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Navigation</h4>
                      <div className="flex items-center gap-2">
                        <History size={16} className="text-blue-500" />
                        <span className="text-lg font-black text-slate-900 dark:text-white">Time Machine</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      {timeMachineYears.map(year => {
                          const isCached = availableArchives.includes(year) || year === activeYear;
                          return (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all relative flex items-center gap-2 ${
                                    selectedYear === year 
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 z-10' 
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                {year}
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                    year === activeYear ? 'bg-blue-400 animate-pulse' : 
                                    isCached ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'
                                }`} title={year === activeYear ? 'Active Ledger' : isCached ? 'Cached Locally' : 'Remote Archive'} />
                            </button>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* Phase 4: Discovery State (Loading vs Error vs Ready) */}
          {isHistorical && incomeData.length === 0 && (
               <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                   {isSyncing ? (
                        <div className="flex flex-col items-center gap-4">
                            <Spinner size={48} className="animate-spin text-blue-500" />
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Discovering Archives...</h3>
                        </div>
                   ) : discoveryAttempted[selectedYear] ? (
                        <>
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800">
                                <AlertCircle size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Vault Discovery Failed</h3>
                                <p className="text-sm text-slate-500 max-w-sm">We couldn't find local records for {selectedYear}. Try scanning your spreadsheet for an archived tab like "Income-{String(selectedYear).slice(-2)}".</p>
                            </div>
                            <button 
                                onClick={() => syncData(['income', 'expenses'])}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:scale-95 uppercase text-xs tracking-widest"
                            >
                                <RefreshCw size={16} /> Retry Discovery
                            </button>
                        </>
                   ) : (
                        <div className="flex flex-col items-center gap-4">
                            <History size={48} className="text-slate-400" />
                            <button 
                                onClick={() => syncData(['income', 'expenses'])}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl"
                            >
                                Start Discovery
                            </button>
                        </div>
                   )}
               </div>
          )}

          <div className={`${isHistorical && incomeData.length === 0 ? 'hidden' : ''}`}>
              {currentView === ViewState.DASHBOARD && <Dashboard assets={assets} netWorthHistory={netWorthHistory} incomeData={incomeData} expenseData={expenseData} isLoading={isSyncing} exchangeRates={exchangeRates} isDarkMode={isDarkMode} selectedYear={selectedYear} />}
              {currentView === ViewState.ASSETS && <AssetsList assets={assets} isLoading={isSyncing} exchangeRates={exchangeRates} onAddAsset={isHistorical ? undefined : a => addAssetToSheet(sheetConfig.sheetId, sheetConfig.tabNames.assets, a).then(() => syncData(['assets']))} onEditAsset={isHistorical ? undefined : a => handleEditGeneric(a, sheetConfig.tabNames.assets, updateAssetInSheet, setAssets)} onDeleteAsset={isHistorical ? undefined : a => handleDeleteGeneric(a, sheetConfig.tabNames.assets, setAssets)} isReadOnly={isHistorical} />}
              {currentView === ViewState.INVESTMENTS && <InvestmentsList investments={calculatedInvestments} assets={assets} trades={trades} isLoading={isSyncing} exchangeRates={exchangeRates} />}
              {currentView === ViewState.TRADES && <TradesList trades={trades} isLoading={isSyncing} onAddTrade={isHistorical ? (async () => {}) : t => addTradeToSheet(sheetConfig.sheetId, sheetConfig.tabNames.trades, t).then(() => syncData(['trades']))} onEditTrade={isHistorical ? undefined : t => handleEditGeneric(t, sheetConfig.tabNames.trades, updateTradeInSheet, setTrades)} onDeleteTrade={isHistorical ? undefined : t => handleDeleteGeneric(t, sheetConfig.tabNames.trades, setTrades)} isReadOnly={isHistorical} />}
              {currentView === ViewState.INCOME && <IncomeView incomeData={incomeData} expenseData={expenseData} detailedExpenses={detailedExpenses} detailedIncome={detailedIncome} isLoading={isSyncing} isDarkMode={isDarkMode} isReadOnly={isHistorical} selectedYear={selectedYear} onUpdateExpense={async (cat, sub, m, v) => { await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.expenses, cat, sub, m, v); syncData(['expenses']); }} onUpdateIncome={async (cat, sub, m, v) => { await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.income, cat, sub, m, v); syncData(['income']); }} />}
              {currentView === ViewState.INFORMATION && <InformationView subscriptions={subscriptions} accounts={accounts} debtEntries={debtEntries} taxRecords={taxRecords} isLoading={isSyncing} onAddSubscription={isHistorical ? undefined : s => addSubscriptionToSheet(sheetConfig.sheetId, sheetConfig.tabNames.subscriptions, s).then(() => syncData(['subscriptions']))} onEditSubscription={isHistorical ? undefined : s => handleEditGeneric(s, sheetConfig.tabNames.subscriptions, updateSubscriptionInSheet, setSubscriptions)} onDeleteSubscription={isHistorical ? undefined : s => handleDeleteGeneric(s, sheetConfig.tabNames.subscriptions, setSubscriptions)} onAddAccount={isHistorical ? undefined : a => addAccountToSheet(sheetConfig.sheetId, sheetConfig.tabNames.accounts, a).then(() => syncData(['accounts']))} onEditAccount={isHistorical ? undefined : a => handleEditGeneric(a, sheetConfig.tabNames.accounts, updateAccountInSheet, setAccounts)} onDeleteAccount={isHistorical ? undefined : a => handleDeleteGeneric(a, sheetConfig.tabNames.accounts, setAccounts)} onAddTaxRecord={isHistorical ? undefined : r => addTaxRecordToSheet(sheetConfig.sheetId, sheetConfig.tabNames.taxAccounts, r).then(() => syncData(['taxAccounts']))} onEditTaxRecord={isHistorical ? undefined : r => handleEditGeneric(r, sheetConfig.tabNames.taxAccounts, updateTaxRecordInSheet, setTaxRecords)} onDeleteTaxRecord={isHistorical ? undefined : r => handleDeleteGeneric(r, sheetConfig.tabNames.taxAccounts, setTaxRecords)} isReadOnly={isHistorical} />}
              {currentView === ViewState.SETTINGS && <DataIngest config={sheetConfig} onConfigChange={setSheetConfig} onSync={syncData} isSyncing={isSyncing} syncingTabs={syncingTabs} syncStatus={syncStatus} sheetUrl={sheetUrl} onSheetUrlChange={setSheetUrl} isDarkMode={isDarkMode} toggleTheme={toggleTheme} userProfile={userProfile} onProfileChange={setUserProfile} onSessionChange={setAuthSession} onSignOut={handleSignOut} onViewChange={setCurrentView} onTourStart={() => setIsTourActive(true)} activeYear={activeYear} onRolloverSuccess={handleRolloverSuccess} />}
              {currentView === ViewState.PRIVACY && <PrivacyPolicy onBack={() => setCurrentView(ViewState.SETTINGS)} />}
              {currentView === ViewState.TERMS && <TermsOfService onBack={() => setCurrentView(ViewState.SETTINGS)} />}
          </div>
        </div>
      </main>
      {isTourActive && <GuidedTour steps={TOUR_STEPS} onComplete={() => { setIsTourActive(false); setHasCompletedTour(true); }} onStepChange={(view) => setCurrentView(view)} />}
    </div>
  );
}

export default App;
