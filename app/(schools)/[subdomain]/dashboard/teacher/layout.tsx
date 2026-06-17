import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createServerClient } from "@/lib/supabase/server";
import { resolveTenantKeys } from "@/lib/supabase/tenant-resolver";
import OnboardingGate from "@/components/dashboard/onboarding-gate";
import { UserStatusGuard } from "@/components/dashboard/user-status-guard";
import { redirect } from "next/navigation";

export default async function TeacherLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { subdomain: string };
}) {
  const { subdomain } = params;

  // Resolve tenant-specific keys — the teacher JWT was issued by this tenant project,
  // so we MUST verify the session against the same project, not the master.
  const tenantKeys = await resolveTenantKeys(subdomain);
  if (!tenantKeys) {
    redirect("/login");
  }

  const supabase = createServerClient(tenantKeys.supabaseUrl, tenantKeys.supabaseAnonKey);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the profile to check for account suspension
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .single() as { data: { is_active: boolean } | null };

  if (profile && !profile.is_active) {
    redirect("/dashboard/suspended");
  }

  // Only teachers (and admins viewing as teacher) should access this layout.
  const role = user.user_metadata?.role;
  if (role !== "teacher" && role !== "admin") {
    redirect("/login");
  }

  const teacherNavItems: readonly SidebarItem[] = [
    { label: "Overview", href: "/dashboard/teacher", icon: "LayoutDashboard" },
    { label: "Class Attendance", href: "/dashboard/teacher/attendance", icon: "ClipboardCheck" },
    { label: "Weekly Timetable", href: "/dashboard/teacher/timetable", icon: "CalendarDays" },
    { label: "Homework Hub", href: "/dashboard/teacher/assignments", icon: "BookOpen" },
    // { label: "My Students", href: "/dashboard/teacher/students", icon: "Users" },
    // { label: "Exam Manager", href: "/dashboard/teacher/exams", icon: "ClipboardList" },
  ];

  return (
    <OnboardingGate user={user}>
      <UserStatusGuard userId={user.id} />
      <div className="flex min-h-screen relative overflow-hidden">
        <Sidebar items={teacherNavItems} role="Teacher" />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto bg-background flex flex-col min-h-0">
            <div className="flex-1 p-8 lg:p-12">
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
    </OnboardingGate>
  );
}
