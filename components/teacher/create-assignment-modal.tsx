"use client";

import { useEffect, useState } from "react";
import { 
  Plus, 
  Calendar, 
  BookOpen, 
  FileText,
  Loader2,
  Paperclip,
  Target
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  dueDate: z.string().min(1, "Due date is required"),
  totalPoints: z.number().min(1).max(100),
  status: z.enum(['draft', 'published']),
});

export function CreateAssignmentModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      classId: "",
      subjectId: "",
      dueDate: "",
      totalPoints: 100,
      status: "published",
    },
  });

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: classData }, { data: subjectData }] = await Promise.all([
        supabase.from("classes").select("*").eq("class_teacher_id", user.id),
        supabase.from("subjects").select("*"),
      ]);
      setClasses(classData || []);
      setSubjects(subjectData || []);
    } catch (error) {
      toast.error("Failed to load options");
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/assignments`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(values),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      toast.success("Assignment published to your students!");
      setOpen(false);
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create assignment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-black h-12 px-8 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
          <Plus className="mr-2 size-5" /> Design Classwork
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-3xl bg-card/95 backdrop-blur-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-4xl font-black tracking-tighter text-primary">New Assignment</DialogTitle>
          <DialogDescription className="text-base font-medium">Outline the tasks, set the deadline, and broadcast to your class.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Target Classroom</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-background/50 border-none ring-1 ring-border rounded-2xl font-bold shadow-inner transition-all hover:ring-primary/50">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="font-medium focus:bg-primary/10">{c.name}</SelectItem>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Academic Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-background/50 border-none ring-1 ring-border rounded-2xl font-bold shadow-inner transition-all hover:ring-primary/50">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="font-medium focus:bg-primary/10">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Assignment Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Intro to Quantum Mechanics" {...field} className="h-12 bg-background/50 border-none ring-1 ring-border rounded-2xl font-bold shadow-inner" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Brief & Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detail the requirements, deliverables, and reading materials..." 
                      className="min-h-[120px] bg-background/50 border-none ring-1 ring-border rounded-2xl font-medium shadow-inner resize-none pt-4"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Submission Deadline</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary opacity-50" />
                        <Input type="datetime-local" {...field} className="h-12 pl-12 bg-background/50 border-none ring-1 ring-border rounded-2xl font-bold shadow-inner" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Point Value</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Target className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary opacity-50" />
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))}
                          className="h-12 pl-12 bg-background/50 border-none ring-1 ring-border rounded-2xl font-black shadow-inner" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-6">
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-black text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary text-white"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-3 size-6 animate-spin" /> : <Plus className="mr-3 size-6" />}
                Publish Assignment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
