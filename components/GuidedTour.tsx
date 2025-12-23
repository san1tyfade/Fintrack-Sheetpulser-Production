
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, TourStep } from '../types';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface GuidedTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onStepChange: (view: ViewState) => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ steps, onComplete, onStepChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 0, arrowSide: 'left' });
  const step = steps[currentStep];

  useEffect(() => {
    // Navigate to the view required for this step
    onStepChange(step.view);

    // Position the bubble relative to the target element
    const updatePosition = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            setBubblePos({ 
                top: rect.top - 160, 
                left: window.innerWidth / 2, 
                arrowSide: 'bottom' 
            });
        } else {
            setBubblePos({ 
                top: rect.top + rect.height / 2, 
                left: rect.right + 20, 
                arrowSide: 'left' 
            });
        }
      }
    };

    // Small delay to let view transition and DOM update
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePosition);
    };
  }, [currentStep, step.targetId, step.view, onStepChange]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dimmed Overlay */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] pointer-events-auto" onClick={onComplete}></div>
      
      {/* Bubble Tooltip */}
      <div 
        className={`absolute w-[320px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border-2 border-blue-500/50 pointer-events-auto transition-all duration-300 ease-out animate-in zoom-in-95
            ${bubblePos.arrowSide === 'bottom' ? '-translate-x-1/2' : '-translate-y-1/2'}`}
        style={{ top: bubblePos.top, left: bubblePos.left }}
      >
        {/* Arrow */}
        <div className={`absolute w-4 h-4 bg-white dark:bg-slate-800 border-2 border-blue-500/50 rotate-45 
            ${bubblePos.arrowSide === 'left' ? '-left-2.5 top-1/2 -translate-y-1/2 border-r-0 border-t-0' : 
              bubblePos.arrowSide === 'bottom' ? '-bottom-2.5 left-1/2 -translate-x-1/2 border-l-0 border-t-0' : ''}`}>
        </div>

        <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Sparkles size={16} className="animate-pulse" />
                <h4 className="font-bold text-sm uppercase tracking-wider">{step.title}</h4>
             </div>
             <button onClick={onComplete} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={16} />
             </button>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
            {step.content}
        </p>

        <div className="flex items-center justify-between">
            <div className="flex gap-1">
                {steps.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentStep ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
            </div>
            <div className="flex gap-2">
                {currentStep > 0 && (
                    <button 
                        onClick={handlePrev}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                )}
                <button 
                    onClick={handleNext}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                    {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                    {currentStep < steps.length - 1 && <ChevronRight size={14} />}
                </button>
            </div>
        </div>
      </div>

      {/* Pulsing Target Highlight */}
      <div 
        className="absolute pointer-events-none transition-all duration-300 border-2 border-blue-500 rounded-xl animate-pulse"
        style={{
            ...(document.getElementById(step.targetId)?.getBoundingClientRect() ? {
                top: (document.getElementById(step.targetId)?.getBoundingClientRect().top || 0) - 4,
                left: (document.getElementById(step.targetId)?.getBoundingClientRect().left || 0) - 4,
                width: (document.getElementById(step.targetId)?.getBoundingClientRect().width || 0) + 8,
                height: (document.getElementById(step.targetId)?.getBoundingClientRect().height || 0) + 8,
            } : { opacity: 0 })
        }}
      />
    </div>
  );
};
