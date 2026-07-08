"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CreditCard,
  Bell,
  Loader2,
  ChevronRight,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Smartphone,
  Megaphone,
  Calendar
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
import { useTenant } from "@/components/providers/tenant-provider";
import { toast } from "sonner";
import { formatNGN, getBackendUrl } from "@/lib/utils";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParentChildren, type ParentChild } from "@/hooks/use-parent-children";
import { useHouseholdOverview } from "@/hooks/use-household-overview";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { EmptyState, ErrorState } from "@/components/dashboard/query-states";

interface Bulletin {
  _id: string;
  title: string;
  message: string;
  channel: string;
  createdAt: string;
}

export default function ParentDashboardPage() {
  const { children, loading, error, refetch } = useParentChildren();
  const { supabase, academicCycle } = useTenant();
  const { outstandingBalance, childStats, performanceData, loading: overviewLoading } = useHouseholdOverview();
  const [parentName, setParentName] = useState("");
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const fetchBulletins = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setParentName(session.user.user_metadata?.full_name || "Parent");

        const res = await fetch(`${getBackendUrl()}/broadcasts`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const result = await res.json();
        if (result.success && result.data) {
          setBulletins(result.data);
        }
      } catch (e) {
        console.error("Failed to fetch bulletins:", e);
      }
    };
    fetchBulletins();
  }, [supabase]);

  const isLoading = loading || overviewLoading;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-primary italic uppercase">Family Overview</h1>
          <p className="text-muted-foreground mt-2 text-xl font-medium max-w-2xl opacity-80">
            Welcome back, {parentName}. Here's how your children are doing in school.
          </p>
        </div>
        <div className="size-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-2xl animate-pulse">
           <Users className="size-10 text-primary" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center gap-4">
           <Loader2 className="size-16 animate-spin text-primary/20" />
           <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading...</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No children linked yet"
          message="Please contact the school to link your children to your account."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
           <div className="xl:col-span-2 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {children.map((child) => (
                    <ChildOverviewCard
                      key={child.id}
                      child={child}
                      stats={childStats[child.id]}
                    />
                 ))}
              </div>

              <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
                 <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                    <div>
                       <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-primary">Performance Trends</CardTitle>
                       <CardDescription className="text-base font-medium opacity-80">Average scores across all your children over recent terms.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-2xl border border-border shadow-md">
                       <TrendingUp className="size-5 text-primary" />
                    </Button>
                 </CardHeader>
                 <CardContent className="p-10 pt-10">
                    <PerformanceChart data={performanceData} />
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
                       <p className="text-white/70 font-bold mt-2 uppercase tracking-widest text-[9px]">
                         Outstanding · {academicCycle?.academicYear || ""} Term {academicCycle?.currentTerm || 1}
                       </p>
                    </div>
                    <div className="text-6xl font-black tabular-nums tracking-tighter">
                       {formatNGN(outstandingBalance)}
                    </div>
                    <Button asChild className="w-full h-16 bg-white text-primary hover:bg-white/90 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all active:scale-95 uppercase tracking-tighter italic">
                       <Link href="/dashboard/parent/finance">
                          {outstandingBalance > 0 ? "Pay Fees" : "All Settled"}
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
                    {bulletins.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-xs font-black uppercase tracking-widest opacity-45">
                         No notices yet
                      </div>
                    ) : (
                      bulletins.slice(0, 3).map((bulletin) => {
                        const dateObj = new Date(bulletin.createdAt);
                        const month = dateObj.toLocaleString('en-US', { month: 'short' });
                        const day = dateObj.getDate();
                        const formattedDate = `${month} ${day}`;
                        return (
                          <div key={bulletin._id} onClick={() => setSelectedBulletin(bulletin)} className="cursor-pointer">
                            <BulletinItem
                              title={bulletin.title}
                              date={formattedDate}
                              type={bulletin.channel}
                            />
                          </div>
                        );
                      })
                    )}
                 </div>
              </Card>
           </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedBulletin} onOpenChange={(open) => !open && setSelectedBulletin(null)}>
        <DialogContent className="max-w-md rounded-2xl border bg-card p-6 shadow-lg">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                {selectedBulletin?.channel === 'sms' ? <Smartphone className="size-3" /> : selectedBulletin?.channel === 'system' ? <Bell className="size-3" /> : <Megaphone className="size-3" />}
                {selectedBulletin?.channel}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 pr-6">
                <Calendar className="size-3" />
                {selectedBulletin && new Date(selectedBulletin.createdAt).toLocaleDateString()}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold leading-snug">
              {selectedBulletin?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedBulletin?.message}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChildOverviewCard({ child, stats }: { child: ParentChild; stats?: { attendancePct: number | null; avgGrade: string | null; avgScore: number | null } }) {
  const profile = child.profiles;
  const className = child.classes?.name || "Unassigned";

  return (
    <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 text-left">
      <div className="h-2 bg-primary group-hover:h-3 transition-all" />
      <CardHeader className="p-8 pb-4 flex flex-row items-center gap-5">
        <Avatar className="size-20 rounded-[2rem] border-4 border-background group-hover:rotate-6 transition-transform shadow-xl">
           <AvatarImage src={profile?.avatar_url || undefined} />
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
               <p className="text-lg font-black text-foreground">
                 {stats?.attendancePct !== null && stats?.attendancePct !== undefined
                   ? `${stats.attendancePct}%`
                   : "—"}
               </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 text-left">
               <div className="flex items-center gap-2 mb-1 justify-start">
                  <TrendingUp className="size-3 text-primary" />
                  <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Avg Grade</span>
               </div>
               <p className="text-lg font-black text-foreground">
                 {stats?.avgGrade || "—"}
               </p>
            </div>
         </div>
         <Button asChild variant="ghost" className="w-full mt-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-primary group-hover:bg-primary/5">
            <Link href={`/dashboard/parent/children/${child.id}`}>
               View Profile <ChevronRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
         </Button>
      </CardContent>
    </Card>
  );
}

function BulletinItem({ title, date, type }: { title: string; date: string; type: string }) {
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
