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
  Save,
  X,
  Image as ImageIcon
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
  imageUrl?: string;
  options: string[];
  optionImages?: string[];
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

// Client-side Image Compression utility using canvas
function compressAndBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File must be an image"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context creation failed"));
          return;
        }

        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG at 75% quality
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
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
  const [qImageUrl, setQImageUrl] = useState("");
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qOptionImages, setQOptionImages] = useState(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
  const [qMarks, setQMarks] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isOption: boolean, optionIdx: number = 0) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      return;
    }

    setCompressing(true);
    try {
      const base64 = await compressAndBase64(file);
      if (isOption) {
        setQOptionImages(prev => {
          const updated = [...prev];
          updated[optionIdx] = base64;
          return updated;
        });
        toast.success(`Option ${String.fromCharCode(65 + optionIdx)} image processed`);
      } else {
        setQImageUrl(base64);
        toast.success("Question image processed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process image");
    } finally {
      setCompressing(false);
    }
  };

  const handleSave = async () => {
    // Validate that we have text OR image for question, and for options
    if (!qText.trim() && !qImageUrl) {
      toast.error("Please provide either question text or a question image");
      return;
    }

    const hasIncompleteOptions = qOptions.some((opt, idx) => !opt.trim() && !qOptionImages[idx]);
    if (hasIncompleteOptions) {
      toast.error("Please fill in text or an image for all four options");
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
          imageUrl: qImageUrl || undefined,
          options: qOptions,
          optionImages: qOptionImages,
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
      } else {
        throw new Error(result.message || "Failed to save question");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save question");
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
    setQImageUrl("");
    setQOptions(["", "", "", ""]);
    setQOptionImages(["", "", "", ""]);
    setQCorrect(0);
    setQMarks(2);
  };

  const openEdit = (q: Question) => {
    setEditingQuestion(q);
    setQText(q.text);
    setQImageUrl(q.imageUrl || "");
    setQOptions(q.options);
    setQOptionImages(q.optionImages || ["", "", "", ""]);
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
        <Button className="ml-auto bg-primary hover:bg-primary/90" onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Question
        </Button>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card className="border-dashed py-20 bg-accent/5">
            <CardContent className="flex flex-col items-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground italic">No questions added yet.</p>
              <Button variant="outline" className="mt-4 animate-bounce" onClick={() => setIsModalOpen(true)}>
                Add your first question
              </Button>
            </CardContent>
          </Card>
        ) : (
          questions.map((q, idx) => (
            <Card key={q._id} className="group hover:border-primary/50 transition-colors shadow-sm bg-white border-none rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-md bg-accent/80 font-bold">Q{idx + 1}</Badge>
                      <Badge variant="outline" className="rounded-md font-medium text-xs text-primary bg-primary/5 border-primary/20">{q.marks} Marks</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-lg font-bold leading-relaxed">{q.text}</p>
                      
                      {q.imageUrl && (
                        <div className="max-w-lg rounded-xl overflow-hidden border bg-slate-50 p-2">
                          <img src={q.imageUrl} alt="Question Visual" className="max-h-64 object-contain rounded-lg w-full" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {q.options.map((opt, oIdx) => (
                        <div 
                          key={oIdx}
                          className={cn(
                            "flex flex-col gap-2 p-4 rounded-xl border text-sm transition-all bg-card/30",
                            oIdx === q.correctIndex 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 ring-1 ring-emerald-200/50 shadow-sm" 
                              : "bg-background border-border text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "size-6 flex items-center justify-center rounded-full text-[10px] font-extrabold",
                              oIdx === q.correctIndex ? "bg-emerald-600 text-white" : "bg-accent text-accent-foreground"
                            )}>
                              {String.fromCharCode(65 + oIdx)}
                            </div>
                            <span className="flex-1 font-semibold text-slate-800">{opt || <span className="italic text-xs font-normal text-muted-foreground">Image Choice</span>}</span>
                            {oIdx === q.correctIndex && <CheckCircle2 className="size-4 text-emerald-600" />}
                          </div>

                          {q.optionImages?.[oIdx] && (
                            <div className="rounded-lg overflow-hidden border bg-white max-h-32 mt-1">
                              <img src={q.optionImages[oIdx]} alt={`Option ${String.fromCharCode(65 + oIdx)}`} className="max-h-28 object-contain w-auto mx-auto p-1" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(q)} className="rounded-xl hover:bg-accent">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(q._id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
            <DialogDescription>Create a multiple-choice question. You can add images for questions and answers.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Question Text */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Question Text</label>
              <Textarea 
                placeholder="Enter question text here..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                className="min-h-[100px] rounded-xl focus:ring-1"
              />
            </div>

            {/* Question Image Upload */}
            <div className="space-y-3 p-4 bg-slate-50 border rounded-2xl">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Question Diagram / Chart (Optional)</label>
              
              {qImageUrl ? (
                <div className="relative group max-w-sm rounded-xl overflow-hidden border bg-white p-2">
                  <img src={qImageUrl} alt="Question Upload Preview" className="max-h-40 object-contain w-full" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={() => setQImageUrl("")}
                    className="absolute top-3 right-3 rounded-full size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <label htmlFor="q-img-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-white transition-all text-sm font-bold text-slate-600 bg-slate-100/50 w-fit">
                      <ImageIcon className="size-4" />
                      Add Question Diagram
                    </div>
                  </label>
                  <input 
                    id="q-img-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, false)}
                    disabled={compressing}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Diagrams are client-side compressed to optimized size.</p>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {qOptions.map((opt, idx) => (
                <div key={idx} className="space-y-3 p-4 bg-card rounded-2xl border border-border/50">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700">Option {String.fromCharCode(65 + idx)}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase text-muted-foreground mr-1 font-bold">Correct Option?</span>
                      <input 
                        type="radio"
                        checked={qCorrect === idx}
                        onChange={() => setQCorrect(idx)}
                        className="accent-primary size-4"
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
                    className="rounded-xl bg-background"
                  />

                  {/* Option Image Upload */}
                  <div className="space-y-2">
                    {qOptionImages[idx] ? (
                      <div className="relative group max-h-24 rounded-lg overflow-hidden border bg-white p-1 max-w-[120px]">
                        <img src={qOptionImages[idx]} alt={`Preview Option ${String.fromCharCode(65 + idx)}`} className="max-h-20 object-contain w-auto mx-auto" />
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          onClick={() => setQOptionImages(prev => {
                            const updated = [...prev];
                            updated[idx] = "";
                            return updated;
                          })}
                          className="absolute top-1 right-1 rounded-full size-5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor={`opt-img-${idx}`} className="cursor-pointer">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg hover:bg-slate-100 transition-all text-xs font-bold text-slate-500 bg-background w-fit">
                            <ImageIcon className="size-3.5" />
                            Add Option Image
                          </div>
                        </label>
                        <input 
                          id={`opt-img-${idx}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, true, idx)}
                          disabled={compressing}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Marks */}
            <div className="w-1/2 space-y-1">
              <label className="text-sm font-bold text-slate-700">Marks for this Question</label>
              <Input 
                type="number"
                value={qMarks}
                onChange={(e) => setQMarks(Number(e.target.value))}
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" className="rounded-xl h-11" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting || compressing} className="rounded-xl h-11 bg-primary hover:bg-primary/90">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {compressing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
