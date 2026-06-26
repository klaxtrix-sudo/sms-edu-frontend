import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createServerClient } from "@/lib/supabase/server";
import { resolveTenantKeys } from "@/lib/supabase/tenant-resolver";
import { redirect } from "next/navigation";
import OnboardingGate from "@/components/dashboard/onboarding-gate";

export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { subdomain: string };
}) {
  const { subdomain } = params;

  const tenantKeys = await resolveTenantKeys(subdomain);
  if (!tenantKeys) {
    redirect("/login");
  }

  const supabase = createServerClient(tenantKeys.supabaseUrl, tenantKeys.supabaseAnonKey);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.user_metadata?.role;
  if (role !== "parent") {
    redirect("/login");
  }

  // Check for account suspension
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .single() as { data: { is_active: boolean } | null };

  if (profile && !profile.is_active) {
    redirect("/dashboard/suspended");
  }

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
      <div className="flex min-h-screen">
        <Sidebar items={parentNavItems} role="Parent" />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto bg-background flex flex-col min-h-0">
            <div className="flex-1 p-8 lg:p-12">
              {children}
            </div>
            <footer className="py-4 text-center select-none">
              <p className="text-[11px] text-foreground/70 leading-relaxed">
                © {new Date().getFullYear()} Klaxtrix SMS &mdash; School Management System. All rights reserved.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </OnboardingGate>
  );
}
