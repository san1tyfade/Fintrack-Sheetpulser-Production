
import { Investment, Trade } from '../types';
import { normalizeTicker } from './geminiService';

/**
 * Reconciles static Investment data from Sheets with dynamic Trade data.
 * Adjusts quantities based on trade history while preserving Sheet metadata.
 */
export const reconcileInvestments = (investments: Investment[], trades: Trade[]): Investment[] => {
    if (!investments.length) return [];
    
    // 1. Calculate net holdings from trades per ticker
    const tradeHoldings = new Map<string, number>();
    trades.forEach(t => {
        const qty = Math.abs(t.quantity || 0);
        if (qty === 0) return;
        const ticker = normalizeTicker(t.ticker);
        const type = (t.type || 'BUY').toUpperCase().trim();
        tradeHoldings.set(ticker, (tradeHoldings.get(ticker) || 0) + (type === 'BUY' ? qty : -qty));
    });

    // 2. Group investments by ticker
    const invByTicker = new Map<string, Investment[]>();
    investments.forEach(inv => {
       const t = normalizeTicker(inv.ticker);
       if (!invByTicker.has(t)) invByTicker.set(t, []);
       invByTicker.get(t)?.push(inv);
    });

    const result: Investment[] = [];
    
    // 3. Reconcile Sheet Quantity with Trade Quantity
    invByTicker.forEach((invs, ticker) => {
        const tradeQty = tradeHoldings.get(ticker);
        
        // If no trades exist, trust the sheet completely
        if (tradeQty === undefined) {
            result.push(...invs);
            return;
        }

        const totalSheetQty = invs.reduce((sum, i) => sum + i.quantity, 0);
        
        // Distribute trade-derived quantity across investment lots proportionally
        if (totalSheetQty === 0) {
            // Edge case: Sheet has 0 qty but trades say otherwise. Assign to first lot.
            result.push({ ...invs[0], quantity: tradeQty });
            for(let i=1; i<invs.length; i++) result.push({ ...invs[i], quantity: 0 });
        } else {
            let remaining = tradeQty;
            invs.forEach((inv, index) => {
                if (index === invs.length - 1) {
                     result.push({ ...inv, quantity: remaining });
                } else {
                     const ratio = inv.quantity / totalSheetQty;
                     const newQty = tradeQty * ratio;
                     result.push({ ...inv, quantity: newQty });
                     remaining -= newQty;
                }
            });
        }
    });
    return result;
};
