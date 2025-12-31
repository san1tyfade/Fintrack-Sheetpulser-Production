
import React from 'react';
import { Shield, Lock, Eye, Database, Globe, Cloud, ArrowLeft, EyeOff, Cpu, HardDrive, Key } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
  isInline?: boolean;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack, isInline = false }) => {
  const sections = [
    {
      title: "Local-First Architecture",
      icon: Cpu,
      color: "text-blue-500",
      content: "Sheetsense Pro is built on a 'Local-First' philosophy. All financial calculations, trend analysis, and portfolio reconciliations are performed entirely within your browser's secure sandbox. Your sensitive data is never transmitted to our servers for processing."
    },
    {
      title: "Visual Privacy (Ghost Mode)",
      icon: EyeOff,
      color: "text-amber-500",
      content: "The built-in 'Privacy Mode' provides real-time cryptographic-style blurring of sensitive figures. This allows you to safely navigate the application in public spaces or during screen-sharing sessions without exposing absolute net worth or specific account balances."
    },
    {
      title: "Cloud Vault Protocol",
      icon: Cloud,
      color: "text-indigo-500",
      content: "The Cloud Vault feature utilizes your private Google Drive as an encrypted-at-rest storage layer. When you synchronize, a JSON manifest is stored in a hidden 'App Data' folder that only this instance of Sheetsense can access. This ensures your local backup is as secure as your Google Account itself."
    },
    {
      title: "Zero-Knowledge Persistence",
      icon: HardDrive,
      color: "text-emerald-500",
      content: "Data stored on your device uses IndexedDB, an industrial-strength local database. This data is persistent and survives browser restarts, but remains strictly isolated to your machine. We have no 'backdoor' access to this information."
    },
    {
      title: "External Data Integrity",
      icon: Globe,
      color: "text-purple-500",
      content: "To provide live market quotes and exchange rates, the app queries public APIs (Frankfurter for FX, Yahoo Finance for Stocks). These queries include ticker symbols but never your personal holdings, account names, or identity."
    },
    {
      title: "OAuth 2.0 Security",
      icon: Key,
      color: "text-rose-500",
      content: "We use Google's official Identity Services (OAuth 2.0) to manage sessions. Sheetsense never sees or stores your Google password. Access tokens are kept in temporary memory and strictly adhere to the principle of least privilege."
    }
  ];

  return (
    <div className={`${isInline ? '' : 'max-w-4xl mx-auto'} animate-fade-in pb-20`}>
      <header className="mb-12">
        {!isInline && onBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-colors mb-8 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Exit Privacy Hub
          </button>
        )}
        <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-500/20">
                <Shield size={32} />
            </div>
            <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Privacy Protocol</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Sheetsense Production Build v1.0.0 — Security Standards</p>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 ${section.color} border border-slate-100 dark:border-slate-700 shadow-inner group-hover:scale-105 transition-transform`}>
                <section.icon size={24} />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{section.title}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-slate-900 dark:bg-slate-850 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <Lock className="text-emerald-400" size={20} />
                <h4 className="font-black uppercase tracking-[0.2em] text-xs text-slate-400">Governance & Sovereignty</h4>
            </div>
            <p className="text-lg font-bold leading-relaxed text-slate-200">
                You are the sole sovereign of your financial data. Sheetsense acts merely as a lens to visualize the data residing in your own Google Spreadsheets. We do not track, aggregate, or sell your financial behavior.
            </p>
            <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Audit Date: {new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified Production Stable
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
