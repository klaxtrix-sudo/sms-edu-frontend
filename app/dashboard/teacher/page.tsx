import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function TeacherDashboard() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher') redirect('/login');

  return (
    <div className="p-8">
      <h1 className="text-3xl font-heading font-bold">Teacher Dashboard</h1>
      <p className="text-muted-foreground mt-1">Welcome, {user.user_metadata?.full_name ?? 'Teacher'}</p>
      {/* TODO: My classes, upcoming exams, pending results */}
    </div>
  );
}
