"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  configureClassProgression,
  getClasses 
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
  recommendedAction: "promoted" | "retained" | "graduated" | "transferred";
  recommendedToClassId: string | null;
  recommendationReason: string;
  selectedAction: "promoted" | "retained" | "graduated" | "transferred";
  selectedToClassId: string | null;
  notes: string;
  alreadyExecuted: boolean;
  executedAction: string | null;
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

  // Data state
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [currentClassData, setCurrentClassData] = useState<any | null>(null);
  const [nextClassData, setNextClassData] = useState<any | null>(null);
  const [allSchoolClasses, setAllSchoolClasses] = useState<any[]>([]);
  const [roster, setRoster] = useState<PromotionRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  // Hierarchy Configuration Modal state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configClasses, setConfigClasses] = useState<any[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Execution Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

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

      // Map roster to interactive state
      const mapped: PromotionRow[] = (data.roster || []).map((r: any) => ({
        ...r,
        selectedAction: r.alreadyExecuted ? r.executedAction : r.recommendedAction,
        selectedToClassId: r.alreadyExecuted ? r.executedToClassId : r.recommendedToClassId,
        notes: r.notes || "",
      }));

      setRoster(mapped);
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
      handleLoadPreview();
    }
  }, [selectedClassId, academicYear]);

  // 3. Update Individual Row Decision
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
      prev.map((row) =>
        row.studentId === studentId ? { ...row, selectedToClassId: targetClassId } : row
      )
    );
  };

  const handleRowNotesChange = (studentId: string, notes: string) => {
    setRoster((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, notes } : row))
    );
  };

  // Bulk Apply Decisions
  const handleBulkSetAction = (action: "promoted" | "retained" | "graduated") => {
    setRoster((prev) =>
      prev.map((row) => {
        let toClassId = row.selectedToClassId;
        if (action === "promoted") toClassId = nextClassData?.id || null;
        if (action === "retained") toClassId = currentClassData?.id || null;
        if (action === "graduated") toClassId = null;
        return {
          ...row,
          selectedAction: action,
          selectedToClassId: toClassId,
        };
      })
    );
    toast.info(`Set all uncommitted students to ${action.toUpperCase()}`);
  };

  // 4. Execute Promotions
  const handleExecutePromotions = async () => {
    if (roster.length === 0) return;

    setExecuting(true);
    try {
      const payload = roster.map((r) => ({
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
        subdomain
      );

      if (!res.success) {
        toast.error(res.error || "Failed to execute promotions.");
        return;
      }

      toast.success(
        `Academic progression applied: ${res.data.promotedCount} promoted, ${res.data.retainedCount} retained, ${res.data.graduatedCount} graduated!`
      );
      setIsConfirmModalOpen(false);
      handleLoadPreview();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute promotions");
    } finally {
      setExecuting(false);
    }
  };

  // 5. Open Class Hierarchy Configuration Modal
  const handleOpenConfigModal = () => {
    if (allSchoolClasses.length > 0) {
      setConfigClasses(
        allSchoolClasses.map((c) => ({
          id: c.id,
          name: c.name,
          orderIndex: c.order_index ?? 0,
          nextClassId: c.next_class_id || null,
          isGraduatingClass: !!c.is_graduating_class,
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

  // 6. Save Hierarchy Settings
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
            <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/20">
              Annual Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-10">
            Aggregate 3-term cumulative performance, compute cohort ranks, and advance students to their next class or alumni status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
                      {session}
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

              <div className="text-muted-foreground">
                Passing Cutoff: <strong className="text-foreground">{passingThreshold}%</strong> annual average
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
          <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled students</p>
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
          <p className="text-[11px] text-muted-foreground mt-0.5">Below passing threshold</p>
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
              Verify annual cumulative grade point averages, customize decisions, and execute batch promotion.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-48 sm:w-60">
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
              <SelectTrigger className="h-9 w-32 text-xs font-semibold rounded-xl bg-background border-border">
                <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Actions" />
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
              className="h-9 text-xs font-semibold rounded-xl"
            >
              All Promote
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkSetAction("retained")}
              className="h-9 text-xs font-semibold rounded-xl text-amber-600 dark:text-amber-400"
            >
              All Repeat
            </Button>

            {/* Batch Commit Button */}
            <Button
              size="sm"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={roster.length === 0}
              className="h-9 rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground shadow-sm"
            >
              <CheckCircle2 className="size-3.5" />
              Execute Promotions ({stats.total})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-3 text-center">Term 1</th>
                  <th className="py-3 px-3 text-center">Term 2</th>
                  <th className="py-3 px-3 text-center">Term 3</th>
                  <th className="py-3 px-4 text-center">Annual Avg</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Target Class</th>
                  <th className="py-3 px-4">Administrative Notes</th>
                  <th className="py-3 px-4 text-center">Ledger Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground text-xs">
                      {loadingPreview ? "Calculating annual progression roster..." : "No student records found."}
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((row) => {
                    const isPassing = row.annualAverage !== null && row.annualAverage >= passingThreshold;
                    const hasScores = row.annualAverage !== null;

                    return (
                      <tr
                        key={row.studentId}
                        className={cn(
                          "hover:bg-muted/30 transition-colors",
                          row.alreadyExecuted && "bg-muted/10 opacity-90"
                        )}
                      >
                        {/* Rank */}
                        <td className="py-3 px-4 text-center font-black">
                          {row.annualRank ? (
                            row.annualRank === 1 ? "🥇 1" :
                            row.annualRank === 2 ? "🥈 2" :
                            row.annualRank === 3 ? "🥉 3" :
                            `#${row.annualRank}`
                          ) : "—"}
                        </td>

                        {/* Student Name */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground">{row.fullName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{row.admissionNo}</p>
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
                                isPassing
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              )}
                            >
                              {row.annualAverage}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
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
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              Committed
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
              You are about to advance student class enrollments for the {academicYear} session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Origin Class:</span>
                <strong className="text-foreground">{currentClassData?.name}</strong>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Advancing To Next Tier:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.promoted} student(s)</strong>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Repeating Current Class:</span>
                <strong className="text-amber-600 dark:text-amber-400 font-bold">{stats.retained} student(s)</strong>
              </div>
              {stats.graduated > 0 && (
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Graduating to Alumni:</span>
                  <strong className="text-purple-600 dark:text-purple-400 font-bold">{stats.graduated} student(s)</strong>
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This operation updates current class enrollments in PostgreSQL and commits permanent audit ledger records into both PostgreSQL and MongoDB.
            </p>
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
              onClick={handleExecutePromotions}
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

      {/* 6. Class Progression Hierarchy Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              Configure Class Hierarchy & Progression Ladder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the vertical sequence of classes and designate terminal graduating classes across your school curriculum.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2 text-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-bold text-[10px] uppercase">
                  <th className="py-2 px-3 w-16">Sequence</th>
                  <th className="py-2 px-3">Class Name</th>
                  <th className="py-2 px-3">Next Progression Class</th>
                  <th className="py-2 px-3 text-center">Terminal / Graduating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {configClasses.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        value={item.orderIndex}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setConfigClasses((prev) =>
                            prev.map((c) => (c.id === item.id ? { ...c, orderIndex: val } : c))
                          );
                        }}
                        className="h-8 w-14 text-center font-bold text-xs rounded-lg"
                      />
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
                        className="rounded border-border text-primary focus:ring-primary size-4"
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

    </div>
  );
}
