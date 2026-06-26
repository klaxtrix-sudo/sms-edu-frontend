"use client";

import { useState, useEffect } from "react";
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
import { createParent } from "@/app/actions/parent-actions";
import { toast } from "sonner";

const parentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type ParentFormValues = z.infer<typeof parentSchema>;

interface AddParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email?: string) => void;
  schoolId: string;
  subdomain: string;
  initialEmail?: string;
}

export function AddParentModal({ isOpen, onClose, onSuccess, schoolId, subdomain, initialEmail }: AddParentModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ParentFormValues>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      fullName: "",
      email: initialEmail || "",
      phone: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialEmail) {
        form.setValue("email", initialEmail);
      } else {
        form.reset();
      }
    }
  }, [isOpen, initialEmail, form]);

  const onSubmit = async (values: ParentFormValues) => {
    setLoading(true);
    try {
      const result = await createParent({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone,
        schoolId,
        subdomain,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Parent account created.");
        form.reset();
        onSuccess(values.email);
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New Parent</DialogTitle>
            <DialogDescription>
              Create a new parent account. They will be able to log in with these credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...form.register("fullName")} placeholder="Jane Doe" />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="jane@example.com" />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...form.register("phone")} placeholder="08012345678" />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
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
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
