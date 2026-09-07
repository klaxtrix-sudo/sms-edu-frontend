"use client";

import { useState, useEffect } from "react";
import { Loader2, Edit3 } from "lucide-react";
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
import { updateFeeStructure } from "@/app/actions/finance-actions";
import { useParams } from "next/navigation";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Name is required").max(100, "Name too long"),
  classId: z.string().min(1, "Class is required"),
  amount: z.string().min(1, "Amount is required"),
  academicYear: z.string().min(4, "Academic year is required"),
  term: z.string().min(1, "Term is required"),
});

interface EditFeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  feeStructure: {
    id: string;
    name: string;
    class_id: string;
    amount: number;
    academic_year: string;
    term: number;
  } | null;
  classes: Array<{ id: string; name: string }>;
}

export function EditFeeStructureModal({
  isOpen,
  onClose,
  onSuccess,
  feeStructure,
  classes,
}: EditFeeStructureModalProps) {
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const subdomain = params?.subdomain as string;

  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 5 }, (_, i) => {
    const start = currentYear - 2 + i;
    return `${start}/${start + 1}`;
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      classId: "",
      amount: "",
      academicYear: `${currentYear}/${currentYear + 1}`,
      term: "1",
    },
  });

  useEffect(() => {
    if (feeStructure && isOpen) {
      form.reset({
        name: feeStructure.name,
        classId: feeStructure.class_id,
        amount: String(feeStructure.amount),
        academicYear: feeStructure.academic_year,
        term: String(feeStructure.term),
      });
    }
  }, [feeStructure, isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!feeStructure) return;
    setLoading(true);
    try {
      const res = await updateFeeStructure(subdomain, feeStructure.id, {
        name: values.name,
        classId: values.classId,
        amount: Number(values.amount),
        academicYear: values.academicYear,
        term: Number(values.term),
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Fee structure updated successfully.");
      onClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update fee structure");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-7">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Edit3 className="size-4" />
            </span>
            <DialogTitle className="text-xl font-black">Edit Fee Structure</DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground">
            Update fee name, amount, or academic term.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fee Title</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl h-11 font-medium bg-muted/30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11 font-medium bg-muted/30">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl max-h-60">
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₦)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        className="rounded-xl h-11 font-black bg-muted/30" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Academic Year</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11 font-medium bg-muted/30">
                          <SelectValue placeholder="Select Session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl">
                        {academicYears.map((yr) => (
                          <SelectItem key={yr} value={yr} className="font-semibold">
                            {yr}
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
                name="term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Term</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11 font-medium bg-muted/30">
                          <SelectValue placeholder="Select Term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="1" className="font-semibold">1st Term</SelectItem>
                        <SelectItem value="2" className="font-semibold">2nd Term</SelectItem>
                        <SelectItem value="3" className="font-semibold">3rd Term</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 sm:pt-6 flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-12 rounded-2xl font-bold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                className="flex-1 h-12 rounded-2xl font-black shadow-md"
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
