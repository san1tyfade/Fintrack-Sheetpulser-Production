
import React from 'react';
import { Scale, FileText, CheckCircle, AlertTriangle, UserCheck, RefreshCcw, ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
  onBack?: () => void;
  isStandalone?: boolean;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack, isStandalone = false }) => {
  const sections = [
    {
      title: "Acceptance of Terms",
      icon: UserCheck,
      color: "text-blue-500",
      content: "By accessing and using Sheetsense, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application. This app is provided for personal, non-commercial financial tracking."
    },
    {
      title: "Not Financial Advice",
      icon: Scale,
      color: "text-amber-500",
      content: "Sheetsense is a data visualization and management tool. The information provided is for educational purposes only and does not constitute financial, investment, or legal advice. Always consult with a qualified professional before making financial decisions."
    },
    {
      title: "Data Accuracy & Google Sheets",
      icon: FileText,
      color: "text-emerald-500",
      content: "The application relies on data provided by your connected Google Sheets and external price APIs. We do not guarantee the accuracy, completeness, or timeliness of the information. You are responsible for the integrity of your spreadsheet data."
    },
    {
      title: "User Responsibility",
      icon: AlertTriangle,
      color: "text-rose-500",
      content: "You are solely responsible for maintaining the security of your Google account and the data within your spreadsheets. Sheetsense is not liable for any unauthorized access to your Google account or data loss resulting from spreadsheet modifications."
    },
    {
      title: "Service Modifications",
      icon: RefreshCcw,
      color: "text-indigo-500",
      content: "We reserve the right to modify or discontinue the application (or any part thereof) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the service."
    },
    {
      title: "Limitation of Liability",
      icon: CheckCircle,
      color: "text-purple-500",
      content: "To the maximum extent permitted by law, Sheetsense and its contributors shall not be liable for any indirect, incidental, or consequential damages resulting from your use or inability to use the application."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
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
          <Scale className="text-blue-600 dark:text-blue-400" size={40} />
          Terms of Service
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg">
          Please read these terms carefully before using Sheetsense.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 ${section.color}`}>
                <section.icon size={24} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{section.title}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl">
        <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">Governing Law</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          These terms are governed by and construed in accordance with the laws of your jurisdiction. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the local courts.
        </p>
        <p className="text-xs text-slate-400 mt-6 italic">
          Last Updated: {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
};
