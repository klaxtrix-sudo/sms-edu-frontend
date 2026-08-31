import { createServerClient } from "@/lib/supabase/server";
import { resolveTenantKeys } from "@/lib/supabase/tenant-resolver";
import { createTenantAdminClient } from "@/lib/supabase/tenant-admin";
import type { User } from "@supabase/supabase-js";

export type ActionRole = "admin" | "teacher" | "student" | "parent";

export interface ActionAuthContext {
  user: User;
  schoolId: string;
  subdomain: string;
  tenantSupabase: Awaited<ReturnType<typeof createTenantAdminClient>>;
}

/**
 * Server Action Guard: Validates that the caller has an active authenticated
 * session with the required role for the target school tenant.
 *
 * Prevents unauthorized or cross-tenant RPC execution on Next.js Server Actions.
 *
 * @param subdomain    The target school subdomain
 * @param allowedRoles Allowed user roles (defaults to ['admin'])
 */
export async function requireActionAuth(
  subdomain: string,
  allowedRoles: ActionRole[] = ["admin"]
): Promise<ActionAuthContext> {
  if (!subdomain || typeof subdomain !== "string") {
    throw new Error("Subdomain is required for action authorization.");
  }

  // 1. Resolve tenant public credentials
  const tenantKeys = await resolveTenantKeys(subdomain);
  if (!tenantKeys) {
    throw new Error(`School tenant "${subdomain}" not found.`);
  }

  // 2. Validate current caller session from cookies
  const serverSupabase = createServerClient(
    tenantKeys.supabaseUrl,
    tenantKeys.supabaseAnonKey
  );
  const {
    data: { user },
    error: authError,
  } = await serverSupabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Please sign in to perform this action.");
  }

  const userRole = (user.user_metadata?.role as ActionRole) || "student";
  const userSchoolId = user.user_metadata?.school_id as string | undefined;

  // 3. Verify cross-tenant isolation
  if (userSchoolId && userSchoolId !== tenantKeys.id) {
    throw new Error("Forbidden: Cross-tenant operations are strictly prohibited.");
  }

  // 4. Role-based verification (Admins are authorized for all actions)
  const isAuthorized =
    userRole === "admin" || allowedRoles.includes(userRole);

  if (!isAuthorized) {
    throw new Error(
      `Forbidden: Requires one of [${allowedRoles.join(", ")}] role permissions.`
    );
  }

  // 5. Initialize tenant admin client (SRK) for privileged mutations
  const tenantSupabase = await createTenantAdminClient(subdomain);

  return {
    user,
    schoolId: tenantKeys.id,
    subdomain,
    tenantSupabase,
  };
}
