import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const parentNavItems: readonly SidebarItem[] = [
    { label: "Household Overview", href: "/dashboard/parent", icon: "LayoutDashboard" },
    { label: "My Children", href: "/dashboard/parent/children", icon: "Users" },
    { label: "Academic Results", href: "/dashboard/parent/results", icon: "GraduationCap" },
    { label: "Fee Payments", href: "/dashboard/parent/finance", icon: "CreditCard" },
    { label: "School Notifications", href: "/dashboard/parent/notifications", icon: "ClipboardList" },
    { label: "Settings", href: "/dashboard/parent/settings", icon: "Settings" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar items={parentNavItems} role="Parent" />
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 bg-accent/5">
        {children}
      </main>
    </div>
  );
}
