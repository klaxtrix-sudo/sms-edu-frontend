'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { useTenant } from '@/components/providers/tenant-provider';
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
import { LogOut, Moon, Sun, Monitor, Menu } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth-actions';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { tenant } = useTenant();

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

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between px-4 md:px-8 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
    </header>
  );
}
