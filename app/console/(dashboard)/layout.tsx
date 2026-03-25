'use client';

import React, { useEffect, useState } from 'react';
import { ConsoleSidebar } from '@/components/console/console-sidebar';
import { useRouter } from 'next/navigation';
import { getBackendUrl } from '@/lib/utils';
import { verifyConsoleSession } from '@/lib/console-auth';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const backendUrl = getBackendUrl();
        const { valid } = await verifyConsoleSession(backendUrl);
        
        if (!valid) {
          router.push('/console');
          return;
        }
        setIsVerifying(false);
      } catch (err) {
        setError('Security Protocol Failure. Re-authenticating...');
        setTimeout(() => router.push('/console'), 2000);
      }
    };

    checkAuth();
  }, [router]);

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
      {/* Executive Sidebar */}
      <ConsoleSidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 blur-[100px] -z-10 rounded-full" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
