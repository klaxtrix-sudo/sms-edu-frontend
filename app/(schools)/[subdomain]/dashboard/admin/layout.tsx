'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { ProductTour } from '@/components/dashboard/product-tour';
import { createClient } from '@/lib/supabase/client';
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { hasPermission } from '@/lib/permissions';

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
    let activeChannel: any = null;

    async function fetchProfile() {
      if (!tenant?.supabaseUrl || !tenant?.supabaseAnonKey) return;
      const supabase = createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, onboarding_completed, is_active, is_super_admin, permissions, custom_role_title')
          .eq('id', user.id)
          .single();

        if (data && data.is_active === false) {
          toast.error("Your account has been suspended by a Super Administrator.");
          window.location.href = '/dashboard/suspended';
          return;
        }

        setProfile(data);

        // Realtime Subscription: Instant Session Invalidation & Permission Synchronization
        activeChannel = supabase
          .channel(`profile-realtime-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              const updated = payload.new as any;
              if (updated.is_active === false) {
                toast.error("Your administrator account has been suspended by a Super Administrator.");
                window.location.href = '/dashboard/suspended';
                return;
              }

              toast.info("Your institutional role or permissions have been updated.");
              setProfile(updated);
            }
          )
          .subscribe();
      }
      setIsProfileLoading(false);
    }

    fetchProfile();

    return () => {
      if (activeChannel) {
        const supabase = createClient(tenant?.supabaseUrl || '', tenant?.supabaseAnonKey || '');
        supabase.removeChannel(activeChannel);
      }
    };
  }, [tenant?.supabaseUrl, tenant?.supabaseAnonKey]);

  useEffect(() => {
    if (!isLoading && tenant && !tenant.isSetupCompleted && !pathname.includes('/setup')) {
      console.log(`[Klaxtrix] Institutional setup incomplete for "${tenant.name}". Redirecting to onboarding wizard.`);
      router.push('/dashboard/setup');
    }
  }, [tenant, isLoading, pathname, router]);

  const allAdminNavItems: readonly SidebarItem[] = useMemo(() => [
    { label: "Overview", href: "/dashboard/admin", icon: "LayoutDashboard" },
    { label: "Teachers", href: "/dashboard/admin/users/teachers", icon: "Users", module: "teachers" },
    { label: "Classes & Subjects", href: "/dashboard/admin/academics", icon: "BookOpen", module: "academics" },
    { label: "Timetable", href: "/dashboard/admin/academics/timetable", icon: "CalendarDays", module: "academics" },
    { label: "Students", href: "/dashboard/admin/users/students", icon: "GraduationCap", module: "students" },
    { label: "Parents", href: "/dashboard/admin/users/parents", icon: "Users", module: "parents" },
    { label: "Attendance", href: "/dashboard/admin/attendance", icon: "ClipboardCheck", module: "attendance" },
    { label: "Analytics", href: "/dashboard/admin/analytics", icon: "BarChart3", module: "analytics" },
    { label: "Announcements", href: "/dashboard/admin/communications", icon: "Megaphone", module: "communications" },
    { label: "Exams", href: "/dashboard/admin/exams", icon: "ClipboardList", module: "exams" },
    { label: "Results", href: "/dashboard/admin/academics/results", icon: "CheckSquare", module: "results" },
    { label: "Promotions", href: "/dashboard/admin/academics/promotions", icon: "Award", module: "students" },
    { label: "Fee Management", href: "/dashboard/admin/finance", icon: "CreditCard", module: "finance" },
    { label: "Administrators", href: "/dashboard/admin/users/admins", icon: "UserCog", module: "admins" },
    { label: "Settings", href: "/dashboard/admin/settings", icon: "Settings", module: "settings" },
  ], []);

  // Determine permissions
  const isSuperAdmin = profile?.is_super_admin ?? true;
  const userPermissions: string[] = useMemo(() => profile?.permissions ?? ['*'], [profile]);

  // Filter sidebar navigation items based on permissions
  const filteredNavItems = useMemo(() => {
    if (isProfileLoading || isSuperAdmin || userPermissions.includes('*')) {
      return allAdminNavItems;
    }
    return allAdminNavItems.filter((item) => {
      if (!item.module) return true; // Overview is accessible to any admin
      return hasPermission(userPermissions, item.module) || hasPermission(userPermissions, `${item.module}:read`);
    });
  }, [allAdminNavItems, isProfileLoading, isSuperAdmin, userPermissions]);

  // Route Permission Guard
  const getRequiredModuleForPath = (path: string): string | null => {
    if (path.includes('/dashboard/admin/finance')) return 'finance';
    if (path.includes('/dashboard/admin/academics/results')) return 'results';
    if (path.includes('/dashboard/admin/academics/promotions')) return 'students';
    if (path.includes('/dashboard/admin/academics')) return 'academics';
    if (path.includes('/dashboard/admin/exams')) return 'exams';
    if (path.includes('/dashboard/admin/users/teachers')) return 'teachers';
    if (path.includes('/dashboard/admin/users/students')) return 'students';
    if (path.includes('/dashboard/admin/users/parents')) return 'parents';
    if (path.includes('/dashboard/admin/users/admins')) return 'admins';
    if (path.includes('/dashboard/admin/attendance')) return 'attendance';
    if (path.includes('/dashboard/admin/analytics')) return 'analytics';
    if (path.includes('/dashboard/admin/communications')) return 'communications';
    if (path.includes('/dashboard/admin/settings')) return 'settings';
    return null;
  };

  const requiredModule = getRequiredModuleForPath(pathname);
  const isAccessDenied = !isProfileLoading && !isSuperAdmin && !userPermissions.includes('*') && requiredModule && !hasPermission(userPermissions, requiredModule) && !hasPermission(userPermissions, `${requiredModule}:read`);

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

      <Sidebar 
        items={filteredNavItems} 
        role="Admin" 
        customRoleTitle={profile?.custom_role_title}
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background custom-scrollbar flex flex-col min-h-0">
          <div className="flex-1 p-4 md:p-8 lg:p-12">
            {isAccessDenied ? (
              <div className="max-w-md mx-auto my-12 p-8 glass-card border border-destructive/20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Access Restricted</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your administrator account ({profile?.custom_role_title || 'Sub-Admin'}) does not have permission to access the <strong className="text-foreground capitalize">{requiredModule}</strong> module.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Please contact your school&apos;s Super Administrator if you require access to this section.
                  </p>
                </div>
                <div className="pt-2">
                  <Button asChild className="w-full h-11 gap-2 font-semibold">
                    <Link href="/dashboard/admin">
                      <ArrowLeft className="w-4 h-4" />
                      Return to Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              children
            )}
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
