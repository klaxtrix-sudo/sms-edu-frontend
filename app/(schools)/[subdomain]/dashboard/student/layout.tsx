import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  const studentNavItems: readonly SidebarItem[] = [
    { label: "Overview", href: "/dashboard/student", icon: "LayoutDashboard" },
    { label: "My Timetable", href: "/dashboard/student/timetable", icon: "CalendarDays" },
    { label: "My Assignments", href: "/dashboard/student/assignments", icon: "BookOpen" },
    { label: "My Exams", href: "/dashboard/student/exams", icon: "ClipboardList" },
    { label: "My Results", href: "/dashboard/student/results", icon: "GraduationCap" },
    { label: "Payments", href: "/dashboard/student/finance", icon: "CreditCard" },
    { label: "Settings", href: "/dashboard/student/settings", icon: "Settings" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar items={studentNavItems} role="Student" />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto bg-background flex flex-col min-h-0">
          <div className="flex-1 p-8 lg:p-12">
            {children}
          </div>
          <footer className="py-4 text-center select-none">
            <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
              © {new Date().getFullYear()} Klaxtrix SMS &mdash; School Management System. All rights reserved.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
