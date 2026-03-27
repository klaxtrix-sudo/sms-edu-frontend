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
    title: 'Command Center',
    content: 'This is your mission control. Monitor student enrollment, academic growth trends, and daily school metrics at a glance.',
    position: 'right',
  },
  {
    targetId: 'sidebar-teachers',
    title: 'Professional Personnel',
    content: 'Manage your faculty records here. Add new teachers, track their assignments, and manage their portal credentials.',
    position: 'right',
  },
  {
    targetId: 'sidebar-classes-&-subjects',
    title: 'Academic Structure',
    content: 'Define your classes and subjects. This is the foundation where sections are created and subjects are assigned to levels.',
    position: 'right',
  },
  {
    targetId: 'sidebar-academic-timetable',
    title: 'Master Scheduling',
    content: 'Organize the school pulse. Create and manage the weekly lecture schedules for all classes and subjects.',
    position: 'right',
  },
  {
    targetId: 'sidebar-students',
    title: 'Student Lifecycle',
    content: 'The heart of your school. Enroll new students, manage student profiles, and track their academic journey.',
    position: 'right',
  },
];

export function ProductTour({ userId }: { userId: string }) {
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
    await completeOnboarding(userId);
  };

  if (!isVisible || !targetRect) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dimmed Overlay with Hole */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 pointer-events-auto"
        style={{
          clipPath: `polygon(
            0% 0%, 0% 100%, 
            ${targetRect.left - 5}px 100%, 
            ${targetRect.left - 5}px ${targetRect.top - 5}px, 
            ${targetRect.right + 5}px ${targetRect.top - 5}px, 
            ${targetRect.right + 5}px ${targetRect.bottom + 5}px, 
            ${targetRect.left - 5}px ${targetRect.bottom + 5}px, 
            ${targetRect.left - 5}px 100%, 
            100% 100%, 100% 0%
          )`
        }}
        onClick={handleFinish}
      />

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, x: targetRect.right + 20, y: targetRect.top }}
          animate={{ opacity: 1, scale: 1, x: targetRect.right + 20, y: targetRect.top }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="absolute w-80 pointer-events-auto p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-primary/20 bg-white rounded-2xl"
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
