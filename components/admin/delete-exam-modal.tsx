"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";

interface DeleteExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  exam: {
    _id: string;
    title: string;
    questionCount?: number;
  } | null;
}

export function DeleteExamModal({ isOpen, onClose, onSuccess, exam }: DeleteExamModalProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (!exam) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const res = await fetch(`${getBackendUrl()}/exams/${exam._id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Failed to delete exam paper");

      toast.success(`Exam paper "${exam.title}" deleted.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "An error occurred during deletion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border border-destructive/20 bg-card text-card-foreground shadow-2xl rounded-[2rem]">
        <DialogHeader className="p-6 pb-0 flex flex-row items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
              Delete Exam Paper
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-0.5 text-xs font-medium">
              This action permanently deletes this examination.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-foreground/90 leading-relaxed font-medium">
            Are you sure you want to delete <span className="font-bold text-foreground">"{exam.title}"</span>?
          </p>
          <div className="text-xs text-muted-foreground bg-muted/40 border border-border p-3.5 rounded-2xl space-y-1.5 leading-relaxed">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Trash2 className="size-3.5 text-destructive" /> Deletion Scope:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>All authored questions and diagrams in Question Studio will be removed.</li>
              <li>Any linked exam timetable slots on the schedule will be cleared.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="p-6 pt-3 bg-muted/20 border-t border-border flex flex-row justify-end gap-2.5">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="rounded-xl px-5 h-10 font-bold text-xs"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={loading}
            className="rounded-xl px-6 h-10 font-bold text-xs shadow-md shadow-destructive/20"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Exam Paper
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
