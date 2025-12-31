
import { useMemo } from 'react';

export const useChartTheme = (isDarkMode: boolean) => {
    return useMemo(() => ({
        axisColor: isDarkMode ? '#94a3b8' : '#64748b',
        gridColor: isDarkMode ? '#334155' : '#e2e8f0',
        tooltipBg: isDarkMode ? '#1e293b' : '#ffffff',
        tooltipBorder: isDarkMode ? '#334155' : '#cbd5e1',
        primary: '#3b82f6',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        muted: isDarkMode ? '#475569' : '#94a3b8',
        surface: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
    }), [isDarkMode]);
};
