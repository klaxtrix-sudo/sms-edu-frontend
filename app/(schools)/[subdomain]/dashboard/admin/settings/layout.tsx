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
  ChevronRight 
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
    description: 'Access and audit logs',
    href: '/dashboard/admin/settings/security',
    icon: ShieldCheck,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-heading font-extrabold tracking-tight text-slate-900 drop-shadow-sm flex items-center gap-3">
          <Settings className="w-10 h-10 text-blue-600" />
          Settings
        </h1>
        <p className="text-slate-500 font-medium">
          Manage your school profile, academic year, and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Settings Navigation */}
        <div className="glass-panel p-4 rounded-[2rem] space-y-2">
          {settingsLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg scale-[1.02]" 
                    : "hover:bg-blue-50 text-slate-600"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors duration-300",
                  isActive ? "bg-white/20" : "bg-slate-100 group-hover:bg-white"
                )}>
                  <link.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-600")} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold">{link.title}</span>
                  <span className={cn(
                    "text-xs font-medium opacity-80",
                    isActive ? "text-blue-50" : "text-slate-400"
                  )}>
                    {link.description}
                  </span>
                </div>
                {isActive && (
                  <ChevronRight className="w-5 h-5 ml-auto self-center text-white/50" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="h-full min-h-[600px]">
          {children}
        </div>
      </div>
    </div>
  );
}
