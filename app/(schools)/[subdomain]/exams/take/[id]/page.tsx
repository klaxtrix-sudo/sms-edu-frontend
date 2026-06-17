"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Bookmark, 
  Wifi, 
  WifiOff, 
  Timer, 
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getBackendUrl, cn } from "@/lib/utils";

interface QuestionOption {
  text: string;
  imageUrl: string;
  originalIndex: number;
}

interface Question {
  _id: string;
  text: string;
  imageUrl?: string;
  options: QuestionOption[];
  marks: number;
}

interface StudentSession {
  token: string;
  student: {
    id: string;
    name: string;
    admissionNo: string;
  };
}

export default function TakeExamPage() {
  const params = useParams();
  const examId = params.id as string;
  const subdomain = params.subdomain as string;
  const router = useRouter();

  // Screen state: 'login' | 'lobby' | 'running' | 'submitted'
  const [screen, setScreen] = useState<'login' | 'lobby' | 'running' | 'submitted'>('login');
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState<StudentSession | null>(null);

  // Login form state
  const [admissionNo, setAdmissionNo] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Exam state
  const [examTitle, setExamTitle] = useState("");
  const [durationMins, setDurationMins] = useState(0);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [totalMarks, setTotalMarks] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({}); // questionId -> selected originalIndex
  const [flagged, setFlagged] = useState<Record<string, boolean>>({}); // questionId -> flagged status
  
  // Loading exam state
  const [loadingExam, setLoadingExam] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Connectivity state
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored! Progress synced.");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Your answers are saved locally.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if session exists in localStorage
    const stored = localStorage.getItem(`exam_sess_${examId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StudentSession;
        setSession(parsed);
        setScreen('lobby');
      } catch (_) {
        localStorage.removeItem(`exam_sess_${examId}`);
      }
    }
    setCheckingSession(false);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [examId]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFs = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFs);
      if (!isCurrentlyFs && screen === 'running' && attemptId && session) {
        // Log fullscreen exit violation
        reportViolation("fullscreen_exit");
        toast.warning("Warning: Exiting full screen is flagged as a potential violation.");
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [screen, attemptId, session]);

  // Tab switch listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && screen === 'running' && attemptId && session) {
        reportViolation("tab_switch");
        toast.error("Violation Warning: Switching tabs or leaving the page is flagged.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [screen, attemptId, session]);

  // Timer countdown
  useEffect(() => {
    if (screen !== 'running' || remainingSecs <= 0) return;

    const timer = setInterval(() => {
      setRemainingSecs(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, remainingSecs]);

  // Local storage backup sync
  useEffect(() => {
    if (screen === 'running' && attemptId) {
      localStorage.setItem(`exam_backup_${attemptId}`, JSON.stringify(answers));
    }
  }, [answers, attemptId, screen]);

  // Send security violation report to backend
  const reportViolation = async (type: 'tab_switch' | 'fullscreen_exit') => {
    if (!session || !attemptId) return;
    try {
      await fetch(`${getBackendUrl()}/attempts/${attemptId}/flag`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`
        },
        body: JSON.stringify({ type })
      });
    } catch (err) {
      console.error("Failed to report violation:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionNo.trim()) return;

    setLoggingIn(true);
    try {
      const res = await fetch(`${getBackendUrl()}/attempts/verify-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admissionNo, examId, subdomain })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Failed to verify credentials");

      const studentSession: StudentSession = {
        token: result.data.token,
        student: result.data.student
      };

      localStorage.setItem(`exam_sess_${examId}`, JSON.stringify(studentSession));
      setSession(studentSession);
      setScreen('lobby');
      toast.success(`Welcome, ${result.data.student.name}`);
    } catch (err: any) {
      toast.error(err.message || "Error logging in");
    } finally {
      setLoggingIn(false);
    }
  };

  const loadExam = async () => {
    if (!session) return;
    setLoadingExam(true);
    try {
      const res = await fetch(`${getBackendUrl()}/attempts/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`
        },
        body: JSON.stringify({ examId })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Could not start exam session");

      setAttemptId(result.data.attemptId);
      setExamTitle(result.data.examTitle);
      setDurationMins(result.data.durationMins);
      setRemainingSecs(result.data.remainingSecs);
      setTotalMarks(result.data.totalMarks);
      setQuestions(result.data.questions);

      // Load saved answers if resumption
      if (result.data.resumed && result.data.savedAnswers) {
        const answersMap: Record<string, number> = {};
        result.data.savedAnswers.forEach((a: any) => {
          answersMap[a.questionId] = a.selected;
        });
        setAnswers(answersMap);
        toast.info("Resumed from your saved progress.");
      } else {
        // Check local storage backup just in case
        const backup = localStorage.getItem(`exam_backup_${result.data.attemptId}`);
        if (backup) {
          try {
            setAnswers(JSON.parse(backup));
          } catch (_) {}
        }
      }

      // Transition to running screen and request fullscreen
      setScreen('running');
      enterFullscreen();
    } catch (err: any) {
      toast.error(err.message || "Failed to load exam. Try again.");
    } finally {
      setLoadingExam(false);
    }
  };

  const enterFullscreen = () => {
    if (containerRef.current) {
      containerRef.current.requestFullscreen().catch(() => {
        toast.info("Please manually enter fullscreen to avoid disruption alerts.");
      });
    }
  };

  const handleSelectOption = async (questionId: string, optionIdx: number) => {
    const updatedAnswers = { ...answers, [questionId]: optionIdx };
    setAnswers(updatedAnswers);

    // Sync to backend background save-answers
    if (!session || !attemptId) return;

    try {
      setPendingSync(true);
      const res = await fetch(`${getBackendUrl()}/attempts/${attemptId}/save-answers`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`
        },
        body: JSON.stringify({
          answers: [{ questionId, selected: optionIdx }]
        })
      });
      if (!res.ok) throw new Error("Offline status");
      setPendingSync(false);
    } catch (_) {
      // Keep online flag false and allow local storage backup to handle it
      setPendingSync(true);
    }
  };

  const triggerManualSync = async () => {
    if (!session || !attemptId || !isOnline) return;
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, sIdx]) => ({
        questionId: qId,
        selected: sIdx
      }));

      const res = await fetch(`${getBackendUrl()}/attempts/${attemptId}/save-answers`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`
        },
        body: JSON.stringify({ answers: payloadAnswers })
      });
      if (res.ok) {
        setPendingSync(false);
        toast.success("Progress successfully synced to server!");
      }
    } catch (e) {
      toast.error("Failed to sync progress. Keep writing, it is saved locally.");
    }
  };

  const handleSubmit = async (confirmSubmit = true) => {
    if (confirmSubmit) {
      const unansweredCount = questions.length - Object.keys(answers).length;
      const confirmMsg = unansweredCount > 0 
        ? `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
        : "Are you sure you want to submit your exam?";
      
      if (!confirm(confirmMsg)) return;
    }

    setSubmitting(true);
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, sIdx]) => ({
        questionId: qId,
        selected: sIdx
      }));

      const res = await fetch(`${getBackendUrl()}/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session!.token}`
        },
        body: JSON.stringify({
          answers: payloadAnswers,
          timeExpired: !confirmSubmit // if not confirmed, it was triggered by timer
        })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Failed to submit exam");

      // Clean up storage
      localStorage.removeItem(`exam_sess_${examId}`);
      localStorage.removeItem(`exam_backup_${attemptId}`);
      
      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      
      setScreen('submitted');
      toast.success("Exam submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Error submitting exam. We will keep retrying.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    toast.error("Time is up! Submitting your answers automatically...");
    handleSubmit(false);
  };

  const toggleFlag = (qId: string) => {
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleLogout = () => {
    localStorage.removeItem(`exam_sess_${examId}`);
    setSession(null);
    setScreen('login');
  };

  const formatTimer = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours > 0 ? hours + ":" : ""}${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 1. LOGIN SCREEN
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-[#06060c] text-white flex items-center justify-center px-4 relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <Card className="w-full max-w-md border-white/10 bg-zinc-950/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4 border border-primary/20">
              <Lock className="size-8" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-white">MCQ Exam Portal</CardTitle>
            <CardDescription className="text-zinc-400">Enter your Admission Number to enter the exam session lobby.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Admission Number</label>
                <Input
                  placeholder="e.g. STU-2025-001"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 text-white placeholder-zinc-600 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-center font-mono tracking-widest text-lg"
                  disabled={loggingIn}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loggingIn || !admissionNo.trim()}
                className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl text-white font-bold transition-all shadow-lg shadow-primary/25"
              >
                {loggingIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Access Exam Room"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-white/5 pt-4 text-xs text-zinc-600">
            Powered by Klaxtrix School Management System
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 2. LOBBY SCREEN
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-[#06060c] text-white flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <Card className="w-full max-w-2xl border-white/10 bg-zinc-950/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative z-10">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-2xl font-black text-white">Exam lobby</CardTitle>
                <CardDescription className="text-zinc-400 mt-1">Review the instructions before starting the assessment.</CardDescription>
              </div>
              <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={handleLogout}>
                Change Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex justify-between border-b border-white/5 pb-2 text-sm">
                <span className="text-zinc-400">Student Profile:</span>
                <span className="font-bold text-white">{session?.student.name} ({session?.student.admissionNo})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Subject:</span>
                <span className="font-mono text-primary font-bold">Objective Assessment</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Important Rules:</h4>
              <ul className="text-sm text-zinc-400 space-y-2 pl-4 list-disc">
                <li>This exam enforces **fullscreen mode**. Navigating out of fullscreen will log a violation.</li>
                <li>Do not switch tabs, open developers tools, or minimize browser window. Violations are tracked.</li>
                <li>Your timer runs continuously. Closing the window **will not** pause your exam timer.</li>
                <li>In case of power/network cuts, reopen this page on any device and input your Admission Number to resume.</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 border-t border-white/5 pt-6">
            <Button
              onClick={loadExam}
              disabled={loadingExam}
              className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-700/20"
            >
              {loadingExam ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing Exam paper...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" /> Start / Resume Examination
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 3. EXAM RUNNING PORTAL
  if (screen === 'running') {
    const currentQuestion = questions[currentIdx];
    const isAnswered = currentQuestion ? answers[currentQuestion._id] !== undefined : false;

    return (
      <div 
        ref={containerRef}
        className="min-h-screen bg-[#07070f] text-zinc-200 flex flex-col relative"
      >
        {/* Fullscreen reminder overlay if not FS */}
        {!isFullscreen && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center space-y-6 select-none">
            <AlertTriangle className="size-16 text-yellow-500 animate-pulse" />
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-black text-white">Full Screen Required</h2>
              <p className="text-zinc-400">To continue with the exam, you must lock the interface in fullscreen mode.</p>
            </div>
            <Button 
              onClick={enterFullscreen}
              className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
            >
              <Maximize className="mr-2 size-4" /> Lock Full Screen
            </Button>
          </div>
        )}

        {/* Header bar */}
        <header className="h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur px-6 flex items-center justify-between z-30 select-none">
          <div className="flex items-center gap-4">
            <span className="font-extrabold text-white text-lg tracking-tight">{examTitle}</span>
            <span className="text-xs text-zinc-500 font-mono">Exam ID: {examId.slice(-6).toUpperCase()}</span>
          </div>

          {/* Sync & Connectivity Widget */}
          <div className="flex items-center gap-4">
            {!isOnline ? (
              <Badge variant="destructive" className="bg-red-500/10 text-red-400 border border-red-500/20 flex gap-1.5 items-center font-bold px-3 py-1 rounded-full">
                <WifiOff className="size-3.5" /> Offline - Backup Saved
              </Badge>
            ) : pendingSync ? (
              <Button 
                onClick={triggerManualSync}
                variant="outline" 
                size="sm"
                className="border-yellow-500/20 text-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 flex gap-1.5 items-center font-bold px-3 rounded-full h-8"
              >
                <Loader2 className="size-3.5 animate-spin" /> Unsynced: Tap to Sync
              </Button>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex gap-1.5 items-center font-bold px-3 py-1 rounded-full">
                <Wifi className="size-3.5" /> Synced & Connected
              </Badge>
            )}

            {/* Timer Widget */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-black font-mono",
              remainingSecs < 300 
                ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" 
                : "bg-white/5 text-white border-white/10"
            )}>
              <Timer className="size-4" />
              <span>{formatTimer(remainingSecs)}</span>
            </div>
          </div>
        </header>

        {/* Main Work Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel: Questions navigation sidebar */}
          <aside className="w-80 border-r border-white/5 bg-zinc-950/40 backdrop-blur-sm p-6 overflow-y-auto flex flex-col gap-6 select-none">
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">Progress Tracker</h3>
              <p className="text-sm font-semibold text-zinc-400">{Object.keys(answers).length} of {questions.length} Answered</p>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const isAns = answers[q._id] !== undefined;
                const isFlag = flagged[q._id];

                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "aspect-square rounded-xl border flex items-center justify-center font-black text-sm transition-all relative",
                      isCurrent 
                        ? "bg-primary border-primary text-white scale-105 shadow-md shadow-primary/25" 
                        : isFlag
                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                          : isAns
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                            : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
                    )}
                  >
                    {idx + 1}
                    {isFlag && <div className="absolute top-1 right-1 size-1.5 bg-yellow-500 rounded-full" />}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-auto space-y-3 pt-6 border-t border-white/5">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-zinc-500 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-md bg-yellow-500/20 border border-yellow-500/40" />
                  <span>Bookmarked / Flagged</span>
                </div>
              </div>

              <Button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/20"
              >
                {submitting ? <Loader2 className="size-5 animate-spin" /> : "Submit Examination"}
              </Button>
            </div>
          </aside>

          {/* Right Panel: Active Question Pane */}
          <main className="flex-1 p-8 lg:p-12 overflow-y-auto flex flex-col bg-zinc-950/20">
            {currentQuestion ? (
              <div className="max-w-3xl mx-auto w-full space-y-8 flex-1 flex flex-col justify-between">
                
                {/* Question Body */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center gap-4 border-b border-white/5 pb-4">
                    <Badge variant="outline" className="text-zinc-500 border-white/10 uppercase tracking-widest font-black text-[10px]">
                      Question {currentIdx + 1} of {questions.length}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      onClick={() => toggleFlag(currentQuestion._id)}
                      className={cn(
                        "hover:bg-white/5 rounded-full px-3 text-xs flex gap-1",
                        flagged[currentQuestion._id] ? "text-yellow-500" : "text-zinc-500"
                      )}
                    >
                      <Bookmark className="size-4 fill-current" />
                      <span>{flagged[currentQuestion._id] ? "Bookmarked" : "Bookmark"}</span>
                    </Button>
                  </div>

                  <div className="space-y-6">
                    <p className="text-xl lg:text-2xl font-black text-white leading-relaxed select-none">
                      {currentQuestion.text}
                    </p>

                    {currentQuestion.imageUrl && (
                      <div className="max-w-xl rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 p-2 shadow-inner">
                        <img 
                          src={currentQuestion.imageUrl} 
                          alt="Question Graphic" 
                          className="max-h-64 object-contain rounded-lg w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Multiple Choices */}
                <div className="grid grid-cols-1 gap-4 select-none">
                  {currentQuestion.options.map((opt, oIdx) => {
                    const isSelected = answers[currentQuestion._id] === opt.originalIndex;

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectOption(currentQuestion._id, opt.originalIndex)}
                        className={cn(
                          "w-full text-left p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 outline-none",
                          isSelected
                            ? "bg-primary/10 border-primary text-white shadow-lg shadow-primary/5 ring-1 ring-primary/30"
                            : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "size-8 flex items-center justify-center rounded-full text-xs font-black shrink-0",
                            isSelected ? "bg-primary text-white" : "bg-white/5 text-zinc-500"
                          )}>
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <span className="font-semibold text-base">{opt.text || <span className="italic text-xs text-zinc-600 font-normal">Visual Option</span>}</span>
                        </div>

                        {opt.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-white/5 bg-white max-h-24 p-1 max-w-[120px] shadow-sm">
                            <img 
                              src={opt.imageUrl} 
                              alt={`Option ${String.fromCharCode(65 + oIdx)}`} 
                              className="max-h-20 object-contain w-auto mx-auto"
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Next/Prev Navigation controls */}
                <div className="flex justify-between items-center pt-8 border-t border-white/5 select-none mt-auto">
                  <Button
                    variant="outline"
                    className="border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white rounded-xl h-11"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                  >
                    <ChevronLeft className="mr-2 size-4" /> Previous
                  </Button>

                  <Button
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11"
                    disabled={currentIdx === questions.length - 1}
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                  >
                    Next <ChevronRight className="ml-2 size-4" />
                  </Button>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // 4. SUBMITTED SUCCESS SCREEN
  if (screen === 'submitted') {
    return (
      <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <Card className="w-full max-w-md border-white/10 bg-zinc-950/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6">
          <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle className="size-10" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black text-white">Exam Completed</CardTitle>
            <CardDescription className="text-zinc-400">Your answers have been graded and recorded successfully.</CardDescription>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-sm text-zinc-400">
            Thank you for completing your examination. You can now close this tab safely.
          </div>
          <Button
            onClick={() => router.push('/')}
            className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-bold"
          >
            Return to School Homepage
          </Button>
        </Card>
      </div>
    );
  }

  return null;
}
