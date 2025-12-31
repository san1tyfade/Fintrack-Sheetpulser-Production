
import { useState, useEffect, useRef } from 'react';
import { fetchLivePrices } from '../services/priceService';
import { PRIMARY_CURRENCY } from '../services/currencyService';

/**
 * Manages live price polling with built-in caching.
 */
export const usePriceEngine = (tickers: string[], pollIntervalMs: number = 60000) => {
    const [livePrices, setLivePrices] = useState<Record<string, number>>({});
    const [isFetching, setIsFetching] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const prevTickersRef = useRef<string[]>([]);

    useEffect(() => {
        const tickerString = JSON.stringify([...tickers].sort());
        const prevTickerString = JSON.stringify(prevTickersRef.current);
        
        if (tickers.length === 0) return;
        
        const updatePrices = async () => {
            setIsFetching(true);
            try {
                const newPrices = await fetchLivePrices(tickers, PRIMARY_CURRENCY);
                setLivePrices(prev => ({ ...prev, ...newPrices }));
                setLastUpdated(new Date());
            } catch (e) {
                console.error("Price Engine: Update failed", e);
            } finally {
                setIsFetching(false);
            }
        };

        // Trigger on mount or ticker change
        if (tickerString !== prevTickerString) {
            updatePrices();
            prevTickersRef.current = [...tickers].sort();
        }

        const interval = setInterval(updatePrices, pollIntervalMs);
        return () => clearInterval(interval);
    }, [tickers, pollIntervalMs]);

    return { livePrices, isFetching, lastUpdated };
};
