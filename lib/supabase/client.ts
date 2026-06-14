import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createClient(supabaseUrl?: string, supabaseAnonKey?: string): SupabaseClient<Database, "public", any> {
  const url = supabaseUrl || (typeof window !== 'undefined' ? (window as any).__tenant_url : null);
  const key = supabaseAnonKey || (typeof window !== 'undefined' ? (window as any).__tenant_anon_key : null);

  if (url && key) {
    return createSupabaseBrowserClient<Database>(url, key, {
      isSingleton: false,
    }) as unknown as SupabaseClient<Database, "public", any>;
  }
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database, "public", any>;
}

/**
 * Creates a generic Supabase client for tenant-specific operations.
 * Use this when querying tables that exist in school-specific nodes 
 * but are not defined in the master Database type (e.g. classes, timetables).
 */
export function createTenantClient(supabaseUrl?: string, supabaseAnonKey?: string): SupabaseClient<any, "public", any> {
  const url = supabaseUrl || (typeof window !== 'undefined' ? (window as any).__tenant_url : null);
  const key = supabaseAnonKey || (typeof window !== 'undefined' ? (window as any).__tenant_anon_key : null);

  if (url && key) {
    return createSupabaseBrowserClient<any>(url, key, {
      isSingleton: false,
    }) as unknown as SupabaseClient<any, "public", any>;
  }
  return createSupabaseBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<any, "public", any>;
}

// Export as createBrowserClient too for compatibility with existing imports
export { createClient as createBrowserClient };
