import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { resolveTenantKeys } from '@/lib/supabase/tenant-resolver';

interface PageProps {
  params: {
    subdomain: string;
  };
}

export default async function SubdomainRootPage({ params }: PageProps) {
  const { subdomain } = params;

  // Guard: some static asset requests (favicon.ico, etc.) can be routed
  // through the [subdomain] catcher. Reject them silently.
  const SYSTEM_PATHS = ['favicon.ico', 'manifest.json', 'robots.txt', 'sitemap.xml'];
  if (SYSTEM_PATHS.includes(subdomain) || subdomain.includes('.')) {
    return notFound();
  }

  // Resolve tenant-specific keys server-side
  const tenantKeys = await resolveTenantKeys(subdomain);
  
  if (!tenantKeys) {
    console.warn(`[Tenant Router] No tenant found for subdomain: "${subdomain}". Returning 404.`);
    return notFound();
  }

  const supabase = createServerClient(tenantKeys.supabaseUrl, tenantKeys.supabaseAnonKey);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Redirect based on role stored in user metadata
  const role = user.user_metadata?.role as string | undefined;

  const roleRedirects: Record<string, string> = {
    admin: '/dashboard/admin',
    teacher: '/dashboard/teacher',
    student: '/dashboard/student',
    parent: '/dashboard/parent',
  };

  redirect(roleRedirects[role ?? ''] ?? '/login');
}
