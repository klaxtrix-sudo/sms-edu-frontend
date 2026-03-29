"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resolveTenantKeys } from "@/lib/supabase/tenant-server";

/**
 * Server action to handle sign-out.
 *
 * IMPORTANT: This action does NOT call redirect(). When redirect() is called
 * from a Server Action invoked via onClick (not a <form>), Next.js performs a
 * client-side soft navigation (RSC fetch). At that moment, the browser has NOT
 * yet committed the Set-Cookie headers from this response to its cookie jar.
 * The next request (RSC fetch for /login) therefore carries stale session
 * cookies — the middleware sees an active session and redirects to the dashboard,
 * causing a 404 or session persistence.
 *
 * The correct pattern: sign out here, then use window.location.href = '/login'
 * on the client. This forces a hard HTTP reload AFTER the browser has applied
 * the cleared-cookie response headers — guaranteeing the middleware sees no session.
 *
 * @param subdomain - The tenant's subdomain (e.g. "glorydays").
 */
export async function signOutAction(subdomain: string) {
  const cookieStore = cookies();

  // 1. Resolve the tenant's Supabase credentials
  const tenantKeys = await resolveTenantKeys(subdomain);

  const supabaseUrl = tenantKeys?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = tenantKeys?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 2. Create a Supabase client for the TENANT's project
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove(name: string, options: CookieOptions) {
        // maxAge: 0 immediately expires the cookie in the browser
        try { cookieStore.set({ name, value: "", ...options, maxAge: 0 }); } catch {}
      },
    },
  });

  // 3. Sign out locally (clears only this device's session)
  await supabase.auth.signOut({ scope: "local" });

  // 4. DO NOT call redirect() here. The client will do window.location.href = '/login'
  //    after this action resolves to guarantee a hard HTTP reload with cleared cookies.
}
