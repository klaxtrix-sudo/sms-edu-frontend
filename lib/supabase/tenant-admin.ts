import { createClient } from "@supabase/supabase-js";
import { resolveTenantAdminKeys } from "./tenant-admin-resolver";
import type { Database } from "@/types/supabase";

/**
 * Creates a Supabase client with SERVICE_ROLE administrative privileges 
 * for a specific tenant's project.
 * 
 * WARNING: This bypasses RLS. ONLY use in secure server-side contexts 
 * (Server Actions, API Routes).
 */
export async function createTenantAdminClient(subdomain: string) {
  const keys = await resolveTenantAdminKeys(subdomain);
  
  if (!keys) {
    throw new Error(`Could not resolve administrative credentials for school: ${subdomain}`);
  }

  return createClient<Database>(keys.supabaseUrl, keys.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
