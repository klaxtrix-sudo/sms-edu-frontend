"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Loader2, 
  User, 
  Edit3,
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

interface EditTimetableEntryModalProps {
  entry: any;
  onSuccess?: () => void;
}

export function EditTimetableEntryModal({ entry, onSuccess }: EditTimetableEntryModalProps) {
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
      class_id: entry?.class_id || "",
      subject_id: entry?.subject_id || "",
      day_of_week: String(entry?.day_of_week || "1"),
      start_time: entry?.start_time?.slice(0, 5) || "08:00",
      end_time: entry?.end_time?.slice(0, 5) || "09:00",
      room: entry?.room || "",
      teacher_id: entry?.teacher_id || "",
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
  const loadClassSubjects = useCallback(async (classId: string, preservedSubjectId?: string) => {
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

      let parsed: ClassSubjectAssignment[] = [];
      if (assignments && assignments.length > 0) {
        parsed = assignments
          .filter((a: any) => a.subjects?.id || a.subject_id)
          .map((a: any) => ({
            subject_id: a.subject_id,
            teacher_id: a.teacher_id || null,
            subject_name: a.subjects?.name || "Subject",
            subject_code: a.subjects?.code || "",
            teacher_name: a.teacher?.full_name || a.teacher?.email || null,
          }))
          .sort((a: ClassSubjectAssignment, b: ClassSubjectAssignment) => a.subject_name.localeCompare(b.subject_name));
      }

      // Defensive fallback: if the entry's original subject is not in the class curriculum, keep it selectable
      const targetSubjId = preservedSubjectId || form.getValues("subject_id");
      if (targetSubjId && !parsed.some((p) => p.subject_id === targetSubjId)) {
        if (entry && entry.subject_id === targetSubjId && entry.class_id === classId) {
          parsed.unshift({
            subject_id: entry.subject_id,
            teacher_id: entry.teacher_id || null,
            subject_name: entry.subjects?.name || "Assigned Subject",
            subject_code: entry.subjects?.code || "",
            teacher_name: entry.profiles?.full_name || null,
          });
        }
      }

      setClassSubjects(parsed);

      // Re-evaluate teacher assignment for target subject
      const found = parsed.find((p) => p.subject_id === targetSubjId);
      if (found) {
        if (found.teacher_id) {
          form.setValue("teacher_id", found.teacher_id);
          setTeacherName(found.teacher_name || "Assigned Teacher");
        } else if (entry && entry.teacher_id && entry.subject_id === targetSubjId) {
          form.setValue("teacher_id", entry.teacher_id);
          setTeacherName(entry.profiles?.full_name || "Assigned Teacher");
        } else {
          form.setValue("teacher_id", "");
          setTeacherName("Not assigned");
        }
      } else if (targetSubjId && (!entry || classId !== entry.class_id)) {
        // User changed class away from original and old subject doesn't exist in new class
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
  }, [supabase, form, entry]);

  // On modal open: populate form from entry data
  useEffect(() => {
    if (open && entry) {
      fetchClasses();
      form.reset({
        class_id: entry.class_id || "",
        subject_id: entry.subject_id || "",
        day_of_week: String(entry.day_of_week || "1"),
        start_time: entry.start_time?.slice(0, 5) || "08:00",
        end_time: entry.end_time?.slice(0, 5) || "09:00",
        room: entry.room || "",
        teacher_id: entry.teacher_id || "",
      });
      setTeacherName(entry.profiles?.full_name || (entry.teacher_id ? "Assigned Teacher" : "Not assigned"));
      if (entry.class_id) {
        loadClassSubjects(entry.class_id, entry.subject_id);
      }
    }
  }, [open, entry, fetchClasses, loadClassSubjects, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("timetables")
        .update({
          class_id: values.class_id,
          subject_id: values.subject_id,
          day_of_week: parseInt(values.day_of_week),
          start_time: values.start_time,
          end_time: values.end_time,
          room: values.room || null,
          teacher_id: (values.teacher_id === "" || values.teacher_id === "none") ? null : values.teacher_id,
        })
        .eq("id", entry.id);

      if (error) throw error;

      toast.success("Period updated successfully");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to update timetable period");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-all hover:bg-primary hover:text-white"
          title="Edit Period"
        >
          <Edit3 className="size-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-[2rem] border border-border/80 shadow-2xl backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-primary">
            Edit Period
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground">
            Update subject, schedule, room, or teacher assignment.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      Classroom
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        loadClassSubjects(val);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background/60 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder={loadingClasses ? "Loading..." : "Select Class"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
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
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      Subject
                    </FormLabel>
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
                                : "Select Subject"
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
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      Day of the Week
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/60 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder="Select Day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
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
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      Assigned Teacher
                    </FormLabel>
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
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      Starts At
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="bg-background/60 border-none ring-1 ring-border rounded-xl font-black"
                      />
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
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      Ends At
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="bg-background/60 border-none ring-1 ring-border rounded-xl font-black"
                      />
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
                  <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                    Room / Facility (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g. Science Lab 1"
                        {...field}
                        className="pl-10 bg-background/60 border-none ring-1 ring-border rounded-xl font-medium"
                      />
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
                {loading ? (
                  <Loader2 className="mr-2 size-5 animate-spin" />
                ) : (
                  <Calendar className="mr-2 size-5" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
