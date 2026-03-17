import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/login');

  return (
    <div className="p-8">
      <h1 className="text-3xl font-heading font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-1">Welcome back, {user.user_metadata?.full_name ?? 'Admin'}</p>
      {/* TODO: Add stat cards, charts, quick actions */}
    </div>
  );
}
