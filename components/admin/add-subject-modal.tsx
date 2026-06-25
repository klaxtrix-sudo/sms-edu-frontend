"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createSubject } from "@/app/actions/admin-actions";
import { toast } from "sonner";
import { useParams } from "next/navigation";

const subjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters"),
  code: z.string().min(2, "Subject code is required (e.g. MATH)"),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
}

export function AddSubjectModal({ isOpen, onClose, onSuccess, schoolId }: AddSubjectModalProps) {
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const subdomain = params?.subdomain as string;

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const onSubmit = async (values: SubjectFormValues) => {
    setLoading(true);
    try {
      const result = await createSubject({
        ...values,
        schoolId,
        subdomain,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subject added.");
        form.reset();
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-2 border-primary/20 bg-white">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-black tracking-tighter text-slate-900">Add New Subject</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Define a new subject in the school curriculum.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Subject Name</Label>
              <Input 
                id="name" 
                {...form.register("name")} 
                placeholder="e.g. Mathematics" 
                className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive font-medium">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Subject Code</Label>
              <Input 
                id="code" 
                {...form.register("code")} 
                placeholder="e.g. MATH" 
                className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors uppercase"
              />
              {form.formState.errors.code && (
                <p className="text-xs text-destructive font-medium">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="flex-1 h-11 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 h-11 rounded-xl gradient-brand shadow-lg shadow-primary/20 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Subject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
