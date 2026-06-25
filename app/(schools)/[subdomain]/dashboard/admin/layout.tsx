'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { ProductTour } from '@/components/dashboard/product-tour';
import { createClient } from '@/lib/supabase/client';

import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, isLoading } = useTenant();
  const [profile, setProfile] = React.useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!tenant?.supabaseUrl || !tenant?.supabaseAnonKey) return;
      // Use tenant-specific Supabase client so we read from the correct project
      const supabase = createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, onboarding_completed')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setIsProfileLoading(false);
    }
    fetchProfile();
  }, [tenant]);

  useEffect(() => {
    if (!isLoading && tenant && !tenant.isSetupCompleted && !pathname.includes('/setup')) {
      console.log(`[Klaxtrix] Institutional setup incomplete for "${tenant.name}". Redirecting to onboarding wizard.`);
      router.push('/dashboard/setup');
    }
  }, [tenant, isLoading, pathname, router]);

  const adminNavItems: readonly SidebarItem[] = [
    { label: "Overview", href: "/dashboard/admin", icon: "LayoutDashboard" },
    { label: "Teachers", href: "/dashboard/admin/users/teachers", icon: "Users" },
    { label: "Classes & Subjects", href: "/dashboard/admin/academics", icon: "BookOpen" },
    { label: "Academic Timetable", href: "/dashboard/admin/academics/timetable", icon: "CalendarDays" },
    { label: "Students", href: "/dashboard/admin/users/students", icon: "GraduationCap" },
    { label: "Attendance Intel", href: "/dashboard/admin/attendance", icon: "ClipboardCheck" },
    { label: "Executive Analytics", href: "/dashboard/admin/analytics", icon: "BarChart3" },
    { label: "Announcements", href: "/dashboard/admin/communications", icon: "Megaphone" },
    { label: "MCQ Exams", href: "/dashboard/admin/exams", icon: "ClipboardList" },
    { label: "Academic Results", href: "/dashboard/admin/academics/results", icon: "CheckSquare" },
    { label: "Fee Management", href: "/dashboard/admin/finance", icon: "CreditCard" },
    { label: "Settings", href: "/dashboard/admin/settings", icon: "Settings" },
  ] as const;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-widest animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Prevent layout flash if setup is incomplete (redirection will happen in useEffect)
  if (tenant && !tenant.isSetupCompleted && !pathname.includes('/setup')) {
    return null;
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {profile && !profile.onboarding_completed && !isProfileLoading && tenant?.subdomain && (
        <ProductTour userId={profile.id} subdomain={tenant.subdomain} />
      )}
      
      {/* Mobile Sidebar Overlay/Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar items={adminNavItems} role="Admin" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background custom-scrollbar flex flex-col min-h-0">
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
