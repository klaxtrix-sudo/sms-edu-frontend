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

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      } else if (process.env.NODE_ENV === 'development') {
        // Mock profile for Dev PoC
        setProfile({
          id: 'a0000000-0000-0000-0000-000000000000',
          onboarding_completed: false
        });
      }
      setIsProfileLoading(false);
    }
    fetchProfile();
  }, []);

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
    { label: "Staff", href: "/dashboard/admin/users/staff", icon: "UserCog" },
    { label: "Attendance Intel", href: "/dashboard/admin/attendance", icon: "ClipboardCheck" },
    { label: "Executive Analytics", href: "/dashboard/admin/analytics", icon: "BarChart3" },
    { label: "Global Communications", href: "/dashboard/admin/communications", icon: "Megaphone" },
    { label: "MCQ Exams", href: "/dashboard/admin/exams", icon: "ClipboardList" },
    { label: "Academic Results", href: "/dashboard/admin/academics/results", icon: "CheckSquare" },
    { label: "Fee Management", href: "/dashboard/admin/finance", icon: "CreditCard" },
    { label: "Settings", href: "/dashboard/admin/settings", icon: "Settings" },
  ] as const;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[10px] font-black uppercase text-cyan-500 tracking-[0.3em] animate-pulse">Syncing Protocols...</p>
        </div>
      </div>
    );
  }

  // Prevent layout flash if setup is incomplete (redirection will happen in useEffect)
  if (tenant && !tenant.isSetupCompleted && !pathname.includes('/setup')) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {profile && !profile.onboarding_completed && !isProfileLoading && (
        <ProductTour userId={profile.id} />
      )}
      <Sidebar items={adminNavItems} role="Admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
