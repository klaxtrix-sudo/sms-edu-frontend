import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { resolveTenantKeys } from "@/lib/supabase/tenant-resolver";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "teacher" | "student" | "parent";

interface RequireRoleResult {
  user: User;
  schoolId: string;
  subdomain: string;
}

/**
 * Server-side guard for dashboard layouts.
 * Resolves the tenant, verifies the Supabase session, checks the user's role,
 * and checks for account suspension.
 *
 * Usage:
 *   const { user, schoolId } = await requireRole("teacher", params);
 *   if (!user) return redirect("/login");  // (requireRole already redirects)
 *
 * @param role  The required role for this route
 * @param params  The route params containing `subdomain`
 * @returns The authenticated user + schoolId, or redirects to /login
 */
export async function requireRole(
  role: UserRole,
  params: { subdomain: string }
): Promise<RequireRoleResult> {
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

  // Check for account suspension
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .single() as { data: { is_active: boolean } | null };

  if (profile && !profile.is_active) {
    redirect("/dashboard/suspended");
  }

  // Role check: allow the exact role, or admin accessing teacher routes
  const userRole = user.user_metadata?.role as string | undefined;
  const isAuthorized =
    userRole === role ||
    (role === "teacher" && userRole === "admin");

  if (!isAuthorized) {
    redirect("/login");
  }

  const schoolId = user.user_metadata?.school_id as string;

  return { user, schoolId, subdomain };
}
