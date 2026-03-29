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
import { createStudent } from "@/app/actions/admin-actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  admissionNo: z.string().min(3, "Admission number is required"),
  classId: z.string().min(1, "Class is required"),
  gender: z.enum(["male", "female"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  subdomain: string;
}

export function AddStudentModal({ isOpen, onClose, onSuccess, schoolId, subdomain }: AddStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const supabase = createClient();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: "",
      email: "",
      admissionNo: "",
      classId: "",
      gender: "male",
      password: "",
    },
  });

  useEffect(() => {
    if (isOpen && schoolId) {
      const fetchClasses = async () => {
        const { data } = await supabase
          .from("classes")
          .select("id, name")
          .eq("school_id", schoolId)
          .order("name");
        setClasses(data || []);
      };
      fetchClasses();
    }
  }, [isOpen, schoolId, supabase]);

  const onSubmit = async (values: StudentFormValues) => {
    setLoading(true);
    try {
      const result = await createStudent({
        ...values,
        schoolId,
        subdomain,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Student enrolled successfully!");
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Enroll New Student</DialogTitle>
            <DialogDescription>
              Create a student account and assign them to a class.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...form.register("fullName")} placeholder="Jane Doe" />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="email">Parent Email (for login)</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="parent@example.com" />
              <p className="text-[10px] text-muted-foreground italic">Students log in using their parent's email initially.</p>
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="admissionNo">Admission No</Label>
              <Input id="admissionNo" {...form.register("admissionNo")} placeholder="STD/2024/001" />
              {form.formState.errors.admissionNo && (
                <p className="text-xs text-destructive">{form.formState.errors.admissionNo.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select onValueChange={(val) => form.setValue("gender", val as any)} defaultValue="male">
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classId">Class</Label>
              <Select onValueChange={(val) => form.setValue("classId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                  {classes.length === 0 && (
                    <SelectItem value="none" disabled>No classes found. Add classes in Settings.</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.classId && (
                <p className="text-xs text-destructive">{form.formState.errors.classId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Login Password</Label>
              <Input id="password" type="password" {...form.register("password")} placeholder="••••••••" />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enroll Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
