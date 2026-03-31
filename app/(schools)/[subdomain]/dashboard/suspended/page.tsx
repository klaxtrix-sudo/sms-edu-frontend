'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, LogOut, Mail, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/app/actions/auth-actions';
import { useParams } from 'next/navigation';

export default function SuspendedPage() {
  const { subdomain } = useParams();

  const handleSignOut = async () => {
    await signOutAction(subdomain as string);
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 select-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-red-500 p-10 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
              <div className="size-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30 animate-pulse">
                <ShieldAlert className="size-10 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-center leading-tight">Access Restricted</h1>
              <p className="text-red-100/80 text-[10px] uppercase font-black mt-2 tracking-[0.2em]">Institutional Security Protocol</p>
            </div>
            
            {/* Background elements */}
            <div className="absolute -right-10 -bottom-10 size-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
          </div>

          {/* Body */}
          <div className="p-10 space-y-8">
            <div className="space-y-4 text-center">
              <p className="text-slate-600 font-medium leading-relaxed">
                Your account access has been <span className="text-red-500 font-black">suspended</span> by the school administration. 
                This may be due to administrative updates, security reviews, or institutional policy adjustments.
              </p>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 inline-flex items-center gap-3">
                <HelpCircle className="size-4 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 italic">Please contact your administrator for restoration steps.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4">
              <Button 
                onClick={() => window.location.href = 'mailto:support@klaxtrix.com'}
                className="h-14 rounded-2xl bg-slate-900 font-bold text-white hover:scale-[1.02] transition-transform shadow-lg shadow-slate-200"
              >
                <Mail className="size-4 mr-2" /> Contact Administration
              </Button>
              
              <Button 
                onClick={handleSignOut}
                variant="outline"
                className="h-14 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:text-red-500 hover:border-red-500/20"
              >
                <LogOut className="size-4 mr-2" /> End Current Session
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-loose">
          Powerd by Klaxtrix SMS &mdash; Secure Core v2.0<br/>
          &copy; {new Date().getFullYear()} All Rights Reserved
        </p>
      </motion.div>
    </div>
  );
}
