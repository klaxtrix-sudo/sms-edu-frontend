import { Sidebar } from "@/components/dashboard/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminNavItems = [
    { label: "Overview", href: "/dashboard/admin", icon: "LayoutDashboard" },
    { label: "School Setup", href: "/dashboard/admin/settings/school", icon: "School" },
    { label: "Classes", href: "/dashboard/admin/classes", icon: "Users" },
    { label: "Subjects", href: "/dashboard/admin/subjects", icon: "BookOpen" },
    { label: "Teachers", href: "/dashboard/admin/users/teachers", icon: "UserCog" },
    { label: "Students", href: "/dashboard/admin/users/students", icon: "GraduationCap" },
    { label: "Fees & Payments", href: "/dashboard/admin/fees", icon: "CreditCard" },
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
