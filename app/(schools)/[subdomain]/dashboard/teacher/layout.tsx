import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createServerClient } from "@/lib/supabase/server";
import { resolveTenantKeys } from "@/lib/supabase/tenant-resolver";
import OnboardingGate from "@/components/dashboard/onboarding-gate";
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
      <div className="flex min-h-screen">
        <Sidebar items={teacherNavItems} role="Teacher" />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-8 lg:p-12 bg-background">
            {children}
          </main>
        </div>
      </div>
    </OnboardingGate>
  );
}
