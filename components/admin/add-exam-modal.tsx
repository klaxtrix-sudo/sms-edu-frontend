"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { PasswordInput } from "@/components/ui/password-input";
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
import { Loader2, Sparkles, RefreshCw, UserCheck, ShieldCheck } from "lucide-react";
import { getBackendUrl } from "@/lib/utils";

function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

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
  studentPin: z.string().min(4, "PIN must be at least 4 characters").max(8, "PIN must be at most 8 characters"),
});

type ExamFormValues = z.infer<typeof examSchema>;

interface AddExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

export function AddExamModal({ open, onOpenChange, onSuccess }: AddExamModalProps) {
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
      studentPin: generateRandomPin(),
    },
  });

  const selectedClassId = form.watch("classId");
  const selectedSubjectId = form.watch("subjectId");

  // Cascading Enhancement 1: When Class changes, fetch class curriculum subjects
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

            // If current subject is not in this class's curriculum, reset it
            const currentSubj = form.getValues("subjectId");
            if (currentSubj && !parsed.some(p => p.subject_id === currentSubj)) {
              form.setValue("subjectId", "");
              form.setValue("assignedTeacherId", "");
              setAutoDetectedTeacherName(null);
            }
          } else {
            // Fallback to all school subjects if no mappings exist for this class
            setClassAssignments([]);
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
  }, [selectedClassId, userRole, open, supabase, form]);

  // Derived available subjects for the selected class
  const availableSubjects = useMemo(() => {
    if (classAssignments.length > 0) {
      const uniqueSubs = new Map<string, string>();
      classAssignments.forEach(a => {
        if (a.subject_id && a.subject_name) {
          uniqueSubs.set(a.subject_id, a.subject_name);
        }
      });
      return Array.from(uniqueSubs.entries()).map(([id, name]) => ({ id, name }));
    }
    return allSchoolSubjects;
  }, [classAssignments, allSchoolSubjects]);

  // Cascading Enhancement 2: When Subject changes, auto-detect assigned teacher
  useEffect(() => {
    if (!selectedSubjectId || userRole !== "admin") return;

    // Look up in classAssignments
    const match = classAssignments.find(a => a.subject_id === selectedSubjectId);
    if (match && match.teacher_id) {
      form.setValue("assignedTeacherId", match.teacher_id, { shouldValidate: true });
      setAutoDetectedTeacherName(match.teacher_name || "Assigned Teacher");
    } else {
      // No teacher assigned to this subject
      form.setValue("assignedTeacherId", "");
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

      // Fetch School Active Session & Term
      const { data: schoolData } = await supabase
        .from("schools")
        .select("academic_year, current_term")
        .eq("id", profile.school_id)
        .single() as any;

      if (schoolData?.academic_year) {
        form.setValue("academicYear", schoolData.academic_year);
      }
      if (schoolData?.current_term) {
        form.setValue("term", schoolData.current_term);
      }

      if (profile.role === "teacher") {
        // Teacher workflow
        form.setValue("assignedTeacherId", user.id);
        setTeachers([{ id: user.id, name: profile.full_name || "Self" }]);

        const [{ data: directAssignments }, { data: timetableAssignments }] = await Promise.all([
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

        const allAssignments = [...(directAssignments || []), ...(timetableAssignments || [])];
        if (allAssignments.length > 0) {
          const uniqueClasses: Record<string, any> = {};
          const uniqueSubjects: Record<string, any> = {};

          allAssignments.forEach((a: any) => {
            if (a.classes) uniqueClasses[a.classes.id] = a.classes;
            if (a.subjects) uniqueSubjects[a.subjects.id] = a.subjects;
          });

          setClasses(Object.values(uniqueClasses));
          setAllSchoolSubjects(Object.values(uniqueSubjects));
        }
      } else {
        // Admin workflow: load classes, all school subjects, and teachers
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
    }

    if (open) {
      form.setValue("studentPin", generateRandomPin());
      setAutoDetectedTeacherName(null);
      fetchData();
    }
  }, [open, supabase, form]);

  const onSubmit = async (values: ExamFormValues) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`${getBackendUrl()}/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...values,
          assignedTeacherId: values.assignedTeacherId || undefined,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Failed to create exam paper");

      if (values.assignedTeacherId) {
        toast.success("Exam paper created! The assigned teacher has been notified.");
      } else {
        toast.success("Exam paper created! You can start setting questions in Question Studio.");
      }

      onSuccess();
      onOpenChange(false);
      form.reset({
        ...form.getValues(),
        title: "",
        description: "",
        studentPin: generateRandomPin(),
      });
    } catch (error: any) {
      toast.error(error.message || "Something went wrong creating exam paper");
    } finally {
      setLoading(false);
    }
  };

  const regeneratePin = () => {
    const newPin = generateRandomPin();
    form.setValue("studentPin", newPin, { shouldValidate: true });
    toast.info(`Generated new student PIN: ${newPin}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Exam Paper
          </DialogTitle>
          <DialogDescription>
            Configure the exam paper syllabus specifications. Scheduling dates and times are handled separately on the Exam Timetable.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
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
                    <FormLabel className="font-semibold">Target Class *</FormLabel>
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-semibold">Subject *</FormLabel>
                      {loadingClassData && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading curriculum...
                        </span>
                      )}
                    </div>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedClassId || loadingClassData}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedClassId ? "Choose class first" : "Select subject"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSubjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClassId && classAssignments.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Showing subjects configured for {classes.find(c => c.id === selectedClassId)?.name || "this class"}.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assigned Teacher (Cascading Result: Auto-detected or Optional Override) */}
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
                          <SelectValue placeholder="No teacher assigned (Admin managed)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned" className="font-medium text-muted-foreground">
                          None (Admin will author & manage questions directly)
                        </SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} {t.email ? `(${t.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      If assigned, this teacher receives an in-app prompt to draft questions. If unassigned, as Admin you have full permissions to author and publish the paper yourself.
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
                    <FormDescription className="text-xs">Total questions for this paper</FormDescription>
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
                    <FormDescription className="text-xs">Max obtainable score</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration & Access PIN */}
              <FormField
                control={form.control}
                name="durationMins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Duration (Minutes) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} max={180} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">CBT countdown clock</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="studentPin"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-semibold">Student Access PIN *</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-primary gap-1"
                        onClick={regeneratePin}
                      >
                        <RefreshCw className="h-3 w-3" /> Regenerate
                      </Button>
                    </div>
                    <FormControl>
                      <PasswordInput
                        placeholder="e.g. 4827"
                        maxLength={8}
                        className="font-mono tracking-widest bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      PIN required to unlock the exam on test day.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Randomise Options */}
              <div className="grid grid-cols-2 gap-3 col-span-1 md:col-span-2 pt-2">
                <FormField
                  control={form.control}
                  name="randomiseQuestions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 leading-none">
                        <FormLabel className="text-sm font-medium">Shuffle Questions</FormLabel>
                        <FormDescription className="text-xs">
                          Randomise order per student
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="randomiseOptions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-3 bg-muted/20">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 leading-none">
                        <FormLabel className="text-sm font-medium">Shuffle Options</FormLabel>
                        <FormDescription className="text-xs">
                          Randomise A/B/C/D order
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Exam Paper
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
