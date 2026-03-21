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
  Calendar,
  ArrowRight
} from "lucide-react";
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

import { resolveTenantKeys } from '@/lib/supabase/tenant-server';

export default async function AdminDashboard({ params }: { params: { subdomain: string } }) {
  const { subdomain } = params;
  
  // Resolve tenant-specific keys server-side
  const tenantKeys = await resolveTenantKeys(subdomain);
  
  if (!tenantKeys) {
    redirect('/login');
  }

  const supabase = createServerClient(tenantKeys.supabaseUrl, tenantKeys.supabaseAnonKey);
  let { data: { user } } = await supabase.auth.getUser();

  // DEVELOPMENT BYPASS for a seamless PoC Review
  const isDev = process.env.NODE_ENV === 'development';
  if (!user && isDev) {
    user = {
      id: 'a0000000-0000-0000-0000-000000000000',
      user_metadata: {
        full_name: 'System Administrator',
        role: 'admin',
        school_id: '00000000-0000-0000-0000-000000000000'
      }
    } as any;
  }

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
    { label: "Faculty", value: String(teachersCount.count ?? 0), icon: Users, color: "from-blue-500 to-indigo-600" },
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
      <header className="relative overflow-hidden glass-panel rounded-[2.5rem] p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
        <div className="relative z-10 space-y-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Institutional Growth Alpha
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-glow">
            Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">{user?.user_metadata?.full_name?.split(' ')[0] ?? 'Administrator'}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl font-medium">
             Everything is on track. {studentsCount.count ?? 0} students and {teachersCount.count ?? 0} faculty members are active across {classesCount.count ?? 0} departments today.
          </p>
        </div>
        
        <div className="relative z-10 glass-panel rounded-2xl p-6 border-white/10 flex flex-col items-center justify-center min-w-[200px] hover:scale-105 transition-transform duration-500 bg-white/5">
          <Calendar className="size-8 text-primary mb-2" />
          <span className="text-sm font-bold text-primary uppercase tracking-tighter">Today's Pulse</span>
          <span className="text-lg font-bold">{today}</span>
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
                +12.5% vs Last Term
              </Badge>
            </div>
            <PerformanceChart />
          </div>
        </div>

        {/* SMALL BENTO CELLS: Core Stats with Glowing Gradients */}
        <div className="grid grid-cols-2 md:col-span-2 lg:col-span-2 gap-6">
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
              <Link href="/dashboard/admin/academics/students">
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
        <div className="lg:col-span-3 glass-panel rounded-[2rem] p-8 border border-white/5 bg-white/5 group overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Recent Bulletins</h3>
            <Button variant="link" className="text-primary gap-2 p-0 group-hover:translate-x-1 transition-transform">
              View All <ArrowRight className="size-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="group/item glass-panel !bg-white/[0.03] rounded-2xl p-6 border-white/5 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500/20 text-blue-400 pointer-events-none">Operational</Badge>
                      <span className="text-xs text-muted-foreground font-medium">Post {i} • Mar 20, 2024</span>
                    </div>
                    <h4 className="font-bold text-lg group-hover/item:text-primary transition-colors">Term 2 Examination Schedule Published</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      The official schedule for all senior levels is now live in the Academics department. Teachers are requested to verify their respective subject timings...
                    </p>
                  </div>
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <ArrowRight className="size-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Background animation blob */}
          <div className="absolute -bottom-24 -right-24 size-48 bg-primary/20 blur-[80px] rounded-full" />
        </div>

      </div>
    </div>
  );
}
