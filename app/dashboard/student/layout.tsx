import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const studentNavItems: readonly SidebarItem[] = [
    { label: "Overview", href: "/dashboard/student", icon: "LayoutDashboard" },
    { label: "My Exams", href: "/dashboard/student/exams", icon: "ClipboardList" },
    { label: "My Results", href: "/dashboard/student/results", icon: "CheckSquare" },
    { label: "Payments", href: "/dashboard/student/finance", icon: "CreditCard" },
    { label: "Settings", href: "/dashboard/student/settings", icon: "Settings" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar items={studentNavItems} role="Student" />
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 bg-accent/5">
        {children}
      </main>
    </div>
  );
}
