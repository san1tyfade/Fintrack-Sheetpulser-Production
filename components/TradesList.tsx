
import React, { useMemo, useState, memo } from 'react';
import { Trade } from '../types';
import { History, TrendingUp, TrendingDown, Search, X, Loader2, Calendar, DollarSign, Hash, Plus, Save, Trash2, Pencil } from 'lucide-react';

interface TradesListProps {
  trades: Trade[];
  isLoading?: boolean;
  onAddTrade: (trade: Trade) => Promise<void>;
  onEditTrade?: (trade: Trade) => Promise<void>;
  onDeleteTrade?: (trade: Trade) => Promise<void>;
  // Added isReadOnly to fix TypeScript errors in App.tsx
  isReadOnly?: boolean;
}

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
    
    // Load initial data when opening for edit
    React.useEffect(() => {
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
            // Reset if opening for Add
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

    const total = (formData.quantity || 0) * (formData.price || 0) + (formData.type === 'BUY' ? (formData.fee || 0) : -(formData.fee || 0));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.ticker || !formData.quantity || !formData.price) {
            setError("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const newTrade: Trade = {
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex, // Preserve row index for edits
                date: formData.date!,
                ticker: formData.ticker.toUpperCase(),
                type: formData.type as 'BUY' | 'SELL',
                quantity: Number(formData.quantity),
                price: Number(formData.price),
                fee: Number(formData.fee || 0),
                total: total
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        {initialData ? <Pencil size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                        {initialData ? 'Edit Trade' : 'New Trade'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                            <input 
                                type="date" 
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                                {['BUY', 'SELL'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFormData({...formData, type: t as any})}
                                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${
                                            formData.type === t 
                                            ? (t === 'BUY' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-red-500 text-white shadow-sm')
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ticker Symbol</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="e.g. AAPL, BTC, VFV"
                                value={formData.ticker}
                                onChange={e => setFormData({...formData, ticker: e.target.value.toUpperCase()})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-3 py-2 text-sm font-bold tracking-wide outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                            <input 
                                type="number" 
                                placeholder="0.00"
                                step="any"
                                value={formData.quantity || ''}
                                onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price per Unit</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    step="any"
                                    value={formData.price || ''}
                                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fees (Optional)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    step="any"
                                    value={formData.fee || ''}
                                    onChange={e => setFormData({...formData, fee: parseFloat(e.target.value)})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-2 text-right">
                             <span className="block text-[10px] text-slate-500 uppercase font-bold">Est. Total</span>
                             <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                                 ${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                             </span>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSubmitting ? 'Saving...' : (initialData ? 'Update Trade' : 'Save Transaction')}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Sub-Component: TradeGroup (Memoized) ---

const TradeGroup = memo(({ ticker, trades, isLoading, onDelete, onEdit }: { ticker: string, trades: Trade[], isLoading: boolean, onDelete?: (t: Trade) => Promise<void>, onEdit: (t: Trade) => void }) => {
    
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDeleteClick = async (trade: Trade) => {
        if (!onDelete) return;
        if (!confirm(`Are you sure you want to delete this ${trade.type} trade for ${trade.ticker}? This will remove the row from your Google Sheet.`)) return;
        
        setDeletingId(trade.id);
        try {
            await onDelete(trade);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setDeletingId(null);
        }
    };

    // Optimize stats calculation
    const stats = useMemo(() => {
        let boughtQty = 0;
        let boughtCost = 0;
        let soldQty = 0;

        for (const t of trades) {
            const qty = Math.abs(t.quantity || 0);
            const total = Math.abs(t.total || 0);
            const type = (t.type || 'BUY').toUpperCase().trim();

            if (type === 'BUY') {
                boughtQty += qty;
                boughtCost += total;
            } else {
                soldQty += qty;
            }
        }

        return {
            avgBuyPrice: boughtQty > 0 ? boughtCost / boughtQty : 0,
            netQuantity: boughtQty - soldQty
        };
    }, [trades]);

    return (
        <div className="space-y-3 animate-fade-in group">
            <div className="flex items-center justify-between px-3 pt-3 pb-1 border-t border-slate-200 dark:border-slate-700/30 group-first:border-0">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500 dark:text-blue-400 border border-blue-500/20">
                        <History size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{ticker}</h3>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{trades.length} Transactions</p>
                    </div>
                </div>
                <div className="flex gap-6 text-sm text-right">
                    <div className="hidden sm:block">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Avg. Buy</p>
                        <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                            {isLoading ? <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : `$${stats.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Net Qty</p>
                        <div className={`font-mono font-bold ${stats.netQuantity < 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isLoading ? <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" /> : stats.netQuantity.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32"><span className="flex items-center gap-1"><Calendar size={12}/> Date</span></th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Type</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"><span className="flex items-center gap-1 justify-end"><Hash size={12}/> Qty</span></th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"><span className="flex items-center gap-1 justify-end"><DollarSign size={12}/> Price</span></th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Total Value</th>
                                <th className="p-4 w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {trades.map((trade) => {
                                const isBuy = (trade.type || 'BUY').trim().toUpperCase() === 'BUY';
                                const dateObj = new Date(trade.date);
                                const dateDisplay = isNaN(dateObj.getTime()) ? trade.date : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                const canEdit = trade.rowIndex !== undefined;
                                const isDeleting = deletingId === trade.id;

                                return (
                                    <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group/row">
                                        <td className="p-4 text-slate-700 dark:text-slate-300 whitespace-nowrap text-sm font-medium">{dateDisplay}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                isBuy 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                : 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'
                                            }`}>
                                                {isBuy ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                {trade.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-slate-700 dark:text-slate-300 font-mono text-sm">
                                            {isLoading ? <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : Math.abs(trade.quantity).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right text-slate-500 dark:text-slate-400 font-mono text-sm group-hover/row:text-slate-900 dark:group-hover/row:text-white transition-colors">
                                            {isLoading ? <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : `$${Math.abs(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </td>
                                        <td className="p-4 text-right text-slate-900 dark:text-white font-bold font-mono text-sm">
                                            {isLoading ? <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse ml-auto" /> : `$${Math.abs(trade.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                {canEdit && (
                                                     <button 
                                                        onClick={() => onEdit(trade)}
                                                        disabled={isDeleting || isLoading}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                                                        title="Edit Trade"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                )}
                                                {canEdit && onDelete && (
                                                    <button 
                                                        onClick={() => handleDeleteClick(trade)}
                                                        disabled={isDeleting || isLoading}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                                        title="Delete Trade"
                                                    >
                                                        {isDeleting ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
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
    // Destructured isReadOnly from props
    isReadOnly = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // 1. Group trades by Ticker and sort within groups
  const groupedTrades = useMemo(() => {
    const groups: { [ticker: string]: Trade[] } = {};
    
    trades.forEach(trade => {
      const ticker = (trade.ticker || 'UNKNOWN').toUpperCase();
      if (!groups[ticker]) groups[ticker] = [];
      groups[ticker].push(trade);
    });

    Object.values(groups).forEach(list => {
        list.sort((a, b) => b.date.localeCompare(a.date));
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [trades]);

  // 2. Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedTrades;
    const lowerTerm = searchTerm.toLowerCase();
    return groupedTrades.filter(([ticker]) => ticker.toLowerCase().includes(lowerTerm));
  }, [groupedTrades, searchTerm]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                Trades
                {isLoading && <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={24} />}
              </h2>
              {!isReadOnly && (
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                  >
                      <Plus size={16} /> Add Trade
                  </button>
              )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Historical transaction log grouped by asset.</p>
        </div>
        
        {/* Search Bar */}
        <div className={`relative w-full md:w-72 transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
             <input
                type="text"
                placeholder="Search by ticker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full placeholder:text-slate-400 transition-all shadow-sm focus:shadow-md"
             />
             {searchTerm && (
                 <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 rounded-full p-0.5"
                 >
                     <X size={14} />
                 </button>
             )}
        </div>
      </header>

      <AddTradeModal 
         isOpen={isAddModalOpen || !!editingTrade}
         initialData={editingTrade}
         onClose={() => { setIsAddModalOpen(false); setEditingTrade(null); }}
         onSave={async (trade) => {
             if (editingTrade && onEditTrade) {
                 await onEditTrade(trade);
             } else {
                 await onAddTrade(trade);
             }
         }}
      />

      <div className={`transition-all duration-500 space-y-8 ${isLoading ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
        {filteredGroups.map(([ticker, tickerTrades]) => (
            <TradeGroup 
                key={ticker} 
                ticker={ticker} 
                trades={tickerTrades} 
                isLoading={isLoading} 
                onDelete={onDeleteTrade}
                onEdit={setEditingTrade}
            />
        ))}

        {trades.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-2xl bg-slate-50 dark:bg-slate-800/20">
                <History size={48} className="opacity-20 mb-4" />
                <p className="font-medium">No trade history found.</p>
                <p className="text-sm mt-1">Import from Sheet or click "Add Trade".</p>
                {!isReadOnly && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-4 text-blue-500 hover:text-blue-600 font-bold text-sm"
                    >
                        + Create First Trade
                    </button>
                )}
            </div>
        )}

        {trades.length > 0 && filteredGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-2xl">
                <Search size={32} className="opacity-20 mb-3" />
                <p>No results for "<span className="text-slate-700 dark:text-slate-300 font-semibold">{searchTerm}</span>"</p>
            </div>
        )}
      </div>
    </div>
  );
};
