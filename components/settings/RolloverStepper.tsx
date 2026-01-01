
import React, { useState } from 'react';
import { Loader2, Zap, PartyPopper, AlertTriangle, Check } from 'lucide-react';
import { resetYearlyLedger } from '../../services/sheetWriteService';

interface RolloverStepperProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (tabs: any[]) => Promise<void>;
  sheetId: string;
  incomeTab: string;
  expenseTab: string;
  onSuccess: (nextYear: number) => void;
  activeYear: number;
}

type Step = 'init' | 'syncing' | 'confirm' | 'rolling' | 'done';

export const RolloverStepper: React.FC<RolloverStepperProps> = ({ 
    isOpen, onClose, onSync, sheetId, incomeTab, expenseTab, onSuccess, activeYear
}) => {
    const [step, setStep] = useState<Step>('init');
    const [confirmYear, setConfirmYear] = useState('');
    
    // We capture the starting year when the wizard opens to prevent the display labels 
    // from jumping forward when the parent state updates during the process.
    const [workflowContext] = useState({ 
        current: activeYear, 
        next: activeYear + 1 
    });

    if (!isOpen) return null;

    const startSync = async () => {
        setStep('syncing');
        try {
            await onSync(['income', 'expenses']);
            setStep('confirm');
        } catch (e) {
            alert("Sync failed before rollover. Please try again.");
            setStep('init');
        }
    };

    const runRollover = async () => {
        if (confirmYear !== String(workflowContext.current)) {
            alert(`Please type ${workflowContext.current} to confirm.`);
            return;
        }
        setStep('rolling');
        try {
            await resetYearlyLedger(sheetId, incomeTab, expenseTab);
            setStep('done');
            // Trigger success callback to update parent state
            onSuccess(workflowContext.next);
        } catch (e: any) {
            alert(`Rollover failed: ${e.message}`);
            setStep('confirm');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${step === 'done' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                            {step === 'done' ? <PartyPopper size={24} /> : <Zap size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Close Financial Year {workflowContext.current}</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Year-End Maintenance Wizard</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {(['syncing', 'confirm', 'rolling', 'done'] as Step[]).map((s, idx) => {
                            const isActive = step === s;
                            const isPast = ['syncing', 'confirm', 'rolling', 'done'].indexOf(step) > idx;
                            return (
                                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${isPast ? 'bg-emerald-500' : isActive ? 'bg-blue-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-700'}`} />
                            );
                        })}
                    </div>

                    <div className="py-4">
                        {step === 'init' && (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Closing a financial year is a major operation. We will first synchronize your current data to ensure your archives are 100% accurate.
                                </p>
                                <button onClick={startSync} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all">
                                    Begin Preparation
                                </button>
                            </div>
                        )}

                        {step === 'syncing' && (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                <Loader2 size={48} className="text-blue-500 animate-spin" />
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Synchronizing {workflowContext.current} Records...</p>
                                <p className="text-xs text-slate-500">Verifying local vault against Google Sheets</p>
                            </div>
                        )}

                        {step === 'confirm' && (
                            <div className="space-y-6">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex gap-3">
                                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase">What happens next?</p>
                                        <ul className="text-xs text-amber-800/80 dark:text-amber-300/80 space-y-1 list-disc pl-4">
                                            <li>Archives "{incomeTab}" to "{incomeTab}-{String(workflowContext.current).slice(-2)}"</li>
                                            <li>Archives "{expenseTab}" to "{expenseTab}-{String(workflowContext.current).slice(-2)}"</li>
                                            <li>Wipes current transactions to start {workflowContext.next} at $0</li>
                                            <li>Historical data remains accessible via Time Machine</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Type "{workflowContext.current}" to confirm</label>
                                    <input 
                                        type="text" 
                                        value={confirmYear} 
                                        onChange={e => setConfirmYear(e.target.value)}
                                        placeholder={String(workflowContext.current)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-black focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-2xl">Cancel</button>
                                    <button 
                                        onClick={runRollover}
                                        disabled={confirmYear !== String(workflowContext.current)}
                                        className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all"
                                    >
                                        Archive & Start {workflowContext.next}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'rolling' && (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                <Loader2 size={48} className="text-emerald-500 animate-spin" />
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Cloning Sheets & Resetting Ledger...</p>
                                <p className="text-xs text-slate-500">Communicating with Google Sheets API</p>
                            </div>
                        )}

                        {step === 'done' && (
                            <div className="space-y-6 text-center py-4">
                                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Check size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">Rollover Successful!</h4>
                                    <p className="text-sm text-slate-500">Your {workflowContext.current} data is safely archived. The active spreadsheet is now ready for {workflowContext.next}.</p>
                                </div>
                                <button onClick={onClose} className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-4 rounded-2xl shadow-xl">
                                    Start {workflowContext.next} Chapter
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
