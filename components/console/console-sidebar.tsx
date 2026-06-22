'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { consoleLogout } from '@/app/actions/console-actions';
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
  ChevronRight,
  X
} from 'lucide-react';

interface ConsoleSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const MENU_ITEMS = [
  { id: 'overview', title: 'Dashboard', icon: LayoutDashboard, href: '/console/dashboard' },
  { id: 'tenants', title: 'Schools', icon: Globe, href: '/console/tenants' },
  { id: 'access', title: 'Access Codes', icon: Key, href: '/console/access' },
  { id: 'infrastructure', title: 'Infrastructure', icon: Server, href: '/console/infrastructure' },
  { id: 'analytics', title: 'Analytics', icon: Activity, href: '/console/analytics' },
];

export function ConsoleSidebar({ isOpen, onClose }: ConsoleSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    toast.info('Signed out', {
      description: 'You have been securely logged out.'
    });
    await consoleLogout();
  };

  return (
    <aside className={cn(
      "w-72 border-r border-slate-800/50 bg-[#0a0a0a] flex flex-col transition-transform duration-300 z-50",
      "lg:translate-x-0 lg:static fixed inset-y-0 left-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-8 border-b border-slate-800/50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold tracking-tight text-slate-100">KLAXTRIX</h1>
          </div>
        </Link>
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg bg-slate-800/50 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-6 space-y-2">
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
        <Link 
          href="/console/config"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all rounded-xl",
            pathname === "/console/config" 
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.3)]"
              : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/30 border border-transparent"
          )}
        >
          <Settings className={cn("w-5 h-5", pathname === "/console/config" && "text-indigo-400")} />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between group cursor-pointer hover:bg-red-500/10 transition-all active:scale-95"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-sm font-bold text-red-200">Log out</span>
          </div>
        </button>
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
