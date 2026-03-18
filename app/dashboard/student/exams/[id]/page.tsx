"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertTriangle, 
  Maximize,
  Loader2,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Question {
  _id: string;
  text: string;
  options: string[];
  marks: number;
}

interface AttemptData {
  attemptId: string;
  examTitle: string;
  durationMins: number;
  endAt: string;
  totalMarks: number;
  questions: Question[];
}

export default function ExamPortalPage() {
  const params = useParams();
  const examId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Anti-cheating refs
  const flagCount = useRef(0);

  const submitExam = useCallback(async (isAuto = false) => {
    if (!attempt || isSubmitting || finished) return;
    
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const formattedAnswers = Object.entries(answers).map(([qId, idx]) => ({
        questionId: qId,
        selected: idx,
      }));

      const res = await fetch(`http://localhost:5000/api/attempts/${attempt.attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          timeExpired: isAuto,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        setFinished(true);
        toast.success(isAuto ? "Time up! Exam auto-submitted." : "Exam submitted successfully!");
      }
    } catch (error) {
      toast.error("Critical: Failed to submit exam. Please contact your invigilator.");
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, answers, finished, isSubmitting, supabase.auth]);

  // 1. Initialise Attempt
  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch("http://localhost:5000/api/attempts/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ examId }),
        });

        const data = await res.json();
        if (data.success) {
          setAttempt(data.data);
          setTimeLeft(data.data.durationMins * 60);
          setLoading(false);
        } else {
          toast.error(data.message || "Failed to start exam");
          router.push("/dashboard/student/exams");
        }
      } catch (error) {
        toast.error("Failed to start session");
        router.push("/dashboard/student/exams");
      }
    }
    init();
  }, [examId, router, supabase.auth]);

  // 2. Timer Logic
  useEffect(() => {
    if (!attempt || finished) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          submitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, finished, submitExam]);

  // 3. Anti-Cheating (Tab Switch)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        flagCount.current += 1;
        toast.warning(`Warning ${flagCount.current}: Please do not switch tabs! This is recorded as a suspicion level flag.`);
        
        // Log to backend
        const { data: { session } } = await supabase.auth.getSession();
        if (attempt?.attemptId) {
          await fetch(`http://localhost:5000/api/attempts/${attempt.attemptId}/flag`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ type: "tab_switch" }),
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [attempt?.attemptId, supabase.auth]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const setOption = (questionId: string, idx: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: idx }));
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center animate-pulse">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h3 className="text-xl font-bold">Initialising Security Protocol...</h3>
        <p className="text-muted-foreground">Preparing your unique exam environment.</p>
      </div>
    </div>
  );

  if (finished) return (
    <div className="h-full max-w-2xl mx-auto flex items-center justify-center py-20 animate-in zoom-in duration-500">
      <Card className="w-full text-center border-none shadow-2xl bg-white overflow-hidden">
        <div className="h-3 w-full bg-green-500" />
        <CardContent className="pt-12 pb-12">
          <div className="size-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="size-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Examination Completed!</h2>
          <p className="text-muted-foreground mb-8">Your attempt has been securely saved and graded.</p>
          
          <div className="bg-accent/30 rounded-2xl p-8 mb-8">
            <div className="text-6xl font-black text-primary mb-2">
              {results?.score} <span className="text-2xl text-muted-foreground font-normal">/ {results?.totalMarks}</span>
            </div>
            <div className="text-sm font-semibold text-primary uppercase tracking-widest">Your Score</div>
            
            <div className="mt-6 pt-6 border-t flex justify-around">
              <div>
                <div className="text-2xl font-bold">{results?.percentage}%</div>
                <div className="text-[10px] text-muted-foreground uppercase">Grade Percentage</div>
              </div>
              <div className="border-l" />
              <div>
                <div className="text-2xl font-bold">{Math.round((results?.score / results?.totalMarks) * 100) >= 40 ? "PASS" : "FAIL"}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Remark</div>
              </div>
            </div>
          </div>

          <Button className="w-full h-12 text-lg" onClick={() => router.push("/dashboard/student/exams")}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const currentQ = attempt!.questions[currentIdx];
  const totalQs = attempt!.questions.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 border-b">
        <div>
          <h2 className="text-xl font-bold truncate max-w-[200px] md:max-w-none">{attempt?.examTitle}</h2>
          <p className="text-xs text-muted-foreground">Question {currentIdx + 1} of {totalQs}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg border-2 transition-colors shadow-sm",
            timeLeft < 300 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-card text-primary border-border"
          )}>
            <Clock className="size-5" />
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="sm" onClick={() => submitExam()} disabled={isSubmitting}>
            <Send className="mr-2 h-4 w-4" /> Submit
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Question Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-xl min-h-[400px]">
            <CardHeader className="border-b bg-accent/5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-background">Question {currentIdx + 1}</Badge>
                <div className="text-xs text-muted-foreground">{currentQ.marks} Marks</div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <h3 className="text-2xl font-medium leading-relaxed">{currentQ.text}</h3>
              
              <div className="space-y-3">
                {currentQ.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setOption(currentQ._id, idx)}
                    className={cn(
                      "w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all group",
                      answers[currentQ._id] === idx 
                        ? "bg-primary/5 border-primary text-primary shadow-md ring-1 ring-primary/20" 
                        : "bg-background border-border hover:bg-accent/50 hover:border-accent-foreground/20"
                    )}
                  >
                    <div className={cn(
                      "size-8 flex items-center justify-center rounded-full font-bold transition-colors",
                      answers[currentQ._id] === idx ? "bg-primary text-white" : "bg-accent text-accent-foreground group-hover:bg-accent-foreground/10"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="flex-1 text-lg">{option}</span>
                    <div className={cn(
                      "size-6 rounded-full border-2 flex items-center justify-center transition-colors",
                      answers[currentQ._id] === idx ? "border-primary bg-primary" : "border-border"
                    )}>
                      {answers[currentQ._id] === idx && <div className="size-2 rounded-full bg-white animate-in zoom-in duration-200" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-accent/5 flex justify-between p-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <Button 
                onClick={() => setCurrentIdx(prev => Math.min(totalQs - 1, prev + 1))}
                disabled={currentIdx === totalQs - 1}
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar / Question Grid */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Question Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {attempt?.questions.map((q, idx) => (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "size-10 rounded-lg text-xs font-bold transition-all border-2",
                      currentIdx === idx ? "border-primary shadow-sm" : "border-transparent",
                      answers[q._id] !== undefined ? "bg-primary text-white" : "bg-accent/50 text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-xs">
                  <div className="size-3 rounded-md bg-primary" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="size-3 rounded-md bg-accent" />
                  <span>Unanswered</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-primary/10 border-2 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-primary">STABILITY ALERT</div>
                <div className="text-[10px] text-primary/60">Do not refresh your browser during the exam.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
