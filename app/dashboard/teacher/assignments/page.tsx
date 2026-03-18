"use client";

import { useEffect, useState } from "react";
import { 
  BookOpen, 
  Plus, 
  Clock, 
  Users, 
  FileText, 
  CheckCircle2,
  Calendar,
  Loader2,
  ChevronRight,
  MoreVertical,
  Search,
  AlertCircle
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
import { CreateAssignmentModal } from "@/components/teacher/create-assignment-modal";

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [selectedClass]);

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: classData } = await supabase
        .from("classes")
        .select("*")
        .eq("class_teacher_id", user.id);
      
      setClasses(classData || []);
    } catch (error) {
      toast.error("Failed to load classes");
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // We'll fetch for all classes or a specific one
      // The backend route is /api/assignments/class/:id, but for now we fetch all and filter in frontend or use a teacher-specific route
      // For this implementation, we'll fetch for each class or implement a teacher route.
      // Let's assume we fetch by class since our routes are class-based.
      
      const targetClasses = selectedClass === "all" ? classes.map(c => c.id) : [selectedClass];
      
      const allAssignments: any[] = [];
      for (const cid of targetClasses) {
        const res = await fetch(`http://localhost:5000/api/assignments/class/${cid}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const result = await res.json();
        if (result.success) allAssignments.push(...result.data);
      }
      
      // Sort and remove duplicates if any
      setAssignments(allAssignments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      toast.error("Error loading assignments");
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary">Homework Hub</h1>
          <p className="text-muted-foreground mt-1 text-lg">Create assignments and evaluate student submissions.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <CreateAssignmentModal onSuccess={fetchAssignments} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
        <div className="flex items-center gap-2">
          {classes.map(c => (
            <Button 
              key={c.id}
              variant={selectedClass === c.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedClass(c.id)}
              className={cn("rounded-xl font-bold transition-all", selectedClass === c.id && "shadow-lg scale-105")}
            >
              {c.name}
            </Button>
          ))}
          <Button 
            variant={selectedClass === "all" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setSelectedClass("all")}
            className={cn("rounded-xl font-bold", selectedClass === "all" && "shadow-lg scale-105")}
          >
            All Classes
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks..." 
            className="pl-10 w-64 bg-background/50 border-none ring-1 ring-border rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="size-12 animate-spin text-primary/40" />
          <p className="text-muted-foreground font-bold animate-pulse">Syncing Assignments...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-card/40 rounded-3xl border-2 border-dashed border-border/50">
          <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="size-10 text-primary opacity-40" />
          </div>
          <h3 className="text-2xl font-black tracking-tight">No Assignments Found</h3>
          <p className="text-muted-foreground mt-2 max-w-xs mx-auto font-medium">Your course list is currently empty. Start by creating a new assignment!</p>
          <Button className="mt-8 rounded-2xl font-bold px-8 h-12 shadow-xl shadow-primary/20" onClick={() => fetchAssignments()}>Refresh Hub</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((a) => (
            <AssignmentCard key={a._id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: any }) {
  const isPastDue = new Date(assignment.dueDate) < new Date();

  return (
    <Link href={`/dashboard/teacher/assignments/${assignment._id}`} className="block group">
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl hover:translate-y-[-4px] transition-all duration-300 relative overflow-hidden h-full">
        <div className={cn(
          "absolute top-0 left-0 w-1 h-full",
          assignment.status === 'published' ? "bg-primary" : "bg-muted-foreground/30"
        )} />
        
        <CardHeader className="p-6">
          <div className="flex items-start justify-between gap-2 mb-4">
            <Badge variant={assignment.status === 'published' ? 'default' : 'outline'} className="rounded-full px-3 py-0.5 font-bold uppercase tracking-wider text-[10px]">
              {assignment.status}
            </Badge>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Users className="size-3" />
              Graded 0/0
            </div>
          </div>
          <CardTitle className="text-xl font-black group-hover:text-primary transition-colors leading-tight">
            {assignment.title}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-sm mt-2 font-medium">
            {assignment.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground bg-muted/30 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary/60" />
              Created {new Date(assignment.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-2 p-3 rounded-2xl text-xs font-black uppercase tracking-widest",
            isPastDue ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
          )}>
            <Clock className="size-4" />
            Due {new Date(assignment.dueDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="size-4 text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {assignment.attachments?.length || 0} Assets
              </span>
            </div>
            <div className="size-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <ChevronRight className="size-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
