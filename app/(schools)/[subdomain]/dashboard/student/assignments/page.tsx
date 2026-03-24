"use client";

import { useEffect, useState } from "react";
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Loader2,
  ChevronRight,
  FileText,
  Search,
  Filter,
  Trophy,
  Target
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
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SubmitAssignmentModal } from "@/components/student/submit-assignment-modal";
import { getBackendUrl } from "@/lib/utils";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  
  const supabase = createClient();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Get Student Class
      const { data: student } = await supabase
        .from("students")
        .select("class_id")
        .eq("user_id", session.user.id)
        .single();

      if (!(student as any)?.class_id) throw new Error("Class not found");

      // 2. Fetch Assignments
      const res = await fetch(`${getBackendUrl()}/assignments/class/${(student as any).class_id}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      
      if (result.success) {
        setAssignments(result.data);
        
        // 3. Fetch Student Submissions to check status
        // Create a teacher route or fetch all for assignment IDs
        // For efficiency, we'll fetch student specific submissions in the details page
        // But for the list view, we need to know if it's submitted.
        // Let's assume there's a student submissions endpoint or we fetch all and filter (less ideal)
        // For now, we'll rely on the details page for status or add a status check.
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load coursework");
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary uppercase italic">Academic Missions</h1>
          <p className="text-muted-foreground mt-1 text-lg font-medium opacity-80">Track your assignments, submit work, and view grades.</p>
        </div>
        <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl">
           <BookOpen className="size-8 text-primary" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/40 p-4 rounded-3xl border border-border/50 backdrop-blur-xl">
         <div className="flex items-center gap-2">
            {['all', 'pending', 'submitted', 'graded'].map((f) => (
               <Button 
                key={f}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f as any)}
                className={cn("rounded-xl font-black uppercase tracking-widest text-[10px]", filter === f && "shadow-lg scale-105")}
               >
                 {f}
               </Button>
            ))}
         </div>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search assignments..." 
              className="pl-10 w-72 bg-background/50 border-none ring-1 ring-border rounded-2xl shadow-inner font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      {loading ? (
        <div className="py-40 flex flex-col items-center gap-4">
           <Loader2 className="size-14 animate-spin text-primary/30" />
           <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase">Syncing Homework...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="py-32 text-center bg-card/30 rounded-[3rem] border-2 border-dashed border-border/50">
           <Trophy className="size-20 mx-auto text-muted-foreground opacity-20 mb-6" />
           <h3 className="text-2xl font-black">All Caught Up!</h3>
           <p className="text-muted-foreground mt-2 font-medium">No active assignments discovered for your class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredAssignments.map((a) => (
             <StudentAssignmentCard key={a._id} assignment={a} />
           ))}
        </div>
      )}
    </div>
  );
}

function StudentAssignmentCard({ assignment }: { assignment: any }) {
  const isPastDue = new Date(assignment.dueDate) < new Date();

  return (
    <Link href={`/dashboard/student/assignments/${assignment._id}`} className="block group">
       <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-2xl rounded-[2rem] overflow-hidden hover:translate-y-[-6px] transition-all duration-500 h-full flex flex-col">
          <div className="h-2 bg-primary group-hover:h-3 transition-all" />
          <CardHeader className="p-8">
             <div className="flex items-center justify-between gap-2 mb-4">
                <Badge variant="outline" className="rounded-full px-3 py-1 bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-[0.2em]">
                   {assignment.subjectId?.name || "Academic"}
                </Badge>
                {isPastDue && (
                   <div className="size-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500" title="Overdue">
                      <AlertCircle size={18} />
                   </div>
                )}
             </div>
             <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors leading-tight">{assignment.title}</CardTitle>
             <CardDescription className="line-clamp-2 mt-4 text-base font-medium opacity-80 leading-relaxed italic">"{assignment.description}"</CardDescription>
          </CardHeader>

          <div className="mt-auto px-8 pb-8 space-y-4">
             <div className="flex flex-col gap-3 pt-6 border-t border-border/30">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                   <div className="flex items-center gap-2">
                       <Clock className="size-4 opacity-50 font-bold" /> Deadline
                   </div>
                   <span className={cn(isPastDue ? "text-rose-500" : "text-emerald-500")}>
                      {new Date(assignment.dueDate).toLocaleDateString()}
                   </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                   <div className="flex items-center gap-2">
                       <Target className="size-4 opacity-50" /> Points
                   </div>
                   <span className="text-primary">{assignment.totalPoints}</span>
                </div>
             </div>

             <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform pt-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">View Brief</span>
                <ChevronRight className="size-5 text-primary opacity-0 group-hover:opacity-100 transition-all" />
             </div>
          </div>
       </Card>
    </Link>
  );
}
