"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  Users, 
  TrendingUp, 
  Search, 
  Download, 
  Calendar, 
  Loader2, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Sun, 
  Coffee, 
  GraduationCap, 
  ChevronDown, 
  ChevronUp, 
  CheckCheck, 
  RotateCcw,
  Sparkles
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
  type SchoolSessionStatus 
} from "@/lib/utils/attendance-session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClassItem {
  id: string;
  name: string;
  class_teacher_id?: string | null;
  teacherName?: string;
  totalStudents?: number;
  submittedCount?: number;
  isSubmitted?: boolean;
  isPartiallySubmitted?: boolean;
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

// Format local date string YYYY-MM-DD safely without UTC timezone drift
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
  const { supabase, academicCycle, holidays, isLoading: isTenantLoading } = useTenant();

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

      // Step C: Calculate metrics strictly for the active scope
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

  // Filtered Summary
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading attendance dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* 1. Lean, Unboxed Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Attendance
            </h1>
            {isInstructional ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold gap-1 px-2.5 py-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Session Active
              </Badge>
            ) : sessionStatus === "PUBLIC_HOLIDAY" ? (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs font-bold gap-1 px-2.5 py-0.5">
                <span>🎉</span>
                {matchingHoliday?.name || "Public Holiday"}
              </Badge>
            ) : sessionStatus === "MID_TERM_BREAK" ? (
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-xs font-bold gap-1 px-2.5 py-0.5">
                <span>🎒</span>
                {matchingHoliday?.name || "Mid-Term Break"}
              </Badge>
            ) : sessionStatus === "HOLIDAY_BREAK" ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold gap-1 px-2.5 py-0.5">
                <Sun className="size-3" />
                Holiday Recess
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 text-xs font-bold gap-1 px-2.5 py-0.5">
                <Coffee className="size-3" />
                Weekend Recess
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Institutional attendance monitoring, daily presence, and roll-call oversight.
          </p>
        </div>
        
        {/* Integrated, Single-Row Toolbar (Guarantees zero button wrapping) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Class Select */}
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-9 w-[150px] sm:w-[170px] bg-background/60 border-border/80 text-xs font-bold rounded-xl shrink-0">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-semibold text-xs">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Picker */}
          <div className="relative shrink-0">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="pl-8 h-9 w-[135px] sm:w-[150px] bg-background/60 border-border/80 text-xs font-bold rounded-xl"
            />
          </div>

          {/* Export CSV Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportAttendanceCSV}
            className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 shrink-0 border-border/80 hover:bg-primary/10 hover:text-primary transition-all"
            title="Download attendance records as CSV"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          {/* Refresh Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchAttendanceData}
            className="size-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
            title="Refresh Attendance Data"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. Instructional Roll Call Tracker (Only shown when session is active and relevant) */}
      {isInstructional && totalClassesCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-card/40 border border-border/50 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black">
              <CheckCheck className="size-3.5" />
            </div>
            <span className="font-bold text-foreground">
              Class Submissions:
            </span>
            <span className="text-muted-foreground">
              {submittedClassesCount} of {totalClassesCount} classrooms finalized
            </span>
          </div>

          <button 
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="text-primary font-bold text-xs hover:underline flex items-center gap-1"
          >
            <span>{showMatrix ? "Hide Matrix" : "View Breakdown"}</span>
            {showMatrix ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      )}

      {/* Collapsible Submission Breakdown */}
      {isInstructional && showMatrix && (
        <div className="p-3.5 rounded-2xl bg-card/30 border border-border/40 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs animate-in fade-in">
          {classSubmissions.map((c) => {
            const isSelected = selectedClass === c.id;
            return (
              <button 
                type="button"
                key={c.id}
                onClick={() => setSelectedClass(isSelected ? "all" : c.id)}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1",
                  isSelected && "ring-2 ring-primary border-primary bg-primary/10",
                  c.isSubmitted 
                    ? "bg-emerald-500/5 border-emerald-500/20 text-foreground" 
                    : c.isPartiallySubmitted
                    ? "bg-amber-500/5 border-amber-500/20 text-foreground"
                    : "bg-muted/30 border-border/50 text-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">{c.name}</span>
                  <span className={cn(
                    "text-[10px] font-black",
                    c.isSubmitted ? "text-emerald-600" : c.isPartiallySubmitted ? "text-amber-600" : "text-muted-foreground"
                  )}>
                    {c.submittedCount}/{c.totalStudents}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate">{c.teacherName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Lean, Uniform Stats Strip (5 Compact Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Daily Average Tile */}
        <div className="p-3.5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Daily Average
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {isInstructional ? `${stats.avgAttendance}%` : "—"}
            </span>
            {isInstructional && stats.avgAttendance > 0 && (
              <span className="text-[11px] font-bold text-emerald-500 flex items-center">
                <ArrowUpRight className="size-3" />
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">
            {isInstructional 
              ? `${stats.presentCount + stats.lateCount} of ${stats.recordedCount || totalEnrolledCount} marked`
              : "Session paused"}
          </span>
        </div>

        {/* Present Tile */}
        <div className="p-3.5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Present</span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.presentCount}</span>
            {stats.recordedCount > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground">
                {Math.round((stats.presentCount / stats.recordedCount) * 100)}%
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">On-time attendees</span>
        </div>

        {/* Absent Tile */}
        <div className="p-3.5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Absent</span>
            <XCircle className="size-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.absentCount}</span>
            {stats.recordedCount > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground">
                {Math.round((stats.absentCount / stats.recordedCount) * 100)}%
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">Unexcused missing</span>
        </div>

        {/* Late Tile */}
        <div className="p-3.5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Late Arrivals</span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.lateCount}</span>
            {stats.recordedCount > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground">
                {Math.round((stats.lateCount / stats.recordedCount) * 100)}%
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">Arrived after bell</span>
        </div>

        {/* Excused Tile */}
        <div className="p-3.5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Excused</span>
            <AlertCircle className="size-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.excusedCount}</span>
            {stats.recordedCount > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground">
                {Math.round((stats.excusedCount / stats.recordedCount) * 100)}%
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium mt-1">Authorized leaves</span>
        </div>
      </div>

      {/* 4. Main Daily Roll Call Card (Brought immediately into view) */}
      <Card className="border border-border/60 shadow-xl bg-card/40 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black tracking-tight">
                Daily Roll Call
              </CardTitle>
              <CardDescription className="text-xs font-medium opacity-80 mt-0.5">
                Roster for {formatDisplayDate(date)} • {totalEnrolledCount} enrolled • {stats.recordedCount} marked
              </CardDescription>
            </div>

            {/* Filter Group: Search and Segmented Status Control */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search student or class..." 
                  className="pl-8 h-8 bg-background/50 border-border/80 rounded-xl text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Segmented Status Pill Control */}
              <div className="flex items-center gap-0.5 bg-background/50 p-0.5 rounded-xl border border-border/70 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All {summary.length > 0 && `(${summary.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("present")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "present" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-emerald-600"
                  )}
                >
                  Present {stats.presentCount > 0 && `(${stats.presentCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("absent")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "absent" ? "bg-rose-600 text-white shadow-sm" : "text-muted-foreground hover:text-rose-600"
                  )}
                >
                  Absent {stats.absentCount > 0 && `(${stats.absentCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("late")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "late" ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:text-amber-600"
                  )}
                >
                  Late {stats.lateCount > 0 && `(${stats.lateCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("excused")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    statusFilter === "excused" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-blue-600"
                  )}
                >
                  Excused {stats.excusedCount > 0 && `(${stats.excusedCount})`}
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="size-8 animate-spin text-primary opacity-40" />
              <p className="text-muted-foreground text-xs font-bold animate-pulse">
                Syncing roll-call records...
              </p>
            </div>
          ) : (
            <Table className="min-w-[650px]">
              <TableHeader className="bg-muted/20">
                <TableRow className="hover:bg-transparent border-b border-border/40">
                  <TableHead className="py-3 pl-4 sm:pl-6 font-bold text-xs uppercase tracking-wider">
                    Student
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    Classroom
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    Remarks
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider pr-4 sm:pr-6">
                    Time
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-14 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                        <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                          {sessionStatus === "WEEKEND" ? (
                            <Coffee className="size-5 opacity-50" />
                          ) : sessionStatus !== "IN_SESSION_ACTIVE" ? (
                            <Sun className="size-5 opacity-50" />
                          ) : (
                            <GraduationCap className="size-5 opacity-50" />
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-foreground">
                          {sessionStatus === "WEEKEND"
                            ? "Weekend Recess"
                            : sessionStatus !== "IN_SESSION_ACTIVE"
                            ? "School Recess"
                            : summary.length === 0
                            ? "No Attendance Submitted"
                            : "No Matching Students"}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {sessionStatus === "WEEKEND"
                            ? "Daily roll call resumes on Monday. Select an earlier school weekday to view records."
                            : sessionStatus !== "IN_SESSION_ACTIVE"
                            ? "Regular sessions are paused for scheduled break."
                            : summary.length === 0
                            ? "Class teachers have not yet submitted roll call for this date."
                            : "No students match your current search or status filters."}
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
                      <TableRow key={a.id} className="hover:bg-accent/20 transition-all group border-b border-border/20">
                        <TableCell className="py-2.5 pl-4 sm:pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 rounded-xl ring-1 ring-border/50">
                              <AvatarImage src={avatarUrl} alt={studentName} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs rounded-xl">
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {studentName}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {admissionNo}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-md px-2 py-0.5 bg-background/50 font-medium text-[11px] border-border/60">
                            {a.classes?.name || "Unassigned"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={cn(
                              "capitalize rounded-full px-2.5 py-0 font-bold text-[10px] shadow-none",
                              a.status === 'present' && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                              a.status === 'absent' && "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
                              a.status === 'late' && "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
                              a.status === 'excused' && "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                            )}
                          >
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {a.remarks || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono pr-4 sm:pr-6 whitespace-nowrap">
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
