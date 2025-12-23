import React from 'react';
import { Shield, Lock, Eye, Database, Globe, Cloud, ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
  isInline?: boolean;
  isStandalone?: boolean;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack, isInline = false, isStandalone = false }) => {
  const sections = [
    {
      title: "Local-First Data Processing",
      icon: Database,
      color: "text-blue-500",
      content: "Sheetsense is designed as a local-first application. Your personal financial data is fetched directly from your Google Sheets to your browser via secure APIs. We do not store, process, or maintain any of your financial information on our own servers."
    },
    {
      title: "Secure Local Storage",
      icon: Lock,
      color: "text-emerald-500",
      content: "All app state, including synced data and configuration, is stored exclusively on your device using IndexedDB and LocalStorage. This information never leaves your device unless you manually sync it back to your connected Google Spreadsheet."
    },
    {
      title: "Restricted Google Permissions",
      icon: Cloud,
      color: "text-indigo-500",
      content: "We use the highly restrictive 'drive.file' scope. This ensures that the app only has access to files that you explicitly select through the secure Google Picker interface. We cannot see or modify any other files in your Google Drive."
    },
    {
      title: "User Profile Privacy",
      icon: Eye,
      color: "text-purple-500",
      content: "We request access to your basic profile information (name and picture) solely to personalize your dashboard experience. This information is processed locally and is never shared with third parties."
    },
    {
      title: "External Services",
      icon: Globe,
      color: "text-orange-500",
      content: "To provide utility features, we interact with minimal third-party APIs: Frankfurter for currency exchange, and CoinGecko/Yahoo Finance for asset prices. No personal identifying data or financial details are ever sent to these services."
    },
    {
      title: "Your Data, Your Control",
      icon: Shield,
      color: "text-rose-500",
      content: "You have complete authority over your data. You can wipe all local application storage at any time via the Settings menu. Deleting the application or clearing your browser's site data removes all information processed by Sheetsense."
    }
  ];

  const content = (
    <div className={`${isInline ? '' : 'max-w-4xl mx-auto'} animate-fade-in`}>
      {!isInline && (
        <header className="mb-10">
          <div className="flex items-center justify-between mb-6">
            {!isStandalone && onBack && (
              <button 
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-4">
            <Shield className="text-blue-600 dark:text-blue-400" size={40} />
            Privacy Policy
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg">
            Transparent, secure, and private financial management.
          </p>
        </header>
      )}

      <div className={`grid grid-cols-1 ${isInline ? 'gap-4' : 'md:grid-cols-2 gap-8'}`}>
        {sections.map((section, idx) => (
          <div key={idx} className={`bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all ${isInline ? 'p-4' : ''}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 ${section.color}`}>
                <section.icon size={24} />
              </div>
              <h3 className={`font-bold text-slate-800 dark:text-slate-200 ${isInline ? 'text-sm' : 'text-lg'}`}>{section.title}</h3>
            </div>
            <p className={`${isInline ? 'text-xs' : 'text-sm'} text-slate-600 dark:text-slate-400 leading-relaxed`}>
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {!isInline && (
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-8 rounded-3xl">
          <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-4 text-lg">Consent & Compliance</h4>
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            By connecting your Google account and utilizing Sheetsense, you acknowledge and consent to the data processing practices described above. This application is intended for personal use and does not track users across sites or sell user data.
          </p>
          <p className="text-xs text-blue-700/60 dark:text-blue-400/60 mt-6 italic">
            Last Updated: {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );

  return content;
};