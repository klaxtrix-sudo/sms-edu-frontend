"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createTenantClient } from "@/lib/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  Loader2, 
  Save, 
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Settings,
  Plus,
  Trash2
} from "lucide-react";
import { calculateGrade } from "@/lib/utils";
import { getResultMetrics, saveResultMetrics, saveResults } from "@/app/actions/admin-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Metric {
  id?: string;
  name: string;
  weight: number;
  school_id: string;
  class_id?: string | null;
  subject_id?: string | null;
  is_custom?: boolean;
}

export default function TeacherResultsPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string>("2025/2026");
  const [currentTerm, setCurrentTerm] = useState<number>(1);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  
  // Selection state
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  // Metrics & Config state
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isCustomMetrics, setIsCustomMetrics] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configMetrics, setConfigMetrics] = useState<Metric[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Data state
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  
  const supabase = createTenantClient();

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setTeacherId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single() as any;

      if (profile?.school_id) {
        setSchoolId(profile.school_id as string);

        // Fetch school current cycle info
        const { data: school } = await supabase
          .from("schools")
          .select("academic_year, current_term")
          .eq("id", profile.school_id)
          .single() as any;

        if (school) {
          setAcademicYear(school.academic_year || "2025/2026");
          setCurrentTerm(school.current_term || 1);
        }

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

        const uniqueClasses: Record<string, any> = {};
        const uniqueSubjects: Record<string, any> = {};

        const processAssignments = (arr: any[]) => {
          arr?.forEach((a: any) => {
            if (a.classes) uniqueClasses[a.classes.id] = a.classes;
            if (a.subjects) uniqueSubjects[a.subjects.id] = a.subjects;
          });
        };

        processAssignments(directAssignments || []);
        processAssignments(timetableAssignments || []);

        setClasses(Object.values(uniqueClasses));
        setSubjects(Object.values(uniqueSubjects));
      }
    } catch (error) {
      console.error("Error fetching initial teacher data:", error);
      toast.error("Failed to load assigned classes or subjects");
    } finally {
      setLoading(false);
    }
  };

  const loadMetricsAndResults = async () => {
    if (!selectedClass || !selectedSubject || !schoolId) return;

    setLoading(true);
    try {
      // 1. Fetch active grading metrics (custom or fallback default)
      const metricsRes = await getResultMetrics(selectedClass, selectedSubject, schoolId, subdomain);
      let activeMetrics: Metric[] = [];
      if (metricsRes.success && metricsRes.data) {
        activeMetrics = metricsRes.data;
        setMetrics(activeMetrics);
        setIsCustomMetrics(!!metricsRes.isCustom);
      } else {
        // Fallback defaults
        activeMetrics = [
          { name: "First Test", weight: 20, school_id: schoolId },
          { name: "Second Test", weight: 20, school_id: schoolId },
          { name: "Exam", weight: 60, school_id: schoolId }
        ];
        setMetrics(activeMetrics);
        setIsCustomMetrics(false);
      }

      // 2. Fetch Students in Class
      const { data: studentsData, error: studentError } = await (supabase as any)
        .from("students")
        .select(`
          id,
          admission_no,
          profiles!user_id (
            full_name
          )
        `)
        .eq("class_id", selectedClass)
        .eq("school_id", schoolId)
        .order("admission_no");

      if (studentError) throw studentError;

      // 3. Fetch Existing Results for this selection
      const { data: resultsData, error: resultsError } = await (supabase as any)
        .from("results")
        .select("*")
        .eq("class_id", selectedClass)
        .eq("subject_id", selectedSubject)
        .eq("academic_year", academicYear)
        .eq("term", currentTerm);

      if (resultsError) throw resultsError;

      setStudents(studentsData || []);
      
      // Map results by student_id
      const resultsMap: Record<string, any> = {};
      resultsData?.forEach((r: any) => {
        resultsMap[r.student_id] = {
          id: r.id,
          scores: r.scores || {},
          grade: r.grade,
          remark: r.remark
        };
      });
      
      // Initialize scores for students that don't have them
      studentsData?.forEach((student: any) => {
        if (!resultsMap[student.id]) {
          const initialScores: Record<string, number> = {};
          activeMetrics.forEach(m => {
            const key = m.id || m.name;
            initialScores[key] = 0;
          });
          resultsMap[student.id] = {
            scores: initialScores,
            grade: "F9",
            remark: "Fail"
          };
        } else {
          // Ensure every active metric has a score entry
          activeMetrics.forEach(m => {
            const key = m.id || m.name;
            if (resultsMap[student.id].scores[key] === undefined) {
              resultsMap[student.id].scores[key] = 0;
            }
          });
        }
      });

      setResults(resultsMap);

    } catch (error: any) {
      console.error("Error fetching students/results:", error);
      toast.error(error.message || "Failed to load class roster and results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      loadMetricsAndResults();
    }
  }, [selectedClass, selectedSubject]);

  const handleScoreChange = (studentId: string, metricKey: string, value: string, maxWeight: number) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;
    if (numValue < 0 || numValue > maxWeight) {
      toast.error(`Score must be between 0 and the metric weight: ${maxWeight}`);
      return;
    }

    setResults(prev => {
      const current = prev[studentId] || { scores: {} };
      const updatedScores = { ...current.scores, [metricKey]: numValue };
      
      const total = metrics.reduce((sum, m) => {
        const key = m.id || m.name;
        return sum + (updatedScores[key] || 0);
      }, 0);

      const grade = calculateGrade(total);
      
      return {
        ...prev,
        [studentId]: {
          ...current,
          scores: updatedScores,
          grade: grade.grade,
          remark: grade.remark
        }
      };
    });
  };

  const onSave = async () => {
    if (!schoolId || !selectedClass || !selectedSubject) return;

    setSaving(true);
    try {
      const dataToSave = students.map(student => {
        const res = results[student.id] || { scores: {} };
        const total = metrics.reduce((sum, m) => {
          const key = m.id || m.name;
          return sum + (res.scores[key] || 0);
        }, 0);
        const grade = calculateGrade(total);

        return {
          id: res.id || undefined,
          student_id: student.id,
          school_id: schoolId,
          class_id: selectedClass,
          subject_id: selectedSubject,
          academic_year: academicYear,
          term: currentTerm,
          scores: res.scores,
          total_score: total,
          grade: grade.grade,
          remark: grade.remark
        };
      });

      const result = await saveResults(dataToSave, subdomain);
      if (result.error) throw new Error(result.error);
      
      toast.success("Results saved.");
      loadMetricsAndResults();
    } catch (error: any) {
      toast.error(error.message || "Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  const openConfigModal = () => {
    setConfigMetrics(metrics.map(m => ({ ...m })));
    setIsConfigOpen(true);
  };

  const handleAddConfigMetric = () => {
    setConfigMetrics(prev => [...prev, { name: "", weight: 0, school_id: schoolId!, class_id: selectedClass, subject_id: selectedSubject, is_custom: true }]);
  };

  const handleRemoveConfigMetric = (index: number) => {
    setConfigMetrics(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConfigMetricChange = (index: number, field: keyof Metric, val: any) => {
    setConfigMetrics(prev => prev.map((m, idx) => {
      if (idx === index) {
        return { ...m, [field]: val };
      }
      return m;
    }));
  };

  const configTotalWeight = configMetrics.reduce((sum, m) => sum + Number(m.weight || 0), 0);

  const saveConfig = async () => {
    if (configTotalWeight !== 100) {
      toast.error(`Total weight must equal exactly 100. Current total: ${configTotalWeight}`);
      return;
    }
    const hasEmptyName = configMetrics.some(m => !m.name.trim());
    if (hasEmptyName) {
      toast.error("Please fill in all assessment metric names.");
      return;
    }

    setSavingConfig(true);
    try {
      const payload = configMetrics.map(m => ({
        school_id: schoolId,
        class_id: selectedClass,
        subject_id: selectedSubject,
        name: m.name.trim(),
        weight: Number(m.weight),
        is_custom: true
      }));

      const res = await saveResultMetrics(payload, subdomain);
      if (res.error) throw new Error(res.error);

      toast.success("Class grading weights saved.");
      setIsConfigOpen(false);
      loadMetricsAndResults();
    } catch (error: any) {
      toast.error(error.message || "Failed to update metrics");
    } finally {
      setSavingConfig(false);
    }
  };

  const resetToDefaultMetrics = async () => {
    setSavingConfig(true);
    try {
      const { error } = await (supabase as any)
        .from("result_metrics")
        .delete()
        .eq("school_id", schoolId)
        .eq("class_id", selectedClass)
        .eq("subject_id", selectedSubject);

      if (error) throw error;

      toast.success("Reverted custom metrics to default.");
      setIsConfigOpen(false);
      loadMetricsAndResults();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset metrics");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assigned Results Entry</h1>
          <p className="text-muted-foreground mt-1 text-lg">Input scores for students in your assigned classes and subjects.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedClass && selectedSubject && (
            <Button
              variant="outline"
              onClick={openConfigModal}
              className="border-primary/20 bg-background/50 hover:bg-accent"
            >
              <Settings className="mr-2 h-4 w-4 text-primary" />
              Customize Metrics
            </Button>
          )}
          <Button 
            onClick={onSave} 
            disabled={saving || students.length === 0}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Grades
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ChevronRight className="size-3 text-primary" /> Assigned Class
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ChevronRight className="size-3 text-primary" /> Assigned Subject
              </label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center justify-end">
               <div className="text-xs text-muted-foreground flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg border border-border/50">
                  <Filter className="size-3" />
                  Cycle: <span className="text-foreground font-semibold">{academicYear} Academic Year • Term {currentTerm}</span>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClass || !selectedSubject ? (
        <div className="h-[40vh] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-accent/50 space-y-4">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Filter className="size-6" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">Record results for your assignments</p>
            <p className="text-muted-foreground">Select one of your assigned classes and subjects above to get started.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading roster & assessment system...</p>
        </div>
      ) : (
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Adm No</TableHead>
                  <TableHead className="min-w-[200px]">Student Name</TableHead>
                  {metrics.map((m, idx) => (
                    <TableHead key={m.id || idx} className="w-[120px] text-center">
                      {m.name} ({m.weight})
                    </TableHead>
                  ))}
                  <TableHead className="w-[90px] text-center">Total (100)</TableHead>
                  <TableHead className="w-[90px] text-center">Grade</TableHead>
                  <TableHead className="min-w-[150px]">Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const result = results[student.id] || { scores: {}, grade: "F9", remark: "Fail" };
                  
                  const total = metrics.reduce((sum, m) => {
                    const key = m.id || m.name;
                    return sum + (result.scores[key] || 0);
                  }, 0);

                  const isPassing = total >= 40;

                  return (
                    <TableRow key={student.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">{student.admission_no}</TableCell>
                      <TableCell className="font-medium">{student.profiles?.full_name}</TableCell>
                      
                      {metrics.map((m, idx) => {
                        const key = m.id || m.name;
                        const scoreVal = result.scores[key] !== undefined ? result.scores[key] : "";
                        return (
                          <TableCell key={m.id || idx} className="text-center">
                            <Input 
                              type="number" 
                              className="w-24 mx-auto bg-background/50 h-9 text-center" 
                              value={scoreVal} 
                              onChange={(e) => handleScoreChange(student.id, key, e.target.value, m.weight)}
                              max={m.weight}
                              min={0}
                              step="any"
                            />
                          </TableCell>
                        );
                      })}

                      <TableCell className="text-center">
                        <div className="font-bold text-base">{total}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={cn(
                          "size-8 rounded-lg flex items-center justify-center font-bold border mx-auto",
                          isPassing 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                        )}>
                          {result.grade}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          {isPassing 
                            ? <CheckCircle2 className="size-3 text-emerald-500" /> 
                            : <AlertCircle className="size-3 text-destructive" />
                          }
                          <span className={isPassing ? 'text-emerald-600 font-semibold' : 'text-destructive font-semibold'}>
                            {result.remark}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {students.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No students enrolled in this class yet.
            </div>
          )}
        </Card>
      )}

      {/* Metrics Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Results Metrics</DialogTitle>
            <DialogDescription>
              Assign the distribution of CA and Exam weights specifically for this class and subject. Total weight must equal exactly 100.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-semibold text-muted-foreground">Metric Name</span>
              <span className="text-sm font-semibold text-muted-foreground w-24 text-center">Max Points</span>
            </div>

            <div className="space-y-3 max-h-[25vh] overflow-y-auto pr-1">
              {configMetrics.map((metric, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Input
                    placeholder="e.g. First Assignment"
                    value={metric.name}
                    onChange={(e) => handleConfigMetricChange(idx, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="20"
                    value={metric.weight}
                    onChange={(e) => handleConfigMetricChange(idx, "weight", Number(e.target.value))}
                    className="w-24 text-center"
                    min={0}
                    max={100}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveConfigMetric(idx)}
                    className="text-destructive hover:bg-destructive/10"
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
              className="w-full mt-2"
            >
              <Plus className="mr-2 size-4" /> Add Metric
            </Button>

            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border text-sm">
              <span className="font-medium">Total weight (Target: 100):</span>
              <span className={cn(
                "font-black text-lg",
                configTotalWeight === 100 ? "text-emerald-500" : "text-destructive"
              )}>
                {configTotalWeight} / 100
              </span>
            </div>

            {isCustomMetrics && (
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3 rounded-lg text-xs flex gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>Removing custom configuration will automatically revert this class back to school-wide defaults.</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {isCustomMetrics && (
              <Button
                variant="destructive"
                disabled={savingConfig}
                onClick={resetToDefaultMetrics}
                className="mr-auto"
              >
                Revert to Defaults
              </Button>
            )}
            <Button variant="ghost" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveConfig} 
              disabled={savingConfig || configTotalWeight !== 100}
              className="bg-primary hover:bg-primary/90"
            >
              {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
