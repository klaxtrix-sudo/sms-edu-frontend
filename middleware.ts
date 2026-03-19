import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host');

  // Skip supabase session update for static files
  if (url.pathname.includes('.') || url.pathname.startsWith('/_next')) {
     return NextResponse.next();
  }

  // Subdomain Detection Logic
  // Root domain: klaxtrix.com.ng or localhost:3000
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  
  // Extract subdomain
  const subdomain = host?.replace(`.${rootDomain}`, '');

  // Initializing session context
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Determine if we are in a tenant-specific space
  const isTenantSpace = subdomain && subdomain !== 'www' && subdomain !== rootDomain && !host?.startsWith('localhost:3000');

  if (isTenantSpace) {
    // TODO: Fetch tenant-specific keys from 'Main Control Database' cache
    // For PoC, we still use master keys if others aren't available
    console.log(`[Klaxtrix Middleware] Routing to tenant: ${subdomain}`);
  }

  // Update supabase session with context-aware keys
  const response = await updateSession(request, supabaseUrl, supabaseAnonKey);

  if (isTenantSpace) {
    // Rewrite the request to /(schools)/[subdomain]/[path]
    return NextResponse.rewrite(
      new URL(`/(schools)/${subdomain}${url.pathname === '/' ? '' : url.pathname}`, request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
