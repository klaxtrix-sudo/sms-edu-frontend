import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  Plus, 
  TrendingUp, 
  ClipboardCheck,
  Megaphone
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

  // Multi-tenant safe ID resolution: fallback to tenantKeys.id if metadata is absent
  const schoolId = tenantKeys.id || user.user_metadata?.school_id;

  // Format local display date
  const now = new Date();
  const formattedDate = now.toLocaleDateString(undefined, { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

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
    if (session.session?.access_token) {
      const response = await fetch(`${getBackendUrl()}/stats/school/${schoolId}/performance`, {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
        cache: 'no-store'
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          performanceData = result.data;
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch performance data:', error);
  }

  // Fetch broadcasts server-side to pass into RecentBulletins
  let initialBulletins: any[] = [];
  try {
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.access_token) {
      const bRes = await fetch(`${getBackendUrl()}/broadcasts`, {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
        cache: 'no-store'
      });
      if (bRes.ok) {
        const bResult = await bRes.json();
        if (bResult.success) {
          initialBulletins = bResult.data || [];
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch server broadcasts:', error);
  }

  const stats = [
    { label: "Teachers", value: String(teachersCount.count ?? 0), icon: Users, color: "from-blue-500 to-indigo-600", href: "/dashboard/admin/users/teachers" },
    { label: "Students", value: String(studentsCount.count ?? 0), icon: GraduationCap, color: "from-emerald-500 to-teal-600", href: "/dashboard/admin/users/students" },
    { label: "Classes", value: String(classesCount.count ?? 0), icon: School, color: "from-amber-500 to-orange-600", href: "/dashboard/admin/academics" },
    { label: "Subjects", value: String(subjectsCount.count ?? 0), icon: BookOpen, color: "from-purple-500 to-violet-600", href: "/dashboard/admin/academics" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      
      {/* Executive Overview Header */}
      <header className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-border/50 bg-card/40 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg group">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Institution Overview</span>
            <span className="size-1 rounded-full bg-border" />
            <span className="text-xs font-medium text-muted-foreground">{subdomain}.klaxtrix.site</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">{tenantKeys.name}</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            Administrative overview and academic analytics for the active session.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <div className="text-left sm:text-right">
            <div className="text-xs sm:text-sm font-bold text-foreground">
              {formattedDate}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium flex items-center sm:justify-end gap-1.5 mt-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Academic Portal Active
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-20 -right-20 size-48 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-colors pointer-events-none" />
      </header>

      {/* Modern Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* LARGE BENTO CELL: Institutional Growth / Performance Chart */}
        <div className="md:col-span-2 lg:col-span-2 rounded-2xl sm:rounded-3xl overflow-hidden border border-border/50 bg-card/40 backdrop-blur-xl shadow-xl hover:border-border/80 transition-all">
          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-black flex items-center gap-2 text-foreground">
                  <TrendingUp className="size-5 text-primary" />
                  Academic Performance
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Aggregated assessment averages by month</p>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                Assessment Trends
              </Badge>
            </div>
            <PerformanceChart data={performanceData} />
          </div>
        </div>

        {/* SMALL BENTO CELLS: Core Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:col-span-2 lg:col-span-2 gap-4">
          {stats.map((stat) => (
            <Link 
              key={stat.label} 
              href={stat.href}
              className="rounded-2xl p-5 border border-border/50 bg-card/40 backdrop-blur-xl group hover:border-primary/40 hover:translate-y-[-2px] transition-all shadow-md overflow-hidden block"
            >
              <div className={`size-10 rounded-xl bg-gradient-to-br ${stat.color} p-2.5 mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                <stat.icon className="size-full text-white" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <div className="text-2xl sm:text-3xl font-black text-foreground">{stat.value}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* MEDIUM BENTO CELL: Quick Action Command Center */}
        <div className="lg:col-span-1 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 border border-border/50 bg-card/40 backdrop-blur-xl shadow-xl">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-foreground">Quick Actions</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Frequently accessed administrative tools</p>
          </div>
          <div className="space-y-2.5">
            <Button variant="outline" className="w-full justify-start gap-2.5 h-11 rounded-xl bg-background/50 border-border/60 hover:bg-primary hover:text-white hover:border-primary transition-all font-bold text-xs" asChild>
              <Link href="/dashboard/admin/users/students">
                <Plus className="size-4" />
                Enroll Student
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2.5 h-11 rounded-xl bg-background/50 border-border/60 hover:bg-primary hover:text-white hover:border-primary transition-all font-bold text-xs" asChild>
              <Link href="/dashboard/admin/attendance">
                <ClipboardCheck className="size-4" />
                Review Attendance
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2.5 h-11 rounded-xl bg-background/50 border-border/60 hover:bg-primary hover:text-white hover:border-primary transition-all font-bold text-xs" asChild>
              <Link href="/dashboard/admin/communications">
                <Megaphone className="size-4" />
                Post Announcement
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2.5 h-11 rounded-xl bg-background/50 border-border/60 hover:bg-primary hover:text-white hover:border-primary transition-all font-bold text-xs" asChild>
              <Link href="/dashboard/admin/academics/results">
                <TrendingUp className="size-4" />
                Generate Reports
              </Link>
            </Button>
          </div>
        </div>

        {/* LARGE BENTO CELL: Recent Bulletins & Announcements */}
        <RecentBulletins initialBulletins={initialBulletins} />

      </div>
    </div>
  );
}
