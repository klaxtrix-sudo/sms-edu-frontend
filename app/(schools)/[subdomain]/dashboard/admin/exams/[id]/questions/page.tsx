"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Plus, 
  Trash, 
  Edit, 
  ChevronLeft, 
  CheckCircle2, 
  HelpCircle,
  Loader2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";

interface Question {
  _id: string;
  text: string;
  options: string[];
  correctIndex: number;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Exam {
  _id: string;
  title: string;
  subjectId: string;
  classId: string;
}

export default function ManageQuestionsPage() {
  const params = useParams();
  const examId = params.id as string;
  const router = useRouter();
  const supabase = createTenantClient();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form State
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
  const [qMarks, setQMarks] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch Exam Details
        const examRes = await fetch(`${getBackendUrl()}/exams/${examId}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` },
        });
        const examData = await examRes.json();
        if (examData.success) setExam(examData.data);

        // Fetch Questions
        const qRes = await fetch(`${getBackendUrl()}/questions?examId=${examId}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` },
        });
        const qData = await qRes.json();
        if (qData.success) setQuestions(qData.data);

      } catch (error) {
        toast.error("Failed to load questions");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [examId, supabase]);

  const handleSave = async () => {
    if (!qText || qOptions.some(o => !o)) {
      toast.error("Please fill all fields and options");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = editingQuestion 
        ? `${getBackendUrl()}/questions/${editingQuestion._id}`
        : `${getBackendUrl()}/questions`;
      
      const method = editingQuestion ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          examId,
          text: qText,
          options: qOptions,
          correctIndex: qCorrect,
          marks: qMarks,
          type: "mcq",
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(editingQuestion ? "Question updated" : "Question added");
        // Update local state
        if (editingQuestion) {
          setQuestions(qs => qs.map(q => q._id === result.data._id ? result.data : q));
        } else {
          setQuestions([...questions, result.data]);
        }
        setIsModalOpen(false);
        resetForm();
      }
    } catch (error) {
      toast.error("Failed to save question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${getBackendUrl()}/questions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });
      setQuestions(qs => qs.filter(q => q._id !== id));
      toast.success("Question deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setQText("");
    setQOptions(["", "", "", ""]);
    setQCorrect(0);
    setQMarks(2);
  };

  const openEdit = (q: Question) => {
    setEditingQuestion(q);
    setQText(q.text);
    setQOptions(q.options);
    setQCorrect(q.correctIndex);
    setQMarks(q.marks);
    setIsModalOpen(true);
  };

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{exam?.title}</h1>
          <p className="text-muted-foreground">Managing Questions • {exam?.subjectId} • {questions.length} Total</p>
        </div>
        <Button className="ml-auto" onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Question
        </Button>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card className="border-dashed py-20 bg-accent/5">
            <CardContent className="flex flex-col items-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground italic">No questions added yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>
                Add your first question
              </Button>
            </CardContent>
          </Card>
        ) : (
          questions.map((q, idx) => (
            <Card key={q._id} className="group hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="rounded-sm">Q{idx + 1}</Badge>
                      <Badge variant="outline" className="rounded-sm font-normal text-xs">{q.marks} Marks</Badge>
                    </div>
                    <p className="text-lg font-medium leading-relaxed mb-4">{q.text}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt, oIdx) => (
                        <div 
                          key={oIdx}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border text-sm transition-all",
                            oIdx === q.correctIndex 
                              ? "bg-green-50 border-green-200 text-green-800 ring-1 ring-green-200" 
                              : "bg-background border-border text-muted-foreground"
                          )}
                        >
                          <div className={cn(
                            "size-6 flex items-center justify-center rounded-full text-[10px] font-bold",
                            oIdx === q.correctIndex ? "bg-green-600 text-white" : "bg-accent text-accent-foreground"
                          )}>
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <span className="flex-1">{opt}</span>
                          {oIdx === q.correctIndex && <CheckCircle2 className="size-4 text-green-600" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(q._id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
            <DialogDescription>Create a multiple-choice question with 4 options.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question Text</label>
              <Textarea 
                placeholder="Enter question text here..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qOptions.map((opt, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Option {String.fromCharCode(65 + idx)}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase text-muted-foreground mr-1">Correct?</span>
                      <input 
                        type="radio"
                        checked={qCorrect === idx}
                        onChange={() => setQCorrect(idx)}
                        className="accent-primary"
                      />
                    </div>
                  </div>
                  <Input 
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...qOptions];
                      updated[idx] = e.target.value;
                      setQOptions(updated);
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="w-1/2">
              <label className="text-sm font-medium mb-2 block">Marks for this Question</label>
              <Input 
                type="number"
                value={qMarks}
                onChange={(e) => setQMarks(Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingQuestion ? "Update Question" : "Save Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
