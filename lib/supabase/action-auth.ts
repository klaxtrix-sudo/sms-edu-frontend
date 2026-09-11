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
  accessToken?: string;
}

import { hasPermission } from "@/lib/permissions";
export { hasPermission };

/**
 * Server Action Guard: Validates that the caller has an active authenticated
 * session with the required role for the target school tenant.
 *
 * Prevents unauthorized or cross-tenant RPC execution on Next.js Server Actions.
 *
 * @param subdomain          The target school subdomain
 * @param allowedRoles       Allowed user roles (defaults to ['admin'])
 * @param requiredPermission Optional module permission required for admin users
 */
export async function requireActionAuth(
  subdomain: string,
  allowedRoles: ActionRole[] = ["admin"],
  requiredPermission?: string
): Promise<ActionAuthContext> {
  if (!subdomain || typeof subdomain !== "string") {
    throw new Error("Subdomain is required for action authorization.");
  }

  // 1. Resolve tenant public credentials
  const tenantKeys = await resolveTenantKeys(subdomain);
  if (!tenantKeys) {
    throw new Error(`School tenant "${subdomain}" not found.`);
  }

  // 2. Resolve caller session from cookies
  const serverSupabase = createServerClient(
    tenantKeys.supabaseUrl,
    tenantKeys.supabaseAnonKey
  );
  const {
    data: { user },
    error: authError,
  } = await serverSupabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Active session required to perform this action.");
  }

  const userSchoolId = user.user_metadata?.school_id;
  const userRole = user.user_metadata?.role as ActionRole | undefined;

  // 3. Multi-tenant boundary verification (Anti-IDOR)
  if (userSchoolId && userSchoolId !== tenantKeys.id) {
    throw new Error("Forbidden: Cross-tenant operations are strictly prohibited.");
  }

  // 4. Role-based verification
  const isAuthorized =
    userRole === "admin" || allowedRoles.includes(userRole as ActionRole);

  if (!isAuthorized) {
    throw new Error(
      `Forbidden: Requires one of [${allowedRoles.join(", ")}] role permissions.`
    );
  }

  // 5. Initialize tenant admin client (SRK) for privileged mutations
  const tenantSupabase = await createTenantAdminClient(subdomain);

  // 6. Check active profile status and granular module permissions
  if (userRole === "admin") {
    const { data: profile } = await (tenantSupabase as any)
      .from('profiles')
      .select('is_active, is_super_admin, permissions, session_revoked_at')
      .eq('id', user.id)
      .single();

    if (profile && profile.is_active === false) {
      throw new Error("Forbidden: Your administrator account has been suspended by a Super Administrator.");
    }

    if (profile?.session_revoked_at) {
      const revokedTime = new Date(profile.session_revoked_at).getTime();
      const authTime = new Date(user.last_sign_in_at || user.created_at).getTime();
      // If session was revoked after the user last signed in, reject the request
      if (revokedTime > authTime) {
        throw new Error("Session revoked or expired. Please sign in again.");
      }
    }

    if (requiredPermission) {
      const profileIsSuper = profile?.is_super_admin === true || user.user_metadata?.is_super_admin === true;
      // Authoritative database profile permissions take precedence over stale JWT metadata
      const effectivePerms = Array.isArray(profile?.permissions)
        ? profile.permissions
        : (Array.isArray(user.user_metadata?.permissions) ? user.user_metadata.permissions : []);

      if (!profileIsSuper && !hasPermission(effectivePerms, requiredPermission)) {
        throw new Error(
          `Forbidden: You do not have permission for the '${requiredPermission}' action or module.`
        );
      }
    }
  }

  const { data: { session } } = await serverSupabase.auth.getSession();

  return {
    user,
    schoolId: tenantKeys.id,
    subdomain,
    tenantSupabase,
    accessToken: session?.access_token,
  };
}
