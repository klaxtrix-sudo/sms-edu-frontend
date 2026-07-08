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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* 1. Hero Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 bg-primary/5 text-primary border-primary/20 font-bold text-xs uppercase tracking-wider">
              Parent Portal
            </Badge>
            {academicCycle && (
              <Badge variant="outline" className="rounded-full px-3 py-1 bg-slate-100 text-slate-700 border-slate-200 font-medium text-xs">
                {academicCycle.academicYear} · Term {academicCycle.currentTerm}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase">
            Family Overview
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl">
            Welcome back, {parentName}. Here is how your children are progressing this session.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
            <Users className="size-8 text-primary" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center gap-4 bg-white rounded-3xl border border-slate-100">
          <Loader2 className="size-12 animate-spin text-primary" />
          <p className="font-bold text-muted-foreground tracking-wider uppercase text-xs">Loading household overview...</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No children linked yet"
          message="Please contact the school administration to link your children to your account."
        />
      ) : (
        <div className="space-y-12">
          {/* 2. Vertically Stacked: My Children Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  My Children
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Individual academic profile, attendance, and performance summary
                </p>
              </div>
              <Badge variant="secondary" className="font-bold text-xs px-3 py-1">
                {children.length} {children.length === 1 ? "Child" : "Children"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children.map((child) => (
                <ChildOverviewCard
                  key={child.id}
                  child={child}
                  stats={childStats[child.id]}
                />
              ))}
            </div>
          </section>

          {/* 3. Vertically Stacked: Financial Standing */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                Financial Standing
              </h2>
              <p className="text-sm font-medium text-muted-foreground">
                Current school fee status across your household
              </p>
            </div>

            <Card className="border border-slate-100 shadow-md bg-white rounded-3xl overflow-hidden">
              <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
                    <CreditCard className="size-7 text-white" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                      Total Outstanding Balance
                    </span>
                    <div className="text-4xl md:text-5xl font-black tracking-tight">
                      {formatNGN(outstandingBalance)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl ${outstandingBalance > 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
                    {outstandingBalance > 0 ? "Payment Required" : "All Settled"}
                  </Badge>
                  <Button asChild className="h-12 px-6 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md">
                    <Link href="/dashboard/parent/finance">
                      {outstandingBalance > 0 ? "Pay Fees Now" : "View Fee History"}
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          {/* 4. Vertically Stacked: Academic Performance Trends */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                Academic Performance Trends
              </h2>
              <p className="text-sm font-medium text-muted-foreground">
                Average scores across all your children over recent terms
              </p>
            </div>

            <Card className="border border-slate-100 shadow-md bg-white rounded-3xl overflow-hidden">
              <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                    Performance Analytics
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-muted-foreground">
                    Combined average grade trends
                  </CardDescription>
                </div>
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/15">
                  <TrendingUp className="size-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <PerformanceChart data={performanceData} />
              </CardContent>
            </Card>
          </section>

          {/* 5. Vertically Stacked: School Bulletins & Announcements */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  School Bulletins
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Latest announcements and official school communication
                </p>
              </div>
              <Bell className="size-5 text-primary" />
            </div>

            <Card className="border border-slate-100 shadow-md bg-white rounded-3xl p-8">
              {bulletins.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  No notices available right now
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {bulletins.slice(0, 5).map((bulletin) => {
                    const dateObj = new Date(bulletin.createdAt);
                    const month = dateObj.toLocaleString('en-US', { month: 'short' });
                    const day = dateObj.getDate();
                    const formattedDate = `${month} ${day}`;
                    return (
                      <div
                        key={bulletin._id}
                        onClick={() => setSelectedBulletin(bulletin)}
                        className="py-4 first:pt-0 last:pb-0 cursor-pointer hover:bg-slate-50/80 rounded-xl px-3 transition-colors"
                      >
                        <BulletinItem
                          title={bulletin.title}
                          date={formattedDate}
                          type={bulletin.channel}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedBulletin} onOpenChange={(open) => !open && setSelectedBulletin(null)}>
        <DialogContent className="max-w-md rounded-2xl border bg-card p-6 shadow-lg">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full capitalize">
                {selectedBulletin?.channel === 'sms' ? <Smartphone className="size-3.5" /> : selectedBulletin?.channel === 'system' ? <Bell className="size-3.5" /> : <Megaphone className="size-3.5" />}
                {selectedBulletin?.channel}
              </span>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {selectedBulletin && new Date(selectedBulletin.createdAt).toLocaleDateString()}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold leading-snug text-slate-900">
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
    <Card className="border border-slate-100 shadow-sm hover:shadow-md bg-white rounded-3xl overflow-hidden transition-all duration-300 text-left flex flex-col justify-between">
      <div>
        <CardHeader className="p-6 pb-4 flex flex-row items-center gap-4">
          <Avatar className="size-16 rounded-2xl border border-slate-100 shadow-sm">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl uppercase">
              {profile?.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20 font-bold text-[10px] uppercase tracking-wider mb-1">
              {className}
            </Badge>
            <CardTitle className="text-lg font-bold text-slate-900 truncate uppercase">
              {profile?.full_name}
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
              Admission: {child.admission_no}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <div className="grid grid-cols-2 gap-3 mt-2 text-left">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-left">
              <div className="flex items-center gap-1.5 mb-1 justify-start">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Attendance</span>
              </div>
              <p className="text-lg font-black text-slate-900">
                {stats?.attendancePct !== null && stats?.attendancePct !== undefined
                  ? `${stats.attendancePct}%`
                  : "—"}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-left">
              <div className="flex items-center gap-1.5 mb-1 justify-start">
                <TrendingUp className="size-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Avg Grade</span>
              </div>
              <p className="text-lg font-black text-slate-900">
                {stats?.avgGrade || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </div>
      <div className="p-6 pt-0">
        <Button asChild variant="outline" className="w-full rounded-xl font-bold uppercase tracking-wider text-xs text-primary border-primary/20 hover:bg-primary/5">
          <Link href={`/dashboard/parent/children/${child.id}`}>
            View Profile <ChevronRight className="ml-1.5 size-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function BulletinItem({ title, date, type }: { title: string; date: string; type: string }) {
  return (
    <div className="flex items-center gap-4 group cursor-pointer text-left">
      <div className="size-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-700 group-hover:bg-primary group-hover:text-white transition-all min-w-[3rem]">
        <span className="text-[10px] font-bold uppercase tracking-tight leading-none">{date.split(' ')[0]}</span>
        <span className="text-sm font-black">{date.split(' ')[1]}</span>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h5 className="text-sm font-bold leading-snug text-slate-900 group-hover:text-primary transition-colors truncate">
          {title}
        </h5>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {type}
        </span>
      </div>
    </div>
  );
}
