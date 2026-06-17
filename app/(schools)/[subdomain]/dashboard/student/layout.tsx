'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createClient } from '@/lib/supabase/client';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      if (!tenant?.supabaseUrl || !tenant?.supabaseAnonKey) return;

      const supabase = createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      // Check if account is active
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', user.id)
        .single();

      if (profile && !(profile as any).is_active) {
        window.location.href = '/dashboard/suspended';
        return;
      }

      setIsAuthorized(true);
      setIsAuthChecking(false);
    }

    if (!isTenantLoading && tenant) {
      checkAuth();
    }
  }, [tenant, isTenantLoading, router]);

  const studentNavItems: readonly SidebarItem[] = [
    { label: "Overview", href: "/dashboard/student", icon: "LayoutDashboard" },
    { label: "My Timetable", href: "/dashboard/student/timetable", icon: "CalendarDays" },
    { label: "My Assignments", href: "/dashboard/student/assignments", icon: "BookOpen" },
    { label: "My Exams", href: "/dashboard/student/exams", icon: "ClipboardList" },
  ];

  if (isTenantLoading || isAuthChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-widest animate-pulse">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Mobile Sidebar Overlay/Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar items={studentNavItems} role="Student" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background flex flex-col min-h-0">
          <div className="flex-1 p-4 md:p-8 lg:p-12">
            {children}
          </div>
          <footer className="py-4 text-center select-none">
            <p className="text-[11px] text-foreground/70 leading-relaxed">
              © {new Date().getFullYear()} Klaxtrix SMS &mdash; School Management System. All rights reserved.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
