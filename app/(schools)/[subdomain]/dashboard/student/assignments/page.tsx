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
  Target,
  Layers
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
import { useTenant } from "@/components/providers/tenant-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SubmitAssignmentModal } from "@/components/student/submit-assignment-modal";
import { getBackendUrl } from "@/lib/utils";

export default function StudentAssignmentsPage() {
  const { supabase, isLoading: isTenantLoading } = useTenant();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  useEffect(() => {
    if (supabase) fetchAssignments();
  }, [supabase]);

  const fetchAssignments = async () => {
    if (!supabase) return;
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex h-auto p-1.5 bg-muted/60 dark:bg-card/80 border border-border/80 rounded-2xl gap-1.5 shadow-sm backdrop-blur-md overflow-x-auto max-w-full">
          {[
            { key: "all", label: "All Missions", icon: Layers, count: assignments.length },
            { key: "pending", label: "Pending", icon: Clock },
            { key: "submitted", label: "Submitted", icon: CheckCircle2 },
            { key: "graded", label: "Graded", icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key as any)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center size-6 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={cn(
                      "ml-1 h-5 px-1.5 text-[10px] font-bold rounded-full",
                      isActive
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted-foreground/10 text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search assignments..." 
            className="pl-10 w-full sm:w-72 bg-background/50 border-none ring-1 ring-border rounded-2xl shadow-inner font-medium h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isTenantLoading || loading ? (
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
