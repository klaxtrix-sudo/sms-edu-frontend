import { type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createServerClient } from "@/lib/supabase/server";
import { resolveTenantKeys } from "@/lib/supabase/tenant-resolver";
import { redirect } from "next/navigation";
import OnboardingGate from "@/components/dashboard/onboarding-gate";
import { UserStatusGuard } from "@/components/dashboard/user-status-guard";
import { requireRole } from "@/lib/supabase/guards";

export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { subdomain: string };
}) {
  const { user } = await requireRole("parent", params);

  const parentNavItems: readonly SidebarItem[] = [
    { label: "Household Overview", href: "/dashboard/parent", icon: "LayoutDashboard" },
    { label: "My Children", href: "/dashboard/parent/children", icon: "Users" },
    { label: "Academic Results", href: "/dashboard/parent/results", icon: "GraduationCap" },
    { label: "Fee Payments", href: "/dashboard/parent/finance", icon: "CreditCard" },
    { label: "School Notifications", href: "/dashboard/parent/notifications", icon: "ClipboardList" },
    { label: "Settings", href: "/dashboard/parent/settings", icon: "Settings" },
  ];

  return (
    <OnboardingGate user={user}>
      <UserStatusGuard userId={user.id} />
      <DashboardShell items={parentNavItems} role="Parent">
        {children}
      </DashboardShell>
    </OnboardingGate>
  );
}
