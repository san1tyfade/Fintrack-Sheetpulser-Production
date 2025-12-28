
import React from 'react';
import { TimeFocus, CustomDateRange } from '../types';
import { Calendar } from 'lucide-react';

interface TimeFocusSelectorProps {
    current: TimeFocus;
    onChange: (focus: TimeFocus) => void;
    customRange?: CustomDateRange;
    onCustomRangeChange?: (range: CustomDateRange) => void;
    disabled?: boolean;
}

export const TimeFocusSelector: React.FC<TimeFocusSelectorProps> = ({ 
    current, onChange, customRange, onCustomRangeChange, disabled 
}) => {
    const options = [
        { id: TimeFocus.MTD, label: 'MTD' },
        { id: TimeFocus.QTD, label: 'QTD' },
        { id: TimeFocus.YTD, label: 'YTD' },
        { id: TimeFocus.ROLLING_12M, label: '12M' },
        { id: TimeFocus.FULL_YEAR, label: 'ALL' },
        { id: TimeFocus.CUSTOM, label: 'CUSTOM' },
    ];

    return (
        <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
            {current === TimeFocus.CUSTOM && customRange && onCustomRangeChange && (
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center gap-2 px-2 text-slate-400">
                        <Calendar size={14} />
                    </div>
                    <input 
                        type="date" 
                        value={customRange.start}
                        onChange={(e) => onCustomRangeChange({ ...customRange, start: e.target.value })}
                        className="bg-transparent text-[10px] font-bold outline-none text-slate-600 dark:text-slate-300"
                    />
                    <span className="text-[10px] font-black text-slate-300 uppercase">to</span>
                    <input 
                        type="date" 
                        value={customRange.end}
                        onChange={(e) => onCustomRangeChange({ ...customRange, end: e.target.value })}
                        className="bg-transparent text-[10px] font-bold outline-none text-slate-600 dark:text-slate-300"
                    />
                </div>
            )}
            
            <div className={`flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit flex-wrap ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
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
        </div>
    );
};
