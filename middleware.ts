import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { resolveTenantKeys } from '@/lib/supabase/tenant-server';

// The resolveTenantKeys logic has been moved to @/lib/supabase/tenant-server.ts 
// for shared use between middleware and server components.

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host');

  if (url.pathname.includes('.') || url.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  
  // A tenant space is any host that is NOT the root domain and NOT 'www'
  // Example: 'fenster.klaxtrix.site' vs 'klaxtrix.site'
  const isTenantSpace = host && host !== rootDomain && host !== `www.${rootDomain}`;
  const subdomain = isTenantSpace ? host.split(`.${rootDomain}`)[0] : null;

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isTenantSpace && subdomain) {
    const tenantKeys = await resolveTenantKeys(subdomain);
    if (tenantKeys) {
      supabaseUrl = tenantKeys.supabaseUrl;
      supabaseAnonKey = tenantKeys.supabaseAnonKey;
      console.log(`[Klaxtrix Middleware] Routing to tenant: ${subdomain} (custom Supabase)`);
    } else {
      console.warn(`[Klaxtrix Middleware] Tenant "${subdomain}" not found. Using master keys as fallback.`);
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (isTenantSpace && subdomain) {
    response = NextResponse.rewrite(
      new URL(`/${subdomain}${url.pathname === '/' ? '' : url.pathname}`, request.url)
    );
  }

  return await updateSession(request, supabaseUrl, supabaseAnonKey, response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
