"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  GraduationCap, 
  Clock, 
  Bell, 
  Loader2,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  MapPin,
  ClipboardCheck,
  FileText,
  Bookmark
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
import { cn, getBackendUrl } from "@/lib/utils";
import Link from "next/link";

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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-primary italic uppercase">
            Teacher Overview
          </h1>
          <p className="text-muted-foreground mt-2 text-xl font-medium max-w-2xl opacity-80">
            Welcome back, {teacherName}. Manage your classrooms, schedules, and student tasks.
          </p>
        </div>
        <div className="size-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-2xl animate-pulse">
          <GraduationCap className="size-10 text-primary" />
        </div>
      </div>

      {loading || isTenantLoading ? (
        <div className="py-40 flex flex-col items-center gap-4">
          <Loader2 className="size-16 animate-spin text-primary/20" />
          <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">
            Syncing Teacher Intelligence...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          
          {/* Main Dashboard Panel */}
          <div className="xl:col-span-2 space-y-10">
            
            {/* 2. Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                label="My Form Classes" 
                value={formClasses.length} 
                icon={Users} 
                color="blue" 
                description={formClasses.map(c => c.name).join(", ") || "None"}
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

            {/* 3. Today's Teaching Schedule (Timeline) */}
            <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-10 pb-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-primary">
                    Teaching Schedule
                  </CardTitle>
                  <CardDescription className="text-base font-medium opacity-80">
                    Your periods for {isWeekend ? "Monday (Next Week)" : "Today"} ({getDayLabel(targetScheduleDay)})
                  </CardDescription>
                </div>
                {isWeekend && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 rounded-full font-bold uppercase tracking-wider text-[10px]">
                    Weekend View
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-6">
                {todayPeriods.length === 0 ? (
                  <div className="border-2 border-dashed border-muted/50 rounded-2xl p-12 text-center text-muted-foreground">
                    <Clock className="size-12 mx-auto opacity-20 mb-4" />
                    <p className="font-bold italic">No periods scheduled for {getDayLabel(targetScheduleDay)}.</p>
                    <p className="text-xs mt-1">Enjoy your prep time!</p>
                  </div>
                ) : (
                  <div className="relative border-l border-primary/20 ml-3 pl-8 space-y-8">
                    {todayPeriods.map((period, index) => (
                      <div key={period.id} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-[37px] top-1.5 size-4 rounded-full bg-primary border-4 border-background group-hover:scale-125 transition-transform" />
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/15 rounded-lg font-bold text-xs">
                                {period.classes?.name}
                              </Badge>
                              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">
                                {period.subjects?.code}
                              </span>
                            </div>
                            <h4 className="text-lg font-black mt-1 text-foreground">
                              {period.subjects?.name}
                            </h4>
                          </div>

                          <div className="flex flex-row items-center gap-6 text-sm font-bold text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="size-4 text-primary/60" />
                              {period.start_time.slice(0, 5)} - {period.end_time.slice(0, 5)}
                            </div>
                            {period.room && (
                              <div className="flex items-center gap-2 italic">
                                <MapPin className="size-4 text-primary/40" />
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

            {/* 4. My Classrooms & Attendance Status */}
            <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-10 pb-6">
                <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-primary">
                  Classroom Manager
                </CardTitle>
                <CardDescription className="text-base font-medium opacity-80">
                  Quick status tracking for classrooms you manage as Form Teacher.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0">
                {formClasses.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-muted/50 rounded-2xl text-center text-muted-foreground">
                    <p className="font-bold italic">You are not currently designated as Form Teacher for any classes.</p>
                    <p className="text-xs mt-1">Contact the administrator to assign you a form classroom.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formClasses.map((cls) => {
                      const status = attendanceStatus[cls.id] || { marked: false, present: 0, absent: 0 };
                      return (
                        <Card key={cls.id} className="border-none shadow-md bg-muted/10 border-border/50 rounded-3xl p-6 hover:bg-muted/20 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <Badge className="rounded-full px-3 py-1 bg-primary/10 text-primary border-primary/20 font-black text-xs uppercase tracking-widest">
                              {cls.name}
                            </Badge>
                            {status.marked ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-none font-bold">
                                <CheckCircle2 className="size-3 mr-1" /> Marked
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 border-none font-bold">
                                <AlertCircle className="size-3 mr-1" /> Pending
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-lg font-black mb-1">Daily Attendance Tracker</h4>
                          <p className="text-xs text-muted-foreground font-medium mb-4">
                            Check student presence logs for the school calendar day.
                          </p>
                          
                          {status.marked ? (
                            <div className="grid grid-cols-2 gap-4 text-center bg-background/50 p-3 rounded-2xl border border-border/50">
                              <div>
                                <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Present</span>
                                <p className="text-lg font-black text-emerald-600">{status.present}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Absent</span>
                                <p className="text-lg font-black text-rose-600">{status.absent}</p>
                              </div>
                            </div>
                          ) : (
                            <Button asChild size="sm" className="w-full rounded-2xl font-black uppercase tracking-wider text-xs h-10 shadow-lg">
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

          </div>

          {/* Sidebar Panel */}
          <div className="xl:col-span-1 space-y-10">

            {/* 5. Action Hub */}
            <Card className="border-none shadow-3xl bg-primary text-white p-10 rounded-[3.5rem] relative overflow-hidden group">
              <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                <Bookmark size={250} />
              </div>
              <div className="relative z-10 space-y-6">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter italic uppercase leading-tight">
                    Action Hub
                  </h3>
                  <p className="text-white/70 font-bold mt-1 uppercase tracking-widest text-[9px]">
                    Fast Management Access
                  </p>
                </div>
                
                <div className="space-y-3 pt-2">
                  <Button asChild className="w-full h-14 bg-white text-primary hover:bg-white/95 rounded-[1.2rem] font-black text-sm shadow-xl transition-all hover:translate-x-1 duration-300 justify-start px-6">
                    <Link href="/dashboard/teacher/attendance">
                      <ClipboardCheck className="mr-3 size-5 text-primary" />
                      Mark Daily Attendance
                    </Link>
                  </Button>

                  <Button asChild className="w-full h-14 bg-white text-primary hover:bg-white/95 rounded-[1.2rem] font-black text-sm shadow-xl transition-all hover:translate-x-1 duration-300 justify-start px-6">
                    <Link href="/dashboard/teacher/assignments">
                      <BookOpen className="mr-3 size-5 text-primary" />
                      Create Homework Assignment
                    </Link>
                  </Button>

                  <Button asChild className="w-full h-14 bg-white text-primary hover:bg-white/95 rounded-[1.2rem] font-black text-sm shadow-xl transition-all hover:translate-x-1 duration-300 justify-start px-6">
                    <Link href="/dashboard/teacher/timetable">
                      <Calendar className="mr-3 size-5 text-primary" />
                      View Weekly Timetable
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* 6. Recent Homework Tasks */}
            <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black tracking-tighter uppercase italic text-primary">
                  Recent Tasks
                </h3>
                <BookOpen className="size-5 text-primary/40" />
              </div>
              <div className="space-y-6">
                {recentAssignments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm italic">
                    No active assignments listed.
                  </div>
                ) : (
                  recentAssignments.map((task) => (
                    <Link key={task._id} href={`/dashboard/teacher/assignments/${task._id}`} className="block group">
                      <div className="border-b border-border/50 pb-4 group-last:border-none flex items-start gap-4">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-115 transition-transform min-w-[2.5rem]">
                          <FileText className="size-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h5 className="text-sm font-black leading-tight group-hover:text-primary transition-colors line-clamp-1">
                            {task.title}
                          </h5>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              {task.className}
                            </span>
                            <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">
                              Submissions: {task.submissionCount}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 self-center text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>

            {/* 7. Bulletins Widget */}
            <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black tracking-tighter uppercase italic text-primary">
                  Notice Board
                </h3>
                <Bell className="size-5 text-primary/40 animate-swing" />
              </div>
              <div className="space-y-6">
                <BulletinItem 
                  title="Term 3 Continuous Assessment Prep" 
                  date="Jun 20" 
                  type="academic"
                />
                <BulletinItem 
                  title="Staff Senate & Budget Review Meeting" 
                  date="Jun 24" 
                  type="meeting"
                />
                <BulletinItem 
                  title="Academic Progress Report Submission" 
                  date="Jul 02" 
                  type="deadline"
                />
              </div>
            </Card>

          </div>

        </div>
      )}
    </div>
  );
}

// Sub-components

function StatCard({ label, value, icon: Icon, color, description }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    indigo: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20"
  };

  return (
    <div className={cn("p-6 rounded-3xl border flex flex-col justify-between backdrop-blur-md shadow-lg h-36 hover:scale-[1.03] transition-transform duration-300 text-left", colors[color])}>
      <div className="flex items-center justify-between">
        <div className="text-3xl font-black leading-none">{value}</div>
        <Icon className="size-6 opacity-60" />
      </div>
      <div>
        <div className="text-xs font-black uppercase tracking-widest mt-2 opacity-85">{label}</div>
        {description && (
          <p className="text-[10px] font-medium opacity-65 truncate mt-0.5">{description}</p>
        )}
      </div>
    </div>
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
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-45">{type}</span>
      </div>
    </div>
  );
}
