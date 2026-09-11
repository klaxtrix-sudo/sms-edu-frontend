"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, UserCheck, ShieldCheck, Edit3 } from "lucide-react";
import { getBackendUrl } from "@/lib/utils";

const examSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  academicYear: z.string().min(1, "Please select an academic session"),
  term: z.coerce.number().int().min(1).max(3),
  classId: z.string().min(1, "Please select a class"),
  subjectId: z.string().min(1, "Please select a subject"),
  assignedTeacherId: z.string().optional().nullable(),
  durationMins: z.coerce.number().int().min(5).max(180),
  totalMarks: z.coerce.number().int().min(1),
  questionCount: z.coerce.number().int().min(1),
  randomiseQuestions: z.boolean().default(true),
  randomiseOptions: z.boolean().default(true),
});

type ExamFormValues = z.infer<typeof examSchema>;

interface EditExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  exam: any | null;
}

interface TeacherOption {
  id: string;
  name: string;
  email?: string;
}

interface ClassSubjectTeacherAssignment {
  subject_id: string;
  teacher_id?: string | null;
  subject_name?: string;
  teacher_name?: string;
}

export function EditExamModal({ open, onOpenChange, onSuccess, exam }: EditExamModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingClassData, setLoadingClassData] = useState(false);
  const [autoDetectedTeacherName, setAutoDetectedTeacherName] = useState<string | null>(null);
  
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [allSchoolSubjects, setAllSchoolSubjects] = useState<{ id: string; name: string }[]>([]);
  const [classAssignments, setClassAssignments] = useState<ClassSubjectTeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [userRole, setUserRole] = useState<string>("admin");

  const supabase = createClient();

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      description: "",
      academicYear: "2025/2026",
      term: 1,
      classId: "",
      subjectId: "",
      assignedTeacherId: "",
      durationMins: 60,
      totalMarks: 100,
      questionCount: 50,
      randomiseQuestions: true,
      randomiseOptions: true,
    },
  });

  const selectedClassId = form.watch("classId");
  const selectedSubjectId = form.watch("subjectId");

  // Populate initial values when exam is provided
  useEffect(() => {
    if (open && exam) {
      form.reset({
        title: exam.title || "",
        description: exam.description || "",
        academicYear: exam.academicYear || "2025/2026",
        term: exam.term || 1,
        classId: exam.classId || "",
        subjectId: exam.subjectId || "",
        assignedTeacherId: exam.assignedTeacherId || "",
        durationMins: exam.durationMins || 60,
        totalMarks: exam.totalMarks || 100,
        questionCount: exam.questionCount || 50,
        randomiseQuestions: exam.randomiseQuestions ?? true,
        randomiseOptions: exam.randomiseOptions ?? true,
      });
    }
  }, [open, exam, form]);

  // When Class changes, fetch class curriculum subjects
  useEffect(() => {
    async function onClassChange() {
      if (!selectedClassId) {
        setClassAssignments([]);
        return;
      }

      if (userRole === "admin") {
        setLoadingClassData(true);
        try {
          const { data: assignments, error } = await (supabase as any)
            .from("class_subject_teachers")
            .select(`
              subject_id,
              teacher_id,
              subjects:subject_id ( id, name ),
              teacher:teacher_id ( id, full_name, email )
            `)
            .eq("class_id", selectedClassId);

          if (!error && assignments && assignments.length > 0) {
            const parsed: ClassSubjectTeacherAssignment[] = assignments.map((a: any) => ({
              subject_id: a.subject_id,
              teacher_id: a.teacher_id,
              subject_name: a.subjects?.name || "Subject",
              teacher_name: a.teacher?.full_name || a.teacher?.email || undefined,
            }));
            setClassAssignments(parsed);

            const currentSubj = form.getValues("subjectId");
            if (currentSubj && !parsed.some(p => p.subject_id === currentSubj)) {
              form.setValue("subjectId", "");
              form.setValue("assignedTeacherId", "");
              setAutoDetectedTeacherName(null);
            }
          } else {
            // Strict binding
            setClassAssignments([]);
            const currentSubj = form.getValues("subjectId");
            // Only clear if the user actively changed class away from original
            if (exam && selectedClassId !== exam.classId) {
              form.setValue("subjectId", "");
              form.setValue("assignedTeacherId", "");
              setAutoDetectedTeacherName(null);
            }
          }
        } catch (err) {
          console.error("[Class Subjects Load Error]:", err);
          setClassAssignments([]);
        } finally {
          setLoadingClassData(false);
        }
      }
    }

    if (open) {
      onClassChange();
    }
  }, [selectedClassId, userRole, open, supabase, form, exam]);

  // Derived available subjects with Strict Binding
  const availableSubjects = useMemo(() => {
    if (userRole === "teacher") {
      return allSchoolSubjects;
    }
    if (classAssignments.length > 0) {
      const uniqueSubs = new Map<string, string>();
      classAssignments.forEach(a => {
        if (a.subject_id && a.subject_name) {
          uniqueSubs.set(a.subject_id, a.subject_name);
        }
      });
      return Array.from(uniqueSubs.entries()).map(([id, name]) => ({ id, name }));
    }
    // If editing and class matches exam's original class, allow existing subject so it doesn't vanish
    if (exam && exam.classId === selectedClassId && exam.subjectId) {
      const existingName = allSchoolSubjects.find(s => s.id === exam.subjectId)?.name || "Current Subject";
      return [{ id: exam.subjectId, name: existingName }];
    }
    return [];
  }, [classAssignments, allSchoolSubjects, userRole, exam, selectedClassId]);

  // Auto-detect assigned teacher when subject changes
  useEffect(() => {
    if (!selectedSubjectId || userRole !== "admin") return;

    const match = classAssignments.find(a => a.subject_id === selectedSubjectId);
    if (match && match.teacher_id) {
      if (!form.getValues("assignedTeacherId")) {
        form.setValue("assignedTeacherId", match.teacher_id);
      }
      setAutoDetectedTeacherName(match.teacher_name || "Assigned Teacher");
    } else {
      setAutoDetectedTeacherName(null);
    }
  }, [selectedSubjectId, classAssignments, userRole, form]);

  // Initial metadata fetch
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id, role, full_name")
        .eq("id", user.id)
        .single() as any;

      if (!profile?.school_id) return;
      setUserRole(profile.role);

      const [{ data: classesData }, { data: subjectsData }, { data: teachersData }] = await Promise.all([
        (supabase as any).from("classes").select("id, name").eq("school_id", profile.school_id).order("name"),
        (supabase as any).from("subjects").select("id, name").eq("school_id", profile.school_id).order("name"),
        (supabase as any)
          .from("profiles")
          .select("id, full_name, email")
          .eq("school_id", profile.school_id)
          .eq("role", "teacher")
          .eq("is_active", true)
          .eq("is_archived", false)
          .order("full_name")
      ]);

      if (classesData) setClasses(classesData);
      if (subjectsData) setAllSchoolSubjects(subjectsData);
      if (teachersData) {
        setTeachers(
          teachersData.map((t: any) => ({
            id: t.id,
            name: t.full_name || t.email || "Unnamed Teacher",
            email: t.email
          }))
        );
      }
    }

    if (open) {
      fetchData();
    }
  }, [open, supabase]);

  const onSubmit = async (values: ExamFormValues) => {
    if (!exam?._id) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`${getBackendUrl()}/exams/${exam._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...values,
          assignedTeacherId: values.assignedTeacherId || null,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Failed to update exam paper");

      toast.success("Exam paper updated successfully.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong updating exam paper");
    } finally {
      setLoading(false);
    }
  };

  if (!exam) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Edit3 className="h-5 w-5" />
            <DialogTitle className="text-xl">Edit Exam Paper</DialogTitle>
          </div>
          <DialogDescription>
            Update specifications, target curriculum bindings, and assessment rules for this paper.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel className="font-semibold">Exam Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. First Term Mathematics Examination" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Instructions & Overview (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Guidance for candidates (e.g. Attempt all questions, scientific calculator permitted)..." 
                        className="resize-none"
                        rows={2} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Academic Session */}
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Academic Session *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="2024/2025">2024/2025 Session</SelectItem>
                        <SelectItem value="2025/2026">2025/2026 Session</SelectItem>
                        <SelectItem value="2026/2027">2026/2027 Session</SelectItem>
                        <SelectItem value="2027/2028">2027/2028 Session</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Term */}
              <FormField
                control={form.control}
                name="term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Academic Term *</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(Number(val))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1st Term</SelectItem>
                        <SelectItem value="2">2nd Term</SelectItem>
                        <SelectItem value="3">3rd Term</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Class (Cascading Trigger 1) */}
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between min-h-[20px]">
                      <FormLabel className="font-semibold">Target Class *</FormLabel>
                    </div>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subject (Cascading Trigger 2: Filtered by Class) */}
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between min-h-[20px]">
                      <FormLabel className="font-semibold">Subject *</FormLabel>
                      {loadingClassData && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading curriculum...
                        </span>
                      )}
                      {!loadingClassData && selectedClassId && availableSubjects.length === 0 && (
                        <span className="text-[11px] text-amber-500 font-normal">
                          0 subjects configured
                        </span>
                      )}
                    </div>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedClassId || loadingClassData || availableSubjects.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              !selectedClassId 
                                ? "Choose class first" 
                                : loadingClassData 
                                ? "Loading curriculum..." 
                                : availableSubjects.length === 0 
                                ? "No subjects configured for this class" 
                                : "Select subject"
                            } 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSubjects.length === 0 ? (
                          <div className="py-3 px-2 text-center text-xs text-muted-foreground">
                            No subjects configured for this class.
                          </div>
                        ) : (
                          availableSubjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assigned Teacher */}
              <FormField
                control={form.control}
                name="assignedTeacherId"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2 bg-muted/40 p-3 rounded-lg border">
                    <div className="flex items-center justify-between pb-1">
                      <FormLabel className="font-semibold flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        Assigned Subject Teacher (Optional)
                      </FormLabel>
                      {autoDetectedTeacherName && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          Auto-Detected ({autoDetectedTeacherName})
                        </Badge>
                      )}
                      {!autoDetectedTeacherName && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Admin can author directly
                        </span>
                      )}
                    </div>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "unassigned" ? "" : val)} 
                      value={field.value || "unassigned"} 
                      disabled={userRole === "teacher"}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned" className="font-medium text-muted-foreground">
                          None
                        </SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      If assigned, this teacher can author and manage questions. If unassigned, as Admin you have full direct permissions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Question Count & Total Marks */}
              <FormField
                control={form.control}
                name="questionCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Target Questions *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={200} {...field} />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">Total questions for this paper</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalMarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Total Marks *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={500} {...field} />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">Max obtainable score</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration */}
              <FormField
                control={form.control}
                name="durationMins"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel className="font-semibold">Duration (Minutes) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} max={180} {...field} />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">CBT countdown clock</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Anti-Cheating Toggles */}
              <FormField
                control={form.control}
                name="randomiseQuestions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">Shuffle Questions</FormLabel>
                      <p className="text-xs text-muted-foreground">Randomise order per student</p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="randomiseOptions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">Shuffle Options</FormLabel>
                      <p className="text-xs text-muted-foreground">Randomise A/B/C/D order</p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Exam Paper
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
