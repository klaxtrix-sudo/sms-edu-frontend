import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

interface PageProps {
  params: {
    subdomain: string;
  };
}

export default async function SubdomainRootPage({ params }: PageProps) {
  const { subdomain } = params;

  // TODO: Fetch tenant-specific keys from 'Main Control Database'
  // For PoC, we use master keys but passing them dynamically prepares for Phase 2
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey);
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
