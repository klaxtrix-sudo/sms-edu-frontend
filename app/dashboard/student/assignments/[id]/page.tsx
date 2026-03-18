"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Target, 
  Clock, 
  Loader2,
  CheckCircle2,
  Send,
  Trophy,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SubmitAssignmentModal } from "@/components/student/submit-assignment-modal";

export default function StudentAssignmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Assignment
      const assRes = await fetch(`http://localhost:5000/api/assignments/${params.id}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const assResult = await assRes.json();
      if (assResult.success) setAssignment(assResult.data);

      // 2. Fetch Student's specific submission for this assignment
      // Note: We need an endpoint for this or browse all submissons (not efficient)
      // I'll assume we can fetch by assignment + student through the submissions list for now 
      // but ideally we add an endpoint: GET /api/assignments/:id/my-submission
      
      const subRes = await fetch(`http://localhost:5000/api/assignments/${params.id}/submissions`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const subResult = await subRes.json();
      if (subResult.success) {
        const mySub = subResult.data.find((s: any) => s.studentId === session.user.id);
        setSubmission(mySub || null);
      }
    } catch (error) {
      toast.error("Error loading task details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="size-16 animate-spin text-primary/30" />
        <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.2em]">Briefing Mission...</p>
      </div>
    );
  }

  if (!assignment) return <div className="p-20 text-center">Task unavailable.</div>;

  const isGraded = submission?.status === 'graded';
  const isPastDue = new Date(assignment.dueDate) < new Date();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 pb-20">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          className="size-11 rounded-2xl shadow-xl hover:bg-primary hover:text-white transition-all border-none ring-1 ring-border"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
           <h1 className="text-4xl font-black tracking-tight text-primary uppercase italic">Mission Brief</h1>
           <p className="text-muted-foreground font-bold opacity-80 uppercase tracking-widest text-[10px]">Assignment ID: {params.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
              <div className="h-3 bg-primary" />
              <CardHeader className="p-10 pb-0">
                 <div className="flex items-center justify-between gap-4 mb-6">
                    <Badge className="rounded-full px-4 py-1.5 bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest">Instruction Set</Badge>
                    <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase opacity-40">
                       <Target className="size-4" /> {assignment.totalPoints} Points Available
                    </div>
                 </div>
                 <CardTitle className="text-4xl font-black leading-tight tracking-tighter">{assignment.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-6">
                 <div className="prose prose-invert max-w-none mb-10">
                    <p className="text-xl font-medium leading-relaxed opacity-90 italic">"{assignment.description}"</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-muted/30 rounded-3xl border border-border/50">
                    <div className="flex items-center gap-3">
                       <div className="size-10 rounded-xl bg-background flex items-center justify-center shadow-lg">
                          <Clock className="size-5 text-primary" />
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Deadline</p>
                          <p className="text-sm font-bold">{new Date(assignment.dueDate).toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="size-10 rounded-xl bg-background flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="size-5 text-primary" />
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50">Status</p>
                          <p className="text-sm font-bold uppercase tracking-tight">{submission ? submission.status : "Awaiting Submission"}</p>
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>

           {submission && (
             <Card className="border-none shadow-3xl bg-card/40 backdrop-blur-xl rounded-[3rem] p-10 space-y-8">
                <div className="flex items-center justify-between">
                   <h3 className="text-2xl font-black uppercase tracking-tighter">My Submission</h3>
                   <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-[9px]">Deployed</Badge>
                </div>
                <div className="p-8 bg-background/50 rounded-[2rem] border border-border/50 relative">
                   <div className="absolute top-6 right-8 opacity-10">
                      <FileText size={40} />
                   </div>
                   <p className="text-base font-medium leading-relaxed whitespace-pre-wrap italic">"{submission.content}"</p>
                </div>
                {isGraded && (
                  <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/10 animate-in zoom-in-95 duration-700">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/40 rotate-6">
                           <Trophy className="size-8" />
                        </div>
                        <div>
                           <h4 className="text-2xl font-black tracking-tight">Academic Grade</h4>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Faculty Evaluation Complete</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 p-6 bg-white/5 rounded-2xl text-center">
                           <div className="text-4xl font-black text-primary">{submission.grade}/{assignment.totalPoints}</div>
                           <div className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Final Score</div>
                        </div>
                        <div className="md:col-span-2 p-6 bg-white/5 rounded-2xl">
                           <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="size-4 text-primary opacity-60" />
                              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Instructor Feedback</span>
                           </div>
                           <p className="text-sm font-bold italic opacity-90 leading-relaxed">"{submission.feedback || "Great work, continue the momentum!"}"</p>
                        </div>
                     </div>
                  </div>
                )}
             </Card>
           )}
        </div>

        <div className="lg:col-span-1 space-y-6">
           {!submission && (
             <Card className="border-none shadow-3xl bg-primary text-white p-8 rounded-[3rem] relative overflow-hidden group">
                <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                   <Send size={200} />
                </div>
                <h3 className="text-3xl font-black tracking-tighter leading-tight italic">Ready to Execute?</h3>
                <p className="mt-4 text-white/80 font-bold text-sm leading-relaxed mb-10">Deploy your findings before the deadline to ensure your grade is registered in the system.</p>
                
                {isPastDue ? (
                  <div className="p-4 bg-rose-500/20 backdrop-blur-md rounded-2xl border border-rose-500/30 flex items-center gap-3">
                     <AlertTriangle className="size-5 text-rose-200 animate-pulse" />
                     <p className="text-xs font-bold text-rose-100 uppercase tracking-widest">Deadline Passed</p>
                  </div>
                ) : (
                  <Button 
                    className="w-full h-16 bg-white text-primary hover:bg-white/90 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all active:scale-95"
                    onClick={() => setIsSubmitModalOpen(true)}
                  >
                    Submit Work
                  </Button>
                )}
             </Card>
           )}

           <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] space-y-6">
              <div>
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Integrity Guide</h4>
                 <div className="space-y-4">
                    <div className="flex gap-4">
                       <div className="size-2 rounded-full bg-primary mt-1.5" />
                       <p className="text-xs font-bold opacity-70">Double-check instructions before submission.</p>
                    </div>
                    <div className="flex gap-4">
                       <div className="size-2 rounded-full bg-primary mt-1.5" />
                       <p className="text-xs font-bold opacity-70">All work is scanned for academic integrity.</p>
                    </div>
                    <div className="flex gap-4">
                       <div className="size-2 rounded-full bg-primary mt-1.5" />
                       <p className="text-xs font-bold opacity-70">Grades are issued within 3-5 business days.</p>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      <SubmitAssignmentModal 
        assignmentId={assignment._id}
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
