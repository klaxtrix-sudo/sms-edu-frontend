"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteStudent } from "@/app/actions/admin-actions";

interface DeleteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  subdomain: string;
  onSuccess: () => void;
}

export function DeleteStudentModal({
  isOpen,
  onClose,
  student,
  subdomain,
  onSuccess,
}: DeleteStudentModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!student) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteStudent({
        studentId: student.id,
        userId: student.user_id,
        subdomain,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Removed student ${student.profiles?.full_name || ""}`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete student.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border-none shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="size-6" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900">
            Remove Student Record?
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-600 leading-relaxed">
            Are you sure you want to remove{" "}
            <span className="font-bold text-slate-900">
              {student.profiles?.full_name || student.admission_no}
            </span>{" "}
            ({student.admission_no}) from the student body? This action removes
            their academic enrollment record and linked student login profile.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
            className="font-bold flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="font-bold flex-1"
          >
            {deleting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Confirm Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
