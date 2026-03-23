'use client';

import React from 'react';
import { ConsoleSidebar } from '@/components/console/console-sidebar';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {


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
