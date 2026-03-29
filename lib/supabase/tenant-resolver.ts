import { getBackendUrl } from "@/lib/utils";

/**
 * Resolves standard tenant keys (URL and Anon key).
 * Safe for use in Node.js, Edge Runtime (Middleware), and Server Components.
 */
export async function resolveTenantKeys(subdomain: string): Promise<{ name: string; supabaseUrl: string; supabaseAnonKey: string; id: string } | null> {
  try {
    const res = await fetch(`${getBackendUrl()}/tenant/resolve?subdomain=${encodeURIComponent(subdomain)}`, {
      cache: "no-store",
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;

    return { 
      id: data.data.id,
      name: data.data.name,
      supabaseUrl: data.data.supabaseUrl, 
      supabaseAnonKey: data.data.supabaseAnonKey 
    };
  } catch (error) {
    console.error(`[Tenant Resolver] Error resolving keys for "${subdomain}":`, error);
    return null;
  }
}
