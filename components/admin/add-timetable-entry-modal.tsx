"use client";

import { useEffect, useState } from "react";
import { 
  Plus, 
  Calendar, 
  Clock, 
  BookOpen, 
  MapPin,
  Loader2
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
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
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

interface AddTimetableEntryModalProps {
  onSuccess?: () => void;
  defaultClassId?: string;
}

export function AddTimetableEntryModal({ onSuccess, defaultClassId }: AddTimetableEntryModalProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (open) {
      fetchData();
      if (defaultClassId) form.setValue("class_id", defaultClassId);
    }
  }, [open, defaultClassId]);

  const fetchData = async () => {
    try {
      const [{ data: classData }, { data: subjectData }, { data: teacherData }] = await Promise.all([
        supabase.from("classes").select("*"),
        supabase.from("subjects").select("*"),
        supabase.from("profiles").select("*").eq("role", "teacher").eq("is_archived", false).order("full_name"),
      ]);
      setClasses(classData || []);
      setSubjects(subjectData || []);
      setTeachers(teacherData || []);
    } catch (error) {
      toast.error("Failed to load scheduling options");
    }
  };

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

      toast.success("Schedule slot reserved successfully");
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
      <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl backdrop-blur-xl bg-card/90">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black tracking-tighter text-primary">Schedule Period</DialogTitle>
          <DialogDescription className="text-base font-medium">Assign a subject to a specific time slot and room.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Classroom</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder="Pick Class" />
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
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder="Pick Subject" />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Day of the Week</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-none ring-1 ring-border rounded-xl font-bold">
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Teacher (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-none ring-1 ring-border rounded-xl font-bold">
                          <SelectValue placeholder="Pick Teacher" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (No Teacher)</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Starts At</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="bg-background/50 border-none ring-1 ring-border rounded-xl font-black" />
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
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Ends At</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="bg-background/50 border-none ring-1 ring-border rounded-xl font-black" />
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
                  <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Room / Facility (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input placeholder="e.g. Science Lab 1" {...field} className="pl-10 bg-background/50 border-none ring-1 ring-border rounded-xl" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-2xl font-black text-lg shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
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
