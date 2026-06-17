"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  GraduationCap, 
  Clock, 
  Bell, 
  Loader2,
  ChevronRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ClipboardCheck,
  FileText,
  Bookmark,
  Smartphone,
  Megaphone
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/components/providers/tenant-provider";
import { toast } from "sonner";
import { cn, getBackendUrl } from "@/lib/utils";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TeacherDashboardPage() {
  const { supabase, tenant, academicCycle, isLoading: isTenantLoading } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState("");
  const [profile, setProfile] = useState<any>(null);
  
  // States for stats and records
  const [formClasses, setFormClasses] = useState<any[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, { marked: boolean, present: number, absent: number }>>({});
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [selectedBulletin, setSelectedBulletin] = useState<any | null>(null);

  useEffect(() => {
    if (supabase) {
      fetchDashboardData();
    }
  }, [supabase]);

  const fetchDashboardData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Get current user session details
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const user = session.user;
      setTeacherName(user.user_metadata?.full_name || "Teacher");

      // 2. Fetch profile details
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // 3. Fetch classes where this teacher is the Form Teacher
      const { data: classesManaged } = await supabase
        .from("classes")
        .select("*")
        .eq("class_teacher_id", user.id);
      
      const formClassesList = classesManaged || [];
      setFormClasses(formClassesList);

      // 4. Fetch all classrooms in school (for mapping/listing names)
      const { data: schoolClasses } = await supabase
        .from("classes")
        .select("*");
      const allClassesList = schoolClasses || [];
      setAllClasses(allClassesList);

      const classMap = new Map<string, string>();
      allClassesList.forEach(c => classMap.set(c.id, c.name));

      // 5. Fetch timetable slots for this teacher
      const { data: scheduleSlots, error: timetableError } = await supabase
        .from("timetables")
        .select(`
          *,
          subjects(name, code),
          classes(name)
        `)
        .eq("teacher_id", user.id)
        .order("start_time", { ascending: true });

      if (timetableError) throw timetableError;
      const timetableList = scheduleSlots || [];
      setTimetableSlots(timetableList);

      // 6. Gather all unique class IDs the teacher interacts with (form classes + teaching classes)
      const classIds = new Set<string>();
      formClassesList.forEach(c => classIds.add(c.id));
      timetableList.forEach(t => classIds.add(t.class_id));

      // 7. Get total student headcount inside their managed form classes
      if (formClassesList.length > 0) {
        const { data: studentsList } = await supabase
          .from("students")
          .select("id")
          .in("class_id", formClassesList.map(c => c.id));
        setTotalStudents(studentsList?.length || 0);
      } else {
        setTotalStudents(0);
      }

      // 8. Fetch daily attendance status for today for managed form classes
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("class_id, status")
        .eq("date", todayStr);

      const attnStatus: Record<string, { marked: boolean, present: number, absent: number }> = {};
      formClassesList.forEach(c => {
        attnStatus[c.id] = { marked: false, present: 0, absent: 0 };
      });
      (todayAttendance || []).forEach(a => {
        if (attnStatus[a.class_id]) {
          attnStatus[a.class_id].marked = true;
          if (a.status === 'present' || a.status === 'late') {
            attnStatus[a.class_id].present++;
          } else {
            attnStatus[a.class_id].absent++;
          }
        }
      });
      setAttendanceStatus(attnStatus);

      // 9. Fetch MongoDB assignments for all teacher's classrooms
      const allClassIds = Array.from(classIds);
      const allAssignments: any[] = [];
      if (allClassIds.length > 0) {
        for (const cid of allClassIds) {
          try {
            const res = await fetch(`${getBackendUrl()}/assignments/class/${cid}`, {
              headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            const result = await res.json();
            if (result.success && result.data) {
              allAssignments.push(...result.data);
            }
          } catch (e) {
            console.error(`Failed to fetch assignments for class ${cid}:`, e);
          }
        }
      }

      // Sort assignments by creation date descending
      const sortedAssignments = allAssignments.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Fetch submission/graded statistics for the top 3 assignments
      const topAssignments = sortedAssignments.slice(0, 3);
      const assignmentsWithCounts = await Promise.all(
        topAssignments.map(async (assign) => {
          try {
            const subRes = await fetch(`${getBackendUrl()}/assignments/${assign._id}/submissions`, {
              headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            const subResult = await subRes.json();
            const subs = subResult.success ? subResult.data : [];
            return {
              ...assign,
              className: classMap.get(assign.classId) || "Unknown Class",
              submissionCount: subs.length,
              gradedCount: subs.filter((s: any) => s.status === 'graded').length
            };
          } catch (e) {
            return {
              ...assign,
              className: classMap.get(assign.classId) || "Unknown Class",
              submissionCount: 0,
              gradedCount: 0
            };
          }
        })
      );

      setRecentAssignments(assignmentsWithCounts);

      // 10. Fetch MongoDB broadcasts/bulletins for the active school and targeted role
      try {
        const bulletinRes = await fetch(`${getBackendUrl()}/broadcasts`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const bulletinResult = await bulletinRes.json();
        if (bulletinResult.success && bulletinResult.data) {
          setBulletins(bulletinResult.data);
        }
      } catch (e) {
        console.error("Failed to fetch bulletins:", e);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sync teacher dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Timeline Schedule Day logic
  const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isWeekend = currentDay === 0 || currentDay === 6;
  const targetScheduleDay = isWeekend ? 1 : currentDay; // Default to Monday on weekends

  const todayPeriods = timetableSlots.filter(
    (slot) => slot.day_of_week === targetScheduleDay
  );

  const getDayLabel = (dayNum: number) => {
    const labels: Record<number, string> = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
      0: "Sunday"
    };
    return labels[dayNum] || "Day";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Teacher Overview
          </h1>
          <p className="text-muted-foreground mt-1.5 text-base font-normal max-w-2xl">
            Welcome back, {teacherName}. Here is what's happening in your classrooms today.
          </p>
        </div>
        <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
          <GraduationCap className="size-6 text-primary" />
        </div>
      </div>

      {loading || isTenantLoading ? (
        <div className="py-40 flex flex-col items-center gap-4">
          <Loader2 className="size-16 animate-spin text-primary/20" />
          <p className="font-semibold text-muted-foreground animate-pulse tracking-wider text-xs">
            Syncing Teacher Intelligence...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* 2. Metrics Grid (Spans the whole horizontal space) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="My Form Classes" 
              value={formClasses.length} 
              icon={Users} 
              color="blue" 
              description={formClasses.map(c => c.name).join(", ") || "None assigned"}
            />
            <StatCard 
              label="Assigned Students" 
              value={totalStudents} 
              icon={GraduationCap} 
              color="emerald" 
              description="In managed classes"
            />
            <StatCard 
              label="Today's Periods" 
              value={todayPeriods.length} 
              icon={Clock} 
              color="amber" 
              description={isWeekend ? "Monday (Weekend view)" : "Scheduled today"}
            />
            <StatCard 
              label="Active Assignments" 
              value={recentAssignments.length} 
              icon={BookOpen} 
              color="indigo" 
              description="In Homework Hub"
            />
          </div>

          {/* 3. Teaching Schedule & Quick Actions (Side-by-side grid layout) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Teaching Schedule (takes up 2 columns) */}
            <div className="xl:col-span-2">
              <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card h-full flex flex-col">
                <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Teaching Schedule
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Your periods for {isWeekend ? "Monday (Next Week)" : "Today"} ({getDayLabel(targetScheduleDay)})
                    </CardDescription>
                  </div>
                  {isWeekend && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 rounded-full font-semibold text-[10px]">
                      Weekend View
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4 flex-1">
                  {todayPeriods.length === 0 ? (
                    <div className="border border-dashed border-border/80 rounded-xl p-8 text-center text-muted-foreground h-full flex flex-col justify-center items-center">
                      <Clock className="size-8 opacity-30 mb-3" />
                      <p className="font-semibold text-sm">No periods scheduled for {getDayLabel(targetScheduleDay)}.</p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Enjoy your prep time!</p>
                    </div>
                  ) : (
                    <div className="relative border-l border-primary/25 ml-2 pl-6 space-y-6">
                      {todayPeriods.map((period) => (
                        <div key={period.id} className="relative group">
                          {/* Dot indicator */}
                          <div className="absolute -left-[31px] top-1.5 size-3 rounded-full bg-primary border-2 border-background group-hover:scale-125 transition-transform" />
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/50 border border-border/50 hover:bg-slate-50 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary hover:bg-primary/15 rounded-lg font-semibold text-xs">
                                  {period.classes?.name}
                                </Badge>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {period.subjects?.code}
                                </span>
                              </div>
                              <h4 className="text-base font-semibold mt-1 text-foreground">
                                {period.subjects?.name}
                              </h4>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-primary/60" />
                                {period.start_time.slice(0, 5)} - {period.end_time.slice(0, 5)}
                              </div>
                              {period.room && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="size-3.5 text-primary/45" />
                                  {period.room}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions (takes up 1 column) */}
            <div className="xl:col-span-1">
              <Card className="border border-border/80 shadow-sm bg-card rounded-xl overflow-hidden h-full flex flex-col">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Access common administrative tasks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3 flex-1 flex flex-col justify-start">
                  <Button asChild variant="outline" className="w-full h-11 bg-background hover:bg-accent border border-border text-foreground hover:text-accent-foreground rounded-lg font-semibold text-sm transition-all flex items-center justify-start px-4 gap-3">
                    <Link href="/dashboard/teacher/attendance">
                      <ClipboardCheck className="size-4 text-primary" />
                      Mark Daily Attendance
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="w-full h-11 bg-background hover:bg-accent border border-border text-foreground hover:text-accent-foreground rounded-lg font-semibold text-sm transition-all flex items-center justify-start px-4 gap-3">
                    <Link href="/dashboard/teacher/assignments">
                      <BookOpen className="size-4 text-primary" />
                      Create Homework Assignment
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="w-full h-11 bg-background hover:bg-accent border border-border text-foreground hover:text-accent-foreground rounded-lg font-semibold text-sm transition-all flex items-center justify-start px-4 gap-3">
                    <Link href="/dashboard/teacher/timetable">
                      <Calendar className="size-4 text-primary" />
                      View Weekly Timetable
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
            
          </div>

          {/* 4. Classroom Manager (Spans the whole horizontal space) */}
          <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                Classroom Manager
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Quick status tracking for classrooms you manage as Form Teacher.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {formClasses.length === 0 ? (
                <div className="p-6 border border-dashed border-border/80 rounded-xl text-center text-muted-foreground">
                  <p className="font-semibold text-sm">You are not designated as Form Teacher for any classes.</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">Contact the administrator to assign you a form classroom.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formClasses.map((cls) => {
                    const status = attendanceStatus[cls.id] || { marked: false, present: 0, absent: 0 };
                    return (
                      <Card key={cls.id} className="border border-border/60 shadow-none bg-slate-50/20 rounded-xl p-5 hover:bg-slate-50/50 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="rounded-lg px-2.5 py-0.5 bg-primary/10 text-primary border-none font-semibold text-xs">
                            {cls.name}
                          </Badge>
                          {status.marked ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-none font-medium">
                              <CheckCircle2 className="size-3 mr-1" /> Marked
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 border-none font-medium">
                              <AlertCircle className="size-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-base font-semibold mb-1">Daily Attendance Tracker</h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          Check student presence logs for the school calendar day.
                        </p>
                        
                        {status.marked ? (
                          <div className="grid grid-cols-2 gap-2 text-center bg-background p-2.5 rounded-xl border border-border/60">
                            <div>
                              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Present</span>
                              <p className="text-base font-semibold text-emerald-600">{status.present}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Absent</span>
                              <p className="text-base font-semibold text-rose-600">{status.absent}</p>
                            </div>
                          </div>
                        ) : (
                          <Button asChild size="sm" className="w-full rounded-lg font-semibold text-xs h-9 shadow-sm">
                            <Link href="/dashboard/teacher/attendance">
                              Mark Attendance
                            </Link>
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Recent Homework Tasks (Spans the whole horizontal space) */}
          <Card className="border border-border/80 shadow-sm rounded-xl p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Tasks
              </h3>
              <BookOpen className="size-4 text-primary/60" />
            </div>
            
            <div className={cn(
              recentAssignments.length > 0 ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "space-y-4"
            )}>
              {recentAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs font-medium w-full col-span-3">
                  No active assignments listed.
                </div>
              ) : (
                recentAssignments.map((task) => (
                  <Link key={task._id} href={`/dashboard/teacher/assignments/${task._id}`} className="block group">
                    <div className="border border-border/60 hover:border-primary/40 p-4 rounded-xl flex items-start gap-3 bg-slate-50/20 hover:bg-slate-50/50 transition-all h-full">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform min-w-[2rem]">
                        <FileText className="size-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h5 className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-1">
                          {task.title}
                        </h5>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {task.className}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground/85">
                            Submissions: {task.submissionCount}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-4 self-center text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* 6. Notice Board (Spans the whole horizontal space) */}
          <Card className="border border-border/80 shadow-sm rounded-xl p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Notice Board
              </h3>
              <Bell className="size-4 text-primary/60" />
            </div>
            <div className={cn(
              bulletins.length > 0 ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "space-y-4"
            )}>
              {bulletins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs font-medium w-full col-span-3">
                  No active notices listed.
                </div>
              ) : (
                bulletins.slice(0, 3).map((bulletin) => (
                  <div key={bulletin._id} onClick={() => setSelectedBulletin(bulletin)} className="cursor-pointer">
                    <BulletinItem 
                      key={bulletin._id}
                      title={bulletin.title}
                      date={new Date(bulletin.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      type={bulletin.channel}
                    />
                  </div>
                ))
              )}
            </div>
          </Card>

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

// Sub-components

function StatCard({ label, value, icon: Icon, color, description }: any) {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100"
  };

  return (
    <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground tracking-tight">{label}</span>
          <div className={cn("p-1.5 rounded-lg", colorMap[color] || "bg-muted text-muted-foreground")}>
            <Icon className="size-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
          {description && (
            <p className="text-[10px] text-muted-foreground/80 mt-1 truncate">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BulletinItem({ title, date, type }: any) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer text-left p-4 rounded-xl border border-border/60 bg-slate-50/20 hover:bg-slate-50/50 transition-all">
      <div className="size-10 rounded-lg bg-muted border border-border/80 flex flex-col items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all min-w-[2.5rem]">
        <span className="text-[9px] font-semibold uppercase leading-none">{date.split(' ')[0]}</span>
        <span className="text-xs font-bold mt-0.5">{date.split(' ')[1]}</span>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h5 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors truncate">{title}</h5>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-0.5 block">{type}</span>
      </div>
    </div>
  );
}
