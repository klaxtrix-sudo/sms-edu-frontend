"use client";

import { useEffect, useState } from "react";
import { 
  ClipboardList, 
  Clock, 
  Calendar, 
  Play, 
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Exam {
  _id: string;
  title: string;
  subjectId: string;
  durationMins: number;
  startAt: string;
  endAt: string;
  questionCount: number;
}

interface Attempt {
  _id: string;
  examId: string;
  score: number;
  totalMarks: number;
  submittedAt: string;
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
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
          // 2. Get Exams for Class from MongoDB
          const examRes = await fetch(`http://localhost:5000/api/exams?classId=${student.class_id}&status=published`, {
            headers: { "Authorization": `Bearer ${session.access_token}` },
          });
          const examData = await examRes.json();
          if (examData.success) {
            setExams(examData.data);
            
            // 3. Fetch any existing attempts for these exams
            // (Optional: fetch in parallel if needed)
          }
        }
      } catch (error) {
        toast.error("Failed to load exams");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const canTakeExam = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(exam.endAt);
    return now >= start && now <= end;
  };

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Available Exams</h1>
        <p className="text-muted-foreground mt-1">Take your online assessments here. Ensure you have a stable connection.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <Card key={exam._id} className="group overflow-hidden border-none shadow-lg transition-all hover:shadow-xl bg-white">
            <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-colors" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="rounded-sm border-primary/20 bg-primary/5 text-primary">
                  {exam.subjectId}
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
                  <span>{new Date(exam.startAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground border-b pb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Ends:</span>
                  </div>
                  <span>{new Date(exam.endAt).toLocaleDateString()}</span>
                </div>
                <div className="bg-accent/30 p-3 rounded-lg flex items-center justify-between font-medium">
                  <span>Questions:</span>
                  <span className="text-primary font-bold">{exam.questionCount}</span>
                </div>
              </div>

              {canTakeExam(exam) ? (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => router.push(`/dashboard/student/exams/${exam._id}`)}
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
    </div>
  );
}
