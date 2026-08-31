import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Cache client instances by URL + Key to prevent duplicate GoTrueClient instances
const clientCache = new Map<string, SupabaseClient<any, "public", any>>();

export function createClient(supabaseUrl?: string, supabaseAnonKey?: string): SupabaseClient<Database, "public", any> {
  const url = supabaseUrl || (typeof window !== 'undefined' ? (window as any).__tenant_url : null) || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = supabaseAnonKey || (typeof window !== 'undefined' ? (window as any).__tenant_anon_key : null) || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !key) {
    throw new Error('Supabase URL and Anon Key are required to create client');
  }

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
  const url = supabaseUrl || (typeof window !== 'undefined' ? (window as any).__tenant_url : null) || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = supabaseAnonKey || (typeof window !== 'undefined' ? (window as any).__tenant_anon_key : null) || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !key) {
    throw new Error('Supabase URL and Anon Key are required to create tenant client');
  }

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

