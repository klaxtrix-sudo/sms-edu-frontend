'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Globe, ArrowLeft, RefreshCcw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface NodeOfflineViewProps {
  subdomain: string;
}

export function NodeOfflineView({ subdomain }: NodeOfflineViewProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
      {/* Visual Indicator */}
      <div className="relative flex justify-center py-6">
        <div className="absolute inset-0 bg-red-500/10 blur-[60px] rounded-full -z-10 animate-pulse-slow" />
        <div className="size-20 rounded-3xl bg-[#0c0c0c] border border-red-500/30 flex items-center justify-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-red-500/5 to-transparent opacity-50" />
          <ShieldAlert className="size-10 text-red-500 animate-in slide-in-from-bottom-2 duration-1000" />
        </div>
      </div>

      {/* Message Content */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest mb-2 shadow-inner">
           <Globe className="size-3" /> Node Disconnected / Unavailable
        </div>
        
        <p className="text-xs font-black text-black uppercase tracking-widest leading-relaxed">
          The requested institutional node <span className="text-red-600 underline decoration-red-600/30 underline-offset-4 decoration-2 italic">"{subdomain}"</span> is currently unreachable.
        </p>
      </div>

      {/* Primary Actions */}
      <div className="flex justify-center pt-4">
        <Link href="http://localhost:3000">
          <Button className="h-12 px-10 bg-black hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest gap-3 transition-all rounded-xl shadow-xl hover:shadow-2xl active:scale-[0.98]">
             <ArrowLeft className="size-4" /> Return to Core Hub
          </Button>
        </Link>
      </div>

      {/* Security Footer */}
      <p className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest opacity-60">
        System Guard Protocols Enforced
      </p>
    </div>
  );
}
