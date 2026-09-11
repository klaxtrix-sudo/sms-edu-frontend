"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash, 
  Edit, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2, 
  HelpCircle,
  Loader2,
  Save,
  X,
  Image as ImageIcon,
  Send,
  AlertCircle,
  ThumbsUp,
  RotateCcw,
  Play,
  Eye,
  Check,
  Award,
  Sparkles,
  Layers,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { getBackendUrl, cn } from "@/lib/utils";

export interface Question {
  _id: string;
  text: string;
  imageUrl?: string;
  options: string[];
  optionImages?: string[];
  correctIndex: number;
  explanation?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Exam {
  _id: string;
  title: string;
  description?: string;
  subjectId: string;
  classId: string;
  academicYear?: string;
  term?: number;
  questionCount: number;
  totalMarks: number;
  durationMins: number;
  workflowStatus: 'draft' | 'pending_questions' | 'ready_for_review' | 'changes_requested' | 'approved' | 'published' | 'ended';
  status: 'draft' | 'published' | 'ended';
  assignedTeacherId?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  randomiseQuestions?: boolean;
  randomiseOptions?: boolean;
}

interface QuestionStudioProps {
  examId: string;
  role: 'admin' | 'teacher';
}

export function QuestionStudio({ examId, role }: QuestionStudioProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Lookups
  const [className, setClassName] = useState<string>("");
  const [subjectName, setSubjectName] = useState<string>("");
  const [assignedTeacherName, setAssignedTeacherName] = useState<string>("");

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionImageUrl, setQuestionImageUrl] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [optionImages, setOptionImages] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [marks, setMarks] = useState(2);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>("medium");
  const [explanation, setExplanation] = useState("");

  // Changes Request Modal
  const [isRequestChangesOpen, setIsRequestChangesOpen] = useState(false);
  const [reviewNotesInput, setReviewNotesInput] = useState("");

  // Test-Drive Simulator Modal
  const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [userTestAnswers, setUserTestAnswers] = useState<Record<number, number>>({});
  const [testDriveSubmitted, setTestDriveSubmitted] = useState(false);

  const supabase = createTenantClient();
  const router = useRouter();

  // Fetch Lookups
  const fetchMetadata = async (classId: string, subjectId: string, teacherId?: string) => {
    try {
      const [{ data: cData }, { data: sData }] = await Promise.all([
        (supabase as any).from("classes").select("name").eq("id", classId).maybeSingle(),
        (supabase as any).from("subjects").select("name").eq("id", subjectId).maybeSingle(),
      ]);
      if (cData) setClassName(cData.name);
      if (sData) setSubjectName(sData.name);

      if (teacherId) {
        const { data: tData } = await (supabase as any)
          .from("profiles")
          .select("full_name, email")
          .eq("id", teacherId)
          .maybeSingle();
        if (tData) setAssignedTeacherName(tData.full_name || tData.email || "Assigned Teacher");
      }
    } catch (e) {
      console.error("Failed to load metadata lookups:", e);
    }
  };

  // Fetch Exam & Questions
  const loadExamAndQuestions = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [examRes, qRes] = await Promise.all([
        fetch(`${getBackendUrl()}/exams/${examId}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        }),
        fetch(`${getBackendUrl()}/questions?examId=${examId}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        })
      ]);

      const examData = await examRes.json();
      const qData = await qRes.json();

      if (examData.success) {
        setExam(examData.data);
        fetchMetadata(examData.data.classId, examData.data.subjectId, examData.data.assignedTeacherId);
      } else {
        toast.error("Failed to load exam details");
      }

      if (qData.success) {
        setQuestions(qData.data || []);
      }
    } catch (error) {
      console.error("Error loading exam:", error);
      toast.error("Network error loading exam");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamAndQuestions();
  }, [examId]);

  // Upload image asset to Supabase Storage via backend
  const uploadImageFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Not authenticated");

          const res = await fetch(`${getBackendUrl()}/exams/upload-asset`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ dataUrl, fileName: file.name }),
          });

          const result = await res.json();
          if (!result.success || !result.url) {
            throw new Error(result.message || "Failed to upload image asset");
          }
          resolve(result.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const publicUrl = await uploadImageFile(file);
      setQuestionImageUrl(publicUrl);
      toast.success("Question diagram uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOptionImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const publicUrl = await uploadImageFile(file);
      const newImages = [...optionImages];
      newImages[index] = publicUrl;
      setOptionImages(newImages);
      toast.success(`Option ${String.fromCharCode(65 + index)} image uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Option image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  // Open modal for new question
  const openNewQuestion = () => {
    setEditingQuestion(null);
    setQuestionText("");
    setQuestionImageUrl("");
    setOptions(["", "", "", ""]);
    setOptionImages(["", "", "", ""]);
    setCorrectIndex(0);
    setMarks(2);
    setDifficulty("medium");
    setExplanation("");
    setIsModalOpen(true);
  };

  // Open modal for editing question
  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionText(q.text);
    setQuestionImageUrl(q.imageUrl || "");
    setOptions(q.options && q.options.length === 4 ? [...q.options] : ["", "", "", ""]);
    setOptionImages(q.optionImages && q.optionImages.length === 4 ? [...q.optionImages] : ["", "", "", ""]);
    setCorrectIndex(q.correctIndex);
    setMarks(q.marks || 2);
    setDifficulty(q.difficulty || "medium");
    setExplanation(q.explanation || "");
    setIsModalOpen(true);
  };

  // Save Question
  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      toast.error("Please enter the question text");
      return;
    }
    if (options.some(opt => !opt.trim())) {
      toast.error("All 4 options (A, B, C, D) must have text");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        examId,
        type: 'mcq',
        text: questionText.trim(),
        imageUrl: questionImageUrl || undefined,
        options: options.map(o => o.trim()),
        optionImages: optionImages.some(img => !!img) ? optionImages : undefined,
        correctIndex,
        marks,
        difficulty,
        explanation: explanation.trim() || undefined,
      };

      if (editingQuestion) {
        // PATCH
        const res = await fetch(`${getBackendUrl()}/questions/${editingQuestion._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          toast.success("Question updated successfully");
          setQuestions(prev => prev.map(q => q._id === editingQuestion._id ? result.data : q));
          setIsModalOpen(false);
        } else {
          toast.error(result.message || "Failed to update question");
        }
      } else {
        // POST
        const res = await fetch(`${getBackendUrl()}/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          toast.success("Question created successfully");
          setQuestions(prev => [...prev, result.data]);
          setIsModalOpen(false);
        } else {
          toast.error(result.message || "Failed to create question");
        }
      }
    } catch (error) {
      console.error("Save question error:", error);
      toast.error("Something went wrong saving question");
    } finally {
      setSaving(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/questions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Question deleted");
        setQuestions(prev => prev.filter(q => q._id !== id));
      } else {
        toast.error(result.message || "Failed to delete question");
      }
    } catch (error) {
      console.error("Delete question error:", error);
      toast.error("Network error deleting question");
    }
  };

  // Submit Questions for Review (Teacher)
  const handleSubmitForReview = async () => {
    if (questions.length === 0) {
      toast.error("Please add at least one question before submitting for review");
      return;
    }

    if (exam && questions.length < exam.questionCount) {
      if (!confirm(`You have authored ${questions.length} of ${exam.questionCount} target questions. Do you still want to submit for review?`)) {
        return;
      }
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/exams/${examId}/submit-for-review`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Questions submitted! School Admin has been notified for review.");
        setExam(result.data);
      } else {
        toast.error(result.message || "Failed to submit for review");
      }
    } catch (error) {
      toast.error("Error submitting for review");
    } finally {
      setActionLoading(false);
    }
  };

  // Request Changes (Admin)
  const handleRequestChanges = async () => {
    if (!reviewNotesInput.trim() || reviewNotesInput.trim().length < 3) {
      toast.error("Please enter specific feedback notes for the teacher");
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/exams/${examId}/request-changes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ reviewNotes: reviewNotesInput.trim() })
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Revision requested. Teacher has been notified.");
        setExam(result.data);
        setIsRequestChangesOpen(false);
      } else {
        toast.error(result.message || "Failed to request changes");
      }
    } catch (error) {
      toast.error("Error requesting changes");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Exam (Admin)
  const handleApproveExam = async (publishImmediately: boolean = false) => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/exams/${examId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ publishImmediately })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(publishImmediately ? "Exam approved and published!" : "Exam questions approved!");
        setExam(result.data);
      } else {
        toast.error(result.message || "Failed to approve exam");
      }
    } catch (error) {
      toast.error("Error approving exam");
    } finally {
      setActionLoading(false);
    }
  };

  // Publish Approved Exam
  const handlePublishExam = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/exams/${examId}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Exam published! It will become available to students on scheduled timetable slots.");
        setExam(result.data);
      } else {
        toast.error(result.message || "Failed to publish exam");
      }
    } catch (error) {
      toast.error("Error publishing exam");
    } finally {
      setActionLoading(false);
    }
  };

  // Launch Test-Drive
  const startTestDrive = () => {
    if (questions.length === 0) {
      toast.error("No questions set to test drive yet.");
      return;
    }
    setCurrentTestIndex(0);
    setUserTestAnswers({});
    setTestDriveSubmitted(false);
    setIsTestDriveOpen(true);
  };

  // Score Calculations
  const totalCurrentMarks = useMemo(() => {
    return questions.reduce((acc, q) => acc + (q.marks || 0), 0);
  }, [questions]);

  const targetQuestions = exam?.questionCount || 50;
  const targetTotalMarks = exam?.totalMarks || 100;
  const questionProgressPct = Math.min(100, Math.round((questions.length / targetQuestions) * 100));
  const marksProgressPct = Math.min(100, Math.round((totalCurrentMarks / targetTotalMarks) * 100));

  // Test-Drive Score
  const testScore = useMemo(() => {
    if (!testDriveSubmitted) return 0;
    let earned = 0;
    questions.forEach((q, idx) => {
      if (userTestAnswers[idx] === q.correctIndex) {
        earned += q.marks || 1;
      }
    });
    return earned;
  }, [testDriveSubmitted, questions, userTestAnswers]);

  // Permissions
  const isLockedForEditing = role === 'teacher' && 
    (exam?.workflowStatus === 'ready_for_review' || exam?.workflowStatus === 'approved' || exam?.workflowStatus === 'published');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading Question Studio...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-bold">Exam Paper Not Found</h2>
        <Button variant="outline" onClick={() => router.push(`/dashboard/${role}/exams`)}>
          Back to Exams
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push(`/dashboard/${role}/exams`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
              {/* Workflow Status Badges */}
              {exam.workflowStatus === 'pending_questions' && (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                  Setting Questions
                </Badge>
              )}
              {exam.workflowStatus === 'ready_for_review' && (
                <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                  Under Admin Review
                </Badge>
              )}
              {exam.workflowStatus === 'changes_requested' && (
                <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/30">
                  Revisions Requested
                </Badge>
              )}
              {exam.workflowStatus === 'approved' && (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  Approved
                </Badge>
              )}
              {exam.workflowStatus === 'published' && (
                <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/30">
                  Published & Active
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{className || "Class"}</span>
              <span>•</span>
              <span className="font-medium text-foreground">{subjectName || "Subject"}</span>
              <span>•</span>
              <span>{exam.academicYear || "Current Session"} (Term {exam.term || 1})</span>
              <span>•</span>
              <span>Assigned: {assignedTeacherName || (exam.assignedTeacherId ? "Teacher" : "None (Admin Managed)")}</span>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Test Drive Button available to both Admin & Teacher */}
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={startTestDrive}
          >
            <Play className="h-4 w-4 text-primary fill-primary" />
            Test-Drive Exam
          </Button>

          {/* Teacher Actions */}
          {role === 'teacher' && (
            <>
              {exam.workflowStatus !== 'ready_for_review' && exam.workflowStatus !== 'approved' && exam.workflowStatus !== 'published' && (
                <Button 
                  onClick={handleSubmitForReview} 
                  disabled={actionLoading || questions.length === 0}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit for Admin Review
                </Button>
              )}
              {exam.workflowStatus === 'approved' && (
                <Button 
                  onClick={handlePublishExam}
                  disabled={actionLoading}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Publish Exam
                </Button>
              )}
            </>
          )}

          {/* Admin Actions */}
          {role === 'admin' && (
            <>
              {exam.workflowStatus === 'ready_for_review' && (
                <>
                  <Button 
                    variant="outline" 
                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => {
                      setReviewNotesInput("");
                      setIsRequestChangesOpen(true);
                    }}
                    disabled={actionLoading}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Request Changes
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleApproveExam(false)}
                    disabled={actionLoading}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Approve Only
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApproveExam(true)}
                    disabled={actionLoading}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1.5" />
                    Approve & Publish
                  </Button>
                </>
              )}
              {/* If exam is approved, Admin can publish */}
              {exam.workflowStatus === 'approved' && (
                <Button 
                  onClick={handlePublishExam}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Publish Exam
                </Button>
              )}
              {/* If exam is not yet submitted for review or approved, Admin can directly Approve & Publish questions they authored */}
              {exam.workflowStatus !== 'ready_for_review' && exam.workflowStatus !== 'approved' && exam.workflowStatus !== 'published' && (
                <Button 
                  onClick={() => handleApproveExam(true)}
                  disabled={actionLoading || questions.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  Approve & Publish
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Changes Requested Notification Banner */}
      {exam.workflowStatus === 'changes_requested' && exam.reviewNotes && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              Admin Revisions Requested
            </h4>
            <p className="text-sm text-rose-700 dark:text-rose-300">
              {exam.reviewNotes}
            </p>
          </div>
        </div>
      )}

      {/* Under Review Notice for Teacher */}
      {role === 'teacher' && exam.workflowStatus === 'ready_for_review' && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Exam Under Admin Review</h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">Questions are submitted for administrative review. Editing is temporarily locked.</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Pending Review</Badge>
        </div>
      )}

      {/* Live Progress Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Questions Scorecard */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Questions Progress</CardDescription>
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-2xl font-bold">
                {questions.length} <span className="text-sm font-normal text-muted-foreground">/ {targetQuestions}</span>
              </CardTitle>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {questionProgressPct}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={questionProgressPct} className="h-2" />
          </CardContent>
        </Card>

        {/* Marks Scorecard */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Marks Allocation</CardDescription>
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-2xl font-bold">
                {totalCurrentMarks} <span className="text-sm font-normal text-muted-foreground">/ {targetTotalMarks}</span>
              </CardTitle>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                {marksProgressPct}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={marksProgressPct} className="h-2 bg-muted" />
          </CardContent>
        </Card>

        {/* Paper Info & Duration */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Time & Setting</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">
                {exam.durationMins} <span className="text-sm font-normal text-muted-foreground">Mins</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {exam.randomiseQuestions ? "Shuffled" : "Sequential"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Per-Question Avg: {questions.length > 0 ? (exam.durationMins / questions.length).toFixed(1) : "0"} mins</span>
            <span className="font-mono text-primary font-semibold">CBT Mode</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">Question Bank ({questions.length})</h2>
            <p className="text-xs text-muted-foreground">
              Review and arrange candidate questions. Images and diagrams are served via Supabase CDN.
            </p>
          </div>

          {!isLockedForEditing && (
            <Button onClick={openNewQuestion} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          )}
        </div>

        {questions.length === 0 ? (
          <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">No Questions Set Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              Get started by adding questions for this exam. You can attach diagrams, mathematical formulas, and images.
            </p>
            {!isLockedForEditing && (
              <Button onClick={openNewQuestion} className="gap-2">
                <Plus className="h-4 w-4" /> Add First Question
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <Card key={q._id} className="relative transition-all hover:border-primary/50 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {index + 1}
                      </span>
                      <div className="space-y-1">
                        <div className="font-medium text-base leading-snug whitespace-pre-wrap">
                          {q.text}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="secondary" className="text-xs">
                            {q.marks || 1} {q.marks === 1 ? 'Mark' : 'Marks'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {!isLockedForEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => openEditQuestion(q)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteQuestion(q._id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Question Image Diagram */}
                  {q.imageUrl && (
                    <div className="my-2 max-w-sm rounded-lg border overflow-hidden bg-muted/20">
                      <img 
                        src={q.imageUrl} 
                        alt="Question Diagram" 
                        className="max-h-56 w-auto object-contain mx-auto"
                      />
                    </div>
                  )}

                  {/* Options List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctIndex === optIdx;
                      const optImg = q.optionImages?.[optIdx];

                      return (
                        <div 
                          key={optIdx}
                          className={cn(
                            "flex items-start gap-2.5 p-2.5 rounded-lg border text-sm transition-all",
                            isCorrect 
                              ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/50 text-emerald-950 dark:text-emerald-100 font-medium" 
                              : "bg-muted/10 border-border"
                          )}
                        >
                          <span className={cn(
                            "flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold",
                            isCorrect 
                              ? "bg-emerald-600 text-white" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>

                          <div className="flex-1 space-y-1">
                            <span>{opt}</span>
                            {optImg && (
                              <img 
                                src={optImg} 
                                alt={`Option ${String.fromCharCode(65 + optIdx)}`} 
                                className="h-20 w-auto object-contain rounded border mt-1" 
                              />
                            )}
                          </div>

                          {isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* QUESTION AUTHORING MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add New MCQ Question"}</DialogTitle>
            <DialogDescription>
              Write the question, upload optional diagram assets, define 4 options, and select the correct answer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Question *</label>
              <Textarea 
                placeholder="Type the question content here..." 
                rows={3} 
                value={questionText} 
                onChange={(e) => setQuestionText(e.target.value)} 
              />
            </div>

            {/* Diagram / Question Image */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Question Diagram / Image (Optional)</label>
              <div className="flex items-center gap-3">
                {questionImageUrl ? (
                  <div className="relative inline-block border rounded-lg overflow-hidden bg-muted/20">
                    <img src={questionImageUrl} alt="Preview" className="h-24 w-auto object-contain p-1" />
                    <button
                      type="button"
                      onClick={() => setQuestionImageUrl("")}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow hover:opacity-90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 border border-dashed rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors text-xs font-medium text-muted-foreground">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Upload Diagram from Computer</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleQuestionImageUpload} 
                      disabled={uploadingImage}
                    />
                  </label>
                )}
                {uploadingImage && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
            </div>

            {/* 4 Options */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-semibold flex items-center justify-between">
                <span>Multiple Choice Options (A - D) *</span>
                <span className="text-xs text-muted-foreground font-normal">Click radio to select correct answer</span>
              </label>

              <div className="space-y-2.5">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/10">
                    <input
                      type="radio"
                      name="correctAnswerGroup"
                      checked={correctIndex === idx}
                      onChange={() => setCorrectIndex(idx)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      title="Select as correct answer"
                    />
                    <span className="font-bold text-xs text-muted-foreground w-4">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 bg-background"
                    />
                    
                    {/* Option Image Upload Button */}
                    <label className="cursor-pointer p-2 hover:bg-muted rounded text-muted-foreground hover:text-primary">
                      <ImageIcon className="h-4 w-4" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleOptionImageUpload(idx, e)}
                        disabled={uploadingImage}
                      />
                    </label>

                    {optionImages[idx] && (
                      <div className="relative border rounded p-0.5 bg-background">
                        <img src={optionImages[idx]} alt="Opt Img" className="h-7 w-7 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = [...optionImages];
                            newImages[idx] = "";
                            setOptionImages(newImages);
                          }}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Marks Allocated */}
            <div className="space-y-1.5 pt-2 max-w-[200px]">
              <label className="text-xs font-semibold">Marks Allocated</label>
              <Input 
                type="number" 
                min={1} 
                max={50} 
                value={marks} 
                onChange={(e) => setMarks(Number(e.target.value))} 
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion} disabled={saving || uploadingImage}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingQuestion ? "Update Question" : "Save Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADMIN REQUEST CHANGES MODAL */}
      <Dialog open={isRequestChangesOpen} onOpenChange={setIsRequestChangesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revisions from Teacher</DialogTitle>
            <DialogDescription>
              Explain the necessary modifications or missing curriculum standards to the subject teacher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Textarea
              placeholder="e.g. Please add 5 more questions on Quantum Physics and ensure question 12 has clear diagram labels..."
              rows={4}
              value={reviewNotesInput}
              onChange={(e) => setReviewNotesInput(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsRequestChangesOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRequestChanges}
              disabled={actionLoading || !reviewNotesInput.trim()}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Revisions Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STUDENT TEST-DRIVE SIMULATOR MODAL */}
      <Dialog open={isTestDriveOpen} onOpenChange={setIsTestDriveOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary fill-primary" />
                  Student CBT Test-Drive Simulator
                </DialogTitle>
                <DialogDescription>
                  Preview the exam interface exactly as candidates will experience it.
                </DialogDescription>
              </div>
              <Badge variant="outline" className="font-mono text-sm px-3 py-1 bg-amber-500/10 text-amber-700 border-amber-300">
                Preview Mode
              </Badge>
            </div>
          </DialogHeader>

          {!testDriveSubmitted ? (
            <div className="space-y-6 pt-2">
              {/* Question Navigation Pills */}
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg bg-muted/30 border">
                {questions.map((_, qIdx) => {
                  const isCurrent = currentTestIndex === qIdx;
                  const isAnswered = userTestAnswers[qIdx] !== undefined;

                  return (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => setCurrentTestIndex(qIdx)}
                      className={cn(
                        "h-8 w-8 rounded text-xs font-bold transition-all",
                        isCurrent && "ring-2 ring-primary bg-primary text-primary-foreground",
                        !isCurrent && isAnswered && "bg-emerald-600 text-white",
                        !isCurrent && !isAnswered && "bg-background border hover:bg-muted"
                      )}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Active Question Display */}
              {questions[currentTestIndex] && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Question {currentTestIndex + 1} of {questions.length}</span>
                    <span>Marks: {questions[currentTestIndex].marks || 1}</span>
                  </div>

                  <h3 className="text-lg font-medium">
                    {questions[currentTestIndex].text}
                  </h3>

                  {questions[currentTestIndex].imageUrl && (
                    <div className="rounded-lg border p-2 bg-muted/10 max-w-md mx-auto">
                      <img 
                        src={questions[currentTestIndex].imageUrl} 
                        alt="Question Diagram" 
                        className="max-h-60 mx-auto object-contain"
                      />
                    </div>
                  )}

                  <div className="space-y-2.5 pt-2">
                    {questions[currentTestIndex].options.map((opt, optIdx) => {
                      const isSelected = userTestAnswers[currentTestIndex] === optIdx;

                      return (
                        <div
                          key={optIdx}
                          onClick={() => {
                            setUserTestAnswers(prev => ({ ...prev, [currentTestIndex]: optIdx }));
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected 
                              ? "bg-primary/10 border-primary text-primary font-medium" 
                              : "hover:bg-muted/30 bg-background"
                          )}
                        >
                          <span className={cn(
                            "flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Simulator Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentTestIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentTestIndex === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                {currentTestIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentTestIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="gap-1"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setTestDriveSubmitted(true)}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Submit Test-Drive
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Test Drive Scorecard Results */
            <div className="space-y-6 py-4 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <Award className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold">Test-Drive Completed!</h3>
              <p className="text-sm text-muted-foreground">
                Simulator evaluated against answer keys:
              </p>

              <div className="inline-block bg-muted/40 p-6 rounded-xl border">
                <div className="text-4xl font-extrabold text-primary">
                  {testScore} <span className="text-xl font-normal text-muted-foreground">/ {totalCurrentMarks}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Score Percentage: {totalCurrentMarks > 0 ? Math.round((testScore / totalCurrentMarks) * 100) : 0}%
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setUserTestAnswers({});
                    setTestDriveSubmitted(false);
                    setCurrentTestIndex(0);
                  }}
                >
                  Retake Simulator
                </Button>
                <Button onClick={() => setIsTestDriveOpen(false)}>
                  Close Simulator
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
