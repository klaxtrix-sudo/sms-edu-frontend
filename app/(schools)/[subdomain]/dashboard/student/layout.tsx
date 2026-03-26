import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
