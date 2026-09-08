'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { useTenant } from '@/components/providers/tenant-provider';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Moon, Sun, Monitor, Menu, Calendar } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth-actions';
import { ThemeToggle } from '@/components/shared/theme-toggle';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { tenant, academicCycle, holidays } = useTenant();

  const handleSignOut = async () => {
    await signOutAction(tenant?.subdomain || '');
    // Hard reload — must use window.location.href, not router.push().
    // router.push() is a soft navigation (RSC fetch) and races against
    // cookie updates, causing 404 or session persistence on the login page.
    window.location.href = '/login';
  };

  // Safe fallback if tenant is somehow null during SSR/hydration
  const schoolName = tenant?.name || 'School';
  const initial = schoolName.charAt(0).toUpperCase();

  const todayHoliday = React.useMemo(() => {
    if (!holidays || holidays.length === 0) return undefined;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    return holidays.find((h) => {
      const s = h.start_date.split("T")[0];
      const e = h.end_date.split("T")[0];
      return todayStr >= s && todayStr <= e;
    });
  }, [holidays]);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between px-4 md:px-8 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-colors">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden" 
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {academicCycle && (
        <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 rounded-full bg-accent/40 border border-border/60 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>
              {academicCycle.academicYear} • Term {academicCycle.currentTerm}
            </span>
          </div>

          <span className="h-4 w-px bg-border/60" />

          <div className="flex items-center gap-2">
            {todayHoliday ? (
              <span className={cn(
                "px-3 py-1 border rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm",
                todayHoliday.holiday_type === "mid_term_break"
                  ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                  : "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
              )}>
                <span>{todayHoliday.holiday_type === "mid_term_break" ? "🎒" : "🎉"}</span>
                <span>{todayHoliday.name}</span>
              </span>
            ) : academicCycle.currentWeek ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Week {academicCycle.currentWeek}
              </div>
            ) : (
              <span className="px-3 py-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                Holiday / Break
              </span>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-xl focus-visible:ring-1 focus-visible:ring-ring">
              <Avatar className="h-10 w-10 border border-border shadow-sm">
                <AvatarImage src={tenant?.logoUrl} alt={schoolName} className="object-contain p-1" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{initial}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1 text-sm">
              <p className="font-medium leading-none truncate">{schoolName}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {tenant?.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Theme
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer gap-2">
            <Sun className="h-4 w-4" />
            <span>Light</span>
            {theme === 'light' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer gap-2">
            <Moon className="h-4 w-4" />
            <span>Dark</span>
            {theme === 'dark' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer gap-2">
            <Monitor className="h-4 w-4" />
            <span>System</span>
            {theme === 'system' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
);
}
