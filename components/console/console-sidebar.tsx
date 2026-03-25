'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { clearConsoleToken } from '@/lib/console-auth';
import { toast } from 'sonner';
import { 
  Shield, 
  LayoutDashboard, 
  Globe, 
  Key, 
  Server, 
  Users, 
  Activity, 
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'overview', title: 'Operations Hub', icon: LayoutDashboard, href: '/console/dashboard' },
  { id: 'tenants', title: 'Institutional Nodes', icon: Globe, href: '/console/tenants' },
  { id: 'access', title: 'Access', icon: Key, href: '/console/access' },
  { id: 'infrastructure', title: 'Cloud Matrix', icon: Server, href: '/console/infrastructure' },
  { id: 'analytics', title: 'Global Pulse', icon: Activity, href: '/console/analytics' },
];

export function ConsoleSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearConsoleToken();
    toast.info('Orbital Link Severed', {
      description: 'Session terminated. Access denied.'
    });
    router.push('/console');
  };

  return (
    <aside className="w-72 border-r border-slate-800/50 bg-[#0a0a0a] flex flex-col">
      <div className="p-8 border-b border-slate-800/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold tracking-tight text-slate-100 italic">KLAXTRIX</h1>
            <p className="text-[10px] font-bold text-cyan-500 tracking-[0.2em] uppercase">Executive Guard</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        <div className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mb-4 px-3">Primary Systems</div>
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group",
              pathname === item.href 
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/30 border border-transparent"
            )}
          >
            <div className="flex items-center gap-3 text-sm font-semibold">
              <item.icon className={cn(
                "w-5 h-5 transition-transform",
                pathname === item.href ? "scale-110" : "group-hover:scale-110"
              )} />
              {item.title}
            </div>
            {pathname === item.href && (
              <ChevronRight className="w-4 h-4 animate-pulse" />
            )}
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800/50 space-y-4">
        <button className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-100 w-full transition-colors">
          <Settings className="w-5 h-5" />
          Console Config
        </button>
        <div 
          onClick={handleLogout}
          className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between group cursor-pointer hover:bg-red-500/10 transition-all active:scale-95"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-sm font-bold text-red-200">Terminate</span>
          </div>
          <Badge variant="outline" className="text-[9px] border-red-500/20 text-red-400">Secure</Badge>
        </div>
      </div>
    </aside>
  );
}

function Badge({ children, className, variant = "default" }: any) {
  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
      variant === "outline" ? "border" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </span>
  );
}
