'use client';

import React, { useEffect } from 'react';
import { ConsoleSidebar } from '@/components/console/console-sidebar';
import { useTenant } from '@/components/providers/tenant-provider';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenant, isLoading } = useTenant();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && tenant && !tenant.isSetupCompleted && !pathname.includes('/setup')) {
      console.log(`[Klaxtrix] Setup incomplete for ${tenant.name}. Redirecting to synchronization wizard.`);
      router.push('/console/setup');
    }
  }, [tenant, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="size-8 text-cyan-500 animate-spin" />
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
