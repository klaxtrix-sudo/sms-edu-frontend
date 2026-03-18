"use client";

import { useEffect, useState } from "react";
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Save,
  Loader2,
  ChevronRight,
  Search
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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus, remarks: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) fetchStudents();
  }, [selectedClass, date]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("*")
        .eq("class_teacher_id", user.id);

      if (classError) throw classError;
      setClasses(classData || []);
      if (classData && classData.length > 0) {
        setSelectedClass(classData[0].id);
      }
    } catch (error) {
      toast.error("Failed to load your assigned classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          admission_no,
          profiles(full_name)
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

      const initialAttendance: Record<string, { status: AttendanceStatus, remarks: string }> = {};
      
      // Default all to present if no existing records
      (studentData || []).forEach(s => {
        const existing = existingAttendance?.find(a => a.student_id === s.id);
        initialAttendance[s.id] = existing 
          ? { status: existing.status as AttendanceStatus, remarks: existing.remarks || "" }
          : { status: 'present', remarks: "" };
      });

      setAttendance(initialAttendance);
    } catch (error) {
      toast.error("Error fetching class roster");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks }
    }));
  };

  const handleSubmit = async () => {
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
        remarks: data.remarks
      }));

      const { error } = await supabase
        .from("attendance")
        .upsert(records, { onConflict: 'student_id,date' });

      if (error) throw error;
      toast.success(`Attendance saved for ${new Date(date).toDateString()}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save attendance records");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = Object.values(attendance).reduce((acc, curr) => {
    acc[curr.status]++;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 });

  if (loading && classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="size-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Checking your schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 p-8 rounded-3xl backdrop-blur-xl border border-border/50 shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-primary">Student Attendance</h1>
          <p className="text-muted-foreground text-lg">Daily presence tracking for your assigned classes.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Classroom</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[200px] bg-background/50 border-none ring-1 ring-border shadow-inner font-bold">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-medium">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Session Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="pl-10 w-[180px] bg-background/50 border-none ring-1 ring-border shadow-inner font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Present" value={stats.present} icon={CheckCircle} color="emerald" />
        <StatCard label="Absent" value={stats.absent} icon={XCircle} color="rose" />
        <StatCard label="Late" value={stats.late} icon={Clock} color="amber" />
        <StatCard label="Excused" value={stats.excused} icon={AlertCircle} color="blue" />
      </div>

      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
        <CardHeader className="border-b border-border/50 bg-muted/30 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-black">Class Roster</CardTitle>
              <CardDescription className="text-base">Mark attendance for each student in {classes.find(c => c.id === selectedClass)?.name}.</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search name or ID..." 
                className="pl-10 w-64 bg-background/50 border-none ring-1 ring-border shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border/50">
              <TableRow>
                <TableHead className="py-5 pl-8 font-black text-sm">Student Information</TableHead>
                <TableHead className="py-5 font-black text-sm text-center">Status Assignment</TableHead>
                <TableHead className="py-5 pr-8 font-black text-sm">Notes / Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
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
                    No students discovered in this classroom.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s) => (
                  <TableRow key={s.id} className="hover:bg-accent/30 transition-colors group border-b border-border/30">
                    <TableCell className="py-6 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                          {s.profiles?.full_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-base text-foreground group-hover:text-primary transition-colors">
                            {s.profiles?.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground font-bold tracking-widest uppercase opacity-70">
                            {s.admission_no}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <StatusButton 
                          status="present" 
                          active={attendance[s.id]?.status === 'present'} 
                          onClick={() => updateStatus(s.id, 'present')} 
                          label="P"
                          color="bg-emerald-500"
                        />
                        <StatusButton 
                          status="absent" 
                          active={attendance[s.id]?.status === 'absent'} 
                          onClick={() => updateStatus(s.id, 'absent')} 
                          label="A"
                          color="bg-rose-500"
                        />
                        <StatusButton 
                          status="late" 
                          active={attendance[s.id]?.status === 'late'} 
                          onClick={() => updateStatus(s.id, 'late')} 
                          label="L"
                          color="bg-amber-500"
                        />
                        <StatusButton 
                          status="excused" 
                          active={attendance[s.id]?.status === 'excused'} 
                          onClick={() => updateStatus(s.id, 'excused')} 
                          label="E"
                          color="bg-blue-500"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-6 pr-8">
                      <Input 
                        placeholder="Add optional note..." 
                        value={attendance[s.id]?.remarks || ""} 
                        onChange={(e) => updateRemarks(s.id, e.target.value)}
                        className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 italic text-sm placeholder:opacity-50"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 pb-12">
        <Button 
          size="lg" 
          onClick={handleSubmit} 
          disabled={submitting || students.length === 0}
          className="h-14 px-10 rounded-2xl font-black text-lg shadow-xl hover:shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-3 size-5 animate-spin" />
              Saving Records...
            </>
          ) : (
            <>
              <Save className="mr-3 size-5" />
              Finalize Attendance
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StatusButton({ active, onClick, label, color }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "size-10 rounded-xl font-black text-sm transition-all duration-300 transform active:scale-90",
        active 
          ? cn(color, "text-white shadow-lg scale-110") 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-600 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-600 bg-blue-500/10 border-blue-500/20"
  };

  return (
    <div className={cn("p-6 rounded-3xl border flex items-center justify-between backdrop-blur-md shadow-lg", colors[color])}>
      <div>
        <div className="text-3xl font-black leading-none">{value}</div>
        <div className="text-xs font-bold uppercase tracking-widest mt-1 opacity-70">{label}</div>
      </div>
      <Icon className="size-8 opacity-40" />
    </div>
  );
}
