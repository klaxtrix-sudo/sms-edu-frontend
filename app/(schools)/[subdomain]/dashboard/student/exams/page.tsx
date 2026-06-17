"use client";

import { useEffect, useState } from "react";
import { 
  ClipboardList, 
  Clock, 
  Calendar, 
  Play, 
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
  CalendarRange
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useTenant } from "@/components/providers/tenant-provider";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";

interface Exam {
  _id: string;
  title: string;
  subjectId: string;
  durationMins: number;
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

export default function StudentExamsPage() {
  const { supabase, isLoading: isTenantLoading } = useTenant();
  const params = useParams();
  const subdomain = params.subdomain as string;
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  
  // Mapping lookups
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});

  const router = useRouter();

  const fetchLookups = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("subjects").select("id, name");
      const sMap: Record<string, string> = {};
      data?.forEach((s: any) => { sMap[s.id] = s.name; });
      setSubjectsMap(sMap);
    } catch (e) {
      console.error("Failed to load display lookups:", e);
    }
  };

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!user || !session) return;

      // 1. Get Student Class from Supabase
      const { data: student } = await (supabase as any)
        .from("students")
        .select("class_id")
        .eq("user_id", user.id)
        .single();

      if (student?.class_id) {
        setStudentClassId(student.class_id);
        
        // 2. Get Exams for Class from MongoDB
        const examRes = await fetch(`${getBackendUrl()}/exams?classId=${student.class_id}&status=published`, {
          headers: { "Authorization": `Bearer ${session.access_token}` },
        });
        const examData = await examRes.json();
        if (examData.success) {
          setExams(examData.data);
        }

        // 3. Fetch Exam Timetable slots filtered by student's class_id
        setLoadingTimetable(true);
        const timetableRes = await fetch(`${getBackendUrl()}/exam-timetables?classId=${student.class_id}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` },
        });
        const timetableData = await timetableRes.json();
        if (timetableData.success) {
          setTimetableSlots(timetableData.data || []);
        }
        setLoadingTimetable(false);
      }
    } catch (error) {
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
      setLoadingTimetable(false);
    }
  };

  useEffect(() => {
    if (supabase) {
      fetchLookups();
      fetchData();
    }
  }, [supabase]);

  const canTakeExam = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(exam.endAt);
    return now >= start && now <= end;
  };

  if (isTenantLoading || loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Examinations</h1>
        <p className="text-muted-foreground mt-1">Take assessments and view scheduled exam times.</p>
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="bg-background/50 border rounded-xl p-1">
          <TabsTrigger value="available" className="rounded-lg font-bold">Available Exams</TabsTrigger>
          <TabsTrigger value="timetable" className="rounded-lg font-bold">Exam Timetable</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <Card key={exam._id} className="group overflow-hidden border-none shadow-lg transition-all hover:shadow-xl bg-white">
                <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-colors" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="rounded-sm border-primary/20 bg-primary/5 text-primary">
                      {subjectsMap[exam.subjectId] || exam.subjectId}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl line-clamp-1">{exam.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {exam.durationMins} Minutes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm mb-6">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Starts:</span>
                      </div>
                      <span>{new Date(exam.startAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground border-b pb-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Ends:</span>
                      </div>
                      <span>{new Date(exam.endAt).toLocaleString()}</span>
                    </div>
                    <div className="bg-accent/30 p-3 rounded-lg flex items-center justify-between font-medium">
                      <span>Questions:</span>
                      <span className="text-primary font-bold">{exam.questionCount}</span>
                    </div>
                  </div>

                  {canTakeExam(exam) ? (
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => router.push(`/${subdomain}/exams/take/${exam._id}`)}
                    >
                      <Play className="mr-2 h-4 w-4" /> Start Examination
                    </Button>
                  ) : (
                    <Button variant="secondary" className="w-full" disabled>
                      {new Date() < new Date(exam.startAt) ? "Scheduled" : "Closed"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {exams.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-3xl bg-accent/5">
              <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <ClipboardList className="size-12 text-primary opacity-40" />
              </div>
              <h3 className="text-2xl font-bold">No active exams</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">There are currently no examinations published for your class. Check back later!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timetable" className="space-y-6">
          <Card className="border-none shadow-sm overflow-hidden bg-card/45 backdrop-blur-sm p-6">
            <h3 className="text-lg font-bold">Your Exam Timetable</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Below are scheduled exam papers, start windows, and room venues assigned to your class.</p>
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
                          <span className="text-xs text-zinc-400 italic">Virtual / Online</span>
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
