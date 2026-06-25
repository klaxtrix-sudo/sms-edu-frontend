"use client";

import { useEffect, useState } from "react";
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
  Clock
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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AdminAttendanceDashboard() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    avgAttendance: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    studentCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedClass, date]);

  const fetchInitialData = async () => {
    try {
      const { data: classData } = await supabase.from("classes").select("*");
      setClasses(classData || []);
    } catch (error) {
      toast.error("Failed to load classes");
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      let studentQuery = supabase.from("students").select("id, class_id");
      if (selectedClass !== "all") {
        studentQuery = studentQuery.eq("class_id", selectedClass);
      }
      const { data: students } = await studentQuery;
      const totalStudents = students?.length || 0;

      // 2. Fetch Attendance for Date
      const { data: attnData, error } = await supabase
        .from("attendance")
        .select(`
          *,
          students(admission_no, profiles!user_id(full_name, avatar_url)),
          classes(name)
        `)
        .eq("date", date) as any;

      if (error) throw error;

      const classFilteredData = selectedClass === "all" 
        ? attnData 
        : attnData.filter((a: any) => a.class_id === selectedClass);

      setSummary(classFilteredData || []);

      // 3. Calculate Stats
      const s = (attnData || []).reduce((acc: any, curr: any) => {
        acc[curr.status]++;
        return acc;
      }, { present: 0, absent: 0, late: 0, excused: 0 });

      const presentTotal = s.present + s.late;
      setStats({
        avgAttendance: totalStudents > 0 ? Math.round((presentTotal / totalStudents) * 100) : 0,
        presentCount: s.present,
        absentCount: s.absent,
        lateCount: s.late,
        studentCount: totalStudents
      });

    } catch (error) {
      toast.error("Error fetching attendance reports");
    } finally {
      setLoading(false);
    }
  };

  const filteredSummary = summary.filter(a => 
    a.students?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.students?.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="z-10">
          <h1 className="text-5xl font-black tracking-tighter text-primary">Attendance</h1>
          <p className="text-muted-foreground mt-2 text-xl font-medium">See attendance across the whole school.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 z-10">
          <div className="space-y-1.5 font-bold">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[180px] bg-card/40 border-none ring-1 ring-border shadow-xl backdrop-blur-md">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 font-bold">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="pl-10 w-[170px] bg-card/40 border-none ring-1 ring-border shadow-xl backdrop-blur-md"
              />
            </div>
          </div>

          <Button variant="outline" size="icon" className="size-10 rounded-xl mt-5 shadow-xl">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Daily Average" 
          value={`${stats.avgAttendance}%`} 
          subText={`${stats.presentCount + stats.lateCount} students present today`}
          trend={stats.avgAttendance >= 80 ? "up" : "down"}
          icon={TrendingUp}
          color="primary"
        />
        <MetricCard title="Total Present" value={stats.presentCount} icon={CheckCircle2} status="present" />
        <MetricCard title="Missing / Absent" value={stats.absentCount} icon={AlertTriangle} status="absent" />
        <MetricCard title="Late Arrivals" value={stats.lateCount} icon={Clock} status="late" />
      </div>

      <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-10 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-3xl font-black tracking-tight">Daily Roll Call</CardTitle>
              <CardDescription className="text-lg font-medium opacity-80">Roster for {new Date(date).toDateString()} • {summary.length} students</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input 
                placeholder="Search name, class or ID..." 
                className="pl-12 w-80 h-12 bg-background/50 border-none ring-1 ring-border focus-visible:ring-primary rounded-2xl shadow-inner font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <Loader2 className="size-16 animate-spin text-primary opacity-20" />
              <p className="text-muted-foreground font-bold text-xl animate-pulse">Loading roll call...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-6 pl-10 font-black uppercase tracking-widest text-xs">Student Profile</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-xs">Classroom</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-xs">Status</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-xs">Remarks</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-xs pr-10">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-32 text-center text-muted-foreground italic text-xl">
                      No attendance taken on this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSummary.map((a) => (
                    <TableRow key={a.id} className="hover:bg-accent/30 transition-all group border-b border-border/20">
                      <TableCell className="py-6 pl-10">
                        <div className="flex items-center gap-5">
                          <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-lg text-primary group-hover:rotate-12 transition-transform shadow-lg">
                            {a.students?.profiles?.full_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-lg text-foreground group-hover:text-primary transition-colors">
                              {a.students?.profiles?.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground font-bold tracking-[0.15em] uppercase opacity-70">
                              {a.students?.admission_no}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg px-3 py-1 bg-background/50 font-bold border-none ring-1 ring-border shadow-sm">
                          {a.classes?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "capitalize rounded-full px-4 py-1 font-black tracking-tight text-[10px] shadow-lg",
                            a.status === 'present' && "bg-emerald-500 hover:bg-emerald-600 text-white",
                            a.status === 'absent' && "bg-rose-500 hover:bg-rose-600 text-white",
                            a.status === 'late' && "bg-amber-500 hover:bg-amber-600 text-white",
                            a.status === 'excused' && "bg-blue-500 hover:bg-blue-600 text-white"
                          )}
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate italic text-sm text-muted-foreground font-medium">
                        {a.remarks || "-"}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-muted-foreground pr-10">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, subText, icon: Icon, trend, color }: any) {
  return (
    <Card className="border-none shadow-2xl bg-primary text-primary-foreground overflow-hidden relative group">
      <div className="absolute -top-4 -right-4 size-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 text-primary-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-5xl font-black text-primary-foreground flex items-end gap-2">
          {value}
          {trend === "up" ? (
            <ArrowUpRight className="size-8 text-emerald-300 animate-pulse" />
          ) : (
            <TrendingDown className="size-8 text-rose-300 animate-pulse" />
          )}
        </div>
        <p className="text-xs mt-3 opacity-80 font-bold tracking-tight bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
          {subText}
        </p>
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, icon: Icon, status }: any) {
  const colors: any = {
    present: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    absent: "text-rose-600 bg-rose-500/10 border-rose-500/20",
    late: "text-amber-600 bg-amber-500/10 border-amber-500/20"
  };

  return (
    <Card className={cn("border-none shadow-2xl bg-card/40 backdrop-blur-xl hover:translate-y-[-8px] transition-all duration-300", colors[status])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
          {title}
        </CardTitle>
        <div className={cn("p-2.5 rounded-2xl shadow-inner", colors[status])}>
          <Icon size={24} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black tabular-nums">{value}</div>
        <div className="mt-4 flex gap-1 items-center">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= (value > 0 ? 5 : 0) ? colors[status].split(" ")[0].replace("text", "bg") : "bg-muted")} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
