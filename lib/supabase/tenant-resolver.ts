import { getBackendUrl } from "@/lib/utils";

interface CachedTenantKeys {
  keys: { name: string; supabaseUrl: string; supabaseAnonKey: string; id: string };
  expiresAt: number;
}

const tenantCache = new Map<string, CachedTenantKeys>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearTenantKeysCache(subdomain?: string): void {
  if (subdomain) {
    tenantCache.delete(subdomain.toLowerCase());
  } else {
    tenantCache.clear();
  }
}

/**
 * Resolves standard tenant keys (URL and Anon key) with in-memory caching.
 * Safe for use in Node.js, Edge Runtime (Middleware), and Server Components.
 */
export async function resolveTenantKeys(
  subdomain: string
): Promise<{ name: string; supabaseUrl: string; supabaseAnonKey: string; id: string } | null> {
  if (!subdomain) return null;

  const normalized = subdomain.toLowerCase().trim();
  const cached = tenantCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  try {
    const res = await fetch(
      `${getBackendUrl()}/tenant/resolve?subdomain=${encodeURIComponent(normalized)}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.data) return null;

    const result = {
      id: data.data.id,
      name: data.data.name,
      supabaseUrl: data.data.supabaseUrl,
      supabaseAnonKey: data.data.supabaseAnonKey,
    };

    // Cache valid result
    tenantCache.set(normalized, {
      keys: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch (error) {
    console.error(`[Tenant Resolver] Error resolving keys for "${subdomain}":`, error);
    return null;
  }
}
