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
import { deleteSubject } from "@/app/actions/admin-actions";
import { toast } from "sonner";
import { useParams } from "next/navigation";

interface DeleteSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subjectData: {
    id: string;
    name: string;
    code?: string;
  } | null;
}

export function DeleteSubjectModal({ isOpen, onClose, onSuccess, subjectData }: DeleteSubjectModalProps) {
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const subdomain = params?.subdomain as string;

  if (!subjectData) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteSubject(subjectData.id, subdomain);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Subject "${subjectData.name}" deleted.`);
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during deletion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border border-destructive/20 bg-card text-card-foreground shadow-2xl rounded-[2rem]">
        <DialogHeader className="p-6 pb-0 flex flex-row items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <DialogTitle className="text-xl font-black tracking-tighter text-foreground outfit-heading">Delete Subject</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1 text-xs font-medium">
              This action cannot be undone.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Are you sure you want to delete <span className="font-black text-foreground">"{subjectData.name}"</span> {subjectData.code && <span className="font-mono text-xs font-bold text-muted-foreground/80">({subjectData.code})</span>}?
          </p>
          <p className="text-xs text-muted-foreground mt-3 bg-muted/40 border border-border p-3 rounded-xl">
            <strong className="text-foreground">Security Guard:</strong> The system prevents deleting subjects that have historical student exam results or active classroom assignments.
          </p>
        </div>

        <DialogFooter className="p-6 pt-0 flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="flex-1 h-11 rounded-xl border-border hover:bg-muted text-muted-foreground hover:text-foreground font-bold text-xs"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs transition-all shadow-lg shadow-destructive/20"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
