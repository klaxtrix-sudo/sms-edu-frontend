'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ConsoleSidebar } from '@/components/console/console-sidebar';
import { useRouter } from 'next/navigation';
import { verifyConsoleSession } from '@/lib/console-auth';
import { Loader2, Shield, Menu, X } from 'lucide-react';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Guard: run exactly once on mount — router is intentionally excluded from deps
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkAuth = async () => {
      try {
        // verifyConsoleSession now resolves backend URL internally
        const { success } = await verifyConsoleSession();
        
        if (!success) {
          router.push('/console');
          return;
        }
        // Small buffer to absorb Next.js on-demand compilation lag
        // Prevents white 404 screen on fresh cache loads
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsVerifying(false);
      } catch (err) {
        setError('Security Protocol Failure. Re-authenticating...');
        setTimeout(() => router.push('/console'), 2000);
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isVerifying) {
    return (
      <div className="h-screen w-full bg-[#050505] flex items-center justify-center flex-col gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin" />
          <Loader2 className="w-8 h-8 text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em]">Establishing Secure Link</p>
          {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-bounce">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Mobile Sidebar Overlay/Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Executive Sidebar */}
      <ConsoleSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800/50 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Shield className="w-5 h-5" />
             </div>
             <h1 className="text-sm font-black tracking-tighter text-slate-100">KLAXTRIX</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 blur-[100px] -z-10 rounded-full" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
