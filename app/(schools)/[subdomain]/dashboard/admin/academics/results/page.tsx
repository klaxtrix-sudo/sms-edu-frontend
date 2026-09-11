"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createTenantClient } from "@/lib/supabase/client";
import { useTenant } from "@/components/providers/tenant-provider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileSpreadsheet, 
  GraduationCap, 
  PenTool, 
  LayoutGrid, 
  RefreshCw, 
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Calendar,
  Layers
} from "lucide-react";
import { 
  getClasses, 
  getClassCurriculumSubjects, 
  getTermGradingReadiness,
  TermGradingReadinessData 
} from "@/app/actions/academic-actions";
import { ResultsReadinessMatrix } from "@/components/admin/results/results-readiness-matrix";
import { SubjectScoresheet } from "@/components/admin/results/subject-scoresheet";
import { ClassBroadsheet } from "@/components/admin/results/class-broadsheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAcademicSessionOptions } from "@/lib/utils/academic-session";

export default function AdminResultsPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { tenant, academicCycle } = useTenant();

  // Active Cycle Selection
  const [academicYear, setAcademicYear] = useState<string>("2026/2027");
  const [currentTerm, setCurrentTerm] = useState<number>(1);

  // Classroom & Subject Filter Selection
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Mode: 'readiness' (no class selected), 'scoresheet', or 'broadsheet'
  const [viewMode, setViewMode] = useState<"scoresheet" | "broadsheet">("scoresheet");

  // Readiness Data state
  const [readinessData, setReadinessData] = useState<TermGradingReadinessData | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const supabase = createTenantClient();

  // Sync initial academic cycle from tenant provider
  useEffect(() => {
    if (academicCycle?.academicYear) {
      setAcademicYear(academicCycle.academicYear);
    }
    if (academicCycle?.currentTerm) {
      setCurrentTerm(academicCycle.currentTerm);
    }
  }, [academicCycle]);

  // Initial load
  useEffect(() => {
    initializeData();
  }, [tenant?.id, academicYear, currentTerm]);

  const initializeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single() as any;

      if (profile?.school_id) {
        setSchoolId(profile.school_id);

        // Fetch classes
        const { data: classesData } = await supabase
          .from("classes")
          .select("id, name")
          .eq("school_id", profile.school_id)
          .order("name");

        setClasses(classesData || []);

        // Load readiness matrix
        loadReadiness(profile.school_id, academicYear, currentTerm);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  };

  const loadReadiness = async (sId: string, year: string, term: number) => {
    setLoadingReadiness(true);
    try {
      const res = await getTermGradingReadiness(year, term, sId, subdomain);
      if (res.success && res.data) {
        setReadinessData(res.data);
      }
    } catch (err) {
      console.error("Readiness load error:", err);
    } finally {
      setLoadingReadiness(false);
    }
  };

  // When class changes, fetch its curriculum subjects (class-scoped!)
  useEffect(() => {
    if (!selectedClassId || !schoolId) {
      setClassSubjects([]);
      setSelectedSubjectId("");
      return;
    }

    const loadSubjectsForClass = async () => {
      setLoadingSubjects(true);
      try {
        const res = await getClassCurriculumSubjects(selectedClassId, schoolId, subdomain);
        if (res.success && res.data) {
          setClassSubjects(res.data);
          // If previous subject not in this class, auto-pick first or reset
          if (res.data.length > 0) {
            setSelectedSubjectId(res.data[0].id);
          } else {
            setSelectedSubjectId("");
          }
        }
      } catch (err) {
        console.error("Error loading class subjects:", err);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjectsForClass();
  }, [selectedClassId, schoolId]);

  // Handler when clicking on a class card in the readiness matrix
  const handleSelectClassFromMatrix = (
    classId: string,
    initialMode: "scoresheet" | "broadsheet" = "scoresheet",
    subjectId?: string
  ) => {
    setSelectedClassId(classId);
    setViewMode(initialMode);
    if (subjectId) {
      setSelectedSubjectId(subjectId);
    }
  };

  const termLabel = currentTerm === 1 ? "1st Term" : currentTerm === 2 ? "2nd Term" : "3rd Term";
  const selectedClassObj = classes.find(c => c.id === selectedClassId);
  const selectedSubjectObj = classSubjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Global Academic Results Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Academic Results & BroadSheet Hub
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/20">
              Institutional Records
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record subject evaluations, inspect class master broadsheets, and publish terminal report cards.
          </p>
        </div>

        {/* Filters & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Academic Session Selector */}
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="h-9 w-[125px] text-xs font-semibold rounded-xl bg-card border-border/80">
              <span className="flex items-center gap-1.5 truncate">
                <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Session" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {getAcademicSessionOptions(academicCycle?.academicYear || academicYear).map((s) => (
                <SelectItem key={s} value={s} className="text-xs font-medium">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Term Selector */}
          <Select value={currentTerm.toString()} onValueChange={(val) => setCurrentTerm(parseInt(val))}>
            <SelectTrigger className="h-9 w-[110px] text-xs font-semibold rounded-xl bg-card border-border/80">
              <span className="flex items-center gap-1.5 truncate">
                <SelectValue placeholder="Term" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-xs font-medium">1st Term</SelectItem>
              <SelectItem value="2" className="text-xs font-medium">2nd Term</SelectItem>
              <SelectItem value="3" className="text-xs font-medium">3rd Term</SelectItem>
            </SelectContent>
          </Select>

          {/* Classroom Selector */}
          <Select 
            value={selectedClassId || "all"} 
            onValueChange={(val) => setSelectedClassId(val === "all" ? "" : val)}
          >
            <SelectTrigger className="h-9 w-[145px] text-xs font-semibold rounded-xl bg-card border-border/80">
              <span className="flex items-center gap-1.5 truncate">
                <GraduationCap className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="All Classrooms" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-medium text-primary">
                📊 All Classrooms (Readiness)
              </SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Scoped Subject Selector (Only if a class is selected and in scoresheet mode) */}
          {selectedClassId && viewMode === "scoresheet" && (
            <Select 
              value={selectedSubjectId} 
              onValueChange={setSelectedSubjectId}
              disabled={loadingSubjects || classSubjects.length === 0}
            >
              <SelectTrigger className="h-9 w-[160px] text-xs font-semibold rounded-xl bg-card border-border/80">
                <span className="flex items-center gap-1.5 truncate">
                  <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder={loadingSubjects ? "Loading..." : "Select Subject"} />
                </span>
              </SelectTrigger>
              <SelectContent>
                {classSubjects.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs font-medium">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* View Mode Toggle: Score Sheet vs BroadSheet */}
          {selectedClassId && (
            <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode("scoresheet")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  viewMode === "scoresheet" 
                    ? "bg-card text-foreground shadow-xs" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <PenTool className="size-3" /> Scores
              </button>

              <button
                type="button"
                onClick={() => setViewMode("broadsheet")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  viewMode === "broadsheet" 
                    ? "bg-card text-foreground shadow-xs" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileSpreadsheet className="size-3 text-indigo-500" /> BroadSheet
              </button>
            </div>
          )}

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => schoolId && loadReadiness(schoolId, academicYear, currentTerm)}
            className="size-9 rounded-xl border-border hover:bg-muted"
            title="Refresh"
          >
            <RefreshCw className={cn("size-3.5", loadingReadiness ? "animate-spin" : "")} />
          </Button>
        </div>
      </div>

      {/* 2. Main Body Content Switcher */}

      {/* Case A: No Class Selected -> Render Institutional Readiness Matrix (Replaces Blank Void!) */}
      {!selectedClassId && (
        <ResultsReadinessMatrix
          data={readinessData}
          loading={loadingReadiness}
          onSelectClass={handleSelectClassFromMatrix}
        />
      )}

      {/* Case B: Class Selected & BroadSheet Mode -> Render ClassBroadsheet */}
      {selectedClassId && viewMode === "broadsheet" && (
        <ClassBroadsheet
          subdomain={subdomain}
          schoolId={schoolId!}
          classId={selectedClassId}
          academicYear={academicYear}
          term={currentTerm}
          termLabel={termLabel}
          onBack={() => setSelectedClassId("")}
          onSelectSubject={(subjectId) => {
            setSelectedSubjectId(subjectId);
            setViewMode("scoresheet");
          }}
        />
      )}

      {/* Case C: Class Selected & ScoreSheet Mode -> Render SubjectScoresheet */}
      {selectedClassId && viewMode === "scoresheet" && (
        selectedSubjectId ? (
          <SubjectScoresheet
            subdomain={subdomain}
            schoolId={schoolId!}
            classId={selectedClassId}
            className={selectedClassObj?.name || "Class"}
            subjectId={selectedSubjectId}
            subjectName={selectedSubjectObj?.name || "Subject"}
            academicYear={academicYear}
            term={currentTerm}
            termLabel={termLabel}
            onBack={() => setSelectedClassId("")}
            onViewBroadsheet={() => setViewMode("broadsheet")}
          />
        ) : (
          <div className="p-12 border border-dashed border-border/80 rounded-2xl bg-card/40 text-center space-y-3">
            <BookOpen className="size-8 text-muted-foreground mx-auto" />
            <h4 className="font-bold text-sm text-foreground">No Subject Selected</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Please choose a subject from the dropdown above, or view the entire class BroadSheet.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("broadsheet")}
              className="mt-2 text-xs font-semibold rounded-xl"
            >
              <FileSpreadsheet className="size-3.5 mr-1.5 text-indigo-500" />
              Open {selectedClassObj?.name} Master BroadSheet
            </Button>
          </div>
        )
      )}

    </div>
  );
}
