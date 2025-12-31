
import { TaxRecord } from '../types';

export const TAX_ACCOUNTS = ['TFSA', 'RRSP', 'FHSA', 'LAPP', 'RESP'];
export const TAX_SUMMARY_ACCOUNTS = ['TFSA', 'RRSP', 'FHSA'];

export const TAX_LIMIT_TYPES = ['LIMIT', 'LIMIT INCREASE', 'OPENING BALANCE', 'INCREASE'];
export const TAX_CONTRIBUTION_TYPES = ['CONTRIBUTION', 'DEPOSIT'];
export const TAX_WITHDRAWAL_TYPES = ['WITHDRAWAL', 'WITHDRAW'];

export const calculateTaxStats = (taxRecords: TaxRecord[]) => {
    const stats: Record<string, { used: number, totalLimit: number, remaining: number }> = {};
    
    TAX_ACCOUNTS.forEach(acc => {
        const records = taxRecords.filter(r => (r.recordType || '').toUpperCase().includes(acc));
        
        let limit = 0;
        let contributions = 0;
        let withdrawals = 0;

        records.forEach(r => {
            const type = (r.transactionType || '').toUpperCase().trim();
            const value = Math.abs(r.value || 0);

            if (TAX_LIMIT_TYPES.includes(type)) {
                limit += value;
            } else if (TAX_CONTRIBUTION_TYPES.includes(type)) {
                contributions += value;
            } else if (TAX_WITHDRAWAL_TYPES.includes(type)) {
                withdrawals += value;
            }
        });

        const used = contributions - withdrawals;
        stats[acc] = {
            used,
            totalLimit: limit,
            remaining: Math.max(0, limit - used)
        };
    });

    return stats;
};
