import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Simple in-process cache to avoid a DB hit on every request
// Key: subdomain → Value: { supabaseUrl, supabaseAnonKey, cachedAt }
const tenantCache = new Map<string, { supabaseUrl: string; supabaseAnonKey: string; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveTenantKeys(subdomain: string): Promise<{ supabaseUrl: string; supabaseAnonKey: string } | null> {
  // Return from cache if fresh
  const cached = tenantCache.get(subdomain);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { supabaseUrl: cached.supabaseUrl, supabaseAnonKey: cached.supabaseAnonKey };
  }

  // Fetch from master Klaxtrix DB via a lightweight internal API call
  // (Decryption happens in the backend — middleware cannot access Node.js crypto)
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';
    const res = await fetch(`${backendUrl}/tenant/resolve?subdomain=${encodeURIComponent(subdomain)}`, {
      next: { revalidate: 300 }, // Edge cache for 5 min in production
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;

    const result = { supabaseUrl: data.data.supabaseUrl, supabaseAnonKey: data.data.supabaseAnonKey };
    tenantCache.set(subdomain, { ...result, cachedAt: Date.now() });
    return result;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host');

  if (url.pathname.includes('.') || url.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const subdomain = host?.replace(`.${rootDomain}`, '');
  const isTenantSpace = subdomain && subdomain !== 'www' && subdomain !== rootDomain && !host?.startsWith('localhost:3000');

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isTenantSpace) {
    const tenantKeys = await resolveTenantKeys(subdomain);
    if (tenantKeys) {
      supabaseUrl = tenantKeys.supabaseUrl;
      supabaseAnonKey = tenantKeys.supabaseAnonKey;
      console.log(`[Klaxtrix Middleware] Routing to tenant: ${subdomain} (custom Supabase)`);
    } else {
      console.warn(`[Klaxtrix Middleware] Tenant "${subdomain}" not found. Using master keys as fallback.`);
    }
  }

  const response = await updateSession(request, supabaseUrl, supabaseAnonKey);

  if (isTenantSpace) {
    return NextResponse.rewrite(
      // Route groups like (schools) and (auth) are file-system only — they are NOT
      // part of the URL. Rewriting to /{subdomain}/login correctly matches
      // app/(schools)/[subdomain]/(auth)/login/page.tsx
      new URL(`/${subdomain}${url.pathname === '/' ? '' : url.pathname}`, request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
