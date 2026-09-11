"use client";

import { useEffect, useState, useMemo } from "react";
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
  Calendar,
  GraduationCap, 
  BookOpen, 
  RefreshCw, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { SubjectScoresheet } from "@/components/admin/results/subject-scoresheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAcademicSessionOptions } from "@/lib/utils/academic-session";
import { useAcademicSync } from "@/hooks/use-academic-sync";

interface AssignedClass {
  id: string;
  name: string;
  subjects: Array<{ id: string; name: string }>;
}

export default function TeacherResultsPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { academicCycle } = useTenant();

  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Active Cycle Selection
  const [academicYear, setAcademicYear] = useState<string>("2026/2027");
  const [currentTerm, setCurrentTerm] = useState<number>(1);

  // Teacher Assignments: grouped by class
  const [classAssignments, setClassAssignments] = useState<Record<string, AssignedClass>>({});
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const supabase = createTenantClient();

  // Sync academic cycle when available from tenant provider
  useEffect(() => {
    if (academicCycle?.academicYear) {
      setAcademicYear(academicCycle.academicYear);
    }
    if (academicCycle?.currentTerm) {
      setCurrentTerm(academicCycle.currentTerm);
    }
  }, [academicCycle]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single() as any;

      if (!profile?.school_id) return;
      setSchoolId(profile.school_id as string);

      // Fetch assignments from both class_subject_teachers and timetables
      const [{ data: directAssignments, error: directError }, { data: timetableAssignments, error: timetableError }] = await Promise.all([
        supabase
          .from("class_subject_teachers")
          .select(`
            class_id,
            subject_id,
            classes:class_id ( id, name ),
            subjects:subject_id ( id, name )
          `)
          .eq("teacher_id", user.id),
        supabase
          .from("timetables")
          .select(`
            class_id,
            subject_id,
            classes:class_id ( id, name ),
            subjects:subject_id ( id, name )
          `)
          .eq("teacher_id", user.id)
      ]) as any[];

      if (directError) throw directError;
      if (timetableError) throw timetableError;

      const assignmentsMap: Record<string, AssignedClass> = {};

      const processAssignmentItem = (item: any) => {
        if (!item?.classes?.id || !item?.subjects?.id) return;
        const cId = item.classes.id;
        const cName = item.classes.name;
        const sId = item.subjects.id;
        const sName = item.subjects.name;

        if (!assignmentsMap[cId]) {
          assignmentsMap[cId] = {
            id: cId,
            name: cName,
            subjects: [],
          };
        }

        if (!assignmentsMap[cId].subjects.some(s => s.id === sId)) {
          assignmentsMap[cId].subjects.push({ id: sId, name: sName });
        }
      };

      (directAssignments || []).forEach(processAssignmentItem);
      (timetableAssignments || []).forEach(processAssignmentItem);

      // Sort subjects alphabetically for each class
      Object.values(assignmentsMap).forEach(c => {
        c.subjects.sort((a, b) => a.name.localeCompare(b.name));
      });

      setClassAssignments(assignmentsMap);

      const classList = Object.values(assignmentsMap).sort((a, b) => a.name.localeCompare(b.name));
      
      // Auto-select first class if none selected or current is invalid
      if (classList.length > 0) {
        setSelectedClassId(prev => {
          if (prev && assignmentsMap[prev]) return prev;
          const firstClass = classList[0];
          // Also auto-select subject if only 1 subject
          if (firstClass.subjects.length === 1) {
            setSelectedSubjectId(firstClass.subjects[0].id);
          }
          return firstClass.id;
        });
      }
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
      toast.error("Failed to load assigned classes or subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Real-time synchronization: refresh class and subject assignments
  useAcademicSync(() => {
    fetchInitialData();
  });

  const assignedClasses = useMemo(() => {
    return Object.values(classAssignments).sort((a, b) => a.name.localeCompare(b.name));
  }, [classAssignments]);

  const availableSubjects = useMemo(() => {
    if (!selectedClassId || !classAssignments[selectedClassId]) return [];
    return classAssignments[selectedClassId].subjects;
  }, [selectedClassId, classAssignments]);

  // When class changes, ensure selected subject is valid for the new class
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const subjectsForClass = classAssignments[newClassId]?.subjects || [];
    if (subjectsForClass.length === 1) {
      setSelectedSubjectId(subjectsForClass[0].id);
    } else if (!subjectsForClass.some(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId("");
    }
  };

  const selectedClassObj = classAssignments[selectedClassId];
  const selectedSubjectObj = availableSubjects.find(s => s.id === selectedSubjectId);
  const termLabel = currentTerm === 1 ? "1st Term" : currentTerm === 2 ? "2nd Term" : "3rd Term";

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Global Teacher Results Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Assigned Results Entry
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/20">
              Teacher Portal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Input subject scores, sync online CBT exams, and manage CA weights for your teaching assignments.
          </p>
        </div>

        {/* Filters & Assignment Controls */}
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

          {/* Assigned Classroom Selector */}
          <Select 
            value={selectedClassId} 
            onValueChange={handleClassChange}
            disabled={loading || assignedClasses.length === 0}
          >
            <SelectTrigger className="h-9 w-[155px] text-xs font-semibold rounded-xl bg-card border-border/80">
              <span className="flex items-center gap-1.5 truncate">
                <GraduationCap className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder={loading ? "Loading..." : assignedClasses.length === 0 ? "No classes" : "Select Class"} />
              </span>
            </SelectTrigger>
            <SelectContent>
              {assignedClasses.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assigned Subject Selector (Scoped to selected class) */}
          <Select 
            value={selectedSubjectId} 
            onValueChange={setSelectedSubjectId}
            disabled={!selectedClassId || availableSubjects.length === 0}
          >
            <SelectTrigger className="h-9 w-[165px] text-xs font-semibold rounded-xl bg-card border-border/80">
              <span className="flex items-center gap-1.5 truncate">
                <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder={!selectedClassId ? "Pick Class first" : availableSubjects.length === 0 ? "No subjects" : "Select Subject"} />
              </span>
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs font-medium">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchInitialData}
            className="size-9 rounded-xl border-border hover:bg-muted"
            title="Refresh Assignments"
          >
            <RefreshCw className={cn("size-3.5", loading ? "animate-spin" : "")} />
          </Button>
        </div>
      </div>

      {/* 2. Main Body Content Switcher */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs font-medium text-muted-foreground">Loading your teaching assignments...</p>
        </div>
      ) : assignedClasses.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-border/80 rounded-2xl bg-card/40 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">No Teaching Assignments Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            You have not been assigned to any classrooms or subjects yet. Please contact your school administrator to configure your teaching assignments.
          </p>
        </div>
      ) : !selectedClassId || !selectedSubjectId ? (
        <div className="p-16 border-2 border-dashed border-border/80 rounded-2xl bg-card/40 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <BookOpen className="size-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Select an Assigned Class & Subject</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Choose a classroom and subject from the dropdown filters above to load the student roster, enter marks, or sync from online CBT exams.
          </p>
        </div>
      ) : (
        <SubjectScoresheet
          key={`${selectedClassId}-${selectedSubjectId}-${academicYear}-${currentTerm}`}
          subdomain={subdomain}
          schoolId={schoolId!}
          classId={selectedClassId}
          className={selectedClassObj?.name || "Class"}
          subjectId={selectedSubjectId}
          subjectName={selectedSubjectObj?.name || "Subject"}
          academicYear={academicYear}
          term={currentTerm}
          termLabel={termLabel}
        />
      )}
    </div>
  );
}
