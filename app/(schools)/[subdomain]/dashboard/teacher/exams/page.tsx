"use client";

import { useEffect, useState } from "react";
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  MoreVertical, 
  Trash, 
  Play, 
  StopCircle, 
  ClipboardList, 
  MapPin, 
  Loader2,
  CalendarRange
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { AddExamModal } from "@/components/admin/add-exam-modal";
import { createTenantClient } from "@/lib/supabase/client";
import { getBackendUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Exam {
  _id: string;
  title: string;
  classId: string;
  subjectId: string;
  durationMins: number;
  status: 'draft' | 'published' | 'ended';
  startAt: string;
  endAt: string;
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
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
      if (result.success && allAssignments.length > 0) {
        // Filter exams to only show assigned classes & subjects
        const teacherExams = result.data.filter((exam: Exam) => 
          allAssignments.some(a => a.class_id === exam.classId && a.subject_id === exam.subjectId)
        );
        setExams(teacherExams);
      } else if (result.success) {
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

  const handleToggleActive = async (examId: string, currentActive: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${getBackendUrl()}/exams/${examId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ isActive: !currentActive, status: !currentActive ? 'published' : 'draft' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Exam set to ${!currentActive ? 'Active' : 'Inactive'}`);
        fetchExams();
      } else {
        throw new Error(result.message || "Failed to toggle status");
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating exam status");
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam? This action cannot be undone.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${getBackendUrl()}/exams/${examId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Exam deleted.");
        fetchExams();
      } else {
        throw new Error(result.message || "Failed to delete exam");
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting exam");
    }
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (exam: Exam) => {
    if (exam.isActive) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/15">Active</Badge>;
    }
    return <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400 font-semibold">Draft / Offline</Badge>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assigned MCQ Exams</h1>
          <p className="text-muted-foreground">Manage exam papers and view scheduled timetable venues.</p>
        </div>
      </div>

      <Tabs defaultValue="papers" className="space-y-6">
        <TabsList className="bg-background/50 border rounded-xl p-1">
          <TabsTrigger value="papers" className="rounded-lg font-bold">Assigned Exams</TabsTrigger>
          <TabsTrigger value="timetable" className="rounded-lg font-bold">School Exam Timetable</TabsTrigger>
        </TabsList>

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
            <Button 
              className="shrink-0 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create New Exam
            </Button>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 border-none shadow-xl">
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => router.push(`/dashboard/teacher/exams/${exam._id}/questions`)}
                        >
                          <Play className="mr-2 h-4 w-4" /> Manage Qs
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => handleDelete(exam._id)}
                        >
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                  
                  <div className="mt-6 flex gap-2">
                    <Button 
                      onClick={() => handleToggleActive(exam._id, exam.isActive)}
                      variant={exam.isActive ? "outline" : "default"}
                      className={cn(
                        "flex-1 text-xs h-9",
                        !exam.isActive && "bg-emerald-600 hover:bg-emerald-700 text-white"
                      )}
                    >
                      {exam.isActive ? (
                        <>
                          <StopCircle className="mr-2 h-3.5 w-3.5 text-destructive" /> Set Offline
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-3.5 w-3.5" /> Go Active
                        </>
                      )}
                    </Button>
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
              <p className="text-muted-foreground mt-1">Create an examination paper for your assigned classes to get started.</p>
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

      <AddExamModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSuccess={fetchExams}
      />
    </div>
  );
}
