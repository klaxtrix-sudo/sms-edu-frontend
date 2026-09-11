"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Loader2, 
  Download, 
  Upload, 
  Laptop, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Filter,
  Lock
} from "lucide-react";
import { 
  getResultMetrics, 
  saveResultMetrics, 
  saveResults,
  getOnlineExamsForSubject,
  syncOnlineExamScores,
  getClassTermStatus
} from "@/app/actions/academic-actions";
import { createTenantClient } from "@/lib/supabase/client";
import { scoreToGrade, gradeRemark } from "@/lib/grade-scale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Metric {
  id?: string;
  name: string;
  weight: number;
  school_id?: string;
  class_id?: string | null;
  subject_id?: string | null;
  is_custom?: boolean;
}

interface SubjectScoresheetProps {
  subdomain: string;
  schoolId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  term: number;
  termLabel: string;
  onBack: () => void;
  onViewBroadsheet: () => void;
}

export function SubjectScoresheet({
  subdomain,
  schoolId,
  classId,
  className,
  subjectId,
  subjectName,
  academicYear,
  term,
  termLabel,
  onBack,
  onViewBroadsheet,
}: SubjectScoresheetProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lifecycle status state
  const [cycleStatus, setCycleStatus] = useState<string>("draft");
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Roster & Metrics state
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isCustomMetrics, setIsCustomMetrics] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, { id?: string; scores: Record<string, any>; isEntered: boolean }>>({});

  // Weights config modal
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configMetrics, setConfigMetrics] = useState<Metric[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // CBT Exam Import Modal (Manual Button as requested by user)
  const [isCbtOpen, setIsCbtOpen] = useState(false);
  const [cbtExams, setCbtExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [targetMetricKey, setTargetMetricKey] = useState<string>("");
  const [syncingCbt, setSyncingCbt] = useState(false);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createTenantClient();

  useEffect(() => {
    loadClassAndSubjectData();
  }, [classId, subjectId, academicYear, term]);

  const loadClassAndSubjectData = async () => {
    setLoading(true);
    setStudents([]);
    setResults({});
    try {
      // 1. Fetch lifecycle status and metrics in parallel
      const [statusRes, metricsRes] = await Promise.all([
        getClassTermStatus(classId, academicYear, term, schoolId, subdomain),
        getResultMetrics(classId, subjectId, schoolId, subdomain, academicYear, term),
      ]);

      const curStatus = statusRes.success && statusRes.data?.status ? statusRes.data.status : "draft";
      setCycleStatus(curStatus);
      setIsLocked(["approved", "published", "archived"].includes(curStatus));

      let activeMetrics: Metric[] = [];
      if (metricsRes.success && metricsRes.data) {
        activeMetrics = metricsRes.data;
        setMetrics(activeMetrics);
        setIsCustomMetrics(!!metricsRes.isCustom);
      } else {
        activeMetrics = [
          { name: "First Test", weight: 20, school_id: schoolId },
          { name: "Second Test", weight: 20, school_id: schoolId },
          { name: "Exam", weight: 60, school_id: schoolId }
        ];
        setMetrics(activeMetrics);
        setIsCustomMetrics(false);
      }

      // Default target metric for CBT sync to Exam or first metric
      const examMetric = activeMetrics.find(m => m.name.toLowerCase().includes("exam")) || activeMetrics[0];
      if (examMetric) {
        setTargetMetricKey(examMetric.id || examMetric.name);
      }

      // 2. Fetch students enrolled in this class for the selected academicYear
      const { data: enrollmentsData, error: enrollError } = await (supabase as any)
        .from("student_enrollments")
        .select(`
          student_id,
          status,
          students:student_id (
            id,
            admission_no,
            gender,
            profiles:user_id (
              full_name
            )
          )
        `)
        .eq("class_id", classId)
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear);

      let resolvedStudents: any[] = [];
      if (!enrollError) {
        // student_enrollments is the authoritative source of truth for session enrollment
        resolvedStudents = (enrollmentsData || [])
          .map((e: any) => e.students)
          .filter(Boolean)
          .sort((a: any, b: any) => (a.admission_no || "").localeCompare(b.admission_no || ""));
      } else {
        // Fallback only if student_enrollments query errored (legacy unmigrated tenant)
        console.warn("student_enrollments query errored, falling back to students table:", enrollError);
        const { data: fallbackStudents, error: studentError } = await (supabase as any)
          .from("students")
          .select(`
            id,
            admission_no,
            gender,
            profiles:user_id (
              full_name
            )
          `)
          .eq("class_id", classId)
          .eq("school_id", schoolId)
          .order("admission_no");

        if (studentError) throw studentError;
        resolvedStudents = fallbackStudents || [];
      }

      // 3. Fetch existing results
      const { data: resultsData, error: resultsError } = await (supabase as any)
        .from("results")
        .select("*")
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .eq("academic_year", academicYear)
        .eq("term", term);

      if (resultsError) throw resultsError;

      setStudents(resolvedStudents);

      // 4. Map results WITHOUT destructive "F9 Fail" defaults for unentered students!
      const resultsMap: Record<string, any> = {};
      
      // Index existing results
      resultsData?.forEach((r: any) => {
        resultsMap[r.student_id] = {
          id: r.id,
          scores: r.scores || {},
          isEntered: true,
        };
      });

      // Initialize empty/null scores for students that do not have recorded grades yet
      resolvedStudents.forEach((s: any) => {
        if (!resultsMap[s.id]) {
          const emptyScores: Record<string, any> = {};
          activeMetrics.forEach(m => {
            const key = m.id || m.name;
            emptyScores[key] = null; // Unentered / null
          });
          resultsMap[s.id] = {
            scores: emptyScores,
            isEntered: false,
          };
        } else {
          // Ensure every metric column key exists in the scores object
          activeMetrics.forEach(m => {
            const key = m.id || m.name;
            if (resultsMap[s.id].scores[key] === undefined) {
              resultsMap[s.id].scores[key] = null;
            }
          });
        }
      });

      setResults(resultsMap);
    } catch (err: any) {
      console.error("Error loading subject results:", err);
      toast.error(err.message || "Failed to load class roster and marks");
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Navigation: handle ArrowDown / Enter / ArrowUp across student inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentIndex: number, metricIndex: number) => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const nextInput = document.getElementById(`cell-${studentIndex + 1}-${metricIndex}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`cell-${studentIndex - 1}-${metricIndex}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleScoreChange = (studentId: string, metricKey: string, value: string, maxWeight: number) => {
    if (isLocked) {
      toast.error("This grading cycle is locked and cannot be edited.");
      return;
    }

    const rawVal = value.trim().toUpperCase();

    // Support special assessment codes (ABS for Absent, EX for Exempt)
    if (rawVal === "ABS" || rawVal === "EX") {
      setResults(prev => {
        const current = prev[studentId] || { scores: {}, isEntered: false };
        return {
          ...prev,
          [studentId]: {
            ...current,
            scores: { ...current.scores, [metricKey]: rawVal },
            isEntered: true,
          }
        };
      });
      return;
    }

    const numVal = rawVal === "" ? null : parseFloat(rawVal);

    if (numVal !== null && (isNaN(numVal) || numVal < 0)) {
      return;
    }

    if (numVal !== null && numVal > maxWeight) {
      toast.error(`Score cannot exceed max points (${maxWeight})`);
    }

    setResults(prev => {
      const current = prev[studentId] || { scores: {}, isEntered: false };
      const updatedScores = { ...current.scores, [metricKey]: numVal };
      const hasAnyScore = Object.values(updatedScores).some(
        v => v !== null && v !== undefined && v !== ""
      );

      return {
        ...prev,
        [studentId]: {
          ...current,
          scores: updatedScores,
          isEntered: hasAnyScore,
        }
      };
    });
  };

  // Save Results (filters out unentered rows!)
  const onSave = async () => {
    if (isLocked) {
      toast.error("Grading cycle is locked. Reopen the cycle to Draft status before making edits.");
      return;
    }

    setSaving(true);
    try {
      const dataToSave: any[] = [];

      students.forEach(s => {
        const entry = results[s.id];
        if (entry && entry.isEntered) {
          // Calculate total
          let total = 0;
          let hasEnteredScore = false;
          let allAbsent = true;
          let allExempt = true;

          metrics.forEach(m => {
            const key = m.id || m.name;
            const val = entry.scores[key];
            if (val !== null && val !== undefined && val !== "") {
              hasEnteredScore = true;
              if (val === "ABS") {
                allExempt = false;
              } else if (val === "EX") {
                allAbsent = false;
              } else if (!isNaN(Number(val))) {
                total += Number(val);
                allAbsent = false;
                allExempt = false;
              }
            }
          });

          if (!hasEnteredScore) return;

          const grade = allAbsent ? "ABS" : allExempt ? "EX" : scoreToGrade(total);
          const remark = allAbsent ? "Absent" : allExempt ? "Exempt" : gradeRemark(grade);

          dataToSave.push({
            ...(entry.id ? { id: entry.id } : {}),
            student_id: s.id,
            school_id: schoolId,
            class_id: classId,
            subject_id: subjectId,
            academic_year: academicYear,
            term,
            scores: entry.scores,
            total_score: total,
            grade,
            remark,
          });
        }
      });

      const res = await saveResults(dataToSave, subdomain);
      if (res.error) throw new Error(res.error);

      toast.success(`Successfully saved ${res.count || 0} student result(s).`);
      loadClassAndSubjectData(); // Reload to refresh IDs
    } catch (err: any) {
      toast.error(err.message || "Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  // CSV Template Export
  const downloadCsvTemplate = () => {
    const metricHeaders = metrics.map(m => `"${m.name} [Max ${m.weight}]"`).join(",");
    const csvContent = [
      `"Admission No","Student Name",${metricHeaders}`,
      ...students.map(s => {
        const studentName = s.profiles?.full_name || "Unnamed Student";
        const emptyCols = metrics.map(() => "").join(",");
        return `"${s.admission_no}","${studentName}",${emptyCols}`;
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${className}_${subjectName}_${academicYear.replace("/", "-")}_T${term}_Scores.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV score template downloaded!");
  };

  // CSV Upload & Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          toast.error("CSV file is empty or missing headers");
          return;
        }

        // Parse student rows by admission number
        const updatedResults = { ...results };
        let matchedCount = 0;

        // Create admission number lookup map
        const studentAdmMap = new Map<string, string>();
        students.forEach(s => studentAdmMap.set(s.admission_no.trim().toLowerCase(), s.id));

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
          const admNo = cols[0]?.toLowerCase();
          const studentId = studentAdmMap.get(admNo);

          if (studentId) {
            const current = updatedResults[studentId] || { scores: {}, isEntered: false };
            const newScores = { ...current.scores };

            metrics.forEach((m, mIdx) => {
              const colVal = cols[2 + mIdx];
              if (colVal !== undefined && colVal !== "") {
                const num = parseFloat(colVal);
                if (!isNaN(num) && num >= 0 && num <= m.weight) {
                  const key = m.id || m.name;
                  newScores[key] = num;
                }
              }
            });

            updatedResults[studentId] = {
              ...current,
              scores: newScores,
              isEntered: Object.values(newScores).some(v => v !== null && v !== undefined),
            };
            matchedCount++;
          }
        }

        setResults(updatedResults);
        toast.success(`Parsed scores for ${matchedCount} students from CSV. Click Save to commit.`);
      } catch (err: any) {
        toast.error("Failed to parse CSV file. Ensure standard format.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  // Open CBT Exam Import Modal
  const openCbtModal = async () => {
    setIsCbtOpen(true);
    try {
      const res = await getOnlineExamsForSubject(classId, subjectId, subdomain);
      if (res.success && res.data) {
        setCbtExams(res.data);
        if (res.data.length > 0) {
          setSelectedExamId(res.data[0].id);
        }
      }
    } catch (err) {
      toast.error("Failed to fetch online exams");
    }
  };

  // Trigger CBT Sync
  const handleSyncCbt = async () => {
    if (!selectedExamId || !targetMetricKey) {
      toast.error("Please select an online exam and target column.");
      return;
    }

    const metric = metrics.find(m => (m.id || m.name) === targetMetricKey) || metrics[0];
    setSyncingCbt(true);
    try {
      const res = await syncOnlineExamScores(
        selectedExamId,
        classId,
        subjectId,
        targetMetricKey,
        metric.weight,
        academicYear,
        term,
        subdomain
      );

      if (!res.success) throw new Error(res.error);

      toast.success(`Successfully imported ${res.syncedCount || 0} student score(s) from online CBT!`);
      setIsCbtOpen(false);
      loadClassAndSubjectData();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync online exam scores");
    } finally {
      setSyncingCbt(false);
    }
  };

  // Weights configuration
  const openConfigModal = () => {
    setConfigMetrics(metrics.map(m => ({ ...m })));
    setIsConfigOpen(true);
  };

  const handleAddConfigMetric = () => {
    setConfigMetrics(prev => [...prev, { name: "", weight: 0, school_id: schoolId, class_id: classId, subject_id: subjectId, is_custom: true }]);
  };

  const handleRemoveConfigMetric = (index: number) => {
    setConfigMetrics(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConfigMetricChange = (index: number, field: keyof Metric, val: any) => {
    setConfigMetrics(prev => prev.map((m, idx) => idx === index ? { ...m, [field]: val } : m));
  };

  const configTotalWeight = configMetrics.reduce((sum, m) => sum + Number(m.weight || 0), 0);

  const saveConfig = async () => {
    if (configTotalWeight !== 100) {
      toast.error(`Total weight must equal exactly 100. Current total: ${configTotalWeight}`);
      return;
    }
    const hasEmptyName = configMetrics.some(m => !m.name.trim());
    if (hasEmptyName) {
      toast.error("Please provide a name for all metric columns.");
      return;
    }

    setSavingConfig(true);
    try {
      const payload = configMetrics.map(m => ({
        school_id: schoolId,
        class_id: classId,
        subject_id: subjectId,
        name: m.name.trim(),
        weight: Number(m.weight),
        is_custom: true,
      }));

      const res = await saveResultMetrics(payload, subdomain, academicYear, term);
      if (res.error) throw new Error(res.error);

      toast.success("Grading components updated!");
      setIsConfigOpen(false);
      loadClassAndSubjectData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update weights");
    } finally {
      setSavingConfig(false);
    }
  };

  // Filter students by search
  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const name = (s.profiles?.full_name || "").toLowerCase();
    const adm = s.admission_no.toLowerCase();
    return name.includes(q) || adm.includes(q);
  });

  // Performance Statistics (only computed from students who actually have entered scores!)
  const enteredStudentScores: number[] = [];
  students.forEach(s => {
    const entry = results[s.id];
    if (entry && entry.isEntered) {
      let tot = 0;
      let hasPoints = false;
      metrics.forEach(m => {
        const key = m.id || m.name;
        const v = entry.scores[key];
        if (v !== null && v !== undefined && !isNaN(Number(v))) {
          tot += Number(v);
          hasPoints = true;
        }
      });
      if (hasPoints) enteredStudentScores.push(tot);
    }
  });

  const gradedCount = enteredStudentScores.length;
  const classAvg = gradedCount > 0 ? Math.round(enteredStudentScores.reduce((a, b) => a + b, 0) / gradedCount) : 0;
  const highest = gradedCount > 0 ? Math.max(...enteredStudentScores) : 0;
  const lowest = gradedCount > 0 ? Math.min(...enteredStudentScores) : 0;
  const passCount = enteredStudentScores.filter(s => s >= 40).length;
  const passRate = gradedCount > 0 ? Math.round((passCount / gradedCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            title="Return to All Classrooms (Readiness Matrix)"
            className="h-8.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 rounded-xl border border-border/60 hover:bg-muted"
          >
            <ArrowLeft className="size-3.5" /> Classes
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{subjectName}</h2>
              <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border-border">
                {className}
              </Badge>
              {cycleStatus === 'published' ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Published
                </Badge>
              ) : cycleStatus === 'approved' ? (
                <Badge className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-bold flex items-center gap-1">
                  <Lock className="size-3" /> Approved (Locked)
                </Badge>
              ) : cycleStatus === 'submitted' ? (
                <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold">
                  In Review
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs font-semibold">
                  Draft
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Input student scores directly, import from online CBT, or upload an offline CSV.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Import from Online Exam (CBT) */}
          <Button
            variant="outline"
            size="sm"
            onClick={openCbtModal}
            disabled={isLocked}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <Laptop className="size-3.5 mr-1.5" />
            Sync from CBT
          </Button>

          {/* Download CSV Template */}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsvTemplate}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-border hover:bg-muted"
          >
            <Download className="size-3.5 mr-1.5" />
            Template
          </Button>

          {/* Upload CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLocked}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-border hover:bg-muted disabled:opacity-50"
          >
            <Upload className="size-3.5 mr-1.5" />
            Upload CSV
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv" 
            className="hidden" 
          />

          {/* Edit Weights */}
          <Button
            variant="outline"
            size="sm"
            onClick={openConfigModal}
            disabled={isLocked}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-border hover:bg-muted disabled:opacity-50"
          >
            <Settings className="size-3.5 mr-1.5" />
            Weights
          </Button>

          {/* Save Button */}
          <Button
            onClick={onSave}
            disabled={isLocked || saving || loading || students.length === 0}
            className={cn(
              "h-9 px-4 text-xs font-bold rounded-xl shadow-md",
              isLocked 
                ? "bg-muted text-muted-foreground border border-border cursor-not-allowed" 
                : "bg-primary hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {saving ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : isLocked ? (
              <Lock className="size-3.5 mr-1.5 text-amber-500" />
            ) : (
              <Save className="size-3.5 mr-1.5" />
            )}
            {isLocked ? "Cycle Locked" : "Save Results"}
          </Button>
        </div>
      </div>

      {/* Lifecycle Locked Warning Banner */}
      {isLocked && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
          <Lock className="size-4 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Grading Cycle Locked ({cycleStatus.toUpperCase()}): </span>
            Scores for {className} ({academicYear} • {termLabel}) have been finalized. An administrator must revert the cycle to Draft status before scores can be modified.
          </div>
        </div>
      )}

      {/* 2. Live Subject Performance Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 border border-border/70 p-3 rounded-xl">
        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Class Average</span>
          <p className={cn("text-lg font-black", gradedCount > 0 ? "text-foreground" : "text-muted-foreground")}>
            {gradedCount > 0 ? `${classAvg}%` : "—"}
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pass Rate</span>
          <p className={cn("text-lg font-black", gradedCount > 0 ? "text-emerald-500" : "text-muted-foreground")}>
            {gradedCount > 0 ? `${passRate}%` : "—"}
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Highest / Lowest</span>
          <p className={cn("text-lg font-black", gradedCount > 0 ? "text-foreground" : "text-muted-foreground")}>
            {gradedCount > 0 ? `${highest}% / ${lowest}%` : "—"}
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Graded Roster</span>
          <p className="text-lg font-black text-foreground">
            {gradedCount} of {students.length}
          </p>
        </div>
      </div>

      {/* Search & Shortcuts Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40 p-2 rounded-xl border border-border/60">
        <div className="relative w-full max-w-md">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search student name or admission no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8.5 pl-9 text-xs rounded-lg bg-background border-border/80 focus-visible:ring-1"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="text-[11px] font-medium hidden md:inline-block">
            Showing <strong className="text-foreground">{filteredStudents.length}</strong> of {students.length} students
          </span>
          <div className="h-3 w-px bg-border hidden md:block" />
          <p className="text-[11px] flex items-center gap-1.5">
            <span>💡 Use</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-muted border border-border/80 text-foreground shadow-2xs">Enter</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-muted border border-border/80 text-foreground shadow-2xs">↓</kbd>
            <span>to jump rows</span>
          </p>
        </div>
      </div>

      {/* 3. Smart Grading Table */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs font-medium text-muted-foreground">Loading student roster and assessment columns...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 border border-dashed border-border/80 rounded-2xl text-center space-y-2 bg-card">
          <AlertCircle className="size-8 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">No Students Enrolled</h4>
          <p className="text-xs text-muted-foreground">There are currently no students assigned to {className}.</p>
        </div>
      ) : (
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] text-xs font-bold">Adm No</TableHead>
                  <TableHead className="min-w-[200px] text-xs font-bold">Student Name</TableHead>
                  
                  {metrics.map((m, idx) => (
                    <TableHead key={m.id || idx} className="w-[130px] min-w-[125px] text-center text-xs font-bold py-3">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="leading-tight line-clamp-1" title={m.name}>{m.name}</span>
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                          Max {m.weight}
                        </span>
                      </div>
                    </TableHead>
                  ))}

                  <TableHead className="w-[85px] text-center text-xs font-bold">Total (100)</TableHead>
                  <TableHead className="w-[80px] text-center text-xs font-bold">Grade</TableHead>
                  <TableHead className="min-w-[130px] text-xs font-bold">Remark</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredStudents.map((student, sIdx) => {
                  const entry = results[student.id] || { scores: {}, isEntered: false };
                  
                  // Calculate student total from valid numbers
                  let studentTotal = 0;
                  let hasAnyPoints = false;
                  let allAbsent = true;
                  let allExempt = true;

                  metrics.forEach(m => {
                    const key = m.id || m.name;
                    const val = entry.scores[key];
                    if (val !== null && val !== undefined && val !== "") {
                      hasAnyPoints = true;
                      if (val === "ABS") {
                        allExempt = false;
                      } else if (val === "EX") {
                        allAbsent = false;
                      } else if (!isNaN(Number(val))) {
                        studentTotal += Number(val);
                        allAbsent = false;
                        allExempt = false;
                      }
                    }
                  });

                  const isEntered = entry.isEntered && hasAnyPoints;
                  const grade = isEntered ? (allAbsent ? "ABS" : allExempt ? "EX" : scoreToGrade(studentTotal)) : "—";
                  const remark = isEntered ? (allAbsent ? "Absent" : allExempt ? "Exempt" : gradeRemark(grade)) : "Unrecorded";
                  const isPassing = isEntered && !allAbsent && !allExempt && studentTotal >= 40;

                  return (
                    <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                        {student.admission_no}
                      </TableCell>

                      <TableCell className="font-medium text-xs text-foreground">
                        {student.profiles?.full_name || "Unnamed Student"}
                      </TableCell>

                      {metrics.map((m, mIdx) => {
                        const key = m.id || m.name;
                        const scoreVal = entry.scores[key] !== null && entry.scores[key] !== undefined ? entry.scores[key] : "";
                        const isOverweight = scoreVal !== "" && typeof scoreVal === "number" && scoreVal > m.weight;
                        const isSpecialCode = scoreVal === "ABS" || scoreVal === "EX";

                        return (
                          <TableCell key={m.id || mIdx} className="text-center p-1.5">
                            <Input
                              id={`cell-${sIdx}-${mIdx}`}
                              type="text"
                              inputMode="decimal"
                              value={scoreVal}
                              placeholder="—"
                              disabled={isLocked || saving}
                              onChange={(e) => handleScoreChange(student.id, key, e.target.value, m.weight)}
                              onKeyDown={(e) => handleKeyDown(e, sIdx, mIdx)}
                              className={cn(
                                "w-20 mx-auto text-center h-8 text-xs font-mono font-bold rounded-lg transition-all shadow-2xs",
                                isOverweight 
                                  ? "border-rose-500 bg-rose-500/10 text-rose-500 focus-visible:ring-rose-500" 
                                  : isSpecialCode
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono"
                                  : "bg-background/90 dark:bg-card border-border/90 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/30",
                                isLocked && "opacity-70 cursor-not-allowed bg-muted/40"
                              )}
                            />
                          </TableCell>
                        );
                      })}

                      {/* Total */}
                      <TableCell className="text-center font-black text-sm">
                        {isEntered ? studentTotal : <span className="text-muted-foreground font-normal">—</span>}
                      </TableCell>

                      {/* Grade */}
                      <TableCell className="text-center">
                        {isEntered ? (
                          <span className={cn(
                            "size-7 rounded-lg inline-flex items-center justify-center font-black text-xs border",
                            isPassing 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          )}>
                            {grade}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Remark */}
                      <TableCell>
                        {isEntered ? (
                          <span className={cn(
                            "text-xs font-bold flex items-center gap-1.5",
                            isPassing ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {isPassing ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                            {remark}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 4. CBT Exam Import Modal */}
      <Dialog open={isCbtOpen} onOpenChange={setIsCbtOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="size-4 text-primary" /> Import Online Exam Scores
            </DialogTitle>
            <DialogDescription>
              Automatically map student scores from a completed computer-based test on Klaxtrix into this score sheet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {cbtExams.length === 0 ? (
              <div className="p-6 text-center border border-dashed rounded-xl space-y-1">
                <p className="text-xs font-bold text-foreground">No CBT Exams Available</p>
                <p className="text-[11px] text-muted-foreground">
                  No online tests have been created or taken for {className} • {subjectName} yet.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Select Online Exam</label>
                  <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Choose exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {cbtExams.map(e => (
                        <SelectItem key={e.id} value={e.id} className="text-xs">
                          {e.title} ({e.questionCount} Questions • {e.totalMarks} Marks)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Target Assessment Column</label>
                  <Select value={targetMetricKey} onValueChange={setTargetMetricKey}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Choose column" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map(m => (
                        <SelectItem key={m.id || m.name} value={m.id || m.name} className="text-xs">
                          {m.name} (Max {m.weight} points)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Exam percentages will scale proportionally to fit the column weight.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsCbtOpen(false)} className="text-xs">
              Cancel
            </Button>
            {cbtExams.length > 0 && (
              <Button 
                onClick={handleSyncCbt} 
                disabled={syncingCbt || !selectedExamId}
                className="text-xs font-bold bg-primary hover:bg-primary/90"
              >
                {syncingCbt && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Import Exam Scores
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Metrics Weights Config Modal */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize Grading Components</DialogTitle>
            <DialogDescription>
              Configure the assessment breakdown for {subjectName} in {className} ({academicYear} • {termLabel}). Total weight must equal 100.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
            <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Teacher Subject Flexibility:</strong> Custom weights configured here apply specifically to <strong>{subjectName}</strong> for this session & term without altering other subjects.
            </span>
          </div>

          <div className="space-y-4 py-3">
            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
              {configMetrics.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Metric Name (e.g. Test 1)"
                    value={m.name}
                    onChange={(e) => handleConfigMetricChange(idx, "name", e.target.value)}
                    className="h-9 text-xs flex-1 rounded-xl"
                  />
                  <Input
                    type="number"
                    placeholder="Weight"
                    value={m.weight}
                    onChange={(e) => handleConfigMetricChange(idx, "weight", Number(e.target.value))}
                    className="h-9 w-20 text-xs font-bold text-center rounded-xl"
                    min={0}
                    max={100}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveConfigMetric(idx)}
                    className="size-9 text-destructive hover:bg-destructive/10 rounded-xl shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddConfigMetric}
              className="w-full text-xs font-semibold rounded-xl border-dashed"
            >
              <Plus className="size-3.5 mr-1.5" /> Add Component
            </Button>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border text-xs">
              <span className="font-semibold text-muted-foreground">Total Points (Must Equal 100):</span>
              <span className={cn(
                "text-base font-black",
                configTotalWeight === 100 ? "text-emerald-500" : "text-rose-500"
              )}>
                {configTotalWeight} / 100
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsConfigOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={saveConfig}
              disabled={savingConfig || configTotalWeight !== 100}
              className="text-xs font-bold bg-primary hover:bg-primary/90"
            >
              {savingConfig && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Apply Weights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
