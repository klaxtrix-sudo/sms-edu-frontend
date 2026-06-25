"use client";

import { useEffect, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getBackendUrl } from "@/lib/utils";

const examSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  classId: z.string().min(1, "Please select a class"),
  subjectId: z.string().min(1, "Please select a subject"),
  durationMins: z.coerce.number().int().min(5).max(180),
  totalMarks: z.coerce.number().int().min(1),
  questionCount: z.coerce.number().int().min(1),
  randomiseQuestions: z.boolean().default(true),
  randomiseOptions: z.boolean().default(true),
  startAt: z.string().min(1, "Start date is required"),
  endAt: z.string().min(1, "End date is required"),
  studentPin: z.string().min(4, "PIN must be at least 4 characters").max(8, "PIN must be at most 8 characters"),
});

type ExamFormValues = z.infer<typeof examSchema>;

interface AddExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddExamModal({ open, onOpenChange, onSuccess }: AddExamModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const supabase = createClient();

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      description: "",
      durationMins: 60,
      totalMarks: 100,
      questionCount: 50,
      randomiseQuestions: true,
      randomiseOptions: true,
      startAt: "",
      endAt: "",
      studentPin: "",
    },
  });

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("id", user.id)
        .single() as any;

      if (profile?.school_id) {
        if (profile.role === "teacher") {
          // Fetch assigned classes and subjects from both class_subject_teachers and timetables
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
            setSubjects(Object.values(uniqueSubjects));
          }
        } else {
          // Admin fetches all classes and subjects
          const [{ data: classesData }, { data: subjectsData }] = await Promise.all([
            (supabase as any).from("classes").select("id, name").eq("school_id", profile.school_id),
            (supabase as any).from("subjects").select("id, name").eq("school_id", profile.school_id),
          ]);
          if (classesData) setClasses(classesData);
          if (subjectsData) setSubjects(subjectsData);
        }
      }
    }
    if (open) fetchData();
  }, [open, supabase]);

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
          startAt: new Date(values.startAt).toISOString(),
          endAt: new Date(values.endAt).toISOString(),
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Failed to create exam");

      toast.success("Exam created as a draft.");
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New MCQ Exam</DialogTitle>
          <DialogDescription>
            Define the exam settings. You will be able to add questions after creation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }: { field: any }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Exam Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Second Term Physics Mid-Term" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }: { field: any }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Instructions for students..." 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classId"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMins"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Duration (Minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalMarks"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Total Marks</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Max possible score for this exam</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="questionCount"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Questions to Display</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Number of random questions each student will take</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2 col-span-1 md:col-span-2">
                <FormField
                  control={form.control}
                  name="randomiseQuestions"
                  render={({ field }: { field: any }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Randomise Questions</FormLabel>
                        <FormDescription>
                          Shuffle question sequence.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="randomiseOptions"
                  render={({ field }: { field: any }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Randomise Options</FormLabel>
                        <FormDescription>
                          Shuffle MCQ answers sequence.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="startAt"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Start Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endAt"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>End Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="studentPin"
                render={({ field }: { field: any }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Student Exam PIN</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="e.g. 4827"
                        maxLength={8}
                        className="font-mono tracking-widest"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Students must enter this PIN alongside their admission number to access the exam. Share it with students before the exam begins.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 mt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Exam Shell
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
