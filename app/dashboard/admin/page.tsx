import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, School, BookOpen } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/login');

  const schoolId = user.user_metadata?.school_id;

  // Fetch real counts
  const [teachersCount, studentsCount, classesCount, subjectsCount] = await Promise.all([
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student'),
    (supabase as any).from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    (supabase as any).from('subjects').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
  ]);

  const stats = [
    { label: "Total Teachers", value: String(teachersCount.count ?? 0), icon: Users, color: "text-blue-500" },
    { label: "Total Students", value: String(studentsCount.count ?? 0), icon: GraduationCap, color: "text-emerald-500" },
    { label: "Total Classes", value: String(classesCount.count ?? 0), icon: School, color: "text-amber-500" },
    { label: "Total Subjects", value: String(subjectsCount.count ?? 0), icon: BookOpen, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Welcome back, <span className="text-foreground font-semibold">{user?.user_metadata?.full_name ?? 'Administrator'}</span>. Here's what's happening today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">Starting fresh...</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">No recent activity detected.</p>
          </CardContent>
        </Card>
        <Card className="col-span-3 border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quick Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 rounded-lg bg-accent/50 text-sm border flex items-center gap-3">
              <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
              Complete school profile setup
            </div>
            <div className="p-3 rounded-lg bg-accent/50 text-sm border flex items-center gap-3 opacity-50">
              Add first teacher account
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
