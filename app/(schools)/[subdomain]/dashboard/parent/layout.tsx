import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

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
