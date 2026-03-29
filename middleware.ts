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
   const RESERVED_PATHS = ['/login', '/register', '/console', '/api', '/home'];
   const isReservedPath = RESERVED_PATHS.some(path => url.pathname.startsWith(path));

   // A tenant space is any host that is NOT the root domain and NOT 'www'
   const isTenantSpace = host && host !== rootDomain && host !== `www.${rootDomain}`;
   const subdomain = isTenantSpace ? host.split(`.${rootDomain}`)[0] : null;

   // If we are on the root domain and hitting a reserved path, don't treat it as a tenant
   if (!isTenantSpace && isReservedPath) {
     return NextResponse.next();
   }

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

  // 1. Initial response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Tenant Rewriting (if applicable)
  if (isTenantSpace && subdomain) {
    response = NextResponse.rewrite(
      new URL(`/${subdomain}${url.pathname === '/' ? '' : url.pathname}`, request.url)
    );
  }

  // 3. Update Session (Cookie management)
  const { supabase, response: updatedResponse } = await updateSession(request, supabaseUrl, supabaseAnonKey, response);

  // 4. Authenticated Redirection - Automatically send logged-in users away from /login
  if (url.pathname === '/login') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Fetch user role to determine the correct dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = profile?.role || 'student';
      console.log(`[Auto-Navigator] Authenticated session for ${user.email} (${role}) detected. Redirecting to dashboard.`);
      
      // Redirect to the appropriate role-based dashboard
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  // 5. Security Guard - Protect Dashboard and Console routes
  const isDashboardPath = url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/console');
  if (isDashboardPath) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log(`[Security Shield] Unauthenticated access attempt to ${url.pathname}. Redirecting to /login.`);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return updatedResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
