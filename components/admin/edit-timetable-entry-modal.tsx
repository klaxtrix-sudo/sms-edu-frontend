"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin,
  Loader2,
  User,
  Edit3
} from "lucide-react";
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

interface EditTimetableEntryModalProps {
  entry: any;
  onSuccess?: () => void;
}

export function EditTimetableEntryModal({ entry, onSuccess }: EditTimetableEntryModalProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [teacherName, setTeacherName] = useState<string>("");
  const [teacherLoading, setTeacherLoading] = useState(false);
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

  const lookupTeacher = useCallback(async (classId: string, subjectId: string) => {
    if (!classId || !subjectId) {
      setTeacherName("");
      form.setValue("teacher_id", "");
      return;
    }
    setTeacherLoading(true);
    try {
      const { data: assignment } = await supabase
        .from("class_subject_teachers")
        .select("teacher_id")
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .maybeSingle();

      if (assignment?.teacher_id) {
        form.setValue("teacher_id", assignment.teacher_id);
        const { data: teacher } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", assignment.teacher_id)
          .single();
        setTeacherName(teacher?.full_name || "Unknown Teacher");
      } else {
        form.setValue("teacher_id", "");
        setTeacherName("Not assigned");
      }
    } catch {
      form.setValue("teacher_id", "");
      setTeacherName("Lookup failed");
    } finally {
      setTeacherLoading(false);
    }
  }, [supabase, form]);

  const fetchData = async () => {
    try {
      const [{ data: classData }, { data: subjectData }] = await Promise.all([
        supabase.from("classes").select("*"),
        supabase.from("subjects").select("*"),
      ]);
      setClasses(classData || []);
      setSubjects(subjectData || []);
    } catch (error) {
      toast.error("Failed to load scheduling options");
    }
  };

  useEffect(() => {
    if (open && entry) {
      fetchData();
      form.reset({
        class_id: entry.class_id || "",
        subject_id: entry.subject_id || "",
        day_of_week: String(entry.day_of_week || "1"),
        start_time: entry.start_time?.slice(0, 5) || "08:00",
        end_time: entry.end_time?.slice(0, 5) || "09:00",
        room: entry.room || "",
        teacher_id: entry.teacher_id || "",
      });
      if (entry.profiles?.full_name) {
        setTeacherName(entry.profiles.full_name);
      }
    }
  }, [open, entry]);

  useEffect(() => {
    if (open && watchClassId && watchSubjectId) {
      if (watchClassId !== entry.class_id || watchSubjectId !== entry.subject_id) {
        lookupTeacher(watchClassId, watchSubjectId);
      }
    }
  }, [watchClassId, watchSubjectId, open, entry, lookupTeacher]);

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
      <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-primary">
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/60 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder="Select Class" />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/60 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                          teacherLoading
                            ? "Loading..."
                            : (!watchClassId || !watchSubjectId)
                            ? ""
                            : teacherName
                        }
                        placeholder="Select class & subject"
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
                disabled={loading}
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
