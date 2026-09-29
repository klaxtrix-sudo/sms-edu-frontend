import { createServerClient as createClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

function getCookieDomainOptions() {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const cookieDomain = rootDomain.split(':')[0];
  const isLocal = cookieDomain === 'localhost';
  return {
    domain: isLocal ? '.localhost' : `.${cookieDomain}`,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
}

export function createServerClient(supabaseUrl?: string, supabaseAnonKey?: string) {
  const cookieStore = cookies();
  const domainOpts = getCookieDomainOptions();

  return createClient<Database>(
    supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...domainOpts, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...domainOpts, ...options, maxAge: 0 }); } catch {}
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
  const domainOpts = getCookieDomainOptions();

  return createClient<any>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...domainOpts, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...domainOpts, ...options, maxAge: 0 }); } catch {}
        },
      },
    }
  );
}
