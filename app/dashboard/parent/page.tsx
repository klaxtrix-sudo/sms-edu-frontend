import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function ParentDashboard() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'parent') redirect('/login');

  return (
    <div className="p-8">
      <h1 className="text-3xl font-heading font-bold">Parent Dashboard</h1>
      <p className="text-muted-foreground mt-1">Welcome, {user.user_metadata?.full_name ?? 'Parent'}</p>
      {/* TODO: Children overview, results, fee payments */}
    </div>
  );
}
