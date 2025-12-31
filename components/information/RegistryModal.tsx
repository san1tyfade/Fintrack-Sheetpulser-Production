
import React from 'react';
import { X, Loader2, Save, LucideIcon } from 'lucide-react';

interface RegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: LucideIcon;
  iconColor: string;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  submitLabel?: string;
}

export const RegistryModal: React.FC<RegistryModalProps> = ({ 
  isOpen, onClose, title, icon: Icon, iconColor, isSubmitting, onSubmit, children, submitLabel = "Save Changes" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-900 ${iconColor}`}>
              <Icon size={20} />
            </div>
            {title}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-8 space-y-6">
          {children}
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSubmitting ? 'Processing...' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
};
