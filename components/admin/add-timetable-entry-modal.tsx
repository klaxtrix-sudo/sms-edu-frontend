"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Plus, 
  Calendar, 
  Clock, 
  BookOpen, 
  MapPin, 
  Loader2, 
  User,
  AlertCircle,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const DAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
];

const formSchema = z.object({
  class_id: z.string().min(1, "Class is required"),
  subject_id: z.string().min(1, "Subject is required"),
  day_of_week: z.string().min(1, "Day is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  room: z.string().optional(),
  teacher_id: z.string().optional(),
});

interface ClassSubjectAssignment {
  subject_id: string;
  teacher_id: string | null;
  subject_name: string;
  subject_code?: string;
  teacher_name?: string | null;
}

interface AddTimetableEntryModalProps {
  onSuccess?: () => void;
  defaultClassId?: string;
}

export function AddTimetableEntryModal({ onSuccess, defaultClassId }: AddTimetableEntryModalProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectAssignment[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teacherName, setTeacherName] = useState<string>("");
  const supabase = createTenantClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      class_id: defaultClassId || "",
      subject_id: "",
      day_of_week: "1",
      start_time: "08:00",
      end_time: "09:00",
      room: "",
      teacher_id: "",
    },
  });

  const watchClassId = form.watch("class_id");
  const watchSubjectId = form.watch("subject_id");

  // Fetch all classes for the class selector
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const { data } = await supabase.from("classes").select("*").order("name");
      setClasses(data || []);
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setLoadingClasses(false);
    }
  }, [supabase]);

  // Dynamically load curriculum subjects configured for the selected classroom
  const loadClassSubjects = useCallback(async (classId: string) => {
    if (!classId) {
      setClassSubjects([]);
      setTeacherName("");
      form.setValue("teacher_id", "");
      form.setValue("subject_id", "");
      return;
    }

    setLoadingSubjects(true);
    try {
      const { data: assignments, error } = await (supabase as any)
        .from("class_subject_teachers")
        .select(`
          subject_id,
          teacher_id,
          subjects:subject_id ( id, name, code ),
          teacher:teacher_id ( id, full_name, email )
        `)
        .eq("class_id", classId);

      if (error) throw error;

      if (assignments && assignments.length > 0) {
        const parsed: ClassSubjectAssignment[] = assignments
          .filter((a: any) => a.subjects?.id || a.subject_id)
          .map((a: any) => ({
            subject_id: a.subject_id,
            teacher_id: a.teacher_id || null,
            subject_name: a.subjects?.name || "Subject",
            subject_code: a.subjects?.code || "",
            teacher_name: a.teacher?.full_name || a.teacher?.email || null,
          }))
          .sort((a: ClassSubjectAssignment, b: ClassSubjectAssignment) => a.subject_name.localeCompare(b.subject_name));

        setClassSubjects(parsed);

        // Check if currently selected subject exists in the newly loaded curriculum
        const currentSubj = form.getValues("subject_id");
        const found = parsed.find((p) => p.subject_id === currentSubj);
        if (found) {
          if (found.teacher_id) {
            form.setValue("teacher_id", found.teacher_id);
            setTeacherName(found.teacher_name || "Assigned Teacher");
          } else {
            form.setValue("teacher_id", "");
            setTeacherName("Not assigned");
          }
        } else if (currentSubj) {
          form.setValue("subject_id", "");
          form.setValue("teacher_id", "");
          setTeacherName("");
        }
      } else {
        setClassSubjects([]);
        form.setValue("subject_id", "");
        form.setValue("teacher_id", "");
        setTeacherName("");
      }
    } catch (err) {
      console.error("Failed to load class curriculum:", err);
      setClassSubjects([]);
      form.setValue("subject_id", "");
      form.setValue("teacher_id", "");
      setTeacherName("");
    } finally {
      setLoadingSubjects(false);
    }
  }, [supabase, form]);

  useEffect(() => {
    if (open) {
      fetchClasses();
      const initialClass = defaultClassId || form.getValues("class_id");
      if (initialClass) {
        form.setValue("class_id", initialClass);
        loadClassSubjects(initialClass);
      }
    } else {
      form.reset({
        class_id: defaultClassId || "",
        subject_id: "",
        day_of_week: "1",
        start_time: "08:00",
        end_time: "09:00",
        room: "",
        teacher_id: "",
      });
      setClassSubjects([]);
      setTeacherName("");
    }
  }, [open, defaultClassId, fetchClasses, loadClassSubjects, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) throw new Error("School not found");

      const { error } = await supabase
        .from("timetables")
        .insert({
          ...values,
          day_of_week: parseInt(values.day_of_week),
          school_id: profile.school_id,
          teacher_id: (values.teacher_id === "" || values.teacher_id === "none") ? null : values.teacher_id
        });

      if (error) throw error;

      toast.success("Timetable slot saved.");
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error("Conflict detected or scheduling error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-bold shadow-lg hover:shadow-primary/20 transition-all rounded-xl">
          <Plus className="mr-2 size-4" /> Add Period
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-[2rem] border border-border/80 shadow-2xl backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Schedule Period</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground">Assign a subject to a specific time slot and room.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Classroom</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        loadClassSubjects(val);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background/60 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder={loadingClasses ? "Loading..." : "Pick Class"} />
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
                name="subject_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Subject</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        const assigned = classSubjects.find((s) => s.subject_id === val);
                        if (assigned?.teacher_id) {
                          form.setValue("teacher_id", assigned.teacher_id);
                          setTeacherName(assigned.teacher_name || "Assigned Teacher");
                        } else {
                          form.setValue("teacher_id", "");
                          setTeacherName("Not assigned");
                        }
                      }} 
                      value={field.value}
                      disabled={!watchClassId || loadingSubjects || classSubjects.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background/60 border-none ring-1 ring-border rounded-xl font-bold disabled:opacity-50">
                          <SelectValue 
                            placeholder={
                              !watchClassId
                                ? "Select class first"
                                : loadingSubjects
                                ? "Loading curriculum..."
                                : classSubjects.length === 0
                                ? "No subjects configured"
                                : "Pick Subject"
                            } 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classSubjects.map((s) => (
                          <SelectItem key={s.subject_id} value={s.subject_id}>
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span>{s.subject_name}</span>
                              {s.subject_code && (
                                <span className="text-[10px] text-muted-foreground font-mono uppercase">
                                  ({s.subject_code})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Prompt when classroom has no curriculum subjects configured */}
            {watchClassId && !loadingSubjects && classSubjects.length === 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5 animate-in fade-in duration-300">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-1">
                  <p className="font-bold">No curriculum subjects configured</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    This classroom does not have any subjects assigned to its curriculum yet. Configure subjects and allocate subject teachers under{" "}
                    <Link 
                      href="/dashboard/admin/academics" 
                      className="underline font-bold text-primary hover:text-primary/80 inline-flex items-center gap-0.5"
                    >
                      Classes & Subjects <ArrowUpRight className="size-3" />
                    </Link>.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Day of the Week</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/60 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder="Select Day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacher_id"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Assigned Teacher</FormLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        readOnly
                        value={
                          loadingSubjects
                            ? "Loading..."
                            : (!watchClassId || !watchSubjectId)
                            ? ""
                            : teacherName
                        }
                        placeholder={!watchClassId ? "Select class first" : !watchSubjectId ? "Pick subject" : "Teacher"}
                        className="pl-10 bg-muted/50 border-none ring-1 ring-border rounded-xl font-bold cursor-default text-sm"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Starts At</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="bg-background/60 border-none ring-1 ring-border rounded-xl font-black" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Ends At</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="bg-background/60 border-none ring-1 ring-border rounded-xl font-black" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="room"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Room / Facility (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input placeholder="e.g. Science Lab 1" {...field} className="pl-10 bg-background/60 border-none ring-1 ring-border rounded-xl font-medium" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-3">
              <Button 
                type="submit" 
                className="w-full h-11 rounded-2xl font-black text-base shadow-xl shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
                disabled={loading || !watchSubjectId}
              >
                {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Calendar className="mr-2 size-5" />}
                Add to Timetable
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
