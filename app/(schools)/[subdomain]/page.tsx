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

  // Resolve tenant-specific keys server-side
  const tenantKeys = await resolveTenantKeys(subdomain);
  
  if (!tenantKeys) {
    console.error(`[CRITICAL] Could not resolve keys for subdomain: ${subdomain}`);
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
