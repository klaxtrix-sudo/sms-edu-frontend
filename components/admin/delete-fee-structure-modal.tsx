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
import { Loader2, AlertTriangle, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { deleteFeeStructure } from "@/app/actions/finance-actions";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { formatNGN } from "@/lib/utils";

interface DeleteFeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  feeStructure: {
    id: string;
    name: string;
    amount: number;
    classes?: { name: string };
    totalCollected?: number;
    uniqueStudentsPaid?: number;
  } | null;
}

export function DeleteFeeStructureModal({
  isOpen,
  onClose,
  onSuccess,
  feeStructure,
}: DeleteFeeStructureModalProps) {
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const subdomain = params?.subdomain as string;

  if (!feeStructure) return null;

  const hasPayments = (feeStructure.uniqueStudentsPaid || 0) > 0 || (feeStructure.totalCollected || 0) > 0;

  const handleDelete = async () => {
    if (hasPayments) {
      toast.error("Deletion blocked: this fee structure has active payments linked to it.");
      return;
    }

    setLoading(true);
    try {
      const result = await deleteFeeStructure(subdomain, feeStructure.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Fee structure "${feeStructure.name}" deleted.`);
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
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-2 border-destructive/20 bg-background shadow-2xl rounded-3xl">
        <DialogHeader className="p-6 pb-2 flex flex-row items-center gap-4">
          <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
            hasPayments ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"
          }`}>
            {hasPayments ? <ShieldAlert className="size-6" /> : <AlertTriangle className="size-6" />}
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-xl font-black tracking-tight">
              {hasPayments ? "Cannot Delete Fee Structure" : "Delete Fee Structure"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {hasPayments ? "Audit trail & ledger protection active" : "This action cannot be undone."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fee Item</p>
            <p className="font-extrabold text-foreground text-base">{feeStructure.name}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <span>Class: <strong className="text-foreground">{feeStructure.classes?.name || "General"}</strong></span>
              <span>•</span>
              <span>Amount: <strong className="text-foreground">{formatNGN(feeStructure.amount)}</strong></span>
            </div>
          </div>

          {hasPayments ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-2">
              <p className="text-xs font-bold leading-relaxed">
                ⚠️ This fee structure has <strong>{feeStructure.uniqueStudentsPaid} recorded payment(s)</strong> totaling <strong>{formatNGN(feeStructure.totalCollected || 0)}</strong>.
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                To protect accounting integrity and prevent accidental data loss, fee structures with recorded payments cannot be deleted. If fees have changed, edit the fee structure or create a new one for upcoming terms instead.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this fee structure? No payments are currently linked to this fee item.
            </p>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="flex-1 h-12 rounded-2xl font-bold"
          >
            {hasPayments ? "Close" : "Cancel"}
          </Button>

          {!hasPayments && (
            <Button 
              onClick={handleDelete} 
              disabled={loading}
              className="flex-1 h-12 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-bold transition-all shadow-lg shadow-destructive/20"
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Confirm Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
