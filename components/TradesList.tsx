
import React, { useMemo, useState, memo, useRef, useEffect } from 'react';
import { Trade, TimeFocus } from '../types';
import { 
  History, Search, X, Loader2, 
  Plus, Save, Trash2, Pencil, 
  ChevronDown, ChevronRight, Filter, Clock,
  ArrowRightLeft, MinusCircle, ArrowDownLeft, ArrowUpRight,
  LayoutGrid, Archive, Check, ArrowDownZA, ArrowUpAZ, Calendar
} from 'lucide-react';
import { isDateWithinFocus } from '../services/portfolioService';

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

// --- Sub-Component: AddTradeModal ---

const AddTradeModal = ({ isOpen, onClose, onSave, initialData }: { isOpen: boolean, onClose: () => void, onSave: (t: Trade) => Promise<void>, initialData?: Trade | null }) => {
    const [formData, setFormData] = useState<Partial<Trade>>({
        date: new Date().toISOString().split('T')[0],
        type: 'BUY',
        ticker: '',
        quantity: 0,
        price: 0,
        fee: 0
    });
    
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                date: initialData.date,
                type: initialData.type,
                ticker: initialData.ticker,
                quantity: initialData.quantity,
                price: initialData.price,
                fee: initialData.fee || 0
            });
        } else if (isOpen && !initialData) {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                type: 'BUY',
                ticker: '',
                quantity: 0,
                price: 0,
                fee: 0
            });
        }
    }, [isOpen, initialData]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const displayQty = Math.abs(formData.quantity || 0);
    const displayPrice = Math.abs(formData.price || 0);
    const displayFee = Math.abs(formData.fee || 0);
    const calculatedTotal = displayQty * displayPrice + (formData.type === 'BUY' ? displayFee : -displayFee);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.ticker || !formData.quantity || !formData.price) {
            setError("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const rawQty = Math.abs(Number(formData.quantity));
            const isSell = formData.type === 'SELL';
            const quantity = isSell ? -rawQty : rawQty;
            
            const newTrade: Trade = {
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex,
                date: formData.date!,
                ticker: formData.ticker.toUpperCase(),
                type: formData.type as 'BUY' | 'SELL',
                quantity,
                price: Number(formData.price),
                fee: Number(formData.fee || 0),
                total: calculatedTotal
            };
            await onSave(newTrade);
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to save trade.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3">
                        {initialData ? <Pencil size={20} className="text-blue-500" /> : <Plus size={20} className="text-blue-500" />}
                        {initialData ? 'Edit Trade' : 'New Trade'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Trade Date</label>
                            <input 
                                type="date" 
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                                {['BUY', 'SELL'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFormData({...formData, type: t as any})}
                                        className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all tracking-widest ${
                                            formData.type === t 
                                            ? (t === 'BUY' ? 'bg-emerald-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md')
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker Symbol</label>
                        <input 
                            type="text" 
                            placeholder="e.g. AAPL, BTC, VFV"
                            value={formData.ticker}
                            onChange={e => setFormData({...formData, ticker: e.target.value.toUpperCase()})}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black tracking-widest outline-none focus:ring-2 focus:ring-blue-500 uppercase transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</label>
                            <input 
                                type="number" 
                                placeholder="0.00"
                                step="any"
                                value={formData.quantity || ''}
                                onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Price / Unit</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    step="any"
                                    value={formData.price || ''}
                                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Total</label>
                            <p className="text-lg font-black font-mono text-slate-900 dark:text-white">
                                ${calculatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSubmitting ? 'Saving' : (initialData ? 'Update' : 'Confirm')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Sub-Component: Transaction Table (Shared) ---

const TransactionTable = ({ trades, isLoading, onDelete, onEdit, isReadOnly, compact = false }: { 
    trades: Trade[], 
    isLoading: boolean, 
    onDelete?: (t: Trade) => Promise<void>, 
    onEdit: (t: Trade) => void,
    isReadOnly: boolean,
    compact?: boolean
}) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (trade: Trade) => {
        if (!onDelete || isReadOnly) return;
        if (!confirm(`Permanently delete this ${trade.type} trade for ${trade.ticker}?`)) return;
        setDeletingId(trade.id);
        try { await onDelete(trade); } catch (e: any) { alert(e.message); } finally { setDeletingId(null); }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        {!compact && <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker</th>}
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantity</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                        <th className="p-4 w-20"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {trades.map((trade) => {
                        const isBuy = (trade.type || 'BUY').trim().toUpperCase() === 'BUY';
                        const isDeleting = deletingId === trade.id;
                        return (
                            <tr key={trade.id} className="hover:bg-blue-500/5 transition-colors group/row tabular-nums">
                                <td className="p-4 whitespace-nowrap text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">{trade.date}</td>
                                {!compact && (
                                    <td className="p-4 text-xs font-black text-slate-900 dark:text-white">{trade.ticker}</td>
                                )}
                                <td className="p-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        isBuy 
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                        : 'bg-red-500/10 text-red-500 dark:text-red-400'
                                    }`}>
                                        {isBuy ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                        {trade.type}
                                    </div>
                                </td>
                                <td className="p-4 text-right text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {Math.abs(trade.quantity).toLocaleString()}
                                </td>
                                <td className="p-4 text-right text-xs font-mono text-slate-400 dark:text-slate-500">
                                    ${Math.abs(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right text-xs font-mono font-black text-slate-900 dark:text-white">
                                    ${Math.abs(trade.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                        {!isReadOnly && (
                                            <>
                                                <button onClick={() => onEdit(trade)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors"><Pencil size={14} /></button>
                                                <button onClick={() => handleDelete(trade)} disabled={isDeleting} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors">
                                                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// --- Sub-Component: Asset Summary Row (Accordion) ---

const AssetGroup = memo(({ ticker, trades, isLoading, onDelete, onEdit, isReadOnly, sortDir }: { ticker: string, trades: Trade[], isLoading: boolean, onDelete?: (t: Trade) => Promise<void>, onEdit: (t: Trade) => void, isReadOnly: boolean, sortDir: SortDirection }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const stats = useMemo(() => {
        let bQty = 0, bCost = 0, sQty = 0;
        trades.forEach(t => {
            const q = Math.abs(t.quantity || 0);
            const val = Math.abs(t.total || 0);
            if (t.type === 'BUY') { bQty += q; bCost += val; }
            else { sQty += q; }
        });
        const net = bQty - sQty;
        return {
            netQty: net,
            avgCost: bQty > 0 ? bCost / bQty : 0,
            totalInvested: bCost,
            isExited: Math.abs(net) < 0.000001
        };
    }, [trades]);

    const sortedGroupTrades = useMemo(() => {
        return [...trades].sort((a, b) => {
            return sortDir === 'DESC' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
        });
    }, [trades, sortDir]);

    return (
        <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm transition-all hover:border-blue-500/30 ${stats.isExited ? 'opacity-60 grayscale-[0.4]' : ''}`}>
            {/* Header Row */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-left"
            >
                <div className="flex items-center gap-6">
                    <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl text-slate-400 border border-slate-200 dark:border-slate-700">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest">{ticker}</h3>
                            {stats.isExited && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                                    <Archive size={10} /> Exited
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{trades.length} Positions Logged</p>
                    </div>
                </div>

                <div className="flex gap-10 lg:gap-16 text-right tabular-nums">
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Held</p>
                        <p className="font-mono font-black text-slate-900 dark:text-white">{stats.netQty.toLocaleString()} units</p>
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Cost</p>
                        <p className="font-mono font-black text-slate-900 dark:text-white">${stats.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Allocation</p>
                        <p className="font-mono font-black text-emerald-600 dark:text-emerald-400">${stats.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </button>

            {/* Expanded Table */}
            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/10 animate-fade-in">
                    <TransactionTable 
                        trades={sortedGroupTrades} 
                        isLoading={isLoading} 
                        onDelete={onDelete} 
                        onEdit={onEdit} 
                        isReadOnly={isReadOnly} 
                        compact={true}
                    />
                </div>
            )}
        </div>
    );
});

// --- Main Component ---

export const TradesList: React.FC<TradesListProps> = ({ 
    trades, 
    isLoading = false, 
    onAddTrade, 
    onEditTrade, 
    onDeleteTrade,
    isReadOnly = false 
}) => {
  const [viewMode, setViewMode] = useState<TradesViewMode>('BY_ASSET');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // New Sorting/Filtering State
  const [sortDir, setSortDir] = useState<SortDirection>('DESC');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFocus>(TimeFocus.FULL_YEAR);
  const [hideExited, setHideExited] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Close filter menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
            setIsFilterMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stats for the header
  const totalStats = useMemo(() => {
    return {
        totalTrades: trades.length,
        uniqueAssets: new Set(trades.map(t => t.ticker)).size,
        totalVolume: trades.reduce((acc, t) => acc + Math.abs(t.total), 0)
    };
  }, [trades]);

  // View Logic
  const filteredAndGrouped = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    // 1. Basic Filtering (Search + Type + Time Window)
    let processedTrades = trades.filter(t => {
        const matchesSearch = t.ticker.toLowerCase().includes(term) || t.date.includes(term);
        const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
        const matchesTime = isDateWithinFocus(t.date, timeFilter);
        return matchesSearch && matchesType && matchesTime;
    });

    // 2. View Mode Specific Processing
    if (viewMode === 'RECENT_HISTORY') {
        return processedTrades.sort((a, b) => {
            return sortDir === 'DESC' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
        });
    }

    // Grouped by Asset
    const groups: Record<string, Trade[]> = {};
    processedTrades.forEach(t => {
        const ticker = (t.ticker || 'UNKNOWN').toUpperCase();
        if (!groups[ticker]) groups[ticker] = [];
        groups[ticker].push(t);
    });

    return Object.entries(groups)
        .filter(([ticker, tickerTrades]) => {
            if (!hideExited) return true;
            const net = tickerTrades.reduce((sum, t) => sum + (t.type === 'BUY' ? Math.abs(t.quantity) : -Math.abs(t.quantity)), 0);
            return Math.abs(net) > 0.000001;
        })
        .sort((a, b) => {
            // Put active positions (non-zero) above exited positions always for logic, 
            // but let ticker name sort them within those clusters
            const aNet = a[1].reduce((sum, t) => sum + (t.type === 'BUY' ? Math.abs(t.quantity) : -Math.abs(t.quantity)), 0);
            const bNet = b[1].reduce((sum, t) => sum + (t.type === 'BUY' ? Math.abs(t.quantity) : -Math.abs(t.quantity)), 0);
            const aExited = Math.abs(aNet) < 0.000001;
            const bExited = Math.abs(bNet) < 0.000001;
            
            if (aExited !== bExited) return aExited ? 1 : -1;
            return a[0].localeCompare(b[0]);
        });
  }, [trades, viewMode, searchTerm, typeFilter, hideExited, sortDir, timeFilter]);

  const hasActiveFilters = typeFilter !== 'ALL' || hideExited || timeFilter !== TimeFocus.FULL_YEAR;

  return (
    <div className="space-y-8 animate-fade-in pb-20 tabular-nums">
      {/* Sticky Top Header / Control Strip */}
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
                    <button 
                        onClick={() => setViewMode('BY_ASSET')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'BY_ASSET' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <LayoutGrid size={14} /> Grouped
                    </button>
                    <button 
                        onClick={() => setViewMode('RECENT_HISTORY')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'RECENT_HISTORY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <Clock size={14} /> History
                    </button>
                </div>

                {!isReadOnly && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 text-white font-black uppercase text-[10px] tracking-widest px-6 py-4 rounded-2xl shadow-xl transition-all flex items-center gap-2"
                    >
                        <Plus size={16} /> New Trade
                    </button>
                )}
            </div>
        </div>

        {/* Search Bar Strip */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search tickers, dates, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                )}
            </div>
            <div className="flex gap-2 relative" ref={filterMenuRef}>
                {/* Advanced Filter Button */}
                <button 
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={`relative border p-3 rounded-2xl shadow-sm transition-all ${
                        hasActiveFilters 
                        ? 'bg-blue-500 text-white border-blue-600' 
                        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500'
                    }`}
                >
                    <Filter size={18} />
                    {hasActiveFilters && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    )}
                </button>

                {/* Filter Menu Popover */}
                {isFilterMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl z-50 p-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2"><ArrowRightLeft size={10}/> Transaction Type</p>
                                <div className="grid grid-cols-1 gap-1">
                                    {(['ALL', 'BUY', 'SELL'] as TypeFilter[]).map(type => (
                                        <button 
                                            key={type}
                                            onClick={() => { setTypeFilter(type); }}
                                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                                typeFilter === type 
                                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                            }`}
                                        >
                                            {type.charAt(0) + type.slice(1).toLowerCase()}
                                            {typeFilter === type && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2"><Calendar size={10}/> Time Window</p>
                                <div className="grid grid-cols-2 gap-1">
                                    {([TimeFocus.FULL_YEAR, TimeFocus.MTD, TimeFocus.QTD, TimeFocus.YTD, TimeFocus.ROLLING_12M] as TimeFocus[]).map(focus => (
                                        <button 
                                            key={focus}
                                            onClick={() => setTimeFilter(focus)}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                                                timeFilter === focus 
                                                ? 'bg-blue-600 text-white shadow-md' 
                                                : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-750'
                                            }`}
                                        >
                                            {focus === TimeFocus.FULL_YEAR ? 'All Time' : focus.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Hide Exited</span>
                                        <span className="text-[9px] text-slate-400 font-medium">Only active holdings</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={hideExited} 
                                        onChange={e => setHideExited(e.target.checked)} 
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </label>
                            </div>
                            
                            {(hasActiveFilters || searchTerm) && (
                                <button 
                                    onClick={() => { setTypeFilter('ALL'); setTimeFilter(TimeFocus.FULL_YEAR); setHideExited(false); setSearchTerm(''); setIsFilterMenuOpen(false); }}
                                    className="w-full pt-4 border-t border-slate-100 dark:border-slate-700/50 text-center text-[10px] font-black uppercase text-red-500 hover:text-red-600 tracking-widest"
                                >
                                    Reset All Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Sort Toggle Button */}
                <button 
                    onClick={() => setSortDir(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                    className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl text-slate-500 hover:text-blue-500 shadow-sm transition-colors flex items-center gap-2 group"
                    title={sortDir === 'DESC' ? "Newest First" : "Oldest First"}
                >
                    {sortDir === 'DESC' ? <ArrowDownZA size={18} /> : <ArrowUpAZ size={18} />}
                </button>
            </div>
        </div>
      </header>

      <AddTradeModal 
         isOpen={isAddModalOpen || !!editingTrade}
         initialData={editingTrade}
         onClose={() => { setIsAddModalOpen(false); setEditingTrade(null); }}
         onSave={async (trade) => {
             if (editingTrade && onEditTrade) await onEditTrade(trade);
             else await onAddTrade(trade);
         }}
      />

      <div className={`space-y-6 transition-all duration-500 ${isLoading ? 'opacity-60 grayscale pointer-events-none' : 'opacity-100'}`}>
        
        {viewMode === 'BY_ASSET' ? (
            <div className="space-y-4">
                {(filteredAndGrouped as [string, Trade[]][]).map(([ticker, tickerTrades]) => (
                    <AssetGroup 
                        key={ticker} 
                        ticker={ticker} 
                        trades={tickerTrades} 
                        isLoading={isLoading} 
                        onDelete={onDeleteTrade}
                        onEdit={setEditingTrade}
                        isReadOnly={isReadOnly}
                        sortDir={sortDir}
                    />
                ))}
            </div>
        ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                <TransactionTable 
                    trades={filteredAndGrouped as Trade[]} 
                    isLoading={isLoading} 
                    onDelete={onDeleteTrade}
                    onEdit={setEditingTrade}
                    isReadOnly={isReadOnly}
                />
            </div>
        )}

        {trades.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900/20">
                <History size={64} className="opacity-10 mb-6" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">No Trade History</h3>
                <p className="text-sm mt-2 opacity-60">Your acquisition trail will appear here after your first transaction.</p>
                {!isReadOnly && (
                    <button onClick={() => setIsAddModalOpen(true)} className="mt-8 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1">Initialize Ledger</button>
                )}
            </div>
        )}

        {trades.length > 0 && filteredAndGrouped.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <MinusCircle size={48} className="opacity-10 mb-4" />
                <p className="font-bold text-sm uppercase tracking-widest">No matches for your current filters</p>
                <button 
                    onClick={() => { setTypeFilter('ALL'); setTimeFilter(TimeFocus.FULL_YEAR); setHideExited(false); setSearchTerm(''); }}
                    className="mt-4 text-blue-500 font-black text-[10px] uppercase tracking-widest hover:underline"
                >
                    Clear all filters
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
