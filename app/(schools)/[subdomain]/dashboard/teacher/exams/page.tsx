"use client";

import { useEffect, useState } from "react";
import { 
  Search, 
  Clock, 
  Play, 
  ClipboardList, 
  MapPin, 
  Loader2,
  CalendarRange,
  FileText,
  Edit,
  RotateCcw,
  Eye,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { createTenantClient } from "@/lib/supabase/client";
import { getBackendUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAcademicSync } from "@/hooks/use-academic-sync";

interface Exam {
  _id: string;
  title: string;
  classId: string;
  subjectId: string;
  durationMins: number;
  status: 'draft' | 'published' | 'ended';
  workflowStatus?: 'draft' | 'pending_questions' | 'ready_for_review' | 'changes_requested' | 'approved' | 'published' | 'ended';
  academicYear?: string;
  term?: number;
  assignedTeacherId?: string;
  startAt?: string;
  endAt?: string;
  questionCount: number;
  isActive: boolean;
}

interface TimetableSlot {
  id: string;
  exam_id: string;
  exam_title: string;
  class_id: string;
  subject_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("papers");
  
  // Mapping lookups
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});

  const supabase = createTenantClient();
  const router = useRouter();

  const fetchLookups = async () => {
    try {
      const [{ data: classesData }, { data: subjectsData }] = await Promise.all([
        (supabase as any).from("classes").select("id, name"),
        (supabase as any).from("subjects").select("id, name"),
      ]);

      const cMap: Record<string, string> = {};
      const sMap: Record<string, string> = {};
      classesData?.forEach((c: any) => { cMap[c.id] = c.name; });
      subjectsData?.forEach((s: any) => { sMap[s.id] = s.name; });
      setClassesMap(cMap);
      setSubjectsMap(sMap);
    } catch (e) {
      console.error("Failed to load display lookups:", e);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Teacher Assignments from both sources in parallel
      const [{ data: directAssignments }, { data: timetableAssignments }] = await Promise.all([
        supabase
          .from("class_subject_teachers")
          .select("class_id, subject_id")
          .eq("teacher_id", session.user.id),
        supabase
          .from("timetables")
          .select("class_id, subject_id")
          .eq("teacher_id", session.user.id)
      ]);

      const allAssignments: { class_id: string; subject_id: string }[] = [];
      if (directAssignments) allAssignments.push(...directAssignments);
      if (timetableAssignments) allAssignments.push(...timetableAssignments);

      // 2. Fetch Exams from MongoDB
      const response = await fetch(`${getBackendUrl()}/exams`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        // Filter exams to only show assigned classes & subjects or directly assigned teacher
        const teacherExams = (result.data || []).filter((exam: any) => 
          (exam.assignedTeacherId && exam.assignedTeacherId === session.user.id) ||
          allAssignments.some(a => a.class_id === exam.classId && a.subject_id === exam.subjectId)
        );
        setExams(teacherExams);
      } else {
        setExams([]);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Could not load exams");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async () => {
    setLoadingTimetable(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${getBackendUrl()}/exam-timetables`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setTimetableSlots(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch timetable slots:", error);
      toast.error("Could not load exam timetable");
    } finally {
      setLoadingTimetable(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchExams();
    fetchTimetable();
  }, []);

  // Real-time synchronization: silently refresh lookups and exam list on assignment changes
  useAcademicSync(() => {
    fetchLookups();
    fetchExams();
    fetchTimetable();
  });



  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (exam: Exam) => {
    if (exam.workflowStatus === 'ready_for_review') {
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">Under Review</Badge>;
    }
    if (exam.workflowStatus === 'changes_requested') {
      return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">Revisions Requested</Badge>;
    }
    if (exam.workflowStatus === 'approved') {
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">Approved</Badge>;
    }
    if (exam.workflowStatus === 'pending_questions') {
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">Setting Questions</Badge>;
    }
    if (exam.status === 'published' || exam.isActive) {
      return <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">Published</Badge>;
    }
    return <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border/80">Draft</Badge>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assigned MCQ Exams</h1>
          <p className="text-muted-foreground">Manage exam papers and view scheduled timetable venues.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Modern Navigational Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
          <TabsList className="inline-flex h-auto p-1.5 bg-muted/60 dark:bg-card/80 border border-border/80 rounded-2xl gap-1.5 shadow-sm backdrop-blur-md">
            <TabsTrigger
              value="papers"
              className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground"
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === "papers" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-primary/10 text-primary"
              )}>
                <FileText className="size-3.5 sm:size-4" />
              </div>
              <span>Assigned Exams</span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-0.5 px-2 py-0.5 text-[11px] font-mono font-bold rounded-full transition-colors border",
                  activeTab === "papers"
                    ? "bg-primary/15 text-primary border-primary/25"
                    : "bg-muted text-muted-foreground border-border/40"
                )}
              >
                {loading ? <Loader2 className="size-3 animate-spin" /> : exams.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="timetable"
              className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground"
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === "timetable" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
              )}>
                <CalendarRange className="size-3.5 sm:size-4" />
              </div>
              <span>School Exam Timetable</span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-0.5 px-2 py-0.5 text-[11px] font-mono font-bold rounded-full transition-colors border",
                  activeTab === "timetable"
                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25"
                    : "bg-muted text-muted-foreground border-border/40"
                )}
              >
                {loadingTimetable ? <Loader2 className="size-3 animate-spin" /> : timetableSlots.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Quick Context / Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {activeTab === "papers" 
                ? `${exams.length} Assigned Exam${exams.length === 1 ? '' : 's'}`
                : `${timetableSlots.length} Timetable Slot${timetableSlots.length === 1 ? '' : 's'}`
              }
            </span>
          </div>
        </div>

        <TabsContent value="papers" className="space-y-6">
          <div className="flex items-center gap-4 bg-card/40 backdrop-blur-sm p-4 rounded-xl border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search assigned exams..." 
                className="pl-9 h-11 border-none bg-accent/50 focus-visible:ring-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-20 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredExams.map((exam) => (
              <Card key={exam._id} className="group overflow-hidden border-none shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 bg-card/40 backdrop-blur-sm">
                <div className="h-2 w-full bg-primary/10 group-hover:bg-primary transition-colors" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    {getStatusBadge(exam)}
                  </div>
                  <CardTitle className="text-xl line-clamp-1">{exam.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                      {subjectsMap[exam.subjectId] || exam.subjectId}
                    </span>
                    <span className="text-sm font-semibold">{classesMap[exam.classId] || exam.classId}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 bg-accent/30 p-2 rounded-lg text-xs font-semibold text-zinc-700">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{exam.durationMins} Mins • {exam.questionCount} Questions</span>
                    </div>
                  </div>
                  
                  {/* Action Button based on Workflow */}
                  <div className="mt-5">
                    {exam.workflowStatus === 'changes_requested' ? (
                      <Button 
                        size="sm"
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
                        onClick={() => router.push(`/dashboard/teacher/exams/${exam._id}/questions`)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Revise Questions
                      </Button>
                    ) : exam.workflowStatus === 'pending_questions' ? (
                      <Button 
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-sm"
                        onClick={() => router.push(`/dashboard/teacher/exams/${exam._id}/questions`)}
                      >
                        <Edit className="h-3.5 w-3.5" /> Set Questions
                      </Button>
                    ) : exam.workflowStatus === 'ready_for_review' ? (
                      <Button 
                        size="sm"
                        variant="outline"
                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 gap-1.5"
                        onClick={() => router.push(`/dashboard/teacher/exams/${exam._id}/questions`)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View Submitted Qs
                      </Button>
                    ) : exam.workflowStatus === 'approved' ? (
                      <Button 
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                        onClick={() => router.push(`/dashboard/teacher/exams/${exam._id}/questions`)}
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Approved — Go to Studio
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                        onClick={() => router.push(`/dashboard/teacher/exams/${exam._id}/questions`)}
                      >
                        <Play className="h-3.5 w-3.5 text-primary fill-primary" /> Question Studio
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredExams.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-accent/30">
              <div className="size-20 rounded-full bg-accent/50 flex items-center justify-center mb-4">
                <ClipboardList className="size-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No assigned exams found</h3>
              <p className="text-muted-foreground mt-1">Exam papers created by school administration for your assigned classes and subjects will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timetable" className="space-y-6">
          <Card className="border-none shadow-sm bg-card/40 backdrop-blur-sm p-6">
            <h3 className="text-lg font-bold">Scheduled Exam Schedule</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Below are the timetabled rooms and time slots assigned for students by administration.</p>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden bg-card/40 backdrop-blur-sm">
            {loadingTimetable ? (
              <div className="py-20 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Exam Paper</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time Window</TableHead>
                    <TableHead>Venue / Room</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetableSlots.map((slot) => (
                    <TableRow key={slot.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="font-semibold text-zinc-900">{slot.exam_title}</TableCell>
                      <TableCell className="font-medium">{classesMap[slot.class_id] || slot.class_id}</TableCell>
                      <TableCell>{subjectsMap[slot.subject_id] || slot.subject_id}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {new Date(slot.exam_date).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary font-bold">
                        {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                      </TableCell>
                      <TableCell>
                        {slot.room ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                            <MapPin className="size-3" /> {slot.room}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">Unassigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {timetableSlots.length === 0 && !loadingTimetable && (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                <CalendarRange className="size-10 text-muted-foreground opacity-30" />
                <span>No exams scheduled on the timetable yet.</span>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
