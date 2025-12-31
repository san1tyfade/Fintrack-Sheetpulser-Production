
import { Trade, TimeFocus } from '../../types';
import { isDateWithinFocus } from '../portfolioService';

export interface GroupedTradeStats {
    netQty: number;
    avgCost: number;
    totalInvested: number;
    isExited: boolean;
}

export interface TradeGroup {
    ticker: string;
    trades: Trade[];
    stats: GroupedTradeStats;
}

/**
 * Calculates aggregate stats for a list of trades (usually for a single ticker).
 */
export const calculateTradeStats = (trades: Trade[]): GroupedTradeStats => {
    let bQty = 0, bCost = 0, sQty = 0;
    trades.forEach(t => {
        const q = Math.abs(t.quantity || 0);
        const val = Math.abs(t.total || 0);
        if (t.type === 'BUY') { 
            bQty += q; 
            bCost += val; 
        } else { 
            sQty += q; 
        }
    });
    const net = bQty - sQty;
    return {
        netQty: net,
        avgCost: bQty > 0 ? bCost / bQty : 0,
        totalInvested: bCost,
        isExited: Math.abs(net) < 0.000001
    };
};

/**
 * Standardized engine for filtering and grouping trades.
 */
export const filterAndProcessTrades = (
    trades: Trade[],
    searchTerm: string,
    typeFilter: 'ALL' | 'BUY' | 'SELL',
    timeFilter: TimeFocus,
    viewMode: 'BY_ASSET' | 'RECENT_HISTORY',
    sortDir: 'ASC' | 'DESC',
    hideExited: boolean
): Trade[] | TradeGroup[] => {
    const term = searchTerm.toLowerCase();
    
    // 1. Filtering
    let filtered = trades.filter(t => {
        const matchesSearch = t.ticker.toLowerCase().includes(term) || t.date.includes(term);
        const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
        const matchesTime = isDateWithinFocus(t.date, timeFilter);
        return matchesSearch && matchesType && matchesTime;
    });

    // 2. Sorting
    filtered.sort((a, b) => sortDir === 'DESC' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

    if (viewMode === 'RECENT_HISTORY') return filtered;

    // 3. Grouping
    const groups: Record<string, Trade[]> = {};
    filtered.forEach(t => {
        const ticker = (t.ticker || 'UNKNOWN').toUpperCase();
        if (!groups[ticker]) groups[ticker] = [];
        groups[ticker].push(t);
    });

    return Object.entries(groups)
        .map(([ticker, tickerTrades]) => ({ 
            ticker, 
            trades: tickerTrades, 
            stats: calculateTradeStats(tickerTrades) 
        }))
        .filter(group => !hideExited || !group.stats.isExited)
        .sort((a, b) => {
            if (a.stats.isExited !== b.stats.isExited) return a.stats.isExited ? 1 : -1;
            return a.ticker.localeCompare(b.ticker);
        });
};
