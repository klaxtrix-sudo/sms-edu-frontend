// Simple in-process cache to avoid a DB hit on every request
// Key: subdomain → Value: { supabaseUrl, supabaseAnonKey, cachedAt }
const tenantCache = new Map<string, { supabaseUrl: string; supabaseAnonKey: string; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function resolveTenantKeys(subdomain: string): Promise<{ supabaseUrl: string; supabaseAnonKey: string } | null> {
  // Return from cache if fresh
  const cached = tenantCache.get(subdomain);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { supabaseUrl: cached.supabaseUrl, supabaseAnonKey: cached.supabaseAnonKey };
  }

  // Fetch from master Klaxtrix DB via a lightweight internal API call
  // (Decryption happens in the backend — middleware and server components use this API)
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';
    const res = await fetch(`${backendUrl}/tenant/resolve?subdomain=${encodeURIComponent(subdomain)}`, {
      next: { revalidate: 300 }, // Fetch cache for 5 min in Next.js Server Components
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;

    const result = { 
      supabaseUrl: data.data.supabaseUrl, 
      supabaseAnonKey: data.data.supabaseAnonKey 
    };
    
    tenantCache.set(subdomain, { ...result, cachedAt: Date.now() });
    return result;
  } catch (error) {
    console.error(`[Tenant Server] Error resolving keys for "${subdomain}":`, error);
    return null;
  }
}
