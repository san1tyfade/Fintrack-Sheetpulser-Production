
import { Asset, ExchangeRates } from '../../types';
import { convertToBase } from '../currencyService';
import { isInvestmentAsset, isFixedAsset, isCashAsset } from '../classificationService';

export type AssetFilterType = 'All' | 'Investment' | 'Property' | 'Cash';
export type AssetSortKey = 'value' | 'name' | 'type';

/**
 * Standardized filtering for the Asset Inventory.
 */
export const filterAssets = (assets: Asset[], searchTerm: string, filterType: string): Asset[] => {
    const term = searchTerm.toLowerCase();
    return assets.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(term) || a.type.toLowerCase().includes(term);
        const matchesFilter = filterType === 'All' || 
                             (filterType === 'Investment' && isInvestmentAsset(a)) ||
                             (filterType === 'Property' && isFixedAsset(a)) ||
                             (filterType === 'Cash' && isCashAsset(a));
        return matchesSearch && matchesFilter;
    });
};

/**
 * Currency-aware sorting engine for assets.
 */
export const sortAssets = (assets: Asset[], sortKey: AssetSortKey, exchangeRates?: ExchangeRates): Asset[] => {
    return [...assets].sort((a, b) => {
        if (sortKey === 'value') {
            return convertToBase(b.value, b.currency, exchangeRates) - convertToBase(a.value, a.currency, exchangeRates);
        }
        if (sortKey === 'name') return a.name.localeCompare(b.name);
        return (a.type || '').localeCompare(b.type || '');
    });
};
