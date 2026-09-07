"use client";

import { useState, useEffect } from "react";
import { Loader2, Receipt, Banknote } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordManualPayment } from "@/app/actions/finance-actions";
import { useTenant } from "@/components/providers/tenant-provider";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { formatNGN } from "@/lib/utils";

const formSchema = z.object({
  studentId: z.string().uuid("Please select a student"),
  feeStructureId: z.string().uuid("Please select a fee structure"),
  amount: z.string().min(1, "Amount is required"),
  channel: z.enum(["cash", "pos", "bank_deposit"]),
  senderName: z.string().optional(),
  bankReference: z.string().optional(),
  notes: z.string().optional(),
});

interface RecordManualPaymentModalProps {
  onSuccess: () => void;
  feeStructures: any[];
}

export function RecordManualPaymentModal({
  onSuccess,
  feeStructures,
}: RecordManualPaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const { tenant, supabase } = useTenant();
  const params = useParams();
  const subdomain = (params?.subdomain as string) || tenant?.subdomain || "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      feeStructureId: "",
      amount: "",
      channel: "cash",
      senderName: "",
      bankReference: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open && supabase && tenant?.id) {
      setLoadingStudents(true);
      supabase
        .from("students")
        .select(`
          id,
          admission_no,
          class_id,
          classes(name),
          profiles!students_user_id_fkey(full_name)
        `)
        .eq("school_id", tenant.id)
        .order("admission_no")
        .then(({ data, error }) => {
          if (!error && data) setStudents(data);
          setLoadingStudents(false);
        });
    }
  }, [open, supabase, tenant?.id]);

  // When a fee structure is selected, autofill the amount
  const selectedFeeId = form.watch("feeStructureId");
  useEffect(() => {
    if (selectedFeeId) {
      const match = feeStructures.find((fs) => fs.id === selectedFeeId);
      if (match) {
        form.setValue("amount", String(match.amount));
      }
    }
  }, [selectedFeeId, feeStructures, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const res = await recordManualPayment(subdomain, {
        studentId: values.studentId,
        feeStructureId: values.feeStructureId,
        amount: Number(values.amount),
        channel: values.channel,
        senderName: values.senderName,
        bankReference: values.bankReference,
        notes: values.notes,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`Payment recorded! Ref: ${res.reference}`);
      setOpen(false);
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-bold rounded-2xl h-11 px-4 border-white/10 hover:bg-white/10 gap-2">
          <Banknote className="size-4 text-emerald-400" />
          Record Bursary Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px] rounded-3xl p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Receipt className="size-4" />
            </span>
            <DialogTitle className="text-xl font-black">Record Offline Payment</DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground">
            Log Cash, POS terminal, or counter deposit payments received at the school bursary.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-11 font-medium bg-muted/30">
                        <SelectValue placeholder={loadingStudents ? "Loading students..." : "Select Student"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl max-h-60">
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.profiles?.full_name || "Unknown"} ({s.admission_no}) • {s.classes?.name || "No Class"}
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
              name="feeStructureId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fee Item</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-11 font-medium bg-muted/30">
                        <SelectValue placeholder="Select Fee Structure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl max-h-60">
                      {feeStructures.map((fs) => (
                        <SelectItem key={fs.id} value={fs.id}>
                          {fs.name} ({fs.classes?.name || "All"}) — {formatNGN(fs.amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount Paid (₦)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="50000" 
                        className="rounded-xl h-11 font-black bg-muted/30" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11 font-medium bg-muted/30">
                          <SelectValue placeholder="Select Method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="cash">💵 Cash (Counter)</SelectItem>
                        <SelectItem value="pos">💳 POS Terminal</SelectItem>
                        <SelectItem value="bank_deposit">🏛️ Direct Bank Deposit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="senderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payer Name (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Mrs. Adeyemi (Parent)" 
                        className="rounded-xl h-11 font-medium bg-muted/30" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">POS / Bank Slip Ref</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. POS-98741 or Deposit Ref" 
                        className="rounded-xl h-11 font-mono text-xs bg-muted/30" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Receipt Remarks / Notes</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Balance to be cleared next week" 
                      className="rounded-xl h-11 text-xs bg-muted/30" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Confirm & Issue Receipt
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
