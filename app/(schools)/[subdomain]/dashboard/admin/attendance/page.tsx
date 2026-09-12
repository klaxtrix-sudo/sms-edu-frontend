"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Search,
  Filter,
  Download,
  Calendar,
  Loader2,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Sun,
  Coffee,
  GraduationCap,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  FileSpreadsheet,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTenant } from "@/components/providers/tenant-provider";
import { useAcademicSync } from "@/hooks/use-academic-sync";
import { 
  getSchoolSessionStatus, 
  getMatchingHoliday,
  isInstructionalDay,
  type SchoolSessionStatus 
} from "@/lib/utils/attendance-session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClassItem {
  id: string;
  name: string;
  class_teacher_id?: string | null;
  profiles?: { full_name?: string } | null;
  totalStudents?: number;
  submittedCount?: number;
  isSubmitted?: boolean;
  isPartiallySubmitted?: boolean;
  teacherName?: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  remarks: string | null;
  created_at: string;
  students?: {
    admission_no: string;
    profiles?: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  } | null;
  classes?: {
    name: string;
  } | null;
}

// Format local date string YYYY-MM-DD safely without UTC drift
function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format date nicely for human display using local time
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function AdminAttendanceDashboard() {
  const { supabase, tenant, academicCycle, holidays, isLoading: isTenantLoading } = useTenant();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classSubmissions, setClassSubmissions] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [date, setDate] = useState<string>(() => getLocalDateString());
  const [summary, setSummary] = useState<AttendanceRecord[]>([]);
  const [totalEnrolledCount, setTotalEnrolledCount] = useState<number>(0);
  const [stats, setStats] = useState({
    avgAttendance: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    recordedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent" | "late" | "excused">("all");
  const [showMatrix, setShowMatrix] = useState(false);

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Compute school session status for selected date
  const matchingHoliday = useMemo(() => {
    return getMatchingHoliday(date, holidays);
  }, [date, holidays]);

  const sessionStatus: SchoolSessionStatus = useMemo(() => {
    return getSchoolSessionStatus(date, academicCycle, holidays);
  }, [date, academicCycle, holidays]);

  const isInstructional = sessionStatus === "IN_SESSION_ACTIVE";

  // 1. Fetch Class definitions
  const fetchClasses = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, class_teacher_id, profiles:class_teacher_id(full_name)")
        .order("name");

      if (error) throw error;
      const classList: ClassItem[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        class_teacher_id: c.class_teacher_id,
        teacherName: c.profiles?.full_name || "Unassigned"
      }));
      setClasses(classList);
    } catch (error) {
      console.error("[Attendance] Failed to load classes:", error);
      toast.error("Failed to load classes");
    }
  }, [supabase]);

  // 2. Fetch Attendance Data and Compute Isolated Scope Statistics
  const fetchAttendanceData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // Step A: Fetch Enrolled Students for selected scope
      let studentQuery = supabase.from("students").select("id, class_id");
      if (selectedClass !== "all") {
        studentQuery = studentQuery.eq("class_id", selectedClass);
      }
      const { data: students, error: studentErr } = await studentQuery;
      if (studentErr) throw studentErr;

      const enrolledCount = students?.length || 0;
      setTotalEnrolledCount(enrolledCount);

      // Step B: Fetch Attendance for Date & Scope directly
      let attnQuery = supabase
        .from("attendance")
        .select(`
          id,
          student_id,
          class_id,
          date,
          status,
          remarks,
          created_at,
          students(admission_no, profiles!students_user_id_fkey(full_name, avatar_url)),
          classes(name)
        `)
        .eq("date", date);

      if (selectedClass !== "all") {
        attnQuery = attnQuery.eq("class_id", selectedClass);
      }

      const { data: attnData, error: attnErr } = await attnQuery;
      if (attnErr) throw attnErr;

      const records: AttendanceRecord[] = (attnData || []) as any;
      setSummary(records);

      // Step C: Calculate metrics strictly for the active scope (eliminating the 1000% bug)
      const counts = records.reduce(
        (acc, curr) => {
          if (curr.status in acc) {
            acc[curr.status]++;
          }
          return acc;
        },
        { present: 0, absent: 0, late: 0, excused: 0 }
      );

      const recorded = records.length;
      const presentTotal = counts.present + counts.late;
      
      // Attendance percentage: if roll-call taken, based on recorded students; else 0
      const calculatedAvg = recorded > 0 
        ? Math.round((presentTotal / recorded) * 100) 
        : 0;

      setStats({
        avgAttendance: calculatedAvg,
        presentCount: counts.present,
        absentCount: counts.absent,
        lateCount: counts.late,
        excusedCount: counts.excused,
        recordedCount: recorded
      });

      // Step D: Calculate Class-by-Class Roll Call Completion Matrix
      const [allDayAttnRes, allStudentsRes] = await Promise.all([
        supabase.from("attendance").select("class_id").eq("date", date),
        supabase.from("students").select("class_id")
      ]);

      const countsByClass: Record<string, number> = {};
      (allDayAttnRes.data || []).forEach((a: any) => {
        countsByClass[a.class_id] = (countsByClass[a.class_id] || 0) + 1;
      });

      const studentsByClass: Record<string, number> = {};
      (allStudentsRes.data || []).forEach((s: any) => {
        if (s.class_id) {
          studentsByClass[s.class_id] = (studentsByClass[s.class_id] || 0) + 1;
        }
      });

      setClasses((prevClasses) => {
        const matrix = prevClasses.map((c) => {
          const totalInClass = studentsByClass[c.id] || 0;
          const submitted = countsByClass[c.id] || 0;
          const isSubmitted = totalInClass > 0 && submitted >= totalInClass;
          const isPartiallySubmitted = submitted > 0 && submitted < totalInClass;
          return {
            ...c,
            totalStudents: totalInClass,
            submittedCount: submitted,
            isSubmitted,
            isPartiallySubmitted
          };
        });
        setClassSubmissions(matrix);
        return prevClasses;
      });

    } catch (error) {
      console.error("[Attendance] Error fetching records:", error);
      toast.error("Error fetching attendance reports");
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedClass, date]);

  // Initial load
  useEffect(() => {
    if (!isTenantLoading && supabase) {
      fetchClasses();
    }
  }, [isTenantLoading, supabase, fetchClasses]);

  // Refetch when class or date changes
  useEffect(() => {
    if (!isTenantLoading && supabase) {
      fetchAttendanceData();
    }
  }, [isTenantLoading, supabase, fetchAttendanceData]);

  // Real-time synchronization when teachers submit attendance
  useAcademicSync(() => {
    fetchAttendanceData();
  });

  // Filtered Summary (supports search across name, admission no, and classroom)
  const filteredSummary = useMemo(() => {
    return summary.filter((a) => {
      const name = a.students?.profiles?.full_name?.toLowerCase() || "";
      const admission = a.students?.admission_no?.toLowerCase() || "";
      const className = a.classes?.name?.toLowerCase() || "";
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch = !search || 
        name.includes(search) || 
        admission.includes(search) || 
        className.includes(search);

      const matchesStatus = statusFilter === "all" || a.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [summary, searchTerm, statusFilter]);

  // Export to CSV
  const exportAttendanceCSV = () => {
    if (filteredSummary.length === 0) {
      toast.error("No attendance records to export for this date and filter");
      return;
    }

    const headers = [
      "Admission No",
      "Student Name",
      "Classroom",
      "Status",
      "Remarks",
      "Time Recorded",
      "Date"
    ];

    const rows = filteredSummary.map((item) => {
      const adm = item.students?.admission_no || "N/A";
      const name = (item.students?.profiles?.full_name || "Unknown").replace(/"/g, '""');
      const cls = (item.classes?.name || "Unassigned").replace(/"/g, '""');
      const status = item.status;
      const remarks = (item.remarks || "").replace(/"/g, '""');
      const time = item.created_at ? new Date(item.created_at).toLocaleTimeString() : "";
      return `"${adm}","${name}","${cls}","${status}","${remarks}","${time}","${date}"`;
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const classSlug = selectedClass === "all" 
      ? "Whole_School" 
      : (classes.find(c => c.id === selectedClass)?.name || "Class").replace(/\s+/g, "_");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${classSlug}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Attendance report downloaded successfully");
  };

  const totalClassesCount = classSubmissions.length;
  const submittedClassesCount = classSubmissions.filter(c => c.isSubmitted).length;

  if (isTenantLoading || (loading && classes.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="size-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading attendance dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card/40 p-6 sm:p-8 rounded-3xl backdrop-blur-xl border border-border/50 shadow-2xl">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-primary">
              Attendance
            </h1>
            {isInstructional ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 px-3 py-1">
                <CheckCircle2 className="size-3.5" />
                <span>Session Active</span>
              </Badge>
            ) : sessionStatus === "PUBLIC_HOLIDAY" ? (
              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs font-bold flex items-center gap-1.5 px-3 py-1">
                <span>🎉</span>
                <span>{matchingHoliday?.name || "Public Holiday"}</span>
              </Badge>
            ) : sessionStatus === "MID_TERM_BREAK" ? (
              <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 px-3 py-1">
                <span>🎒</span>
                <span>{matchingHoliday?.name || "Mid-Term Break"}</span>
              </Badge>
            ) : sessionStatus === "HOLIDAY_BREAK" ? (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold flex items-center gap-1.5 px-3 py-1">
                <Sun className="size-3.5" />
                <span>Holiday / Recess</span>
              </Badge>
            ) : (
              <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 text-xs font-bold flex items-center gap-1.5 px-3 py-1">
                <Coffee className="size-3.5" />
                <span>Weekend Recess</span>
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base font-medium">
            Institutional attendance monitoring, daily presence, and class roll-call oversight.
          </p>
        </div>
        
        {/* Controls Container with Clean Baseline Alignment */}
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="space-y-1.5 flex-1 sm:flex-none min-w-[140px]">
            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground ml-1">
              Classroom
            </label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-[190px] h-10 bg-background/50 border-none ring-1 ring-border shadow-inner font-bold rounded-xl">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-semibold">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-medium">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1 sm:flex-none min-w-[140px]">
            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground ml-1">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="pl-9 w-full sm:w-[170px] h-10 bg-background/50 border-none ring-1 ring-border shadow-inner font-bold rounded-xl"
              />
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportAttendanceCSV}
            className="h-10 px-3.5 rounded-xl border-border/80 font-bold text-xs gap-1.5 shadow-md shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
            title="Download attendance records as CSV"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchAttendanceData}
            className="size-10 rounded-xl font-bold text-xs text-muted-foreground hover:text-foreground shrink-0 shadow-sm"
            title="Refresh Attendance Data"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      {/* 2. Strict Academic Session Banner for Non-Instructional Days */}
      {sessionStatus === "WEEKEND" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-900 dark:text-slate-200 animate-in fade-in duration-300">
          <Coffee className="size-5 shrink-0 mt-0.5 text-slate-600 dark:text-slate-400" />
          <div className="space-y-1 text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Weekend Recess (Non-Instructional Day)</span>
              <Badge variant="outline" className="bg-slate-500/20 text-slate-800 dark:text-slate-300 border-slate-500/30 text-[10px] uppercase font-black">
                Viewing Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Today is a weekend. Daily roll-call is paused and resumes on the next scheduled school weekday. You can inspect historical logs by selecting an earlier date above.
            </p>
          </div>
        </div>
      )}

      {sessionStatus === "HOLIDAY_BREAK" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 animate-in fade-in duration-300">
          <Sun className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1 text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Academic Term Recess / Holiday Break</span>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-black">
                Viewing Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              The school is currently on holiday recess. Standard attendance recording is paused to preserve accurate term statistics.
            </p>
          </div>
        </div>
      )}

      {sessionStatus === "PUBLIC_HOLIDAY" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 animate-in fade-in duration-300">
          <span className="text-xl shrink-0 mt-0.5">🎉</span>
          <div className="space-y-1 text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Public Holiday: {matchingHoliday?.name || "Official Holiday"}</span>
              <Badge variant="outline" className="bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/30 text-[10px] uppercase font-black">
                Viewing Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {matchingHoliday?.description || "School is closed in observance of this holiday."} Regular sessions will resume on the next instructional day.
            </p>
          </div>
        </div>
      )}

      {sessionStatus === "MID_TERM_BREAK" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200 animate-in fade-in duration-300">
          <span className="text-xl shrink-0 mt-0.5">🎒</span>
          <div className="space-y-1 text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Mid-Term Recess: {matchingHoliday?.name || "School Break"}</span>
              <Badge variant="outline" className="bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/30 text-[10px] uppercase font-black">
                Viewing Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Classes are suspended for mid-term break. Daily roll-call resumes when the term reconvenes.
            </p>
          </div>
        </div>
      )}

      {/* 3. Class Roll Call Submission Matrix (Admin Operational Oversight) */}
      <Card className="border border-border/60 bg-card/40 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
        <div 
          onClick={() => setShowMatrix(!showMatrix)}
          className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-accent/20 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
              <CheckCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base">Daily Roll Call Submission Matrix</span>
                <Badge variant="secondary" className="font-bold text-[10px] px-2 py-0.5">
                  {submittedClassesCount} / {totalClassesCount} Finalized
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {isInstructional 
                  ? `${totalClassesCount - submittedClassesCount} classrooms pending teacher roll call submission`
                  : "Attendance submission paused for non-instructional session"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span>{showMatrix ? "Hide Matrix" : "View Breakdown"}</span>
            {showMatrix ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </div>

        {showMatrix && (
          <div className="p-4 sm:p-5 pt-0 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {classSubmissions.map((c) => {
              const isSelected = selectedClass === c.id;
              return (
                <div 
                  key={c.id}
                  onClick={() => setSelectedClass(isSelected ? "all" : c.id)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-xs",
                    isSelected && "ring-2 ring-primary border-primary bg-primary/5",
                    c.isSubmitted 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-foreground hover:bg-emerald-500/10" 
                      : c.isPartiallySubmitted
                      ? "bg-amber-500/5 border-amber-500/20 text-foreground hover:bg-amber-500/10"
                      : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-sm font-black text-foreground">{c.name}</span>
                    {c.isSubmitted ? (
                      <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0">Completed</Badge>
                    ) : c.isPartiallySubmitted ? (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">Partial</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border">Pending</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Teacher: {c.teacherName}</span>
                    <span className="font-bold">{c.submittedCount}/{c.totalStudents}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 4. 5-Metric KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Daily Average" 
          value={isInstructional ? `${stats.avgAttendance}%` : "—"} 
          subText={isInstructional 
            ? `${stats.presentCount + stats.lateCount} of ${stats.recordedCount || totalEnrolledCount} present`
            : "Session Paused"}
          isInstructional={isInstructional}
          status={stats.avgAttendance >= 80 ? "good" : stats.avgAttendance >= 60 ? "warning" : "low"}
        />
        <MetricCard 
          title="Total Present" 
          value={stats.presentCount} 
          icon={CheckCircle2} 
          status="present" 
          total={stats.recordedCount || totalEnrolledCount}
        />
        <MetricCard 
          title="Missing / Absent" 
          value={stats.absentCount} 
          icon={AlertTriangle} 
          status="absent" 
          total={stats.recordedCount || totalEnrolledCount}
        />
        <MetricCard 
          title="Late Arrivals" 
          value={stats.lateCount} 
          icon={Clock} 
          status="late" 
          total={stats.recordedCount || totalEnrolledCount}
        />
        <MetricCard 
          title="Excused Leaves" 
          value={stats.excusedCount} 
          icon={AlertCircle} 
          status="excused" 
          total={stats.recordedCount || totalEnrolledCount}
        />
      </div>

      {/* 5. Main Daily Roll Call Card */}
      <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-2xl sm:rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-4 sm:p-6 lg:p-8 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                Daily Roll Call
              </CardTitle>
              <CardDescription className="text-sm sm:text-base font-medium opacity-80 mt-1">
                Roster for {formatDisplayDate(date)} • {totalEnrolledCount} student{totalEnrolledCount === 1 ? "" : "s"} enrolled • {stats.recordedCount} marked
              </CardDescription>
            </div>

            {/* Search & Status Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name, class or ID..." 
                  className="pl-10 h-10 bg-background/50 border-none ring-1 ring-border focus-visible:ring-primary rounded-xl shadow-inner font-medium text-xs sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-background/40 p-1 rounded-xl ring-1 ring-border shadow-sm text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({summary.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("present")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "present" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-emerald-600"
                  )}
                >
                  Present ({stats.presentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("absent")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "absent" ? "bg-rose-600 text-white shadow-sm" : "text-muted-foreground hover:text-rose-600"
                  )}
                >
                  Absent ({stats.absentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("late")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "late" ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:text-amber-600"
                  )}
                >
                  Late ({stats.lateCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("excused")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "excused" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-blue-600"
                  )}
                >
                  Excused ({stats.excusedCount})
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-32 gap-4">
              <Loader2 className="size-12 sm:size-16 animate-spin text-primary opacity-30" />
              <p className="text-muted-foreground font-bold text-base sm:text-lg animate-pulse">
                Syncing roll-call records...
              </p>
            </div>
          ) : (
            <Table className="min-w-[680px]">
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-4 sm:pl-6 font-black uppercase tracking-widest text-xs">
                    Student Profile
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-xs">
                    Classroom
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-xs">
                    Status
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-xs">
                    Remarks
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-xs pr-4 sm:pr-6">
                    Time Recorded
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 sm:py-28 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                        <div className="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                          {sessionStatus === "WEEKEND" ? (
                            <Coffee className="size-6 opacity-60" />
                          ) : sessionStatus !== "IN_SESSION_ACTIVE" ? (
                            <Sun className="size-6 opacity-60" />
                          ) : (
                            <GraduationCap className="size-6 opacity-60" />
                          )}
                        </div>
                        <h4 className="text-base font-bold text-foreground">
                          {sessionStatus === "WEEKEND"
                            ? "No Attendance on Weekends"
                            : sessionStatus !== "IN_SESSION_ACTIVE"
                            ? "School is in Holiday / Recess"
                            : summary.length === 0
                            ? "No Attendance Submitted for this Date"
                            : "No Matching Students Found"}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {sessionStatus === "WEEKEND"
                            ? "Regular school roll call is only taken on active weekdays (Monday through Friday)."
                            : sessionStatus !== "IN_SESSION_ACTIVE"
                            ? "Classes are suspended for school recess. Select a regular term day to view attendance records."
                            : summary.length === 0
                            ? "Class teachers have not yet submitted daily roll call logs for this date. Check the Submission Matrix above."
                            : "No students match your active search and status filter criteria."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSummary.map((a) => {
                    const studentName = a.students?.profiles?.full_name || "Unknown Student";
                    const avatarUrl = a.students?.profiles?.avatar_url || "";
                    const admissionNo = a.students?.admission_no || "N/A";
                    const initial = studentName.charAt(0).toUpperCase();

                    return (
                      <TableRow key={a.id} className="hover:bg-accent/30 transition-all group border-b border-border/20">
                        <TableCell className="py-3.5 pl-4 sm:pl-6">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <Avatar className="size-10 rounded-2xl shadow-sm ring-1 ring-border/50">
                              <AvatarImage src={avatarUrl} alt={studentName} />
                              <AvatarFallback className="bg-primary/10 text-primary font-black text-sm rounded-2xl">
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-black text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {studentName}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase opacity-80">
                                {admissionNo}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 bg-background/50 font-bold border-none ring-1 ring-border shadow-sm text-xs">
                            {a.classes?.name || "Unassigned"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={cn(
                              "capitalize rounded-full px-3 py-0.5 font-black tracking-tight text-[10px] shadow-sm",
                              a.status === 'present' && "bg-emerald-500 hover:bg-emerald-600 text-white",
                              a.status === 'absent' && "bg-rose-500 hover:bg-rose-600 text-white",
                              a.status === 'late' && "bg-amber-500 hover:bg-amber-600 text-white",
                              a.status === 'excused' && "bg-blue-500 hover:bg-blue-600 text-white"
                            )}
                          >
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate italic text-xs text-muted-foreground font-medium">
                          {a.remarks || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-muted-foreground pr-4 sm:pr-6 whitespace-nowrap">
                          {a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  subText, 
  isInstructional, 
  status 
}: { 
  title: string; 
  value: string; 
  subText: string; 
  isInstructional: boolean; 
  status: "good" | "warning" | "low";
}) {
  return (
    <Card className="border-none shadow-2xl bg-primary text-primary-foreground overflow-hidden relative group rounded-2xl sm:rounded-3xl">
      <div className="absolute -top-4 -right-4 size-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
      <CardHeader className="pb-1.5 p-4 sm:p-5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80 text-primary-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary-foreground flex items-end gap-2">
          {value}
          {isInstructional && (
            status === "good" ? (
              <ArrowUpRight className="size-6 sm:size-7 text-emerald-300" />
            ) : (
              <TrendingDown className="size-6 sm:size-7 text-rose-300" />
            )
          )}
        </div>
        <p className="text-[11px] mt-2 opacity-90 font-bold tracking-tight bg-white/15 w-fit px-2.5 py-0.5 rounded-full backdrop-blur-sm">
          {subText}
        </p>
      </CardContent>
    </Card>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  status, 
  total 
}: { 
  title: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>; 
  status: "present" | "absent" | "late" | "excused"; 
  total: number;
}) {
  const colors = {
    present: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    absent: "text-rose-600 bg-rose-500/10 border-rose-500/20",
    late: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    excused: "text-blue-600 bg-blue-500/10 border-blue-500/20"
  };

  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Card className={cn("border-none shadow-xl bg-card/50 backdrop-blur-xl hover:translate-y-[-4px] transition-all duration-300 rounded-2xl sm:rounded-3xl", colors[status])}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 p-4 sm:p-5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-xl shadow-inner", colors[status])}>
          <Icon className="size-4 sm:size-5" />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums">{value}</span>
          {total > 0 && (
            <span className="text-xs font-bold opacity-75">{percentage}%</span>
          )}
        </div>
        <div className="mt-3 w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              status === "present" && "bg-emerald-500",
              status === "absent" && "bg-rose-500",
              status === "late" && "bg-amber-500",
              status === "excused" && "bg-blue-500"
            )}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
