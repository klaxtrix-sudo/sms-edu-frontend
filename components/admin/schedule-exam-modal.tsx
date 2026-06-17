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
  FormMessage
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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Calendar } from "lucide-react";
import { getBackendUrl } from "@/lib/utils";

const scheduleSchema = z.object({
  examId: z.string().min(1, "Please select an exam paper"),
  examDate: z.string().min(1, "Please select an exam date"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  room: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ScheduleExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ExamPaper {
  _id: string;
  title: string;
  classId: string;
  subjectId: string;
}

export function ScheduleExamModal({ open, onOpenChange, onSuccess }: ScheduleExamModalProps) {
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<ExamPaper[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const supabase = createClient();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      examId: "",
      examDate: "",
      startTime: "",
      endTime: "",
      room: "",
    },
  });

  const loadInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch class and subject names for display mapping
      const [{ data: classesData }, { data: subjectsData }] = await Promise.all([
        (supabase as any).from("classes").select("id, name"),
        (supabase as any).from("subjects").select("id, name"),
      ]);

      const cMap: Record<string, string> = {};
      const sMap: Record<string, string> = {};
      classesData?.forEach((c: any) => { cMap[c.id] = c.name; });
      subjectsData?.forEach((s: any) => { sMap[s.id] = s.name; });
      setClassesMap(cMap);
      setSubjectsMap(sMap);

      // 2. Fetch all MongoDB exams
      const response = await fetch(`${getBackendUrl()}/exams`, {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (result.success) {
        setExams(result.data || []);
      }
    } catch (err) {
      console.error("Failed to load initial data for scheduler:", err);
    }
  };

  useEffect(() => {
    if (open) {
      loadInitialData();
      form.reset();
    }
  }, [open]);

  const onSubmit = async (values: ScheduleFormValues) => {
    const selectedExam = exams.find(e => e._id === values.examId);
    if (!selectedExam) {
      toast.error("Selected exam not found");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`${getBackendUrl()}/exam-timetables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          examId: values.examId,
          examTitle: selectedExam.title,
          classId: selectedExam.classId,
          subjectId: selectedExam.subjectId,
          examDate: values.examDate,
          startTime: values.startTime + ":00", // append seconds
          endTime: values.endTime + ":00",
          room: values.room || null,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Failed to schedule exam");

      toast.success("Exam successfully added to the timetable!");
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while scheduling");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" /> Schedule Examination
          </DialogTitle>
          <DialogDescription>
            Place an active exam paper on the official timetable schedule and venue.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="examId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Exam Paper</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Choose an exam paper" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {exams.map((exam) => (
                        <SelectItem key={exam._id} value={exam._id}>
                          {exam.title} ({subjectsMap[exam.subjectId] || exam.subjectId} - {classesMap[exam.classId] || exam.classId})
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
              name="examDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Date</FormLabel>
                  <FormControl>
                    <Input type="date" className="bg-background/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" className="bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" className="bg-background/50" {...field} />
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
                  <FormLabel>Room / Hall Venue (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Auditorium A, Room 102" className="bg-background/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule Slot
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
