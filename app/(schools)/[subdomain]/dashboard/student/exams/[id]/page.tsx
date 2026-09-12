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
import { useTenant } from "@/components/providers/tenant-provider";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";

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
  const { supabase, isLoading: isTenantLoading } = useTenant();

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
    if (!supabase || !attempt || isSubmitting || finished) return;
    
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const formattedAnswers = Object.entries(answers).map(([qId, idx]) => ({
        questionId: qId,
        selected: idx,
      }));

      const res = await fetch(`${getBackendUrl()}/attempts/${attempt.attemptId}/submit`, {
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
        toast.success(isAuto ? "Time's up! Your exam was submitted." : "Exam submitted!");
      }
    } catch (error) {
      toast.error("We couldn't submit your exam. Please tell your invigilator.");
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, answers, finished, isSubmitting, supabase]);

  // 1. Initialise Attempt
  useEffect(() => {
    async function init() {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${getBackendUrl()}/attempts/start`, {
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
        toast.error("Couldn't start the exam.");
        router.push("/dashboard/student/exams");
      }
    }
    init();
  }, [examId, router, supabase]);

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
      if (!supabase) return;
      if (document.visibilityState === "hidden") {
        flagCount.current += 1;
        toast.warning(`Warning ${flagCount.current}: Please don't switch tabs. This is logged as possible cheating.`);
        
        // Log to backend
        const { data: { session } } = await supabase.auth.getSession();
        if (attempt?.attemptId) {
          await fetch(`${getBackendUrl()}/attempts/${attempt.attemptId}/flag`, {
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
  }, [attempt?.attemptId, supabase]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const setOption = (questionId: string, idx: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: idx }));
  };

  if (isTenantLoading || loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center animate-pulse">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h3 className="text-xl font-bold">Starting your exam...</h3>
        <p className="text-muted-foreground">Getting everything ready.</p>
      </div>
    </div>
  );

  if (finished) return (
    <div className="h-full max-w-lg mx-auto flex items-center justify-center py-20 animate-in zoom-in duration-500">
      <Card className="w-full text-center border border-border shadow-2xl bg-card overflow-hidden rounded-3xl">
        <div className="h-2 w-full bg-emerald-500" />
        <CardContent className="pt-12 pb-10 px-8 space-y-6">
          <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 shadow-sm">
            <CheckCircle2 className="size-10 text-emerald-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Exam Submitted Successfully</h2>
            <p className="text-sm text-muted-foreground">
              Your answers have been securely recorded.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 text-xs text-muted-foreground leading-relaxed">
            Official examination scores and grading will be released with the end-of-term academic report card.
          </div>

          <Button 
            className="w-full h-12 font-bold text-sm rounded-xl bg-primary hover:bg-primary/90 shadow-md" 
            onClick={() => router.push("/dashboard/student/exams")}
          >
            Back to Examinations
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const currentQ = attempt!.questions[currentIdx];
  const totalQs = attempt!.questions.length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 bg-background/90 backdrop-blur-md py-3 sm:py-4 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold truncate max-w-[180px] sm:max-w-none text-foreground">{attempt?.examTitle}</h2>
          <p className="text-xs text-muted-foreground">Question {currentIdx + 1} of {totalQs}</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono font-bold text-sm sm:text-lg border-2 transition-colors shadow-sm",
            timeLeft < 300 ? "bg-destructive/10 text-destructive border-destructive/30 animate-pulse" : "bg-card text-primary border-border"
          )}>
            <Clock className="size-4 sm:size-5 shrink-0" />
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="sm" onClick={() => submitExam()} disabled={isSubmitting} className="h-9 px-3 sm:px-4 text-xs sm:text-sm">
            <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Submit
          </Button>
        </div>
      </header>

      {/* Mobile Question Quick-Jump Bar (< lg) */}
      <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-1.5 py-1 touch-scroll">
        {attempt?.questions.map((q, idx) => (
          <button
            key={q._id}
            onClick={() => setCurrentIdx(idx)}
            className={cn(
              "size-9 rounded-lg text-xs font-bold transition-all border-2 shrink-0 flex items-center justify-center",
              currentIdx === idx ? "border-primary shadow-sm ring-1 ring-primary/30" : "border-transparent",
              answers[q._id] !== undefined ? "bg-primary text-white" : "bg-accent/60 text-muted-foreground hover:bg-accent"
            )}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Main Question Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border border-border shadow-xl min-h-[350px] sm:min-h-[400px] bg-card">
            <CardHeader className="border-b bg-accent/5 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-background font-semibold">Question {currentIdx + 1}</Badge>
                <div className="text-xs text-muted-foreground font-semibold">{currentQ.marks} Marks</div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-5 sm:pt-8 space-y-6 sm:space-y-8">
              <h3 className="text-base sm:text-xl lg:text-2xl font-medium leading-relaxed">{currentQ.text}</h3>
              
              <div className="space-y-2.5 sm:space-y-3">
                {currentQ.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setOption(currentQ._id, idx)}
                    className={cn(
                      "w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl border-2 text-left transition-all group",
                      answers[currentQ._id] === idx 
                        ? "bg-primary/5 border-primary text-primary shadow-md ring-1 ring-primary/20" 
                        : "bg-background border-border hover:bg-accent/50 hover:border-accent-foreground/20"
                    )}
                  >
                    <div className={cn(
                      "size-7 sm:size-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-colors shrink-0",
                      answers[currentQ._id] === idx ? "bg-primary text-white" : "bg-accent text-accent-foreground group-hover:bg-accent-foreground/10"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="flex-1 text-sm sm:text-base lg:text-lg">{option}</span>
                    <div className={cn(
                      "size-5 sm:size-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                      answers[currentQ._id] === idx ? "border-primary bg-primary" : "border-border"
                    )}>
                      {answers[currentQ._id] === idx && <div className="size-2 rounded-full bg-white animate-in zoom-in duration-200" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-accent/5 flex justify-between p-4 sm:p-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="h-10 px-3 sm:px-4 text-xs sm:text-sm"
              >
                <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" /> Previous
              </Button>
              <Button 
                onClick={() => setCurrentIdx(prev => Math.min(totalQs - 1, prev + 1))}
                disabled={currentIdx === totalQs - 1}
                className="h-10 px-3 sm:px-4 text-xs sm:text-sm"
              >
                Next <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar / Question Grid */}
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-xl bg-card">
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
                <div className="text-xs font-bold text-primary">Heads up</div>
                <div className="text-[10px] text-primary/60">Don't refresh your browser during the exam.</div>
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
