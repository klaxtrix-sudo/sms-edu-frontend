"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  Target, 
  MessageSquare,
  Loader2,
  FileText
} from "lucide-react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";

const formSchema = z.object({
  grade: z.number().min(0, "Grade cannot be negative"),
  feedback: z.string().min(5, "Feedback must be at least 5 characters"),
});

interface GradeSubmissionModalProps {
  submission: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  maxPoints: number;
}

export function GradeSubmissionModal({ submission, isOpen, onClose, onSuccess, maxPoints }: GradeSubmissionModalProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grade: submission?.grade || 0,
      feedback: submission?.feedback || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.grade > maxPoints) {
      toast.error(`Grade can't be more than ${maxPoints} points.`);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/assignments/submissions/${submission._id}/grade`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(values),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      toast.success("Grade submitted and student notified!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit grade");
    } finally {
      setLoading(false);
    }
  }

  if (!submission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[550px] p-5 sm:p-6 rounded-3xl sm:rounded-[2.5rem] border-none shadow-3xl bg-card/95 backdrop-blur-2xl overflow-y-auto max-h-[92vh]">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
        <DialogHeader className="pt-4 sm:pt-6 space-y-1 sm:space-y-2">
          <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tighter text-primary">Grade Submission</DialogTitle>
          <DialogDescription className="text-xs sm:text-base font-medium">Review the student's work and leave feedback.</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/30 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/50 space-y-3 sm:space-y-4 max-h-[240px] overflow-y-auto mt-2 sm:mt-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-60 mb-2">
                <FileText className="size-3" /> Student Response
            </div>
            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed italic">"{submission.content || "No written answer."}"</p>
            {submission.attachments?.length > 0 && (
                <div className="pt-3 border-t border-border/30">
                     <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Attachments</span>
                     <div className="flex flex-wrap gap-2">
                        {submission.attachments.map((url: string, idx: number) => (
                            <a 
                                key={idx} 
                                href={url} 
                                target="_blank" 
                                className="px-3 py-1.5 bg-background/50 rounded-xl text-[10px] font-bold border border-border/50 hover:bg-primary/10 transition-colors"
                            >
                                File {idx + 1}
                            </a>
                        ))}
                     </div>
                </div>
            )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Score</FormLabel>
                    <span className="text-[10px] font-black uppercase text-primary">Max {maxPoints} pts</span>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary opacity-50" />
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        className="h-12 pl-12 bg-background/50 border-none ring-1 ring-border rounded-2xl font-black shadow-inner" 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Feedback</FormLabel>
                  <FormControl>
                    <div className="relative">
                       <MessageSquare className="absolute left-4 top-4 size-4 text-primary opacity-50" />
                       <Textarea 
                        placeholder="Leave feedback to help the student improve..." 
                        className="min-h-[100px] pl-12 bg-background/50 border-none ring-1 ring-border rounded-2xl font-medium shadow-inner resize-none pt-4" 
                        {...field} 
                       />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2 sm:pt-4">
              <Button 
                type="submit" 
                className="w-full h-12 sm:h-14 rounded-2xl font-black text-base sm:text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary text-white"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-3 size-5 sm:size-6 animate-spin" /> : <CheckCircle2 className="mr-3 size-5 sm:size-6" />}
                Save Grade
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
