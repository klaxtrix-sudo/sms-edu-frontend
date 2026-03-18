"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Loader2, 
  Save, 
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { calculateGrade } from "@/lib/utils";
import { saveResults } from "@/app/actions/admin-actions";
import { toast } from "sonner";

export default function ResultsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  // Selection state
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  // Data state
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  
  const supabase = createClient();

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single() as any;

      if (profile?.school_id) {
        setSchoolId(profile.school_id as string);

        const [classesRes, subjectsRes] = await Promise.all([
          (supabase as any)
            .from("classes")
            .select("id, name")
            .eq("school_id", profile.school_id)
            .order("name"),
          (supabase as any)
            .from("subjects")
            .select("id, name")
            .eq("school_id", profile.school_id)
            .order("name")
        ]);

        setClasses(classesRes.data || []);
        setSubjects(subjectsRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load filter options");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndResults = async () => {
    if (!selectedClass || !selectedSubject || !schoolId) return;

    setLoading(true);
    try {
      // 1. Fetch Students in Class
      const { data: studentsData, error: studentError } = await (supabase as any)
        .from("students")
        .select(`
          id,
          admission_no,
          profiles:user_id (
            full_name
          )
        `)
        .eq("class_id", selectedClass)
        .eq("school_id", schoolId)
        .order("admission_no");

      if (studentError) throw studentError;

      // 2. Fetch Existing Results for this selection
      const { data: resultsData, error: resultsError } = await (supabase as any)
        .from("results")
        .select("*")
        .eq("subject_id", selectedSubject)
        .eq("academic_year", "2025/2026") // Dynamic?
        .eq("term", 1); // Dynamic?

      if (resultsError) throw resultsError;

      setStudents(studentsData || []);
      
      // Map results by student_id
      const resultsMap: Record<string, any> = {};
      resultsData?.forEach((r: any) => {
        resultsMap[r.student_id] = {
          ca1: r.ca1,
          ca2: r.ca2,
          exam: r.exam,
          grade: r.grade,
          remark: r.remark
        };
      });
      setResults(resultsMap);

    } catch (error) {
      console.error("Error fetching students/results:", error);
      toast.error("Failed to load students list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudentsAndResults();
    }
  }, [selectedClass, selectedSubject]);

  const handleScoreChange = (studentId: string, field: string, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;
    if (numValue < 0 || (field.startsWith("ca") && numValue > 20) || (field === "exam" && numValue > 60)) {
      // Basic validation: CAs usually 20, Exam 60 in many systems. 
      // We can adjust based on requirements.
      return;
    }

    setResults(prev => {
      const current = prev[studentId] || { ca1: 0, ca2: 0, exam: 0 };
      const updated = { ...current, [field]: numValue };
      const total = updated.ca1 + updated.ca2 + updated.exam;
      const grade = calculateGrade(total);
      
      return {
        ...prev,
        [studentId]: {
          ...updated,
          grade: grade.grade,
          remark: grade.remark
        }
      };
    });
  };

  const onSave = async () => {
    if (!schoolId || !selectedSubject) return;

    setSaving(true);
    try {
      const dataToSave = students.map(student => ({
        student_id: student.id,
        school_id: schoolId,
        subject_id: selectedSubject,
        academic_year: "2025/2026",
        term: 1,
        ca1: results[student.id]?.ca1 || 0,
        ca2: results[student.id]?.ca2 || 0,
        exam: results[student.id]?.exam || 0,
        grade: results[student.id]?.grade || "F",
        remark: results[student.id]?.remark || "Fail"
      }));

      const result = await saveResults(dataToSave);
      if (result.error) throw new Error(result.error);
      
      toast.success("Results updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Academic Results</h1>
          <p className="text-muted-foreground mt-1 text-lg">Record and manage student performance scores.</p>
        </div>
        <Button 
          onClick={onSave} 
          disabled={saving || students.length === 0}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Results
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ChevronRight className="size-3 text-primary" /> Select Class
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
                <ChevronRight className="size-3 text-primary" /> Select Subject
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
                  Filtering for: <span className="text-foreground font-semibold">2025/2026 Academic Year • First Term</span>
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
            <p className="text-lg font-medium">Ready to record results?</p>
            <p className="text-muted-foreground">Select a class and subject above to load the student list.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Fetching class roster...</p>
        </div>
      ) : (
        <Card className="border-none shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px]">Adm No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead className="w-[100px]">CA 1 (20)</TableHead>
                <TableHead className="w-[100px]">CA 2 (20)</TableHead>
                <TableHead className="w-[100px]">Exam (60)</TableHead>
                <TableHead className="w-[80px]">Total</TableHead>
                <TableHead className="w-[80px]">Grade</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const result = results[student.id] || { ca1: 0, ca2: 0, exam: 0, grade: "F", remark: "Fail" };
                const total = (result.ca1 || 0) + (result.ca2 || 0) + (result.exam || 0);
                const isPassing = total >= 40;

                return (
                  <TableRow key={student.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold">{student.admission_no}</TableCell>
                    <TableCell className="font-medium">{student.profiles?.full_name}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        className="w-20 bg-background/50 h-9" 
                        value={result.ca1} 
                        onChange={(e) => handleScoreChange(student.id, "ca1", e.target.value)}
                        max={20}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        className="w-20 bg-background/50 h-9" 
                        value={result.ca2} 
                        onChange={(e) => handleScoreChange(student.id, "ca2", e.target.value)}
                        max={20}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        className="w-20 bg-background/50 h-9" 
                        value={result.exam} 
                        onChange={(e) => handleScoreChange(student.id, "exam", e.target.value)}
                        max={60}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-base">{total}</div>
                    </TableCell>
                    <TableCell>
                      <div className={`size-8 rounded-lg flex items-center justify-center font-bold border ${
                        isPassing 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {result.grade}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        {isPassing 
                          ? <CheckCircle2 className="size-3 text-emerald-500" /> 
                          : <AlertCircle className="size-3 text-destructive" />
                        }
                        <span className={isPassing ? 'text-emerald-600' : 'text-destructive font-medium'}>
                          {result.remark}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {students.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No students enrolled in this class yet.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
