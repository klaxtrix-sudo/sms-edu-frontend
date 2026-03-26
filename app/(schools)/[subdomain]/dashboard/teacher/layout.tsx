import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacherNavItems: readonly SidebarItem[] = [
    { label: "Overview", href: "/dashboard/teacher", icon: "LayoutDashboard" },
    { label: "Class Attendance", href: "/dashboard/teacher/attendance", icon: "ClipboardCheck" },
    { label: "Weekly Timetable", href: "/dashboard/teacher/timetable", icon: "CalendarDays" },
    { label: "Homework Hub", href: "/dashboard/teacher/assignments", icon: "BookOpen" },
    // { label: "My Students", href: "/dashboard/teacher/students", icon: "Users" },
    // { label: "Exam Manager", href: "/dashboard/teacher/exams", icon: "ClipboardList" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar items={teacherNavItems} role="Teacher" />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
