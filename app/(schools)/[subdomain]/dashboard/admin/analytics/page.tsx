"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Clock, 
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  FileText,
  ChevronRight,
  Sparkles,
  Info
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTenant } from "@/components/providers/tenant-provider";
import { 
  getSchoolAnalytics, 
  SchoolAnalyticsData, 
  PriorityAlertItem 
} from "@/app/actions/analytics-actions";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { AnalyticsReportModal } from "@/components/admin/analytics-report-modal";

export default function AdminAnalyticsPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const { tenant, academicCycle } = useTenant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"7" | "30" | "term">("30");
  const [analyticsData, setAnalyticsData] = useState<SchoolAnalyticsData | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const loadAnalytics = useCallback(async (showRefreshing = false) => {
    if (!subdomain) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getSchoolAnalytics(
        subdomain,
        period,
        academicCycle?.academicYear,
        academicCycle?.currentTerm
      );

      if (res.success && res.data) {
        setAnalyticsData(res.data);
      } else {
        toast.error(res.error || "Failed to load school analytics");
      }
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
      toast.error(err.message || "Failed to load school analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subdomain, period, academicCycle?.academicYear, academicCycle?.currentTerm]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const activeTermLabel = analyticsData?.academicCycle?.termLabel || 
    (academicCycle ? (academicCycle.currentTerm === 1 ? "1st Term" : academicCycle.currentTerm === 2 ? "2nd Term" : "3rd Term") : "Current Term");

  const activeSessionLabel = analyticsData?.academicCycle?.academicYear || 
    academicCycle?.academicYear || "2026/2027";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5">
              Institutional Intelligence
            </Badge>
            {tenant?.name && (
              <span className="text-xs font-medium text-muted-foreground">• {tenant.name}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">School Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Real-time executive performance monitoring across attendance health, academic evaluations, and tuition realization.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Term Badge */}
          <div className="px-3.5 py-2 bg-card border border-border/80 rounded-xl text-xs font-bold text-foreground flex items-center gap-2 shadow-xs">
            <CalendarDays className="size-4 text-primary" />
            <span>{activeSessionLabel} • {activeTermLabel}</span>
          </div>

          {/* Period Selector */}
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[140px] h-10 bg-card border-border/80 text-xs font-semibold rounded-xl">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7" className="text-xs font-medium">Last 7 Days</SelectItem>
              <SelectItem value="30" className="text-xs font-medium">Last 30 Days</SelectItem>
              <SelectItem value="term" className="text-xs font-medium">Full Term</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(true)}
            disabled={loading || refreshing}
            className="h-10 px-3.5 border-border/80 text-foreground hover:bg-muted font-medium text-xs rounded-xl"
          >
            <RefreshCw className={`size-3.5 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Aggregating school intelligence...</p>
        </div>
      ) : !analyticsData ? (
        <div className="py-24 text-center">
          <Info className="size-10 mx-auto text-muted-foreground opacity-30 mb-2" />
          <p className="text-sm font-semibold text-foreground">Analytics data is currently unavailable.</p>
          <Button onClick={() => loadAnalytics()} className="mt-4 text-xs font-bold" variant="outline">
            Retry Loading
          </Button>
        </div>
      ) : (
        <>
          {/* 4 Executive KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Attendance */}
            <AnalyticsStatCard
              title="School Attendance"
              value={`${analyticsData.metrics.attendance.rate}%`}
              trend={analyticsData.metrics.attendance.totalRecords > 0 ? analyticsData.metrics.attendance.trend : undefined}
              isPositive={analyticsData.metrics.attendance.totalRecords > 0 ? analyticsData.metrics.attendance.rate >= 75 : undefined}
              icon={Clock}
              iconColor="text-blue-600 dark:text-blue-400"
              iconBg="bg-blue-500/10"
              description="Average student daily presence"
            />

            {/* Card 2: Academic Score */}
            <AnalyticsStatCard
              title="Academic Score"
              value={`${analyticsData.metrics.academics.avgScore}%`}
              trend={analyticsData.metrics.academics.totalResultsRecorded > 0 ? `Pass Rate: ${analyticsData.metrics.academics.passRate}%` : undefined}
              isPositive={analyticsData.metrics.academics.totalResultsRecorded > 0 ? analyticsData.metrics.academics.avgScore >= 60 : undefined}
              icon={GraduationCap}
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-500/10"
              description="Mean across term assessments"
            />

            {/* Card 3: Revenue Realization */}
            <AnalyticsStatCard
              title="Tuition Realization"
              value={`${analyticsData.metrics.finance.rate}%`}
              trend={`₦${analyticsData.metrics.finance.collected.toLocaleString()} in`}
              isPositive={analyticsData.metrics.finance.rate >= 50}
              icon={CreditCard}
              iconColor="text-indigo-600 dark:text-indigo-400"
              iconBg="bg-indigo-500/10"
              description="Fee collection efficiency"
            />

            {/* Card 4: Community Activity */}
            <AnalyticsStatCard
              title="School Community"
              value={analyticsData.metrics.community.totalStudents.toString()}
              trend={`${analyticsData.metrics.community.totalTeachers} Faculty`}
              isPositive={true}
              icon={Users}
              iconColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-500/10"
              description="Total enrolled student body"
            />
          </div>

          {/* Main Analytics Grid: Left Performance Trends & Right Priority Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column (2 Cols): Performance Trends Recharts Component */}
            <Card className="lg:col-span-2 border border-border/80 shadow-sm bg-card rounded-xl">
              <CardHeader className="p-6 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" /> Performance Trends
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Visual longitudinal progression across attendance, class standings, and fee inflows.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <AnalyticsCharts
                  trends={analyticsData.performanceTrends}
                  classComparisons={analyticsData.classComparisons}
                  collectedRevenue={analyticsData.metrics.finance.collected}
                  targetedRevenue={analyticsData.metrics.finance.targeted}
                />
              </CardContent>
            </Card>

            {/* Right Column (1 Col): Priority Observations & Report Trigger */}
            <Card className="lg:col-span-1 border border-border/80 shadow-sm bg-card rounded-xl flex flex-col justify-between p-6 min-h-[440px]">
              <div className="space-y-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" /> Priority Observations
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Real-time operational anomalies requiring administrative action.
                  </CardDescription>
                </div>

                {analyticsData.priorityAlerts.length === 0 ? (
                  <div className="py-12 text-center p-4 rounded-xl bg-muted/20 border border-border/60">
                    <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-2" />
                    <p className="text-xs font-bold text-foreground">All Systems Operational</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      No critical attendance dips or unverified financial transactions detected.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analyticsData.priorityAlerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                )}
              </div>

              {/* Term Report Generation CTA */}
              <div className="pt-6 mt-6 border-t border-border/60 space-y-2">
                <Button
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="size-4" /> Generate Term Executive Report
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Generates an official print-ready briefing for principals and governors.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Term Executive Summary Modal */}
      <AnalyticsReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        schoolName={tenant?.name || "Klaxtrix School"}
        data={analyticsData}
      />

    </div>
  );
}

function AnalyticsStatCard({
  title,
  value,
  trend,
  isPositive,
  icon: Icon,
  iconColor,
  iconBg,
  description,
}: {
  title: string;
  value: string;
  trend?: string;
  isPositive?: boolean;
  icon: any;
  iconColor: string;
  iconBg: string;
  description: string;
}) {
  return (
    <Card className="bg-card border-border/80 shadow-sm p-4 rounded-xl relative overflow-hidden transition-all duration-200 hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className={`size-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
          <Icon className="size-4" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold text-foreground">
          {value}
        </span>

        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-0.5 ${
            isPositive === undefined
              ? "bg-muted text-muted-foreground border-border"
              : isPositive 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          }`}>
            {isPositive !== undefined && (isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />)}
            {trend}
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-1">
        {description}
      </p>
    </Card>
  );
}

function AlertCard({ alert }: { alert: PriorityAlertItem }) {
  const isHigh = alert.severity === "high";
  const isMedium = alert.severity === "medium";

  return (
    <div className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
      isHigh 
        ? "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300" 
        : isMedium 
        ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {isHigh ? (
            <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : isMedium ? (
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h5 className="font-bold leading-tight">{alert.title}</h5>
            <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">{alert.description}</p>
          </div>
        </div>
      </div>

      <div className="pt-1.5 border-t border-current/10 flex justify-end">
        <Link
          href={alert.actionUrl}
          className="inline-flex items-center gap-1 text-[11px] font-bold underline hover:opacity-80"
        >
          {alert.actionLabel} <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
