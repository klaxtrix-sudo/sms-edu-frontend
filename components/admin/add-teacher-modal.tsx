"use client";

import { useState } from "react";
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
import { Loader2, Copy, Check, Share2, Sparkles, CheckCircle2 } from "lucide-react";
import { createTeacher } from "@/app/actions/admin-actions";
import { toast } from "sonner";

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  subdomain: string;
}

export function AddTeacherModal({ isOpen, onClose, onSuccess, schoolId, subdomain }: AddTeacherModalProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdData, setCreatedData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    activationLink: string;
  } | null>(null);

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
    },
  });

  const handleCloseModal = () => {
    if (loading) return;
    setCreatedData(null);
    setCopied(false);
    form.reset();
    onClose();
  };

  const handleDone = () => {
    setCreatedData(null);
    setCopied(false);
    form.reset();
    onSuccess();
    onClose();
  };

  const handleCopyLink = async () => {
    if (!createdData?.activationLink) return;
    try {
      await navigator.clipboard.writeText(createdData.activationLink);
      setCopied(true);
      toast.success("Activation link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareWhatsApp = () => {
    if (!createdData) return;
    const cleanPhone = createdData.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hello ${createdData.fullName},\n\nYour teacher account on Klaxtrix portal has been created. Click the link below to securely activate your account and choose your password:\n\n${createdData.activationLink}`
    );
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://api.whatsapp.com/send?text=${message}`;
    window.open(url, "_blank");
  };

  const onSubmit = async (values: TeacherFormValues) => {
    setLoading(true);
    try {
      const result = await createTeacher({
        email: values.email,
        fullName: values.fullName,
        phone: values.phone,
        schoolId,
        subdomain,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Teacher account created.");
        setCreatedData({
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          activationLink: result.activationLink || "",
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="sm:max-w-[450px]">
        {createdData ? (
          <div className="space-y-5 py-2">
            <DialogHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl">Teacher Account Created!</DialogTitle>
              <DialogDescription className="text-center text-xs">
                An invitation email has been dispatched to <strong className="text-foreground">{createdData.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-xl bg-muted/40 p-4 border border-border/80">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Direct Activation Link
              </Label>
              <p className="text-[11px] text-muted-foreground">
                You can also share this one-time link directly with the teacher to activate their account immediately:
              </p>

              <div className="flex items-center gap-2 mt-2">
                <Input
                  readOnly
                  value={createdData.activationLink}
                  className="text-xs bg-background h-9 font-mono selection:bg-primary/20"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="h-9 px-3 shrink-0 gap-1.5 font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="w-full h-9 gap-2 text-xs font-semibold bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400 border border-emerald-600/20"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share via WhatsApp
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" onClick={handleDone} className="w-full h-10 font-semibold">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Add New Teacher</DialogTitle>
              <DialogDescription>
                Register a new teacher. A secure activation link will be generated for them to choose their password.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" {...form.register("fullName")} placeholder="e.g. Emeka Nnamdi" />
                {form.formState.errors.fullName && (
                  <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...form.register("email")} placeholder="e.g. teacher@school.edu.ng" />
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
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span>Zero-password invitation: The teacher creates their own password upon opening the activation link.</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
