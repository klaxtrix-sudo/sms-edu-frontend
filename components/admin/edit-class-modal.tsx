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
import { updateClass, getTeachers } from "@/app/actions/admin-actions";
import { toast } from "sonner";
import { useParams } from "next/navigation";

const classSchema = z.object({
  name: z.string().min(2, "Class name must be at least 2 characters"),
  teacherId: z.string().optional().nullable(),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  initialData: {
    id: string;
    name: string;
    teacherId?: string | null;
  };
}

export function EditClassModal({ isOpen, onClose, onSuccess, schoolId, initialData }: EditClassModalProps) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const params = useParams();
  const subdomain = params?.subdomain as string;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: initialData.name,
      teacherId: initialData.teacherId || "",
    },
  });

  // Re-populate form when initialData changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: initialData.name,
        teacherId: initialData.teacherId || "",
      });
    }
  }, [isOpen, initialData, form]);

  useEffect(() => {
    if (isOpen && schoolId && subdomain) {
      const fetchTeachersData = async () => {
        const result = await getTeachers(schoolId, subdomain);
        if (result.success) {
          setTeachers(result.data || []);
        } else {
          toast.error(result.error || "Failed to load teachers");
        }
      };
      fetchTeachersData();
    }
  }, [isOpen, schoolId, subdomain]);

  const onSubmit = async (values: ClassFormValues) => {
    setLoading(true);
    try {
      const result = await updateClass(initialData.id, {
        name: values.name,
        teacherId: values.teacherId === "" ? null : values.teacherId
      }, subdomain);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Class updated successfully!");
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
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-2 border-primary/20 bg-white shadow-2xl">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-black tracking-tighter text-slate-900 outfit-heading">Edit Class</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Modify class details and assigned teacher.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Class Name</Label>
              <Input 
                id="edit-name" 
                {...form.register("name")} 
                placeholder="e.g. JSS 1 Gold" 
                className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors"
                autoComplete="off"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive font-medium">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-teacherId" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Class Teacher (Optional)</Label>
              <Select 
                onValueChange={(val) => form.setValue("teacherId", val === "none" ? "" : val)}
                defaultValue={initialData.teacherId || "none"}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors">
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (No Teacher Assigned)</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="flex-1 h-11 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 h-11 rounded-xl gradient-brand shadow-lg shadow-primary/20 text-white font-bold"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
