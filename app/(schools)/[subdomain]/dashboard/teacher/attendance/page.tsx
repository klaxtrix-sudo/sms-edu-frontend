"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Save,
  Loader2,
  Search,
  Percent,
  CheckCheck,
  RotateCcw,
  Sun,
  Coffee,
  GraduationCap,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/components/providers/tenant-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAcademicSync } from "@/hooks/use-academic-sync";
import { 
  getSchoolSessionStatus, 
  getMatchingHoliday 
} from "@/lib/utils/attendance-session";
import { 
  AttendanceStudentRow, 
  AttendanceStudentCard,
  type AttendanceStatus 
} from "@/components/teacher/attendance-student-row";

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isExistingRecord, setIsExistingRecord] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { supabase, isLoading: isTenantLoading, academicCycle, holidays } = useTenant();
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const matchingHoliday = useMemo(() => {
    return getMatchingHoliday(date, holidays);
  }, [date, holidays]);

  // Determine instructional session status for the currently selected date
  const sessionStatus = useMemo(() => {
    return getSchoolSessionStatus(date, academicCycle, holidays);
  }, [date, academicCycle, holidays]);

  const isInstructional = sessionStatus === "IN_SESSION_ACTIVE";

  const fetchInitialData = useCallback(async (isInitial = true) => {
    if (!supabase) return;
    if (isInitial) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("*")
        .eq("class_teacher_id", user.id);

      if (classError) throw classError;
      const newClasses = classData || [];
      setClasses(newClasses);

      setSelectedClass((prevSelected) => {
        if (prevSelected && newClasses.some((c) => c.id === prevSelected)) {
          return prevSelected;
        }
        return newClasses.length > 0 ? newClasses[0].id : "";
      });
    } catch (error) {
      toast.error("Failed to load your assigned classes");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (supabase) fetchInitialData(true);
  }, [supabase, fetchInitialData]);

  // Real-time synchronization: silently refresh class roster and handle selection transitions
  useAcademicSync(() => {
    fetchInitialData(false);
  });

  const fetchStudents = useCallback(async () => {
    if (!supabase || !selectedClass) return;
    setRosterLoading(true);
    try {
      // 1. Fetch Students
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          admission_no,
          profiles!students_user_id_fkey(full_name)
        `)
        .eq("class_id", selectedClass);

      if (studentError) throw studentError;
      setStudents(studentData || []);

      // 2. Fetch existing attendance for this date
      const { data: existingAttendance, error: attnError } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", selectedClass)
        .eq("date", date);

      if (attnError) throw attnError;

      const hasExisting = Boolean(existingAttendance && existingAttendance.length > 0);
      setIsExistingRecord(hasExisting);

      const initialAttendance: Record<string, { status: AttendanceStatus; remarks: string }> = {};

      (studentData || []).forEach((s: any) => {
        const existing = existingAttendance?.find((a: any) => a.student_id === s.id);
        initialAttendance[s.id] = existing 
          ? { status: existing.status as AttendanceStatus, remarks: existing.remarks || "" }
          : { status: "present", remarks: "" };
      });

      setAttendance(initialAttendance);
    } catch (error: any) {
      console.error("[Attendance] Error fetching class roster:", error);
      const message = error?.message || error?.details || "Error fetching class roster";
      toast.error(message);
    } finally {
      setRosterLoading(false);
    }
  }, [supabase, selectedClass, date]);

  useEffect(() => {
    if (supabase && selectedClass) {
      fetchStudents();
    }
  }, [selectedClass, date, supabase, fetchStudents]);

  // Isolated callbacks for memoized AttendanceStudentRow
  const handleStatusChange = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        status,
        remarks: prev[studentId]?.remarks || "",
      },
    }));
  }, []);

  const handleRemarksChange = useCallback((studentId: string, remarks: string) => {
    setAttendance((prev) => {
      if (prev[studentId]?.remarks === remarks) return prev;
      return {
        ...prev,
        [studentId]: {
          status: prev[studentId]?.status || "present",
          remarks,
        },
      };
    });
  }, []);

  // 1-Click Batch Action: Mark All Present
  const handleMarkAllPresent = useCallback(() => {
    setAttendance((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = {
          status: "present",
          remarks: next[s.id]?.remarks || "",
        };
      });
      return next;
    });
    toast.success("All students marked as Present");
  }, [students]);

  const handleSubmit = async () => {
    if (!supabase || !isInstructional) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) throw new Error("School ID not found");

      const records = Object.entries(attendance).map(([studentId, data]) => ({
        student_id: studentId,
        class_id: selectedClass,
        school_id: profile.school_id,
        date,
        status: data.status,
        remarks: data.remarks,
      }));

      const { error } = await supabase
        .from("attendance")
        .upsert(records, { onConflict: "student_id,date" });

      if (error) throw error;
      setIsExistingRecord(true);

      const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      toast.success(`Attendance successfully finalized for ${formattedDate}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save attendance records");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => 
      s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const stats = useMemo(() => {
    return Object.values(attendance).reduce(
      (acc, curr) => {
        acc[curr.status]++;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0 }
    );
  }, [attendance]);

  const totalStudents = students.length;
  const attendanceRate = totalStudents > 0
    ? Math.round(((stats.present + stats.late) / totalStudents) * 100)
    : 0;

  if (isTenantLoading || (loading && classes.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="size-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Checking your schedules...</p>
      </div>
    );
  }

  // Empty state when teacher has no assigned form classes
  if (!loading && classes.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-card/50 p-8 rounded-3xl backdrop-blur-xl border border-border/50 shadow-2xl">
          <h1 className="text-4xl font-black tracking-tighter text-primary">Student Attendance</h1>
          <p className="text-muted-foreground text-lg mt-1">Daily presence tracking for your assigned classes.</p>
        </div>
        <Card className="border border-border/60 bg-card/50 backdrop-blur-xl rounded-3xl p-12 text-center shadow-xl">
          <div className="max-w-md mx-auto flex flex-col items-center gap-4">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <GraduationCap className="size-8 opacity-60" />
            </div>
            <h3 className="text-xl font-bold">No Classroom Assigned</h3>
            <p className="text-sm text-muted-foreground">
              You are currently not designated as a Class Teacher for any form class. Once school administration assigns you to a classroom, your student roster and attendance roll call will appear here automatically.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const selectedClassName = classes.find((c) => c.id === selectedClass)?.name || "Class";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card/50 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl backdrop-blur-xl border border-border/50 shadow-2xl">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-primary">Student Attendance</h1>
            {isExistingRecord ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 px-3 py-1">
                <CheckCircle className="size-3.5" />
                <span>Saved Record</span>
              </Badge>
            ) : isInstructional ? (
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold flex items-center gap-1.5 px-3 py-1">
                <Clock className="size-3.5" />
                <span>New Session (Unsaved)</span>
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
            ) : (
              <Badge className="bg-muted text-muted-foreground border-border text-xs font-bold flex items-center gap-1.5 px-3 py-1">
                <Info className="size-3.5" />
                <span>Non-Instructional Day</span>
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Daily presence tracking and session logs for your assigned classes.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="space-y-1.5 flex-1 sm:flex-initial">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Classroom</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-none ring-1 ring-border shadow-inner font-bold">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-medium">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1 sm:flex-initial">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Session Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input 
                type="date" 
                value={date} 
                max={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10 w-full sm:w-[180px] bg-background/50 border-none ring-1 ring-border shadow-inner font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Strict Guard Banner for Non-Instructional Days */}
      {sessionStatus === "PUBLIC_HOLIDAY" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 animate-in fade-in">
          <span className="text-xl shrink-0 mt-0.5">🎉</span>
          <div className="space-y-1 text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Public Holiday: {matchingHoliday?.name || "National Holiday"}</span>
              <Badge variant="outline" className="bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/30 text-[10px] uppercase font-black">
                Viewing Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {matchingHoliday?.description || "School is officially closed in observance of this public holiday."} Regular roll call is paused. You can still inspect past attendance logs freely.
            </p>
          </div>
        </div>
      )}

      {sessionStatus === "MID_TERM_BREAK" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200 animate-in fade-in">
          <span className="text-xl shrink-0 mt-0.5">🎒</span>
          <div className="space-y-1 text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Mid-Term Recess: {matchingHoliday?.name || "School Break"}</span>
              <Badge variant="outline" className="bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/30 text-[10px] uppercase font-black">
                Viewing Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {matchingHoliday?.description || "Classes are suspended for mid-term recess."} Regular attendance tracking resumes when the term reconvenes.
            </p>
          </div>
        </div>
      )}

      {sessionStatus === "HOLIDAY_BREAK" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
          <Sun className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1 text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Academic Term Recess / Holiday Break</span>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-black">
                Viewing Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              The school is currently on term break. Regular attendance recording is paused to prevent skewing academic metrics. You can freely review past session logs by picking an earlier date above.
            </p>
          </div>
        </div>
      )}

      {sessionStatus === "WEEKEND" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-900 dark:text-slate-200">
          <Coffee className="size-5 shrink-0 mt-0.5 text-slate-600 dark:text-slate-400" />
          <div className="space-y-1 text-sm">
            <div className="font-bold flex items-center gap-2">
              <span>Weekend Recess (Non-Instructional Day)</span>
              <Badge variant="outline" className="bg-slate-500/20 text-slate-800 dark:text-slate-300 border-slate-500/30 text-[10px] uppercase font-black">
                Viewing Mode
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Attendance cannot be submitted on Saturdays or Sundays. Select an active school weekday (Monday – Friday) to conduct student roll call.
            </p>
          </div>
        </div>
      )}

      {/* 3. 5-Metric KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard label="Present" value={stats.present} icon={CheckCircle} color="emerald" />
        <StatCard label="Absent" value={stats.absent} icon={XCircle} color="rose" />
        <StatCard label="Late" value={stats.late} icon={Clock} color="amber" />
        <StatCard label="Excused" value={stats.excused} icon={AlertCircle} color="blue" />
        <div className="col-span-2 sm:col-span-1">
          <StatCard 
            label="Attendance Rate" 
            value={`${attendanceRate}%`} 
            icon={Percent} 
            color={attendanceRate >= 90 ? "emerald" : attendanceRate >= 75 ? "amber" : "rose"} 
          />
        </div>
      </div>

      {/* 4. Roster Card */}
      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl overflow-hidden rounded-2xl sm:rounded-3xl">
        <CardHeader className="border-b border-border/50 bg-muted/30 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-black">Class Roster</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Mark attendance for each student in {selectedClassName}. Total enrolled: {totalStudents}.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
              {/* Batch Action Toolbar */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!isInstructional || students.length === 0}
                  onClick={handleMarkAllPresent}
                  className="flex-1 sm:flex-initial h-9 px-3 rounded-xl border-border/80 font-bold text-xs gap-1.5 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                  title="Mark all enrolled students as present"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Mark All Present</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={students.length === 0}
                  onClick={fetchStudents}
                  className="h-9 px-3 rounded-xl font-bold text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  title="Reload saved attendance"
                >
                  <RotateCcw className="size-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name or ID..." 
                  className="pl-10 h-9 bg-background/50 border-none ring-1 ring-border shadow-inner text-xs w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border/50">
                <TableRow>
                  <TableHead className="py-4 pl-6 md:pl-8 font-black text-xs md:text-sm">Student Information</TableHead>
                  <TableHead className="py-4 font-black text-xs md:text-sm text-center">Status Assignment</TableHead>
                  <TableHead className="py-4 pr-6 md:pr-8 font-black text-xs md:text-sm">Notes / Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rosterLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="size-10 animate-spin text-primary/40" />
                        <p className="text-muted-foreground font-medium">Syncing roster...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-20 text-center text-muted-foreground italic">
                      {students.length === 0 ? "No students discovered in this classroom." : "No matching students found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s) => (
                    <AttendanceStudentRow
                      key={s.id}
                      student={s}
                      status={attendance[s.id]?.status || "present"}
                      remarks={attendance[s.id]?.remarks || ""}
                      disabled={!isInstructional}
                      onStatusChange={handleStatusChange}
                      onRemarksChange={handleRemarksChange}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden p-3.5 sm:p-4 space-y-3">
            {rosterLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary/40" />
                <p className="text-muted-foreground font-medium text-xs">Syncing roster...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground italic text-xs">
                {students.length === 0 ? "No students discovered in this classroom." : "No matching students found."}
              </div>
            ) : (
              filteredStudents.map((s) => (
                <AttendanceStudentCard
                  key={s.id}
                  student={s}
                  status={attendance[s.id]?.status || "present"}
                  remarks={attendance[s.id]?.remarks || ""}
                  disabled={!isInstructional}
                  onStatusChange={handleStatusChange}
                  onRemarksChange={handleRemarksChange}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Submit Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 pb-12">
        <div className="text-xs text-muted-foreground font-medium text-center sm:text-left">
          {!isInstructional ? (
            <span className="flex items-center justify-center sm:justify-start gap-1.5 text-amber-700 dark:text-amber-400">
              <Info className="size-4 shrink-0" />
              Submission disabled: Selected date is outside active school sessions.
            </span>
          ) : isExistingRecord ? (
            <span>Existing session record found. Re-submitting will update records for {date}.</span>
          ) : (
            <span>Ready to finalize roll call for {filteredStudents.length} student(s).</span>
          )}
        </div>

        <Button 
          size="lg" 
          onClick={handleSubmit} 
          disabled={submitting || students.length === 0 || !isInstructional}
          className={cn(
            "w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-10 rounded-2xl font-black text-base md:text-lg shadow-xl transition-all",
            isInstructional && "hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-3 size-5 animate-spin" />
              Saving Records...
            </>
          ) : (
            <>
              <Save className="mr-3 size-5" />
              {isExistingRecord ? "Update Attendance Record" : "Finalize Attendance"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>; 
  color: "emerald" | "rose" | "amber" | "blue" | "indigo";
}) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-600 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    indigo: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
  };

  return (
    <div className={cn("p-4 sm:p-5 rounded-2xl sm:rounded-3xl border flex items-center justify-between backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]", colors[color])}>
      <div>
        <div className="text-2xl sm:text-3xl font-black leading-none">{value}</div>
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1 opacity-75">{label}</div>
      </div>
      <Icon className="size-6 sm:size-8 opacity-40 shrink-0" />
    </div>
  );
}
