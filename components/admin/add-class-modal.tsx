"use client";

import { useEffect, useState } from "react";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createClass } from "@/app/actions/admin-actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const classSchema = z.object({
  name: z.string().min(2, "Class name must be at least 2 characters"),
  teacherId: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
}

export function AddClassModal({ isOpen, onClose, onSuccess, schoolId }: AddClassModalProps) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const supabase = createClient();

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      teacherId: "",
    },
  });

  useEffect(() => {
    if (isOpen && schoolId) {
      const fetchTeachers = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("school_id", schoolId)
          .eq("role", "teacher")
          .order("full_name");
        setTeachers(data || []);
      };
      fetchTeachers();
    }
  }, [isOpen, schoolId, supabase]);

  const onSubmit = async (values: ClassFormValues) => {
    setLoading(true);
    try {
      const result = await createClass({
        ...values,
        schoolId,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Class created successfully!");
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
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
            <DialogDescription>
              Create a new class and optionally assign a class teacher.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input id="name" {...form.register("name")} placeholder="e.g. JSS 1 Gold" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherId">Class Teacher (Optional)</Label>
              <Select onValueChange={(val) => form.setValue("teacherId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Class
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
