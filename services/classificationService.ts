
import React from 'react';
import { Asset } from '../types';
import { Wallet, Home, Car, Package, Coins, CircleDollarSign, Briefcase, Landmark } from 'lucide-react';

/**
 * Determines if an asset represents an Investment (Stock, Crypto, Retirement, TFSA/FHSA, etc.)
 */
export const isInvestmentAsset = (asset: Asset): boolean => {
    const t = (asset.type || '').toLowerCase();
    const n = (asset.name || '').toLowerCase();
    return (
        t.includes('investment') || 
        t.includes('crypto') || 
        t.includes('stock') || 
        t.includes('etf') || 
        t.includes('retirement') ||
        t.includes('pension') ||
        t.includes('tfsa') ||
        t.includes('fhsa') ||
        t.includes('rrsp') ||
        n.includes('tfsa') || 
        n.includes('fhsa') || 
        n.includes('rrsp') || 
        n.includes('pension') ||
        n.includes('crypto')
    );
};

/**
 * Determines if an asset represents a Fixed Asset (Real Estate, Vehicle, Physical Property)
 */
export const isFixedAsset = (asset: Asset): boolean => {
    const t = (asset.type || '').toLowerCase();
    const n = (asset.name || '').toLowerCase();
    
    // Explicitly exclude cash "funds" that might be named "Car Fund"
    if (n.includes('fund') || n.includes('savings')) return false;

    return (
        t.includes('real estate') || 
        t.includes('property') || 
        t.includes('house') || 
        t.includes('vehicle') || 
        t.includes('car')
    );
};

/**
 * Determines if an asset is Liquid Cash (Bank accounts, Savings funds, etc.)
 * Defined as anything that is NOT an Investment and NOT a Fixed Asset.
 */
export const isCashAsset = (asset: Asset): boolean => {
    const n = (asset.name || '').toLowerCase();
    
    // Explicitly Include "Fund" or "Savings" as cash overrides, but exclude Pension funds
    if ((n.includes('fund') || n.includes('savings')) && !n.includes('pension')) return true;
    
    if (isInvestmentAsset(asset)) return false;
    if (isFixedAsset(asset)) return false;
    
    return true;
};

/**
 * Returns the appropriate Lucide icon component based on asset type string.
 */
export const getAssetIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('cash') || t.includes('bank')) return React.createElement(Wallet, { className: "text-emerald-400" });
    if (t.includes('real estate') || t.includes('property') || t.includes('house')) return React.createElement(Home, { className: "text-blue-400" });
    if (t.includes('vehicle') || t.includes('car')) return React.createElement(Car, { className: "text-indigo-400" });
    if (t.includes('personal property')) return React.createElement(Package, { className: "text-indigo-300" });
    if (t.includes('crypto')) return React.createElement(Coins, { className: "text-orange-400" });
    if (t.includes('stock') || t.includes('etf')) return React.createElement(CircleDollarSign, { className: "text-purple-400" });
    if (t.includes('investment')) return React.createElement(Briefcase, { className: "text-blue-400" });
    if (t.includes('retirement') || t.includes('pension') || t.includes('401k') || t.includes('rrsp') || t.includes('tfsa') || t.includes('fhsa')) return React.createElement(Briefcase, { className: "text-yellow-400" });
    return React.createElement(Landmark, { className: "text-slate-400" });
};
