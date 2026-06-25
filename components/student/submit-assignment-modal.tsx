"use client";

import { useState } from "react";
import { 
  Send, 
  Loader2,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn, getBackendUrl } from "@/lib/utils";

const formSchema = z.object({
  content: z.string().min(10, "Your response must be at least 10 characters"),
});

interface SubmitAssignmentModalProps {
  assignmentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmitAssignmentModal({ assignmentId, isOpen, onClose, onSuccess }: SubmitAssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/assignments/submit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({
          assignmentId,
          ...values,
          attachments: [] // For now, simple text submission
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      toast.success("Submitted! Your work is in.");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-[3rem] border-none shadow-3xl bg-card/95 backdrop-blur-3xl overflow-hidden p-0">
        <div className="h-32 bg-primary relative overflow-hidden flex items-center px-10">
           <div className="absolute top-0 right-0 p-10 opacity-20 rotate-12">
              <Send size={150} color="white" />
           </div>
           <div>
              <DialogTitle className="text-3xl font-black tracking-tighter text-white uppercase italic">Submit Assignment</DialogTitle>
              <DialogDescription className="text-white/70 font-bold mt-1 uppercase tracking-widest text-[10px]">Send your work to your teacher.</DialogDescription>
           </div>
        </div>

        <div className="p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground opacity-70">Your Answer</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your answer here..." 
                        className="min-h-[250px] bg-background/50 border-none ring-1 ring-border rounded-3xl font-medium shadow-inner p-6 leading-relaxed resize-none focus:ring-primary"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="p-6 bg-muted/30 rounded-3xl border border-dashed border-border/50 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:bg-primary/5 transition-all">
                  <div className="size-12 rounded-full bg-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Paperclip className="size-6 text-primary" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest opacity-40">Add attachments (Coming soon)</span>
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary text-white group"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-3 size-6 animate-spin" />
                  ) : (
                    <Send className="mr-3 size-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  )}
                  Submit
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
