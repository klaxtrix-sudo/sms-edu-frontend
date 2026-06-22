import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  Plus, 
  TrendingUp, 
  Bell, 
  Calendar
} from "lucide-react";
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

import { resolveTenantKeys } from '@/lib/supabase/tenant-resolver';
import { getBackendUrl } from '@/lib/utils';
import { RecentBulletins } from '@/components/admin/recent-bulletins';

export default async function AdminDashboard({ params }: { params: { subdomain: string } }) {
  const { subdomain } = params;
  
  // Resolve tenant-specific keys server-side
  const tenantKeys = await resolveTenantKeys(subdomain);
  
  if (!tenantKeys) {
    redirect('/login');
  }

  const supabase = createServerClient(tenantKeys.supabaseUrl, tenantKeys.supabaseAnonKey);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') redirect('/login');

  const schoolId = user.user_metadata?.school_id;

  // Fetch real counts and performance data
  const [teachersCount, studentsCount, classesCount, subjectsCount] = await Promise.all([
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student'),
    (supabase as any).from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    (supabase as any).from('subjects').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
  ]);

  // Fetch performance trend from backend
  let performanceData = [];
  try {
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(`${getBackendUrl()}/stats/school/${schoolId}/performance`, {
      headers: session.session?.access_token
        ? { Authorization: `Bearer ${session.session.access_token}` }
        : {},
    });
    const result = await response.json();
    if (result.success) {
      performanceData = result.data;
    }
  } catch (error) {
    console.error('Failed to fetch performance data:', error);
  }



  const stats = [
    { label: "Teachers", value: String(teachersCount.count ?? 0), icon: Users, color: "from-blue-500 to-indigo-600" },
    { label: "Students", value: String(studentsCount.count ?? 0), icon: GraduationCap, color: "from-emerald-500 to-teal-600" },
    { label: "Classes", value: String(classesCount.count ?? 0), icon: School, color: "from-amber-500 to-orange-600" },
    { label: "Subjects", value: String(subjectsCount.count ?? 0), icon: BookOpen, color: "from-purple-500 to-violet-600" },
  ];

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen pb-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Executive Hero Header */}
      <header className="relative overflow-hidden glass-panel rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-glow">
            Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">{tenantKeys.name}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl font-medium">
             Everything is on track. {studentsCount.count ?? 0} students and {teachersCount.count ?? 0} teachers are active across {classesCount.count ?? 0} class levels today.
          </p>
        </div>
        
        <div className="relative z-10 glass-panel rounded-2xl p-6 border-white/10 flex flex-col items-center justify-center w-full md:min-w-[200px] hover:scale-105 transition-transform duration-500 bg-white/5">
          <Calendar className="size-8 text-primary mb-2" />
          <span className="text-sm font-bold text-primary uppercase tracking-tighter">Today's Pulse</span>
          <span className="text-base md:text-lg font-bold text-center">{today}</span>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 size-64 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-colors" />
      </header>

      {/* Modern Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* LARGE BENTO CELL: Institutional Growth Chart */}
        <div className="md:col-span-2 lg:col-span-2 glass-panel rounded-[2rem] overflow-hidden group hover:shadow-primary/5 transition-all duration-500 border border-white/5 bg-white/5">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  Academic Performance
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Institutional cumulative growth & trends</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                Live Analytics
              </Badge>
            </div>
            <PerformanceChart data={performanceData} />
          </div>
        </div>

        {/* SMALL BENTO CELLS: Core Stats with Glowing Gradients */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:col-span-2 lg:col-span-2 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-panel rounded-[1.8rem] p-6 group hover:translate-y-[-4px] transition-all duration-300 border border-white/5 bg-white/5 overflow-hidden">
               <div className={`size-12 rounded-2xl bg-gradient-to-br ${stat.color} p-3 mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className="size-full text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                <div className="text-3xl font-black">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* MEDIUM BENTO CELL: Quick Action Command Center */}
        <div className="lg:col-span-1 glass-panel rounded-[2rem] p-8 space-y-6 border border-white/5 bg-white/5">
          <h3 className="text-xl font-bold">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-primary hover:text-white transition-all group" asChild>
              <Link href="/dashboard/admin/users/students">
                <Plus className="size-5" />
                Enroll Student
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-primary hover:text-white transition-all group" asChild>
               <Link href="/dashboard/admin/communications">
                <Bell className="size-5" />
                Post Announcement
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-primary hover:text-white transition-all group" asChild>
              <Link href="/dashboard/admin/academics/results">
                <TrendingUp className="size-5" />
                Generate Reports
              </Link>
            </Button>
          </div>
        </div>

        {/* LARGE BENTO CELL: Global Feed / Bulletins */}
        <RecentBulletins />

      </div>
    </div>
  );
}
