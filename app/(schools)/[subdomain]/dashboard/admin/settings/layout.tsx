'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Settings, 
  Building2, 
  BookOpen, 
  Zap, 
  ShieldCheck, 
  ChevronRight,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsLinks = [
  {
    title: 'General',
    description: 'School profile and branding',
    href: '/dashboard/admin/settings/general',
    icon: Building2,
  },
  {
    title: 'Academic',
    description: 'Terms, sessions and grading',
    href: '/dashboard/admin/settings/academic',
    icon: BookOpen,
  },
  {
    title: 'Integrations',
    description: 'SMS, Payments and Email',
    href: '/dashboard/admin/settings/integrations',
    icon: Zap,
  },
  {
    title: 'Security',
    description: 'Access and authentication',
    href: '/dashboard/admin/settings/security',
    icon: ShieldCheck,
  },
  {
    title: 'Audit Trail',
    description: 'Activity & governance logs',
    href: '/dashboard/admin/settings/audit-logs',
    icon: History,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 sm:gap-8 h-full">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold tracking-tight text-foreground drop-shadow-sm flex items-center gap-2.5 sm:gap-3">
          <Settings className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-primary shrink-0" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base font-medium">
          Manage your school profile, academic year, and integrations.
        </p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 items-start">
        {/* Settings Navigation: horizontal scrolling bar on mobile, rich vertical panel on desktop */}
        <div className="glass-panel p-2 sm:p-3 lg:p-4 rounded-2xl lg:rounded-[2rem] border border-border/60 bg-card/60 w-full flex lg:flex-col overflow-x-auto no-scrollbar gap-2 touch-scroll">
          {settingsLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group flex items-center lg:items-start gap-3 p-2.5 sm:p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all duration-300 shrink-0",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg scale-[1.01]" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg lg:rounded-xl transition-colors duration-300 shrink-0",
                  isActive ? "bg-white/20 text-white" : "bg-muted group-hover:bg-card text-muted-foreground"
                )}>
                  <link.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs sm:text-sm whitespace-nowrap lg:whitespace-normal">{link.title}</span>
                  <span className={cn(
                    "hidden lg:block text-xs font-medium opacity-80",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {link.description}
                  </span>
                </div>
                {isActive && (
                  <ChevronRight className="hidden lg:block w-5 h-5 ml-auto self-center text-primary-foreground/50" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="h-full min-h-[400px] w-full min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
