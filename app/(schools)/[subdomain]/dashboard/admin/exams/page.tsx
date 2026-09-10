"use client";

import { useEffect, useState } from "react";
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  MoreVertical, 
  Edit, 
  Trash, 
  Play, 
  StopCircle, 
  ClipboardList, 
  MapPin, 
  Loader2,
  CalendarRange,
  FileText
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
import { ScheduleExamModal } from "@/components/admin/schedule-exam-modal";
import { createTenantClient } from "@/lib/supabase/client";
import { cn, getBackendUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("papers");
  
  // Mapping lookups for classes/subjects
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

      const response = await fetch(`${getBackendUrl()}/exams`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setExams(result.data);
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

  const handleDeleteTimetable = async (id: string) => {
    if (!confirm("Are you sure you want to remove this timetable slot?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${getBackendUrl()}/exam-timetables/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Schedule entry removed");
        fetchTimetable();
      } else {
        throw new Error(result.message);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete schedule entry");
    }
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published": return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">Active</Badge>;
      case "draft": return <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border/80">Draft</Badge>;
      case "ended": return <Badge variant="destructive" className="bg-destructive/15 text-destructive border border-destructive/30">Ended</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Examinations Control</h1>
          <p className="text-muted-foreground">Manage exam papers, set questions, and schedule dates on the academic timetable.</p>
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
              <span>Exam Papers</span>
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
              <span>Exam Timetable</span>
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
                ? `${exams.length} Exam Paper${exams.length === 1 ? '' : 's'} Configured`
                : `${timetableSlots.length} Timetable Slot${timetableSlots.length === 1 ? '' : 's'} Scheduled`
              }
            </span>
          </div>
        </div>

        <TabsContent value="papers" className="space-y-6">
          <div className="flex items-center gap-4 bg-card/40 backdrop-blur-sm p-4 rounded-xl border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search exam papers..." 
                className="pl-9 h-11 border-none bg-accent/50 focus-visible:ring-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Exam Paper
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-20 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredExams.map((exam) => (
              <Card key={exam._id} className="group overflow-hidden border-none shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
                <div className="h-2 w-full bg-primary/10 group-hover:bg-primary transition-colors" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    {getStatusBadge(exam.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 border-none shadow-xl">
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => router.push(`/dashboard/admin/exams/${exam._id}/questions`)}
                        >
                          <Play className="mr-2 h-4 w-4" /> Manage Qs
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-xl line-clamp-1">{exam.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {subjectsMap[exam.subjectId] || exam.subjectId}
                    </span>
                    <span className="text-xs font-semibold text-zinc-500">• {classesMap[exam.classId] || exam.classId}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 bg-accent/30 p-2 rounded-lg text-xs font-semibold text-foreground/80">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{exam.durationMins} Mins • {exam.questionCount} Questions</span>
                    </div>
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
              <h3 className="text-xl font-semibold">No exam papers found</h3>
              <p className="text-muted-foreground mt-1">Create your first examination to get started.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timetable" className="space-y-6">
          <div className="flex justify-between items-center bg-card/40 backdrop-blur-sm p-4 rounded-xl border shadow-sm">
            <div>
              <h3 className="text-lg font-bold">Exam Schedule Timetable</h3>
              <p className="text-xs text-muted-foreground">Set official dates and room schedules for students.</p>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              onClick={() => setIsScheduleModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Schedule New Exam
            </Button>
          </div>

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
                    <TableHead className="w-[100px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetableSlots.map((slot) => (
                    <TableRow key={slot.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="font-semibold text-foreground">{slot.exam_title}</TableCell>
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
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTimetable(slot.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash className="size-4" />
                        </Button>
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

      <ScheduleExamModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
        onSuccess={fetchTimetable}
      />
    </div>
  );
}
