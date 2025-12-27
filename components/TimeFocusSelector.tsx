
import React from 'react';
import { TimeFocus } from '../types';

interface TimeFocusSelectorProps {
    current: TimeFocus;
    onChange: (focus: TimeFocus) => void;
    disabled?: boolean;
}

export const TimeFocusSelector: React.FC<TimeFocusSelectorProps> = ({ current, onChange, disabled }) => {
    const options = [
        { id: TimeFocus.MTD, label: 'MTD' },
        { id: TimeFocus.QTD, label: 'QTD' },
        { id: TimeFocus.YTD, label: 'YTD' },
        { id: TimeFocus.ROLLING_12M, label: '12M' },
        { id: TimeFocus.FULL_YEAR, label: 'ALL' },
    ];

    return (
        <div className={`flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        current === opt.id
                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};
