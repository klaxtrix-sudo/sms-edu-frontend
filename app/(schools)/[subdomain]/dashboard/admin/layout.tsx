import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminNavItems: readonly SidebarItem[] = [
    { label: "Overview", href: "/dashboard/admin", icon: "LayoutDashboard" },
    { label: "Executive Analytics", href: "/dashboard/admin/analytics", icon: "BarChart3" },
    { label: "Global Communications", href: "/dashboard/admin/communications", icon: "Megaphone" },
    { label: "Attendance Intel", href: "/dashboard/admin/attendance", icon: "ClipboardCheck" },
    { label: "Teachers", href: "/dashboard/admin/users/teachers", icon: "Users" },
    { label: "Students", href: "/dashboard/admin/users/students", icon: "GraduationCap" },
    { label: "Staff", href: "/dashboard/admin/users/staff", icon: "UserCog" },
    { label: "Classes & Subjects", href: "/dashboard/admin/academics", icon: "BookOpen" },
    { label: "Academic Timetable", href: "/dashboard/admin/academics/timetable", icon: "CalendarDays" },
    { label: "MCQ Exams", href: "/dashboard/admin/exams", icon: "ClipboardList" },
    { label: "Academic Results", href: "/dashboard/admin/academics/results", icon: "CheckSquare" },
    { label: "Fee Management", href: "/dashboard/admin/finance", icon: "CreditCard" },
    { label: "Settings", href: "/dashboard/admin/settings", icon: "Settings" },
  ] as const;

  return (
    <div className="flex min-h-screen">
      <Sidebar items={adminNavItems} role="Admin" />
      <main className="flex-1 overflow-y-auto p-8 lg:p-12">
        {children}
      </main>
    </div>
  );
}
