'use client';

import React, { useState, useEffect } from 'react';
import { ConsoleSidebar } from './console-sidebar';
import { Menu, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] bg-[#050505] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Responsive Console Sidebar */}
      <ConsoleSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        {/* Mobile Header Bar (< lg) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800/50 bg-[#0a0a0a]/90 backdrop-blur-md z-30 shrink-0">
          <Link href="/console/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-sm text-slate-100 tracking-tight">KLAXTRIX CONSOLE</span>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] -z-10 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 blur-[100px] -z-10 rounded-full pointer-events-none" />

        <div className="flex-1 overflow-y-auto custom-scrollbar touch-scroll p-3.5 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
