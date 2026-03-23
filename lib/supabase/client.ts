import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createClient(supabaseUrl?: string, supabaseAnonKey?: string) {
  return createSupabaseBrowserClient<Database>(
    supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Creates a generic Supabase client for tenant-specific operations.
 * Use this when querying tables that exist in school-specific nodes 
 * but are not defined in the master Database type (e.g. classes, timetables).
 */
export function createTenantClient(supabaseUrl?: string, supabaseAnonKey?: string): SupabaseClient<any> {
  return createSupabaseBrowserClient<any>(
    supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Export as createBrowserClient too for compatibility with existing imports
export { createClient as createBrowserClient };
