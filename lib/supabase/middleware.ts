import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(
  request: NextRequest, 
  supabaseUrl?: string, 
  supabaseAnonKey?: string,
  existingResponse?: NextResponse
) {
  let response = existingResponse || NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          // Cross-subdomain session persistence:
          // Local dev needs ".localhost", production needs ".solabacademy.com.ng"
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
          const cookieDomain = rootDomain.split(':')[0];
          const isLocal = cookieDomain === 'localhost';
          
          const finalOptions = {
            ...options,
            domain: isLocal ? '.localhost' : `.${cookieDomain}`,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
          };

          request.cookies.set({ name, value, ...finalOptions });
          response = existingResponse || NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...finalOptions });
        },
        remove(name: string, options: CookieOptions) {
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
          const cookieDomain = rootDomain.split(':')[0];
          const isLocal = cookieDomain === 'localhost';

          const finalOptions = {
            ...options,
            domain: isLocal ? '.localhost' : `.${cookieDomain}`,
            maxAge: 0,
            path: '/',
          };

          request.cookies.set({ name, value: '', ...finalOptions });
          response = existingResponse || NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...finalOptions });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return { supabase, response };
}
