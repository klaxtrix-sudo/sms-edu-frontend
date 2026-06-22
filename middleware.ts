import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { resolveTenantKeys } from '@/lib/supabase/tenant-resolver';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host');

  // 1. Static asset bypass
  if (url.pathname.includes('.') || url.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  
  // 2. Tenant Detection
  const isTenantSpace = host && host !== rootDomain && host !== `www.${rootDomain}`;
  const subdomain = isTenantSpace ? host.split(`.${rootDomain}`)[0] : null;

  // 3. Supabase Key Resolution (Tenant-aware)
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isTenantSpace && subdomain) {
    const tenantKeys = await resolveTenantKeys(subdomain);
    if (tenantKeys) {
      supabaseUrl = tenantKeys.supabaseUrl;
      supabaseAnonKey = tenantKeys.supabaseAnonKey;
    }
  }

  // 4. Initial response / Rewrite (Internal mapping)
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (isTenantSpace && subdomain) {
    response = NextResponse.rewrite(
      new URL(`/${subdomain}${url.pathname === '/' ? '' : url.pathname}`, request.url)
    );
  }

  // 5. Mandatory Session Update (Cookie management)
  const { supabase, response: updatedResponse } = await updateSession(request, supabaseUrl, supabaseAnonKey, response);

  // 6. Security Guard: Protect Dashboard routes (Console routes use custom JWT auth)
  const isProtectedPath = url.pathname.startsWith('/dashboard');
  if (isProtectedPath) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log(`[Security Guard] Unauthenticated access to ${url.pathname}. Redirecting to /login.`);
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based route enforcement: prevent cross-role access
    const role = user.user_metadata?.role || 'student';
    const dashboardRoleMatch = url.pathname.match(/^\/dashboard\/(admin|teacher|student|parent)/);
    if (dashboardRoleMatch && dashboardRoleMatch[1] !== role) {
      const correctDashboard = new URL(`/dashboard/${role}`, request.url);
      console.log(`[Security Guard] Role mismatch: ${role} accessing ${url.pathname}. Redirecting to ${correctDashboard.pathname}.`);
      const roleRedirect = NextResponse.redirect(correctDashboard);
      updatedResponse.cookies.getAll().forEach((cookie) => {
        roleRedirect.cookies.set(cookie);
      });
      return roleRedirect;
    }
  }

  // 7. Console Guard: Protect Master Admin Console routes
  // The console uses a separate JWT stored in an httpOnly cookie (set by /console login).
  // If no console cookie exists, redirect to the console login page.
  if (url.pathname.startsWith('/console/') && url.pathname !== '/console') {
    const consoleToken = request.cookies.get('klaxtrix_console_token')?.value;
    if (!consoleToken) {
      return NextResponse.redirect(new URL('/console', request.url));
    }
  }

  // 7. Auto-Navigation: Authenticated users away from /login
  if (url.pathname === '/login') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const role = user.user_metadata?.role || 'student';
      const redirectUrl = new URL(`/dashboard/${role}`, request.url);
      
      console.log(`[Auto-Navigator] Authenticated session for ${user.email} (${role}). Redirecting to dashboard.`);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      
      // Crucial: Copy session cookies to the redirect response
      // Use set on redirectResponse with values from updatedResponse
      updatedResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      
      return redirectResponse;
    }
  }

  return updatedResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
