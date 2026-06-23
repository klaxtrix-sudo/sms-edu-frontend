import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantKeys } from '@/lib/supabase/tenant-resolver';
import { createTenantServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { subdomain: string } }) {
  const subdomain = params.subdomain;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const tenantBaseUrl = `${protocol}://${subdomain}.${rootDomain}`;

  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/login'; // Default redirect, middleware handles auto-login routing

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=Invalid+verification+link', tenantBaseUrl));
  }

  if (!subdomain) {
    return NextResponse.redirect(new URL('/login?error=Invalid+school+portal', tenantBaseUrl));
  }

  const tenantKeys = await resolveTenantKeys(subdomain);
  if (!tenantKeys) {
    return NextResponse.redirect(new URL('/login?error=School+not+found', tenantBaseUrl));
  }

  const supabase = createTenantServerClient(tenantKeys.supabaseUrl, tenantKeys.supabaseAnonKey);

  const { error } = await supabase.auth.verifyOtp({
    type: type as any,
    token_hash,
  });

  if (!error) {
    // If successfully verified, redirect them to the generic /login which auto-navigates
    // authenticated users to their correct dashboard via the Next.js middleware!
    return NextResponse.redirect(new URL(next, tenantBaseUrl));
  }

  // Handle verification errors
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, tenantBaseUrl));
}
