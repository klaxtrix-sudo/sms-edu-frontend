import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Cache client instances by URL + Key to prevent duplicate GoTrueClient instances
const clientCache = new Map<string, SupabaseClient<any, "public", any>>();

/**
 * Resolves the Supabase credentials for a browser client.
 * Order: explicit args → tenant keys configured by <TenantProvider> → platform env.
 *
 * The platform (master) env fallback exists only for legacy no-argument call
 * sites; it is warned loudly because a platform-bound client has no session
 * for the school and its tables lack tenant columns (e.g. academic_year).
 */
function resolveBrowserCredentials(
  supabaseUrl?: string,
  supabaseAnonKey?: string
): { url: string; key: string } {
  const hasExplicitArgs = Boolean(supabaseUrl && supabaseAnonKey);

  // A partial explicit arg pair (e.g. a URL without a key) would mix argument
  // values with tenant/env fallbacks and silently misbind. Reject it loudly
  // instead of producing a hard-to-debug client.
  const hasAnyExplicitArg = supabaseUrl != null || supabaseAnonKey != null;
  if (hasAnyExplicitArg && !hasExplicitArgs) {
    throw new Error('Supabase URL and Anon Key must be provided together');
  }

  const tenantUrl = typeof window !== 'undefined' ? (window as any).__tenant_url : null;
  const tenantKey = typeof window !== 'undefined' ? (window as any).__tenant_anon_key : null;

  const url = supabaseUrl || tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = supabaseAnonKey || tenantKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !key) {
    throw new Error('Supabase URL and Anon Key are required to create client');
  }

  if (!hasExplicitArgs && (!tenantUrl || !tenantKey)) {
    console.warn(
      '[supabase/client] No tenant keys configured yet — binding to the platform (master) project. ' +
        'Call configureTenantBrowserClient() (via <TenantProvider>) before using no-argument ' +
        'createClient/createTenantClient calls to avoid master-project queries.'
    );
  }

  return { url, key };
}

/**
 * Records the resolved tenant (school node) credentials for the browser and
 * purges cached clients that were created from the platform fallback before
 * the tenant keys were known.
 *
 * Called by <TenantProvider> once /tenant/resolve completes, so that
 * no-argument createClient()/createTenantClient() calls (e.g. dashboard pages
 * mounted at first render) target the school's own project instead of the
 * platform project.
 */
export function configureTenantBrowserClient(supabaseUrl: string, supabaseAnonKey: string): void {
  if (typeof window === 'undefined') return;

  const changed =
    (window as any).__tenant_url !== supabaseUrl ||
    (window as any).__tenant_anon_key !== supabaseAnonKey;

  (window as any).__tenant_url = supabaseUrl;
  (window as any).__tenant_anon_key = supabaseAnonKey;

  if (changed) {
    // Drop clients created before the tenant keys were known so no stale
    // platform-bound instance can be reused. Clients are cheap to recreate.
    clientCache.clear();
  }
}

/** Clears the configured tenant credentials (e.g. on sign-out). */
export function clearTenantBrowserClient(): void {
  if (typeof window === 'undefined') return;
  (window as any).__tenant_url = null;
  (window as any).__tenant_anon_key = null;
  clientCache.clear();
}

export function createClient(supabaseUrl?: string, supabaseAnonKey?: string): SupabaseClient<Database, "public", any> {
  const { url, key } = resolveBrowserCredentials(supabaseUrl, supabaseAnonKey);

  const cacheKey = `db:${url}:${key}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)! as SupabaseClient<Database, "public", any>;
  }

  const client = createSupabaseBrowserClient<Database>(url, key, {
    isSingleton: true,
  }) as unknown as SupabaseClient<Database, "public", any>;

  clientCache.set(cacheKey, client);
  return client;
}

/**
 * Creates a generic Supabase client for tenant-specific operations.
 * Use this when querying tables that exist in school-specific nodes
 * but are not defined in the master Database type (e.g. classes, timetables).
 */
export function createTenantClient(supabaseUrl?: string, supabaseAnonKey?: string): SupabaseClient<any, "public", any> {
  const { url, key } = resolveBrowserCredentials(supabaseUrl, supabaseAnonKey);

  const cacheKey = `generic:${url}:${key}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const client = createSupabaseBrowserClient<any>(url, key, {
    isSingleton: true,
  }) as unknown as SupabaseClient<any, "public", any>;

  clientCache.set(cacheKey, client);
  return client;
}

// Export as createBrowserClient too for compatibility with existing imports
export { createClient as createBrowserClient };