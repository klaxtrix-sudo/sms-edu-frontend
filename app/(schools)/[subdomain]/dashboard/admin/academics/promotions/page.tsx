"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  GraduationCap, 
  Award, 
  ArrowRight, 
  RotateCcw, 
  Settings2, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Loader2, 
  Save, 
  ArrowLeft,
  Search,
  Filter,
  Users,
  Undo2,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Check,
  ShieldAlert,
  HelpCircle,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  previewClassPromotions, 
  executeClassPromotions, 
  revertClassPromotions,
  configureClassProgression,
  configureCoreSubjects,
  getClasses,
  getSubjects
} from "@/app/actions/academic-actions";
import { getAcademicSessionOptions } from "@/lib/utils/academic-session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/providers/tenant-provider";

interface PromotionRow {
  studentId: string;
  fullName: string;
  admissionNo: string;
  currentStatus: string;
  term1Avg: number | null;
  term2Avg: number | null;
  term3Avg: number | null;
  annualAverage: number | null;
  annualRank: number | null;
  termsCount: number;
  failedCoreSubjects?: string[];
  attendancePercentage?: number | null;
  recommendedAction: "promoted" | "retained" | "graduated" | "transferred";
  recommendedToClassId: string | null;
  recommendationReason: string;
  selectedAction: "promoted" | "retained" | "graduated" | "transferred";
  selectedToClassId: string | null;
  notes: string;
  alreadyExecuted: boolean;
  executedAction: string | null;
  isStaged?: boolean;
}

export default function AdminPromotionsPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { tenant, academicCycle } = useTenant();
  const schoolId = tenant?.id;

  // Session & Class state
  const sessionOptions = useMemo(
    () => getAcademicSessionOptions(academicCycle?.academicYear || "2026/2027", 3, 3),
    [academicCycle?.academicYear]
  );
  const [academicYear, setAcademicYear] = useState<string>("2025/2026");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [passingThreshold, setPassingThreshold] = useState<number>(50);

  // Sync active academic year from tenant cycle once loaded
  useEffect(() => {
    if (academicCycle?.academicYear) {
      setAcademicYear(academicCycle.academicYear);
    }
  }, [academicCycle?.academicYear]);

  // Data state
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [currentClassData, setCurrentClassData] = useState<any | null>(null);
  const [nextClassData, setNextClassData] = useState<any | null>(null);
  const [allSchoolClasses, setAllSchoolClasses] = useState<any[]>([]);
  const [roster, setRoster] = useState<PromotionRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [unapprovedTerms, setUnapprovedTerms] = useState<number[]>([]);
  const [coreSubjectNames, setCoreSubjectNames] = useState<string[]>([]);

  // Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // In-flight user edits preservation ref
  const userEditsRef = useRef<Map<string, { action: string; toClassId: string | null; notes: string }>>(new Map());

  // Execution options
  const [applyLiveMutation, setApplyLiveMutation] = useState(true);

  // Hierarchy Configuration Modal state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configClasses, setConfigClasses] = useState<any[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Core Subjects Configuration Modal state
  const [isCoreModalOpen, setIsCoreModalOpen] = useState(false);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [selectedCoreIds, setSelectedCoreIds] = useState<Set<string>>(new Set());
  const [savingCore, setSavingCore] = useState(false);

  // Confirmation Modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);

  // Temporal & Execution Lock state
  const [canExecute, setCanExecute] = useState<boolean>(true);
  const [isTermLocked, setIsTermLocked] = useState<boolean>(false);
  const [isTerm3Published, setIsTerm3Published] = useState<boolean>(true);
  const [currentTerm, setCurrentTerm] = useState<number>(3);
  const [lockReason, setLockReason] = useState<string | null>(null);

  // Emergency Administrative Override Modal state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideInput, setOverrideInput] = useState("");
  const [overrideReasonText, setOverrideReasonText] = useState("");

  // 1. Initial Load: Fetch Classes
  useEffect(() => {
    if (!schoolId) return;
    const fetchClasses = async () => {
      try {
        const res = await getClasses(schoolId, subdomain);
        if (res.success && res.data) {
          setClasses(res.data);
          if (res.data.length > 0 && !selectedClassId) {
            setSelectedClassId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    };
    fetchClasses();
  }, [schoolId, subdomain]);

  // 2. Load Promotion Preview
  const handleLoadPreview = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class first.");
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await previewClassPromotions(
        selectedClassId,
        academicYear,
        passingThreshold,
        subdomain
      );

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to load progression preview.");
        return;
      }

      const data = res.data;
      setCurrentClassData(data.currentClass);
      setNextClassData(data.nextClass);
      setAllSchoolClasses(data.allSchoolClasses || []);
      setUnapprovedTerms(data.unapprovedTerms || []);
      setCoreSubjectNames(data.coreSubjectNames || []);
      setCanExecute(data.canExecute ?? true);
      setIsTermLocked(data.isTermLocked ?? false);
      setIsTerm3Published(data.isTerm3Published ?? true);
      setCurrentTerm(data.currentTerm ?? 3);
      setLockReason(data.lockReason ?? null);

      // Map roster preserving in-flight user edits if present
      const mapped: PromotionRow[] = (data.roster || []).map((r: any) => {
        const userEdit = userEditsRef.current.get(r.studentId);
        return {
          ...r,
          selectedAction: userEdit?.action || (r.alreadyExecuted ? r.executedAction : r.recommendedAction),
          selectedToClassId: userEdit ? userEdit.toClassId : (r.alreadyExecuted ? r.executedToClassId : r.recommendedToClassId),
          notes: userEdit ? userEdit.notes : (r.notes || ""),
        };
      });

      setRoster(mapped);

      // Default select all students in the class
      setSelectedStudentIds(new Set(mapped.map((m) => m.studentId)));

      toast.success(`Loaded ${mapped.length} student(s) for ${data.currentClass?.name}`);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Auto-load preview when class or year changes
  useEffect(() => {
    if (selectedClassId && academicYear) {
      userEditsRef.current.clear();
      handleLoadPreview();
    }
  }, [selectedClassId, academicYear]);

  // 3. Selection toggles
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === filteredRoster.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredRoster.map((r) => r.studentId)));
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // 4. Update Individual Row Decision
  const handleRowActionChange = (
    studentId: string,
    newAction: "promoted" | "retained" | "graduated" | "transferred"
  ) => {
    setRoster((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        let newToClassId = row.selectedToClassId;

        if (newAction === "promoted") {
          newToClassId = nextClassData?.id || null;
        } else if (newAction === "retained") {
          newToClassId = currentClassData?.id || null;
        } else if (newAction === "graduated") {
          newToClassId = null;
        }

        // Record edit in ref to preserve across threshold updates
        userEditsRef.current.set(studentId, {
          action: newAction,
          toClassId: newToClassId,
          notes: row.notes,
        });

        return {
          ...row,
          selectedAction: newAction,
          selectedToClassId: newToClassId,
        };
      })
    );
  };

  const handleRowClassChange = (studentId: string, targetClassId: string) => {
    setRoster((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        userEditsRef.current.set(studentId, {
          action: row.selectedAction,
          toClassId: targetClassId,
          notes: row.notes,
        });
        return { ...row, selectedToClassId: targetClassId };
      })
    );
  };

  const handleRowNotesChange = (studentId: string, notes: string) => {
    setRoster((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        userEditsRef.current.set(studentId, {
          action: row.selectedAction,
          toClassId: row.selectedToClassId,
          notes,
        });
        return { ...row, notes };
      })
    );
  };

  // Bulk Apply Decisions
  const handleBulkSetAction = (action: "promoted" | "retained" | "graduated") => {
    setRoster((prev) =>
      prev.map((row) => {
        // Only modify if student is selected
        if (!selectedStudentIds.has(row.studentId)) return row;

        let toClassId = row.selectedToClassId;
        if (action === "promoted") toClassId = nextClassData?.id || null;
        if (action === "retained") toClassId = currentClassData?.id || null;
        if (action === "graduated") toClassId = null;

        userEditsRef.current.set(row.studentId, {
          action,
          toClassId,
          notes: row.notes,
        });

        return {
          ...row,
          selectedAction: action,
          selectedToClassId: toClassId,
        };
      })
    );
    toast.info(`Set selected students to ${action.toUpperCase()}`);
  };

  // Reset to Algorithmic Recommendations
  const handleResetToRecommendations = () => {
    userEditsRef.current.clear();
    setRoster((prev) =>
      prev.map((row) => ({
        ...row,
        selectedAction: row.recommendedAction,
        selectedToClassId: row.recommendedToClassId,
        notes: "",
      }))
    );
    toast.success("Reset all decisions back to calculated criteria recommendations.");
  };

  // 5. Execute Promotions
  const handleExecutePromotions = async (forceOverride: boolean = false, overrideReason?: string) => {
    const targetStudents = roster.filter((r) => selectedStudentIds.has(r.studentId));
    if (targetStudents.length === 0) {
      toast.error("Please select at least one student to execute.");
      return;
    }

    setExecuting(true);
    try {
      const payload = targetStudents.map((r) => ({
        studentId: r.studentId,
        action: r.selectedAction,
        toClassId: r.selectedToClassId,
        annualAverage: r.annualAverage,
        annualRank: r.annualRank,
        decisionType:
          r.selectedAction !== r.recommendedAction ? "manual_override" : "automatic",
        notes: r.notes || null,
      }));

      const res = await executeClassPromotions(
        selectedClassId,
        academicYear,
        payload,
        subdomain,
        applyLiveMutation,
        forceOverride,
        overrideReason
      );

      if (!res.success) {
        toast.error(res.error || "Failed to execute promotions.");
        return;
      }

      userEditsRef.current.clear();
      toast.success(
        `Academic progression committed: ${res.data.promotedCount} promoted, ${res.data.retainedCount} retained, ${res.data.graduatedCount} graduated!${
          !applyLiveMutation ? " (Staged for rollover)" : ""
        }${forceOverride ? " [Emergency Override Applied]" : ""}`
      );
      setIsConfirmModalOpen(false);
      setIsOverrideModalOpen(false);
      setOverrideInput("");
      setOverrideReasonText("");
      handleLoadPreview();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute promotions");
    } finally {
      setExecuting(false);
    }
  };

  // 6. Revert Promotions
  const handleRevertPromotions = async () => {
    setReverting(true);
    try {
      const res = await revertClassPromotions(selectedClassId, academicYear, subdomain);
      if (!res.success) {
        toast.error(res.error || "Failed to revert promotions.");
        return;
      }

      userEditsRef.current.clear();
      toast.success(`Successfully reverted promotions for ${res.data.revertedCount} student(s).`);
      setIsRevertModalOpen(false);
      handleLoadPreview();
    } catch (err: any) {
      toast.error(err.message || "Failed to revert promotions.");
    } finally {
      setReverting(false);
    }
  };

  // 7. Hierarchy Configuration Modal
  const handleOpenConfigModal = () => {
    if (allSchoolClasses.length > 0) {
      setConfigClasses(
        allSchoolClasses.map((c) => ({
          id: c.id,
          name: c.name,
          orderIndex: c.order_index ?? 0,
          nextClassId: c.next_class_id || null,
          isGraduatingClass: Boolean(c.is_graduating_class),
        }))
      );
    } else {
      setConfigClasses(
        classes.map((c, idx) => ({
          id: c.id,
          name: c.name,
          orderIndex: idx + 1,
          nextClassId: null,
          isGraduatingClass: false,
        }))
      );
    }
    setIsConfigModalOpen(true);
  };

  const handleMoveClass = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= configClasses.length) return;

    setConfigClasses((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((item, idx) => ({ ...item, orderIndex: idx + 1 }));
    });
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await configureClassProgression(configClasses, subdomain);
      if (!res.success) {
        toast.error(res.error || "Failed to save progression settings.");
        return;
      }
      toast.success("Class progression sequence updated successfully.");
      setIsConfigModalOpen(false);
      handleLoadPreview();
    } catch (err: any) {
      toast.error(err.message || "Error saving configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  // 8. Core Subjects Modal
  const handleOpenCoreModal = async () => {
    if (!schoolId) return;
    try {
      const res = await getSubjects(schoolId, subdomain);
      if (res.success && res.data) {
        setSchoolSubjects(res.data);
        const coreSet = new Set<string>();
        res.data.forEach((s: any) => {
          if (s.is_core || coreSubjectNames.includes(s.name)) {
            coreSet.add(s.id);
          }
        });
        setSelectedCoreIds(coreSet);
        setIsCoreModalOpen(true);
      }
    } catch (err) {
      toast.error("Failed to load school subjects");
    }
  };

  const handleSaveCoreSubjects = async () => {
    setSavingCore(true);
    try {
      const res = await configureCoreSubjects(
        Array.from(selectedCoreIds),
        selectedClassId || undefined,
        subdomain
      );
      if (!res.success) {
        toast.error(res.error || "Failed to save core subjects.");
        return;
      }
      toast.success("Core subjects updated successfully.");
      setIsCoreModalOpen(false);
      handleLoadPreview();
    } catch (err: any) {
      toast.error(err.message || "Error saving core subjects");
    } finally {
      setSavingCore(false);
    }
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return roster.filter((r) => {
      const matchesSearch =
        r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterAction === "all" || r.selectedAction === filterAction;
      return matchesSearch && matchesFilter;
    });
  }, [roster, searchQuery, filterAction]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: roster.length,
      promoted: roster.filter((r) => r.selectedAction === "promoted").length,
      retained: roster.filter((r) => r.selectedAction === "retained").length,
      graduated: roster.filter((r) => r.selectedAction === "graduated").length,
      executed: roster.filter((r) => r.alreadyExecuted).length,
      staged: roster.filter((r) => r.isStaged).length,
    };
  }, [roster]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* 1. Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/admin/academics/results`}>
              <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Academic Progression & Promotion
            </h1>
            {isTermLocked ? (
              <Badge variant="outline" className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <Lock className="size-3" />
                Forecast Mode (Term {currentTerm})
              </Badge>
            ) : !canExecute ? (
              <Badge variant="outline" className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <Lock className="size-3" />
                Term 3 Pending Approval
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="size-3" />
                Annual Promotion Ready
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-10">
            Aggregate 3-term cumulative performance, apply core subject and attendance gates, and execute atomic promotion batches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {stats.executed > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRevertModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Undo2 className="size-3.5" />
              Revert Promotions ({stats.executed})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCoreModal}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl bg-card border-border/80 hover:bg-primary/5 hover:text-primary"
          >
            <BookOpen className="size-3.5" />
            Core Subjects
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenConfigModal}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl bg-card border-border/80 hover:bg-primary/5 hover:text-primary"
          >
            <Settings2 className="size-3.5" />
            Configure Hierarchy
          </Button>

          <Link href={`/dashboard/admin/academics/results`}>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold rounded-xl bg-card border-border/80"
            >
              Results Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Mid-Year Progression Lock Banner */}
      {isTermLocked && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <Lock className="size-5" />
          </div>
          <div className="text-xs space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-2">
                Mid-Year Cumulative Forecast Active (Term {currentTerm} In Progress)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOverrideModalOpen(true)}
                className="h-7 text-xs font-bold border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 rounded-lg gap-1.5"
              >
                <AlertTriangle className="size-3.5 text-amber-600" />
                Emergency Administrative Override
              </Button>
            </div>
            <p className="text-amber-800/90 dark:text-amber-400/90 text-xs leading-relaxed">
              Batch promotions are locked during early terms to protect your student registry against accidental premature class reassignment. Current rankings, cumulative averages, and algorithmic recommendations serve as a real-time progress forecast. Live execution unlocks automatically when Term 3 concludes.
            </p>
          </div>
        </div>
      )}

      {/* Term 3 Unpublished / Unsigned Gate Banner */}
      {!isTermLocked && !canExecute && lockReason && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <Lock className="size-5" />
          </div>
          <div className="text-xs space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-2">
                Annual Promotion Locked — Pending Term 3 Final Sign-off
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOverrideModalOpen(true)}
                className="h-7 text-xs font-bold border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 rounded-lg gap-1.5"
              >
                <AlertTriangle className="size-3.5 text-amber-600" />
                Emergency Administrative Override
              </Button>
            </div>
            <p className="text-amber-800/90 dark:text-amber-400/90 text-xs leading-relaxed">
              {lockReason}
            </p>
          </div>
        </div>
      )}

      {/* Draft Results Warning Banner */}
      {unapprovedTerms.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-amber-800 dark:text-amber-300">
              Pending Grading Cycle Approval (Term {unapprovedTerms.join(", ")})
            </p>
            <p className="text-amber-700/80 dark:text-amber-400/80 text-[11px] leading-relaxed">
              Results for the indicated term(s) have not yet been approved/published in the Results Hub. Annual averages and recommendations shown below include draft scores and should be treated as provisional until approved.
            </p>
          </div>
        </div>
      )}

      {/* 2. Filter & Selection Console */}
      <Card className="border border-border/80 shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
            
            {/* Academic Session */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                Academic Session
              </label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background border-border">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessionOptions.map((session) => (
                    <SelectItem key={session} value={session} className="text-xs font-medium">
                      {session} {session === academicCycle?.academicYear ? "(Active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Class */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="size-3.5 text-primary" />
                Origin Class
              </label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background border-border">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Passing Cutoff */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Award className="size-3.5 text-primary" />
                Passing Cutoff (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={passingThreshold}
                onChange={(e) => setPassingThreshold(Number(e.target.value) || 0)}
                className="h-10 text-xs font-bold rounded-xl bg-background border-border"
              />
            </div>

            {/* Refresh / Load Button */}
            <div>
              <Button
                onClick={handleLoadPreview}
                disabled={loadingPreview || !selectedClassId}
                className="w-full h-10 rounded-xl font-bold text-xs gap-2"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    Calculate Progression
                  </>
                )}
              </Button>
            </div>

          </div>

          {/* Progression Target Summary Banner */}
          {currentClassData && (
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold">Progression Route:</span>
                <Badge variant="outline" className="font-black bg-muted/40">
                  {currentClassData.name}
                </Badge>
                <ArrowRight className="size-3.5 text-primary" />
                {currentClassData.is_graduating_class ? (
                  <Badge className="font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                    🎓 Graduation (Alumni)
                  </Badge>
                ) : nextClassData ? (
                  <Badge className="font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {nextClassData.name}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="font-black text-[10px]">
                    No Next Class Configured (Click Configure Hierarchy)
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
                {coreSubjectNames.length > 0 && (
                  <div>
                    Core Subjects: <strong className="text-foreground font-semibold">{coreSubjectNames.join(", ")}</strong>
                  </div>
                )}
                <div>
                  Passing Cutoff: <strong className="text-foreground">{passingThreshold}%</strong>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="border border-border/80 shadow-sm bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Cohort</span>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats.executed > 0 ? `${stats.executed} promotions committed` : "Enrolled students"}
          </p>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">To Advance</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.promoted}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Meet promotion criteria</p>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">To Repeat</span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.retained}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Below cutoff / failed core</p>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Graduating</span>
            <GraduationCap className="size-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.graduated}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Completed terminal tier</p>
        </Card>
      </div>

      {/* 4. Interactive Promotion Roster */}
      <Card className="border border-border/80 shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-4 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Annual Progression Roster
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Verify annual cumulative averages, adjust student decisions, and execute batch promotion.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-44 sm:w-56">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs rounded-xl bg-background border-border"
              />
            </div>

            {/* Action Filter */}
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="h-9 w-28 text-xs font-semibold rounded-xl bg-background border-border">
                <Filter className="size-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium">All Actions</SelectItem>
                <SelectItem value="promoted" className="text-xs font-medium">Promote</SelectItem>
                <SelectItem value="retained" className="text-xs font-medium">Repeat</SelectItem>
                <SelectItem value="graduated" className="text-xs font-medium">Graduate</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Bulk Presets */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkSetAction("promoted")}
              disabled={selectedStudentIds.size === 0}
              className="h-9 text-xs font-semibold rounded-xl"
            >
              All Promote
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkSetAction("retained")}
              disabled={selectedStudentIds.size === 0}
              className="h-9 text-xs font-semibold rounded-xl text-amber-600 dark:text-amber-400"
            >
              All Repeat
            </Button>

            {/* Reset to Calculated Recommendations */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetToRecommendations}
              className="h-9 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>

            {/* Batch Commit Button */}
            {canExecute ? (
              <Button
                size="sm"
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={selectedStudentIds.size === 0}
                className="h-9 rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground shadow-sm"
              >
                <CheckCircle2 className="size-3.5" />
                Execute ({selectedStudentIds.size})
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsOverrideModalOpen(true)}
                disabled={selectedStudentIds.size === 0}
                className="h-9 rounded-xl font-bold text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                title={lockReason || "Promotion is locked during active early terms. Click for Emergency Administrative Override."}
              >
                <Lock className="size-3.5" />
                Promotion Locked ({isTermLocked ? `Term ${currentTerm}` : "Pending"})
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={filteredRoster.length > 0 && selectedStudentIds.size === filteredRoster.length}
                      onChange={handleToggleSelectAll}
                      className="size-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-12 text-center">Rank</th>
                  <th className="py-3 px-4 min-w-[180px] sticky left-0 bg-muted/90 backdrop-blur-sm z-10">Student</th>
                  <th className="py-3 px-3 text-center">Term 1</th>
                  <th className="py-3 px-3 text-center">Term 2</th>
                  <th className="py-3 px-3 text-center">Term 3</th>
                  <th className="py-3 px-4 text-center">Annual Avg</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Target Class</th>
                  <th className="py-3 px-4">Administrative Notes</th>
                  <th className="py-3 px-4 text-center">Progression Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground text-xs">
                      {loadingPreview ? "Calculating annual progression roster..." : "No student records found."}
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((row) => {
                    const isPassing = row.annualAverage !== null && row.annualAverage >= passingThreshold;
                    const hasScores = row.annualAverage !== null;
                    const isSelected = selectedStudentIds.has(row.studentId);
                    const hasFailedCore = (row.failedCoreSubjects || []).length > 0;

                    return (
                      <tr
                        key={row.studentId}
                        className={cn(
                          "hover:bg-muted/30 transition-colors",
                          isSelected && "bg-primary/5",
                          row.alreadyExecuted && "bg-muted/10 opacity-90"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudent(row.studentId)}
                            className="size-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>

                        {/* Rank */}
                        <td className="py-3 px-3 text-center font-black">
                          {row.annualRank ? (
                            row.annualRank === 1 ? "🥇 1" :
                            row.annualRank === 2 ? "🥈 2" :
                            row.annualRank === 3 ? "🥉 3" :
                            `#${row.annualRank}`
                          ) : "—"}
                        </td>

                        {/* Student Name (Sticky on left) */}
                        <td className="py-3 px-4 sticky left-0 bg-background/95 backdrop-blur-sm z-10">
                          <p className="font-bold text-foreground truncate max-w-[200px]">{row.fullName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">{row.admissionNo}</span>
                            {row.attendancePercentage !== null && row.attendancePercentage !== undefined && (
                              <Badge variant="outline" className={cn(
                                "text-[9px] px-1 py-0 h-3.5 font-bold",
                                row.attendancePercentage < 75 ? "text-rose-600 border-rose-500/30" : "text-muted-foreground"
                              )}>
                                {row.attendancePercentage}% Att.
                              </Badge>
                            )}
                          </div>
                          {hasFailedCore && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                              ⚠️ Failed core: {row.failedCoreSubjects?.join(", ")}
                            </p>
                          )}
                        </td>

                        {/* Term 1 */}
                        <td className="py-3 px-3 text-center">
                          {row.term1Avg !== null ? `${row.term1Avg}%` : <span className="text-muted-foreground">—</span>}
                        </td>

                        {/* Term 2 */}
                        <td className="py-3 px-3 text-center">
                          {row.term2Avg !== null ? `${row.term2Avg}%` : <span className="text-muted-foreground">—</span>}
                        </td>

                        {/* Term 3 */}
                        <td className="py-3 px-3 text-center">
                          {row.term3Avg !== null ? `${row.term3Avg}%` : <span className="text-muted-foreground">—</span>}
                        </td>

                        {/* Annual Average */}
                        <td className="py-3 px-4 text-center">
                          {hasScores ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-black px-2 py-0.5",
                                isPassing && !hasFailedCore
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              )}
                            >
                              {row.annualAverage}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              No Grades
                            </Badge>
                          )}
                        </td>

                        {/* Decision Dropdown */}
                        <td className="py-3 px-4">
                          <Select
                            value={row.selectedAction}
                            onValueChange={(val: any) => handleRowActionChange(row.studentId, val)}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 w-32 text-xs font-bold rounded-lg border",
                                row.selectedAction === "promoted" && "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/20",
                                row.selectedAction === "retained" && "text-amber-600 dark:text-amber-400 bg-amber-500/5 border-amber-500/20",
                                row.selectedAction === "graduated" && "text-purple-600 dark:text-purple-400 bg-purple-500/5 border-purple-500/20"
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="promoted" className="text-xs font-bold text-emerald-600">Promote</SelectItem>
                              <SelectItem value="retained" className="text-xs font-bold text-amber-600">Repeat Class</SelectItem>
                              <SelectItem value="graduated" className="text-xs font-bold text-purple-600">Graduate</SelectItem>
                              <SelectItem value="transferred" className="text-xs font-bold text-blue-600">Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Target Class */}
                        <td className="py-3 px-4">
                          {row.selectedAction === "graduated" ? (
                            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 italic">
                              Alumni (Graduated)
                            </span>
                          ) : (
                            <Select
                              value={row.selectedToClassId || ""}
                              onValueChange={(val) => handleRowClassChange(row.studentId, val)}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs font-medium rounded-lg bg-background border-border">
                                <SelectValue placeholder="Destination" />
                              </SelectTrigger>
                              <SelectContent>
                                {allSchoolClasses.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>

                        {/* Notes Input */}
                        <td className="py-3 px-4">
                          <Input
                            placeholder="Decision justification..."
                            value={row.notes}
                            onChange={(e) => handleRowNotesChange(row.studentId, e.target.value)}
                            className="h-8 w-44 text-[11px] rounded-lg bg-background border-border"
                          />
                        </td>

                        {/* Ledger Status */}
                        <td className="py-3 px-4 text-center">
                          {row.alreadyExecuted ? (
                            <Badge className={cn(
                              "text-[10px] font-bold",
                              row.isStaged
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            )}>
                              {row.isStaged ? "Staged" : "Committed"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              Pending
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Execution Confirmation Dialog */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" />
              Confirm Academic Progression
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You are about to commit progression decisions for {selectedStudentIds.size} student(s) for the {academicYear} session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Origin Class:</span>
                <strong className="text-foreground">{currentClassData?.name}</strong>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Selected Cohort Size:</span>
                <strong className="text-foreground">{selectedStudentIds.size} student(s)</strong>
              </div>
            </div>

            {/* Live Mutation Toggle */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-1.5">
              <label className="flex items-center gap-2 font-bold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyLiveMutation}
                  onChange={(e) => setApplyLiveMutation(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                Apply Live Class Reassignment Now
              </label>
              <p className="text-[11px] text-muted-foreground ml-6 leading-relaxed">
                {applyLiveMutation
                  ? "Immediately moves students into their new class rosters across the school system."
                  : "Schedules promotion decisions for the new session rollover without moving students out of their current classrooms yet."}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={executing}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleExecutePromotions(false)}
              disabled={executing}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              {executing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Executing...
                </>
              ) : (
                "Confirm & Execute"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Administrative Override Dialog */}
      <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-card border border-destructive/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              Emergency Administrative Override
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Bypass active mid-year promotion lock for {selectedStudentIds.size} student(s) in {currentClassData?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <AlertTriangle className="size-4 shrink-0" />
                Caution: Premature Class Reassignment Risk
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                You are overriding an active grading cycle (Term {currentTerm}). Executing live promotions now will reassign students to new classes immediately, which will distort current-term report cards, continuous assessments, and attendance logs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Session & Current Term:</span>
                <strong className="text-foreground">{academicYear} (Term {currentTerm})</strong>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Origin Class:</span>
                <strong className="text-foreground">{currentClassData?.name}</strong>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Selected Cohort Size:</span>
                <strong className="text-foreground">{selectedStudentIds.size} student(s)</strong>
              </div>
            </div>

            {/* Live Mutation Toggle */}
            <div className="p-3 rounded-xl border border-border/80 bg-background space-y-1">
              <label className="flex items-center gap-2 font-bold text-foreground cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={applyLiveMutation}
                  onChange={(e) => setApplyLiveMutation(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                Apply Live Class Reassignment Now
              </label>
              <p className="text-[11px] text-muted-foreground ml-6 leading-relaxed">
                {applyLiveMutation
                  ? "Immediately moves students into their new class rosters across the school system."
                  : "Schedules promotion decisions for the new session rollover without moving students out of their current classrooms yet."}
              </p>
            </div>

            {/* Justification Textarea */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center justify-between text-xs">
                <span>Administrative Justification <span className="text-destructive">*</span></span>
                <span className="text-[10px] text-muted-foreground">Stored in immutable audit log</span>
              </label>
              <Textarea
                value={overrideReasonText}
                onChange={(e) => setOverrideReasonText(e.target.value)}
                placeholder="State the reason for early promotion execution (e.g., accelerated promotion, special administrative directive, off-cycle grade skip)..."
                className="text-xs min-h-[70px] resize-none"
              />
            </div>

            {/* Explicit "OVERRIDE" confirmation */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs">
                Type <span className="font-mono bg-destructive/15 text-destructive px-1.5 py-0.5 rounded font-bold">OVERRIDE</span> to unlock execution:
              </label>
              <Input
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                placeholder="Type OVERRIDE"
                className="font-mono text-xs uppercase"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsOverrideModalOpen(false);
                setOverrideInput("");
                setOverrideReasonText("");
              }}
              disabled={executing}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleExecutePromotions(true, overrideReasonText.trim())}
              disabled={
                executing || 
                overrideInput.trim() !== "OVERRIDE" || 
                overrideReasonText.trim().length < 5
              }
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              {executing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Overriding & Executing...
                </>
              ) : (
                "Confirm Emergency Override"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Revert Confirmation Dialog */}
      <Dialog open={isRevertModalOpen} onOpenChange={setIsRevertModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-destructive/20">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Undo2 className="size-5" />
              Revert Class Promotions
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action rolls back executed promotions for {currentClassData?.name} in {academicYear}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-foreground leading-relaxed">
              Are you sure you want to revert? This will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
              <li>Restore promoted students back to <strong>{currentClassData?.name}</strong>.</li>
              <li>Reset graduation and alumni status for graduated students in this session.</li>
              <li>Clear committed promotion records from the academic progression history.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRevertModalOpen(false)}
              disabled={reverting}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevertPromotions}
              disabled={reverting}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              {reverting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Reverting...
                </>
              ) : (
                "Yes, Revert All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Class Progression Hierarchy Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              Configure Class Hierarchy & Progression Ladder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Reorder classes with Move Up/Down arrows and designate terminal graduating classes across your curriculum.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2 text-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-bold text-[10px] uppercase">
                  <th className="py-2 px-3 w-20 text-center">Order</th>
                  <th className="py-2 px-3">Class Name</th>
                  <th className="py-2 px-3">Next Progression Class</th>
                  <th className="py-2 px-3 text-center">Terminal / Graduating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {configClasses.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveClass(idx, "up")}
                          className="size-6 rounded-md hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                        >
                          <ArrowUp className="size-3" />
                        </Button>
                        <span className="font-mono font-bold text-xs w-4 text-center">{idx + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={idx === configClasses.length - 1}
                          onClick={() => handleMoveClass(idx, "down")}
                          className="size-6 rounded-md hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                        >
                          <ArrowDown className="size-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-foreground">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <Select
                        value={item.nextClassId || "none"}
                        disabled={item.isGraduatingClass}
                        onValueChange={(val) => {
                          setConfigClasses((prev) =>
                            prev.map((c) =>
                              c.id === item.id
                                ? { ...c, nextClassId: val === "none" ? null : val }
                                : c
                            )
                          );
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs font-medium rounded-lg">
                          <SelectValue placeholder="Select next class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs italic text-muted-foreground">
                            None (Final Class)
                          </SelectItem>
                          {configClasses
                            .filter((c) => c.id !== item.id)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.isGraduatingClass}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setConfigClasses((prev) =>
                            prev.map((c) =>
                              c.id === item.id
                                ? {
                                    ...c,
                                    isGraduatingClass: checked,
                                    nextClassId: checked ? null : c.nextClassId,
                                  }
                                : c
                            )
                          );
                        }}
                        className="rounded border-border text-primary focus:ring-primary size-4 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigModalOpen(false)}
              disabled={savingConfig}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              {savingConfig ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Save Sequence
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Core Subjects Configuration Modal */}
      <Dialog open={isCoreModalOpen} onOpenChange={setIsCoreModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Configure Core Academic Subjects
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Designate mandatory subjects required for automatic promotion. Students failing core subjects are held back for retake.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2 text-xs">
            {schoolSubjects.map((subj) => {
              const isChecked = selectedCoreIds.has(subj.id);
              return (
                <div
                  key={subj.id}
                  onClick={() => {
                    setSelectedCoreIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(subj.id)) next.delete(subj.id);
                      else next.add(subj.id);
                      return next;
                    });
                  }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border border-border/80 cursor-pointer transition-colors",
                    isChecked ? "bg-primary/10 border-primary/30" : "hover:bg-muted/30"
                  )}
                >
                  <div>
                    <p className="font-bold text-foreground">{subj.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{subj.code}</p>
                  </div>
                  <div className={cn(
                    "size-5 rounded-md border flex items-center justify-center",
                    isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  )}>
                    {isChecked && <Check className="size-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCoreModalOpen(false)}
              disabled={savingCore}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCoreSubjects}
              disabled={savingCore}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              {savingCore ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Save Core Subjects
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
