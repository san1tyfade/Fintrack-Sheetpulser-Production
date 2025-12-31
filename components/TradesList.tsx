
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Trade, TimeFocus } from '../types';
import { 
  History, Search, X, Plus, Filter, Clock,
  ArrowRightLeft, LayoutGrid, Check, ArrowDownZA, ArrowUpAZ, Calendar
} from 'lucide-react';
import { filterAndProcessTrades, TradeGroup } from '../services/trades/tradeService';
import { TradeHistoryTable } from './trades/TradeHistoryTable';
import { TradeAssetAccordion } from './trades/TradeAssetAccordion';
import { TradeEntryModal } from './trades/TradeEntryModal';

interface TradesListProps {
  trades: Trade[];
  isLoading?: boolean;
  onAddTrade: (trade: Trade) => Promise<void>;
  onEditTrade?: (trade: Trade) => Promise<void>;
  onDeleteTrade?: (trade: Trade) => Promise<void>;
  isReadOnly?: boolean;
}

type TradesViewMode = 'BY_ASSET' | 'RECENT_HISTORY';
type SortDirection = 'DESC' | 'ASC';
type TypeFilter = 'ALL' | 'BUY' | 'SELL';

export const TradesList: React.FC<TradesListProps> = ({ 
    trades, isLoading = false, onAddTrade, onEditTrade, onDeleteTrade, isReadOnly = false 
}) => {
  const [viewMode, setViewMode] = useState<TradesViewMode>('BY_ASSET');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('DESC');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFocus>(TimeFocus.FULL_YEAR);
  const [hideExited, setHideExited] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
            setIsFilterMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalStats = useMemo(() => ({
      totalTrades: trades.length,
      uniqueAssets: new Set(trades.map(t => t.ticker)).size,
      totalVolume: trades.reduce((acc, t) => acc + Math.abs(t.total), 0)
  }), [trades]);

  const processedData = useMemo(() => 
    filterAndProcessTrades(trades, searchTerm, typeFilter, timeFilter, viewMode, sortDir, hideExited),
    [trades, searchTerm, typeFilter, timeFilter, viewMode, sortDir, hideExited]
  );

  const hasActiveFilters = typeFilter !== 'ALL' || hideExited || timeFilter !== TimeFocus.FULL_YEAR;

  return (
    <div className="space-y-8 animate-fade-in pb-20 tabular-nums">
      <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md pt-2 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                    Trades
                    <div className="flex gap-2">
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20 font-black uppercase tracking-widest">{totalStats.totalTrades} txs</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 font-black uppercase tracking-widest">{totalStats.uniqueAssets} assets</span>
                    </div>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Audit trail and acquisition ledger.</p>
            </div>

            <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 flex shadow-sm">
                    <button onClick={() => setViewMode('BY_ASSET')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'BY_ASSET' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><LayoutGrid size={14} /> Grouped</button>
                    <button onClick={() => setViewMode('RECENT_HISTORY')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'RECENT_HISTORY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Clock size={14} /> History</button>
                </div>
                {!isReadOnly && <button onClick={() => setIsAddModalOpen(true)} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 text-white font-black uppercase text-[10px] tracking-widest px-6 py-4 rounded-2xl shadow-xl transition-all flex items-center gap-2"><Plus size={16} /> New Trade</button>}
            </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search tickers, dates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
            </div>
            <div className="flex gap-2 relative" ref={filterMenuRef}>
                <button onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)} className={`relative border p-3 rounded-2xl shadow-sm transition-all ${hasActiveFilters ? 'bg-blue-500 text-white border-blue-600' : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500'}`}><Filter size={18} />{hasActiveFilters && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>}</button>
                {isFilterMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl z-50 p-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-6">
                            <div><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2"><ArrowRightLeft size={10}/> Action Type</p>
                                <div className="grid grid-cols-1 gap-1">{(['ALL', 'BUY', 'SELL'] as TypeFilter[]).map(type => (
                                    <button key={type} onClick={() => setTypeFilter(type)} className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${typeFilter === type ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>{type === 'ALL' ? 'All Actions' : type === 'BUY' ? 'Buys Only' : 'Sells Only'}{typeFilter === type && <Check size={14} />}</button>))}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2"><Calendar size={10}/> Time Window</p>
                                <div className="grid grid-cols-2 gap-1">{([TimeFocus.FULL_YEAR, TimeFocus.YTD, TimeFocus.MTD, TimeFocus.ROLLING_12M] as TimeFocus[]).map(focus => (
                                    <button key={focus} onClick={() => setTimeFilter(focus)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${timeFilter === focus ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100'}`}>{focus === TimeFocus.FULL_YEAR ? 'All Time' : focus.replace('_', ' ')}</button>))}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50"><label className="flex items-center justify-between cursor-pointer group"><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Hide Exited</span><span className="text-[9px] text-slate-400 font-medium">Active holdings only</span></div><input type="checkbox" checked={hideExited} onChange={e => setHideExited(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></label></div>
                            {(hasActiveFilters || searchTerm) && <button onClick={() => { setTypeFilter('ALL'); setTimeFilter(TimeFocus.FULL_YEAR); setHideExited(false); setSearchTerm(''); setIsFilterMenuOpen(false); }} className="w-full pt-4 border-t border-slate-100 dark:border-slate-700/50 text-center text-[10px] font-black uppercase text-red-500 hover:text-red-600 tracking-widest">Reset Filters</button>}
                        </div>
                    </div>
                )}
                <button onClick={() => setSortDir(p => p === 'DESC' ? 'ASC' : 'DESC')} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl text-slate-500 hover:text-blue-500 shadow-sm transition-colors" title={sortDir === 'DESC' ? "Newest First" : "Oldest First"}>{sortDir === 'DESC' ? <ArrowDownZA size={18} /> : <ArrowUpAZ size={18} />}</button>
            </div>
        </div>
      </header>

      <TradeEntryModal isOpen={isAddModalOpen || !!editingTrade} initialData={editingTrade} onClose={() => { setIsAddModalOpen(false); setEditingTrade(null); }} onSave={async (trade) => editingTrade ? onEditTrade?.(trade) : onAddTrade(trade)} />

      <div className={`space-y-6 transition-all duration-500 ${isLoading ? 'opacity-60 grayscale pointer-events-none' : 'opacity-100'}`}>
        {viewMode === 'BY_ASSET' ? (
            <div className="space-y-4">
                {(processedData as TradeGroup[]).map(group => (
                    <TradeAssetAccordion key={group.ticker} group={group} isLoading={isLoading} onDelete={onDeleteTrade} onEdit={setEditingTrade} isReadOnly={isReadOnly} />
                ))}
            </div>
        ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                <TradeHistoryTable trades={processedData as Trade[]} isLoading={isLoading} onDelete={onDeleteTrade} onEdit={setEditingTrade} isReadOnly={isReadOnly} />
            </div>
        )}
        {trades.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900/20">
                <History size={64} className="opacity-10 mb-6" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">No Trade History</h3>
                {!isReadOnly && <button onClick={() => setIsAddModalOpen(true)} className="mt-8 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1">Initialize Ledger</button>}
            </div>
        )}
      </div>
    </div>
  );
};
