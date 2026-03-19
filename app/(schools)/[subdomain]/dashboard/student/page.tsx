import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function StudentDashboard() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'student') redirect('/login');

  return (
    <div className="p-8">
      <h1 className="text-3xl font-heading font-bold">Student Dashboard</h1>
      <p className="text-muted-foreground mt-1">Hello, {user.user_metadata?.full_name ?? 'Student'}!</p>
      {/* TODO: Results overview, upcoming exams, fee status */}
    </div>
  );
}
