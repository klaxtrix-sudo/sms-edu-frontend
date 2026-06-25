'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { completeOnboarding } from '@/app/actions/admin-actions';
import { cn } from '@/lib/utils';

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: 'right' | 'bottom' | 'top' | 'left';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'sidebar-overview',
    title: 'Dashboard',
    content: 'Here\'s your dashboard. See student enrollment, growth trends, and daily stats at a glance.',
    position: 'right',
  },
  {
    targetId: 'sidebar-teachers',
    title: 'Teachers',
    content: 'Manage your teachers here. Add new teachers, see their classes, and update their login details.',
    position: 'right',
  },
  {
    targetId: 'sidebar-classes-&-subjects',
    title: 'Classes & Subjects',
    content: 'Set up your classes and subjects here, then assign subjects to each class.',
    position: 'right',
  },
  {
    targetId: 'sidebar-academic-timetable',
    title: 'Timetable',
    content: 'Build the weekly timetable for all your classes and subjects.',
    position: 'right',
  },
  {
    targetId: 'sidebar-students',
    title: 'Students',
    content: 'Enroll new students, manage their profiles, and follow their progress.',
    position: 'right',
  },
];

export function ProductTour({ userId, subdomain }: { userId: string; subdomain: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const updatePosition = () => {
      const target = document.getElementById(TOUR_STEPS[currentStep].targetId);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      }
    };

    // Initial position
    updatePosition();
    
    // Polling for position (handles cases where the target might take time to render)
    const interval = setInterval(updatePosition, 500);

    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearInterval(interval);
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsVisible(false);
    // Persist locally immediately so the tour never re-appears in the same session
    if (typeof window !== 'undefined') {
      localStorage.setItem(`klaxtrix_tour_done_${userId}`, 'true');
    }
    await completeOnboarding(userId, subdomain);
  };

  // Skip immediately if already dismissed in this browser (localStorage fast-path)
  const alreadyDone = typeof window !== 'undefined'
    && !!localStorage.getItem(`klaxtrix_tour_done_${userId}`);

  if (!isVisible || !targetRect || alreadyDone) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dimmed Overlay with Hole */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-[1px]"
        style={{
          clipPath: `polygon(
            0% 0%, 0% 100%, 
            ${targetRect.left - 4}px 100%, 
            ${targetRect.left - 4}px ${targetRect.top - 4}px, 
            ${targetRect.right + 4}px ${targetRect.top - 4}px, 
            ${targetRect.right + 4}px ${targetRect.bottom + 4}px, 
            ${targetRect.left - 4}px ${targetRect.bottom + 4}px, 
            ${targetRect.left - 4}px 100%, 
            100% 100%, 100% 0%
          )`
        }}
        onClick={handleFinish}
      />

      {/* Animated Focus Ring */}
      <motion.div
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          left: targetRect.left - 8,
          top: targetRect.top - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16
        }}
        className="absolute border-2 border-primary rounded-xl z-[10000] pointer-events-none shadow-[0_0_20px_rgba(59,130,246,0.5)]"
      >
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-[-4px] border-4 border-primary/30 rounded-[14px]" 
        />
      </motion.div>

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10, x: targetRect.right + 24 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            x: targetRect.right + 24,
            top: Math.min(targetRect.top, typeof window !== 'undefined' ? window.innerHeight - 300 : targetRect.top)
          }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute w-80 pointer-events-auto p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-200 bg-white rounded-2xl z-[10001]"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/80">
                Onboarding Portal • {currentStep + 1}/{TOUR_STEPS.length}
              </span>
              <button 
                onClick={handleFinish}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Skip Tour"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">{step.title}</h3>
              <p className="text-[14px] text-slate-600 leading-relaxed font-medium">
                {step.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button 
                onClick={handleFinish}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
              >
                Skip 
              </button>
              <Button 
                size="sm" 
                onClick={handleNext}
                className="gap-2 px-6 h-10 rounded-xl shadow-lg shadow-primary/20 bg-primary font-bold hover:scale-105 transition-all text-white border-0"
              >
                {currentStep === TOUR_STEPS.length - 1 ? (
                  <>Finish <Check className="size-4" /></>
                ) : (
                  <>Next <ChevronRight className="size-4" /></>
                )}
              </Button>
            </div>
          </div>

          {/* Connected Arrow Pin */}
          <div className="absolute top-8 -left-2 size-4 bg-white border-l-2 border-t-2 border-primary/20 rotate-[-45deg] shadow-[-10px_-10px_20px_rgba(0,0,0,0.1)]" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
