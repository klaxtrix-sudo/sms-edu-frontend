import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = createServerClient();
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
