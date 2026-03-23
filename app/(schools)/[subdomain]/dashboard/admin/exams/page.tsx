"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Calendar, Clock, MoreVertical, Edit, Trash, Play, StopCircle, ClipboardList } from "lucide-react";
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
import { AddExamModal } from "@/components/admin/add-exam-modal";
import { createTenantClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const supabase = createTenantClient();
  const router = useRouter();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("http://localhost:5000/api/exams", {
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

  useEffect(() => {
    fetchExams();
  }, []);

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case "draft": return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Draft</Badge>;
      case "ended": return <Badge variant="destructive">Ended</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCQ Exams</h1>
          <p className="text-muted-foreground">Manage and create objective examinations for your students.</p>
        </div>
        <Button 
          className="shrink-0 bg-primary hover:bg-primary/90"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Create New Exam
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search exams..." 
            className="pl-9 h-11 border-none bg-accent/50 focus-visible:ring-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-11 px-6">Filters</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredExams.map((exam) => (
          <Card key={exam._id} className="group overflow-hidden border-none shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 bg-white">
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
                    <DropdownMenuItem className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/admin/exams/${exam._id}/questions`)}
                    >
                      <Play className="mr-2 h-4 w-4" /> Manage Qs
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="text-xl line-clamp-1">{exam.title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-sm font-normal border-primary/20 bg-primary/5 text-primary">
                  {exam.subjectId}
                </Badge>
                • {exam.classId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 bg-accent/30 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{exam.durationMins} Mins • {exam.questionCount} Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Starts: {new Date(exam.startAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="mt-6 flex gap-2">
                <Button variant="secondary" className="flex-1 text-xs">View Results</Button>
                {exam.status === 'draft' ? (
                  <Button className="flex-1 text-xs bg-green-600 hover:bg-green-700">Publish</Button>
                ) : (
                  <Button variant="outline" className="flex-1 text-xs text-destructive hover:bg-destructive/5 hover:text-destructive">End Exam</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExams.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-20 rounded-full bg-accent/50 flex items-center justify-center mb-4">
            <ClipboardList className="size-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No exams found</h3>
          <p className="text-muted-foreground mt-1">Create your first examination to get started.</p>
          <Button className="mt-6">
            <Plus className="mr-2 h-4 w-4" /> Create Exam
          </Button>
        </div>
      )}

      <AddExamModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSuccess={fetchExams}
      />
    </div>
  );
}
