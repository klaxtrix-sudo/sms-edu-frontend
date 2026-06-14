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
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
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
           <h1 className="text-4xl font-black tracking-tight text-primary">Task Analysis</h1>
           <p className="text-muted-foreground font-medium opacity-80">Managing submissions for <strong>{assignment.title}</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-3xl bg-primary text-primary-foreground overflow-hidden relative">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileText size={120} />
             </div>
             <CardHeader>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none w-fit px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest mb-2">Metadata</Badge>
                <CardTitle className="text-3xl font-black leading-tight">{assignment.title}</CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                <p className="text-white/80 font-medium leading-relaxed italic">{assignment.description}</p>
                <div className="space-y-3 pt-6 border-t border-white/10">
                   <div className="flex items-center gap-3 text-sm font-bold">
                      <Calendar className="size-4 opacity-60" />
                      Due {new Date(assignment.dueDate).toLocaleString()}
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold">
                      <Target className="size-4 opacity-60" />
                      Worth {assignment.totalPoints} Points
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold">
                      <Users className="size-4 opacity-60" />
                      Status: <span className="capitalize">{assignment.status}</span>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-xl p-6">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Execution Stats</h4>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background/50 rounded-2xl border border-border/50 text-center">
                   <div className="text-2xl font-black text-primary">{submissions.length}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Submitted</div>
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-border/50 text-center">
                   <div className="text-2xl font-black text-emerald-500">{submissions.filter(s => s.status === 'graded').length}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Evaluated</div>
                </div>
             </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
             <CardHeader className="p-10 border-b border-border/50">
                <CardTitle className="text-3xl font-black tracking-tight">Submission Roster</CardTitle>
                <CardDescription className="text-lg font-medium">Review and grade individual student work.</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
                {subLoading ? (
                  <div className="py-32 flex flex-col items-center gap-4">
                    <Loader2 className="size-12 animate-spin text-primary/20" />
                    <span className="font-bold text-muted-foreground">Parsing student records...</span>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="py-32 text-center">
                    <div className="size-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 opacity-30">
                       <GraduationCap size={40} />
                    </div>
                    <p className="text-xl font-black text-muted-foreground italic">Pending student engagement.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                     {submissions.map((s) => (
                        <div key={s._id} className="p-8 flex items-center justify-between group hover:bg-accent/30 transition-all">
                           <div className="flex items-center gap-6">
                              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-xl text-primary shadow-lg group-hover:rotate-6 transition-transform">
                                 {profiles[s.studentId]?.full_name?.charAt(0) || "S"}
                              </div>
                              <div>
                                 <h4 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{profiles[s.studentId]?.full_name || "Unknown Student"}</h4>
                                 <div className="flex items-center gap-3 mt-1">
                                    <Badge className={cn(
                                       "rounded-full px-3 py-0.5 font-bold uppercase tracking-widest text-[8px]",
                                       s.status === 'graded' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"
                                    )}>
                                       {s.status}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-tighter flex items-center gap-1">
                                       <Clock className="size-3" /> Submitted {new Date(s.submittedAt).toLocaleDateString()}
                                    </span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-4">
                              {s.status === 'graded' && (
                                 <div className="text-right mr-4">
                                    <div className="text-xl font-black text-emerald-600">{s.grade}/{assignment.totalPoints}</div>
                                    <div className="text-[8px] font-black uppercase tracking-widest opacity-40 leading-none">Scored</div>
                                 </div>
                              )}
                              <Button 
                                onClick={() => handleGrade(s)}
                                className={cn(
                                   "rounded-2xl font-black h-12 px-6 shadow-xl transition-all",
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
