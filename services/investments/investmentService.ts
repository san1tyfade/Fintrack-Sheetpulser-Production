
import { Investment, Asset, Trade, ExchangeRates } from '../../types';
import { normalizeTicker } from '../geminiService';
import { convertToBase, PRIMARY_CURRENCY } from '../currencyService';

/**
 * Calculates current market price based on live quotes, falling back to trade history or sheet values.
 */
export const resolveCurrentPrice = (
    ticker: string, 
    livePrices: Record<string, number>, 
    trades: Trade[], 
    sheetPrice: number
): number => {
    if (livePrices[ticker]) return livePrices[ticker];
    if (trades && trades.length > 0) {
        const tradeWithPrice = trades.find(t => (t.marketPrice || 0) > 0);
        if (tradeWithPrice) return tradeWithPrice.marketPrice!;
        if (trades[0].price) return Math.abs(trades[0].price);
    }
    return sheetPrice || 0;
};

/**
 * Calculates valuation for a holding, prioritizing live pricing.
 */
export const calculateHoldingValue = (quantity: number, price: number, manualMarketValue?: number, isLive?: boolean): number => {
    if (Math.abs(quantity) < 0.000001) return 0;
    if (isLive) return quantity * price;
    if ((manualMarketValue || 0) > 0) return manualMarketValue!;
    return quantity * price;
};

/**
 * Orchestrates the "Synthetic Portfolio" - merging explicit sheet entries with 
 * derived holdings from trade history and cash balances from the assets tab.
 */
export const buildSyntheticPortfolio = (
    sheetInvestments: Investment[],
    trades: Trade[],
    assets: Asset[],
    exchangeRates?: ExchangeRates
): Investment[] => {
    const sheetTickers = new Set(sheetInvestments.map(i => normalizeTicker(i.ticker)));
    const unified: Investment[] = [...sheetInvestments];
    
    // 1. Trades Lookup Map
    const tradesByTicker = new Map<string, Trade[]>();
    trades.forEach(t => {
        const ticker = normalizeTicker(t.ticker);
        if (ticker === 'UNKNOWN') return;
        if (!tradesByTicker.has(ticker)) tradesByTicker.set(ticker, []);
        tradesByTicker.get(ticker)?.push(t);
    });

    // 2. Add synthetic holdings from trade history (tickers not in the main sheet)
    tradesByTicker.forEach((tickerTrades, ticker) => {
        if (!sheetTickers.has(ticker)) {
            const netQty = tickerTrades.reduce((acc, t) => {
                 const type = (t.type || 'BUY').toUpperCase().trim();
                 return acc + (type === 'SELL' ? -Math.abs(t.quantity) : Math.abs(t.quantity));
            }, 0);
            
            if (Math.abs(netQty) < 0.000001) return;

            const buyTrades = tickerTrades.filter(t => (t.type || 'BUY').toUpperCase().trim() === 'BUY');
            const totalCost = buyTrades.reduce((sum, t) => sum + Math.abs(t.total), 0);
            const totalBuyQty = buyTrades.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
            const avgPrice = totalBuyQty > 0 ? totalCost / totalBuyQty : 0;
            const latestPrice = tickerTrades[0] ? (tickerTrades[0].marketPrice || Math.abs(tickerTrades[0].price)) : 0;

            let account = 'Uncategorized';
            let assetClass = 'Trade Derived';
            const tLower = ticker.toLowerCase();
            if (['btc', 'eth', 'sol', 'ada', 'xrp', 'doge', 'ltc', 'dot', 'usdt', 'usdc'].includes(tLower)) {
                account = 'Crypto Wallet';
                assetClass = 'Crypto';
            }

            unified.push({
                id: `synthetic-${ticker}`,
                ticker: tickerTrades[0].ticker, 
                name: tickerTrades[0].ticker,
                quantity: netQty,
                avgPrice,
                currentPrice: latestPrice,
                accountName: account,
                assetClass,
                marketValue: netQty * latestPrice
            });
        }
    });

    // 3. Map account cash balances from Assets tab
    const activeAccountNames = new Set(unified.map(u => (u.accountName || '').toUpperCase().trim()));

    assets.forEach(asset => {
        const lowerName = (asset.name || '').toLowerCase();
        const lowerType = (asset.type || '').toLowerCase();
        
        let targetAccount = '';
        if (lowerName.includes('tfsa') || lowerType.includes('tfsa')) targetAccount = 'TFSA';
        else if (lowerName.includes('fhsa') || lowerType.includes('fhsa')) targetAccount = 'FHSA';
        else if (lowerName.includes('rrsp') || lowerType.includes('rrsp')) targetAccount = 'RRSP';
        else if (lowerName.includes('resp') || lowerType.includes('resp')) targetAccount = 'RESP';
        else if (lowerName.includes('lira') || lowerType.includes('lira')) targetAccount = 'LIRA';
        
        if (targetAccount) {
            const isCashEntry = lowerName.includes('cash') || lowerName.includes('uninvested') || lowerType === 'cash';
            if (!activeAccountNames.has(targetAccount.toUpperCase()) || isCashEntry) {
                unified.push({
                    id: `asset-${asset.id}`,
                    ticker: 'CASH',
                    name: asset.name,
                    quantity: 1,
                    avgPrice: convertToBase(asset.value, asset.currency, exchangeRates),
                    currentPrice: convertToBase(asset.value, asset.currency, exchangeRates),
                    accountName: targetAccount,
                    assetClass: 'Cash & Summary',
                    marketValue: convertToBase(asset.value, asset.currency, exchangeRates)
                });
            }
        }
    });

    return unified;
};
