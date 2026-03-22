// No in-memory cache here — we need fresh is_setup_completed on every request
// to correctly route users who have just completed setup.

export async function resolveTenantKeys(subdomain: string): Promise<{ name: string; supabaseUrl: string; supabaseAnonKey: string } | null> {

  // Fetch from master Klaxtrix DB via a lightweight internal API call
  // (Decryption happens in the backend — middleware and server components use this API)
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';
    const res = await fetch(`${backendUrl}/tenant/resolve?subdomain=${encodeURIComponent(subdomain)}`, {
      cache: 'no-store', // Always fetch fresh — is_setup_completed must not be stale
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;

    return { 
      name: data.data.name,
      supabaseUrl: data.data.supabaseUrl, 
      supabaseAnonKey: data.data.supabaseAnonKey 
    };

  } catch (error) {
    console.error(`[Tenant Server] Error resolving keys for "${subdomain}":`, error);
    return null;
  }
}
