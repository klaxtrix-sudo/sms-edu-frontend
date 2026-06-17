"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  Clock, 
  Bell, 
  Loader2,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Calendar,
  Wallet,
  CheckCircle2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState("");
  const supabase = createTenantClient();

  useEffect(() => {
    fetchHouseholdData();
  }, []);

  const fetchHouseholdData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setParentName(session.user.user_metadata?.full_name || "Parent");

      // Fetch Linked Children (parent_id references profiles.id, which is session.user.id)
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          admission_no,
          user_id,
          classes (name),
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("parent_id", session.user.id);

      if (studentError) throw studentError;
      setChildren(students || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load household data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-primary italic uppercase">Household Intelligence</h1>
          <p className="text-muted-foreground mt-2 text-xl font-medium max-w-2xl opacity-80">
            Welcome back, {parentName}. Monitor your children's educational progress and financial status.
          </p>
        </div>
        <div className="size-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-2xl animate-pulse">
           <Users className="size-10 text-primary" />
        </div>
      </div>

      {loading ? (
        <div className="py-40 flex flex-col items-center gap-4">
           <Loader2 className="size-16 animate-spin text-primary/20" />
           <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Syncing Household Records...</p>
        </div>
      ) : children.length === 0 ? (
        <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-20 text-center">
           <Users className="size-20 mx-auto text-muted-foreground opacity-10 mb-6" />
           <h3 className="text-2xl font-black">No Linked Students Found</h3>
           <p className="text-muted-foreground mt-2 font-medium">Please contact the school administrator to link your children to your account.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
           <div className="xl:col-span-2 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {children.map((child) => (
                   <ChildOverviewCard key={child.id} child={child} />
                 ))}
              </div>

              <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
                 <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                    <div>
                       <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-primary">Academic Trajectory</CardTitle>
                       <CardDescription className="text-base font-medium opacity-80">Aggregate performance trends across all enrolled children.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-2xl border border-border shadow-md">
                       <TrendingUp className="size-5 text-primary" />
                    </Button>
                 </CardHeader>
                 <CardContent className="p-10 pt-10 h-[300px] flex items-end justify-around gap-2 bg-gradient-to-t from-primary/5 to-transparent">
                    {/* Placeholder for aggregate chart */}
                    {[40, 60, 55, 80, 75, 90, 85].map((h, i) => (
                      <div key={i} className="w-full bg-primary/10 rounded-xl hover:bg-primary transition-all duration-500" style={{ height: `${h}%` }} />
                    ))}
                 </CardContent>
              </Card>
           </div>

           <div className="xl:col-span-1 space-y-10 focus-within:">
              <Card className="border-none shadow-4xl bg-primary text-white p-10 rounded-[3.5rem] relative overflow-hidden group">
                 <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                    <Wallet size={250} />
                 </div>
                 <div className="relative z-10 space-y-8">
                    <div className="size-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                       <CreditCard className="size-8" />
                    </div>
                    <div>
                       <h3 className="text-3xl font-black tracking-tighter italic uppercase leading-tight">Financial Health</h3>
                       <p className="text-white/70 font-bold mt-2 uppercase tracking-widest text-[9px]">Term 2 Balance</p>
                    </div>
                    <div className="text-6xl font-black tabular-nums tracking-tighter">₦125,400</div>
                    <Button asChild className="w-full h-16 bg-white text-primary hover:bg-white/90 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all active:scale-95 uppercase tracking-tighter italic">
                       <Link href="/dashboard/parent/finance">
                          Settle Fees
                       </Link>
                    </Button>
                 </div>
              </Card>

              <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-10">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black tracking-tighter uppercase italic text-primary">School Bulletins</h3>
                    <Bell className="size-5 text-primary/40 animate-swing" />
                 </div>
                 <div className="space-y-6">
                    <BulletinItem 
                      title="Term 2 Examination Schedule" 
                      date="Mar 20" 
                      type="academic"
                    />
                    <BulletinItem 
                      title="Parent-Teacher Conference" 
                      date="Mar 25" 
                      type="event"
                    />
                    <BulletinItem 
                      title="Mid-Term Break Announcement" 
                      date="Apr 02" 
                      type="holiday"
                    />
                 </div>
              </Card>
           </div>
        </div>
      )}
    </div>
  );
}

function ChildOverviewCard({ child }: { child: any }) {
  const profile = (child as any).profiles;
  const className = (child as any).classes?.name || "Unassigned";

  return (
    <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 text-left">
      <div className="h-2 bg-primary group-hover:h-3 transition-all" />
      <CardHeader className="p-8 pb-4 flex flex-row items-center gap-5">
        <Avatar className="size-20 rounded-[2rem] border-4 border-background group-hover:rotate-6 transition-transform shadow-xl">
           <AvatarImage src={profile?.avatar_url} />
           <AvatarFallback className="bg-primary/5 text-primary font-black text-2xl uppercase tracking-tighter">
             {profile?.full_name?.charAt(0)}
           </AvatarFallback>
        </Avatar>
        <div>
           <Badge variant="outline" className="rounded-full px-3 py-1 bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest mb-2">
              {className}
           </Badge>
           <CardTitle className="text-2xl font-black leading-tight group-hover:text-primary transition-colors italic uppercase">{profile?.full_name}</CardTitle>
           <CardDescription className="text-xs font-bold opacity-60 uppercase tracking-widest mt-1">Admission: {child.admission_no}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-4">
         <div className="grid grid-cols-2 gap-4 mt-4 text-left">
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 text-left">
               <div className="flex items-center gap-2 mb-1 justify-start">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Attendance</span>
               </div>
               <p className="text-lg font-black text-foreground">94%</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 text-left">
               <div className="flex items-center gap-2 mb-1 justify-start">
                  <TrendingUp className="size-3 text-primary" />
                  <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Avg Grid</span>
               </div>
               <p className="text-lg font-black text-foreground">B+</p>
            </div>
         </div>
         <Button asChild variant="ghost" className="w-full mt-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-primary group-hover:bg-primary/5">
            <Link href={`/dashboard/parent/children/${child.id}`}>
               Examine Profile <ChevronRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
         </Button>
      </CardContent>
    </Card>
  );
}

function BulletinItem({ title, date, type }: any) {
  return (
    <div className="flex items-center gap-4 group cursor-pointer text-left">
       <div className="size-12 rounded-2xl bg-muted/50 border border-border flex flex-col items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all min-w-[3rem]">
          <span className="text-[9px] font-black uppercase tracking-tighter leading-none">{date.split(' ')[0]}</span>
          <span className="text-sm font-black italic">{date.split(' ')[1]}</span>
       </div>
       <div className="flex-1 border-b border-border/50 pb-4 group-last:border-none text-left">
          <h5 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors italic">{title}</h5>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{type}</span>
       </div>
    </div>
  );
}
