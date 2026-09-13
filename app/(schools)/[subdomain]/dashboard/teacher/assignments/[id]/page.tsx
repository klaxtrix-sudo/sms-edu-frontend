"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Target, 
  CheckCircle2, 
  Clock, 
  Loader2,
  ChevronRight,
  FileText,
  User,
  GraduationCap
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
import { useTenant } from "@/components/providers/tenant-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GradeSubmissionModal } from "@/components/teacher/grade-submission-modal";
import { getBackendUrl } from "@/lib/utils";

export default function AssignmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [profiles, setProfiles] = useState<any>({});
  
  const { supabase, isLoading: isTenantLoading } = useTenant();

  useEffect(() => {
    if (supabase) fetchAssignmentDetails();
  }, [params.id, supabase]);

  const fetchAssignmentDetails = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/assignments/${params.id}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.success) {
        setAssignment(result.data);
        fetchSubmissions(session.access_token);
      }
    } catch (error) {
      toast.error("Error loading assignment");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (token: string) => {
    if (!supabase) return;
    setSubLoading(true);
    try {
      const res = await fetch(`${getBackendUrl()}/assignments/${params.id}/submissions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setSubmissions(result.data);
        // Fetch student profiles for these submissions
        const studentIds = result.data.map((s: any) => s.studentId);
        if (studentIds.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", studentIds);
          
          const profileMap = (profileData || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
          setProfiles(profileMap);
        }
      }
    } catch (error) {
       toast.error("Failed to load submissions");
    } finally {
      setSubLoading(false);
    }
  };

  const handleGrade = (submission: any) => {
    setSelectedSubmission(submission);
    setIsGradeModalOpen(true);
  };

  if (isTenantLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="size-16 animate-spin text-primary/30" />
        <p className="text-muted-foreground font-black animate-pulse">Analyzing Course Record...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
       <div className="p-20 text-center space-y-4">
          <h2 className="text-2xl font-black">Assignment not found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
       </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          className="size-10 sm:size-11 rounded-xl sm:rounded-2xl shadow-md hover:bg-primary hover:text-white transition-all border-none ring-1 ring-border shrink-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4 sm:size-5" />
        </Button>
        <div>
           <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-primary">Task Analysis</h1>
           <p className="text-muted-foreground font-medium text-xs sm:text-sm opacity-80">Managing submissions for <strong>{assignment.title}</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-2xl bg-primary text-primary-foreground overflow-hidden relative rounded-2xl sm:rounded-3xl">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <FileText size={100} />
             </div>
             <CardHeader className="p-5 sm:p-6 pb-2">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none w-fit px-3 py-0.5 rounded-full font-black text-[10px] uppercase tracking-widest mb-2">Metadata</Badge>
                <CardTitle className="text-2xl sm:text-3xl font-black leading-tight">{assignment.title}</CardTitle>
             </CardHeader>
             <CardContent className="p-5 sm:p-6 pt-2 space-y-5">
                <p className="text-white/80 text-xs sm:text-sm font-medium leading-relaxed italic">{assignment.description}</p>
                <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs sm:text-sm font-bold">
                   <div className="flex items-center gap-2.5">
                      <Calendar className="size-4 opacity-60 shrink-0" />
                      <span>Due {new Date(assignment.dueDate).toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-2.5">
                      <Target className="size-4 opacity-60 shrink-0" />
                      <span>Worth {assignment.totalPoints} Points</span>
                   </div>
                   <div className="flex items-center gap-2.5">
                      <Users className="size-4 opacity-60 shrink-0" />
                      <span>Status: <span className="capitalize">{assignment.status}</span></span>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-card/40 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Execution Stats</h4>
             <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-background/50 rounded-2xl border border-border/50 text-center">
                   <div className="text-xl sm:text-2xl font-black text-primary">{submissions.length}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Submitted</div>
                </div>
                <div className="p-3 sm:p-4 bg-background/50 rounded-2xl border border-border/50 text-center">
                   <div className="text-xl sm:text-2xl font-black text-emerald-500">{submissions.filter(s => s.status === 'graded').length}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Evaluated</div>
                </div>
             </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-2xl rounded-2xl sm:rounded-[2rem] overflow-hidden">
             <CardHeader className="p-5 sm:p-8 border-b border-border/50">
                <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight">Submission Roster</CardTitle>
                <CardDescription className="text-sm sm:text-base font-medium">Review and grade individual student work.</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
                {subLoading ? (
                  <div className="py-24 flex flex-col items-center gap-4">
                    <Loader2 className="size-10 animate-spin text-primary/20" />
                    <span className="font-bold text-muted-foreground text-xs sm:text-sm">Parsing student records...</span>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="py-24 text-center px-4">
                    <div className="size-16 sm:size-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-30">
                       <GraduationCap size={36} />
                    </div>
                    <p className="text-lg sm:text-xl font-black text-muted-foreground italic">Pending student engagement.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                     {submissions.map((s) => (
                        <div key={s._id} className="p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-accent/30 transition-all">
                           <div className="flex items-start sm:items-center gap-3 sm:gap-4 md:gap-6 min-w-0">
                              <div className="size-11 sm:size-14 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-lg sm:text-xl text-primary shadow-md group-hover:rotate-6 transition-transform shrink-0">
                                 {profiles[s.studentId]?.full_name?.charAt(0) || "S"}
                              </div>
                              <div className="min-w-0">
                                 <h4 className="text-base sm:text-lg md:text-xl font-black text-foreground group-hover:text-primary transition-colors truncate">
                                   {profiles[s.studentId]?.full_name || "Unknown Student"}
                                 </h4>
                                 <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                                    <Badge className={cn(
                                       "rounded-full px-2.5 sm:px-3 py-0.5 font-bold uppercase tracking-widest text-[8px] sm:text-[9px]",
                                       s.status === 'graded' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"
                                    )}>
                                       {s.status}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-tighter flex items-center gap-1">
                                       <Clock className="size-3 shrink-0" /> Submitted {new Date(s.submittedAt).toLocaleDateString()}
                                    </span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30 w-full sm:w-auto">
                              {s.status === 'graded' && (
                                 <div className="text-left sm:text-right mr-2 sm:mr-4">
                                    <div className="text-lg sm:text-xl font-black text-emerald-600">{s.grade}/{assignment.totalPoints}</div>
                                    <div className="text-[8px] font-black uppercase tracking-widest opacity-40 leading-none">Scored</div>
                                 </div>
                              )}
                              <Button 
                                onClick={() => handleGrade(s)}
                                className={cn(
                                   "rounded-xl sm:rounded-2xl font-black h-11 sm:h-12 px-5 sm:px-6 shadow-md transition-all flex-1 sm:flex-initial",
                                   s.status === 'graded' ? "bg-muted text-foreground hover:bg-primary hover:text-white" : "bg-primary text-white hover:scale-105 shadow-primary/20"
                                )}
                              >
                                 {s.status === 'graded' ? "Edit Grade" : "Evaluate Work"}
                              </Button>
                           </div>
                        </div>
                     ))}
                  </div>
                )}
             </CardContent>
           </Card>
        </div>
      </div>

      <GradeSubmissionModal 
        submission={selectedSubmission}
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        onSuccess={() => {
           const token = localStorage.getItem('sb-access-token'); // Fallback if no session
           if (supabase) {
              supabase.auth.getSession().then(({ data: { session }}) => {
                 if (session) fetchSubmissions(session.access_token);
              });
           }
        }}
        maxPoints={assignment.totalPoints}
      />
    </div>
  );
}
