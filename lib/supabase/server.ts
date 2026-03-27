import { createServerClient as createClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export function createServerClient(supabaseUrl?: string, supabaseAnonKey?: string) {
  const cookieStore = cookies();
  return createClient<Database>(
    supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }); } catch {}
        },
      },
    }
  );
}

/**
 * Creates a Supabase server client for tenant-specific databases.
 * Uses 'any' typing because tenant DBs have a different schema than the master.
 * Always requires explicit URL and anon key (from tenant credentials).
 */
export function createTenantServerClient(supabaseUrl: string, supabaseAnonKey: string) {
  const cookieStore = cookies();
  return createClient<any>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }); } catch {}
        },
      },
    }
  );
}
