"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Loader2, 
  Edit3,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { updateTeacher } from "@/app/actions/admin-actions";
import { createTenantClient } from "@/lib/supabase/client";

interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: any;
  classes?: { id: string; name: string }[];
  subdomain: string;
  schoolId?: string;
  onSuccess: () => void;
}

export function EditTeacherModal({
  isOpen,
  onClose,
  teacher,
  classes: initialClasses = [],
  subdomain,
  schoolId,
  onSuccess,
}: EditTeacherModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formClassId, setFormClassId] = useState<string>("none");
  const [classes, setClasses] = useState<{ id: string; name: string }[]>(initialClasses);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createTenantClient();

  useEffect(() => {
    if (isOpen && teacher) {
      setFullName(teacher.full_name || "");
      setEmail(teacher.email || "");
      setPhone(teacher.phone || "");

      // Fetch teacher's current form class and classes list
      const loadData = async () => {
        setIsLoadingClasses(true);
        try {
          // 1. Fetch current form class for this teacher
          const { data: formClass } = await supabase
            .from("classes")
            .select("id, name")
            .eq("class_teacher_id", teacher.id)
            .maybeSingle();

          if (formClass?.id) {
            setFormClassId(formClass.id);
          } else {
            setFormClassId("none");
          }

          // 2. If classes were not passed in, fetch all classes
          if (classes.length === 0) {
            const { data: allClasses } = await supabase
              .from("classes")
              .select("id, name")
              .order("name");

            if (allClasses) {
              setClasses(allClasses);
            }
          }
        } catch (err) {
          console.error("[EditTeacherModal] Error loading class data:", err);
        } finally {
          setIsLoadingClasses(false);
        }
      };

      loadData();
    }
  }, [isOpen, teacher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Teacher full name is required.");
      return;
    }

    if (!email.trim()) {
      toast.error("Email address is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateTeacher(
        teacher.id,
        {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          formClassId: formClassId === "none" ? null : formClassId,
        },
        subdomain,
        schoolId
      );

      if (res.success) {
        toast.success("Teacher profile updated successfully.");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to update teacher profile.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto border-border/80 bg-card text-card-foreground shadow-2xl p-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary z-50" />

        <form onSubmit={handleSubmit}>
          <div className="p-6 sm:p-8 space-y-6">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                  <Edit3 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-heading font-black tracking-tight text-foreground">
                    Edit Teacher Profile
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-medium">
                    Update faculty member information, contact details, and classroom leadership.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="teacher-full-name" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" /> Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="teacher-full-name"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSaving}
                  required
                  className="h-10 rounded-xl bg-background/50 border-border/80 text-xs"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="teacher-email" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-primary" /> Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="teacher-email"
                  type="email"
                  placeholder="teacher@school.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSaving}
                  required
                  className="h-10 rounded-xl bg-background/50 border-border/80 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Used for sign-in and system notifications. Updating will sync credentials.
                </p>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label htmlFor="teacher-phone" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Phone className="size-3.5 text-primary" /> Phone Number
                </Label>
                <Input
                  id="teacher-phone"
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSaving}
                  className="h-10 rounded-xl bg-background/50 border-border/80 text-xs"
                />
              </div>

              {/* Form Class Leadership */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="teacher-form-class" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" /> Form Class (Class Teacher)
                </Label>
                <Select
                  value={formClassId}
                  onValueChange={setFormClassId}
                  disabled={isSaving || isLoadingClasses}
                >
                  <SelectTrigger id="teacher-form-class" className="h-10 rounded-xl bg-background/50 border-border/80 text-xs">
                    <SelectValue placeholder="Select assigned form class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      No Class Assigned (Subject Teacher Only)
                    </SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id} className="text-xs">
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Assigning a form class grants this teacher primary attendance and roster leadership for that class.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-border/60 bg-muted/20 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 px-4 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-10 px-5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
