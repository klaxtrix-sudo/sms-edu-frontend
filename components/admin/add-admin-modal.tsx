"use client";

import { useState, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Copy, Check, Share2, Sparkles, CheckCircle2, Shield, UserCog } from "lucide-react";
import { createSubAdmin } from "@/app/actions/subadmin-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RolePreset {
  id: string;
  title: string;
  description: string;
  permissions: string[];
}

const ROLE_PRESETS: RolePreset[] = [
  {
    id: "bursar",
    title: "Bursar / Accounts Officer",
    description: "Manage fee structures, invoices, payment records, and financial analytics.",
    permissions: ["finance", "analytics"],
  },
  {
    id: "academic_officer",
    title: "Academic Officer / VP Academic",
    description: "Manage classrooms, subjects, timetables, exams, results, and attendance.",
    permissions: ["academics", "exams", "results", "attendance", "analytics"],
  },
  {
    id: "exam_officer",
    title: "Exam Officer / CBT Director",
    description: "Manage exams, CBT question studio, score compilation, and broadsheets.",
    permissions: ["exams", "results", "academics"],
  },
  {
    id: "admissions_officer",
    title: "Admissions Officer / Registrar",
    description: "Enroll students, manage student profiles, parent linkages, and promotions.",
    permissions: ["students", "parents", "academics"],
  },
  {
    id: "communications_officer",
    title: "Communications / PR Officer",
    description: "Publish school notices and send SMS/Email broadcasts.",
    permissions: ["communications"],
  },
  {
    id: "auditor",
    title: "Auditor / Financial Inspector",
    description: "Read-only access to financial records, invoices, transactions, and analytics.",
    permissions: ["finance:read", "analytics:read"],
  },
  {
    id: "custom",
    title: "Custom Administrator",
    description: "Select arbitrary module permissions manually.",
    permissions: [],
  },
];

const AVAILABLE_MODULES = [
  { id: "finance", label: "Fee & Finance Management", desc: "Fee structures, invoices, payment recording, receipts" },
  { id: "academics", label: "Classes, Subjects & Timetable", desc: "Classrooms, subjects, timetable scheduling, holidays" },
  { id: "students", label: "Student Admissions & Records", desc: "Student enrollment, profiles, promotions, and PIN resets" },
  { id: "teachers", label: "Teacher Staffing & Assignments", desc: "Teacher accounts, subject/class assignments, directory" },
  { id: "parents", label: "Parent Directory & Linkages", desc: "Parent accounts and student linking" },
  { id: "attendance", label: "Attendance Tracking", desc: "Daily student attendance marking and reports" },
  { id: "exams", label: "Examinations & CBT Studio", desc: "Exam papers, question authoring, CBT scheduling" },
  { id: "results", label: "Results & Broadsheets", desc: "Assessment scores, computations, broadsheets, report cards" },
  { id: "communications", label: "Announcements & Broadcasts", desc: "Noticeboard notices, SMS and email broadcasts" },
  { id: "analytics", label: "Institutional Analytics", desc: "School performance and enrollment statistics" },
  { id: "settings", label: "Institutional Settings", desc: "School profile, branding, academic calendar, integrations" },
];

const adminSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  customRoleTitle: z.string().min(2, "Role title is required"),
});

type AdminFormValues = z.infer<typeof adminSchema>;

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  subdomain: string;
}

export function AddAdminModal({ isOpen, onClose, onSuccess, schoolId, subdomain }: AddAdminModalProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("bursar");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["finance", "analytics"]);
  const [createdData, setCreatedData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    customRoleTitle: string;
    activationLink: string;
  } | null>(null);

  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      customRoleTitle: "Bursar / Accounts Officer",
    },
  });

  const handleSelectPreset = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.id !== "custom") {
      // Defer updating form title and multiple checkbox states to the next macro-task
      // so Radix Select can cleanly finish its dropdown closing animation and unmount
      setTimeout(() => {
        form.setValue("customRoleTitle", preset.title, { shouldValidate: true });
        setSelectedPermissions([...preset.permissions]);
      }, 0);
    }
  }, [form]);

  const isModuleChecked = (moduleId: string) => {
    return (
      selectedPermissions.includes(moduleId) ||
      selectedPermissions.includes(`${moduleId}:manage`) ||
      selectedPermissions.includes(`${moduleId}:read`)
    );
  };

  const getModuleScope = (moduleId: string): "manage" | "read" => {
    if (selectedPermissions.includes(`${moduleId}:read`)) return "read";
    return "manage";
  };

  const togglePermission = useCallback((moduleId: string) => {
    setSelectedPreset("custom");
    setSelectedPermissions((prev) => {
      const isSelected =
        prev.includes(moduleId) ||
        prev.includes(`${moduleId}:manage`) ||
        prev.includes(`${moduleId}:read`);

      if (isSelected) {
        return prev.filter(
          (p) => p !== moduleId && p !== `${moduleId}:manage` && p !== `${moduleId}:read`
        );
      } else {
        return [...prev, `${moduleId}:manage`];
      }
    });
  }, []);

  const setModuleScope = useCallback((moduleId: string, scope: "manage" | "read") => {
    setSelectedPreset("custom");
    setSelectedPermissions((prev) => {
      const filtered = prev.filter(
        (p) => p !== moduleId && p !== `${moduleId}:manage` && p !== `${moduleId}:read`
      );
      return [...filtered, `${moduleId}:${scope}`];
    });
  }, []);

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
      `Hello ${createdData.fullName},\n\nYou have been invited as an Administrator (${createdData.customRoleTitle}) on the Klaxtrix school portal. Click the link below to securely activate your account and choose your password:\n\n${createdData.activationLink}`
    );
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://api.whatsapp.com/send?text=${message}`;
    window.open(url, "_blank");
  };

  const onSubmit = async (values: AdminFormValues) => {
    if (selectedPermissions.length === 0) {
      toast.error("Please select at least one module permission for this administrator.");
      return;
    }

    setLoading(true);
    try {
      const result = await createSubAdmin({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        customRoleTitle: values.customRoleTitle,
        permissions: selectedPermissions,
        schoolId,
        subdomain,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Administrator account provisioned.");
        setCreatedData({
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          customRoleTitle: values.customRoleTitle,
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
      <DialogContent className="sm:max-w-[550px] p-0 flex flex-col max-h-[88vh] overflow-hidden rounded-[2rem] border border-border/80 bg-card text-card-foreground shadow-2xl">
        {createdData ? (
          <div className="space-y-5 p-6 md:p-8">
            <DialogHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold">Administrator Invited!</DialogTitle>
              <DialogDescription className="text-center text-xs">
                An invitation email has been dispatched to <strong className="text-foreground">{createdData.email}</strong> for the role of <strong className="text-primary">{createdData.customRoleTitle}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-xl bg-muted/40 p-4 border border-border/80">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Direct Activation Link
              </Label>
              <p className="text-[11px] text-muted-foreground">
                You can copy or share this one-time activation link directly with the staff member:
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
              <Button type="button" onClick={handleDone} className="w-full h-10 font-semibold rounded-xl">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-6 pb-4 shrink-0 border-b border-border/60">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <UserCog className="w-5 h-5" />
                  </div>
                  Invite Administrator / Sub-Admin
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Create a scoped administrative account with granular permissions. They will set their own password via the activation link.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="fullName" className="text-xs font-semibold">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="fullName" {...form.register("fullName")} placeholder="e.g. Samuel Adekunle" className="h-9 text-sm" />
                  {form.formState.errors.fullName && (
                    <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">Email Address <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" {...form.register("email")} placeholder="staff@school.edu.ng" className="h-9 text-sm" />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">Phone Number <span className="text-destructive">*</span></Label>
                  <Input id="phone" {...form.register("phone")} placeholder="08012345678" className="h-9 text-sm" />
                  {form.formState.errors.phone && (
                    <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Role Preset & Title */}
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Role Template Preset</span>
                    <span className="text-[10px] text-primary font-normal">Auto-fills permissions</span>
                  </Label>
                  <Select value={selectedPreset} onValueChange={handleSelectPreset}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose a preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_PRESETS.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customRoleTitle" className="text-xs font-semibold">Administrative Title <span className="text-destructive">*</span></Label>
                  <Input id="customRoleTitle" {...form.register("customRoleTitle")} placeholder="e.g. Bursar, Dean of Studies" className="h-9 text-sm" />
                  {form.formState.errors.customRoleTitle && (
                    <p className="text-xs text-destructive">{form.formState.errors.customRoleTitle.message}</p>
                  )}
                </div>
              </div>

              {/* Module Permissions Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    Authorized Modules ({selectedPermissions.length} selected)
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPermissions(AVAILABLE_MODULES.map((m) => `${m.id}:manage`))}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPermissions([])}
                      className="text-[10px] text-muted-foreground hover:underline font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {AVAILABLE_MODULES.map((module) => {
                    const isChecked = isModuleChecked(module.id);
                    const scope = getModuleScope(module.id);
                    return (
                      <div
                        key={module.id}
                        className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-colors select-none ${
                          isChecked ? "bg-primary/5 border-primary/30" : "bg-card border-border/60 hover:bg-muted/30"
                        }`}
                      >
                        <div
                          className="flex items-start gap-2.5 cursor-pointer"
                          onClick={() => togglePermission(module.id)}
                        >
                          <Checkbox
                            checked={isChecked}
                            className="mt-0.5 pointer-events-none"
                          />
                          <div className="space-y-0.5 flex-1">
                            <p className={`text-xs font-semibold ${isChecked ? "text-primary" : "text-foreground"}`}>
                              {module.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {module.desc}
                            </p>
                          </div>
                        </div>

                        {isChecked && (
                          <div className="flex items-center gap-2 pl-7 pt-1 border-t border-border/40">
                            <span className="text-[10px] font-medium text-muted-foreground">Scope:</span>
                            <div className="inline-flex rounded-md p-0.5 bg-muted/60 text-[10px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModuleScope(module.id, "manage");
                                }}
                                className={`px-2 py-0.5 rounded font-medium transition-all ${
                                  scope === "manage"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Full Control (Manage)
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModuleScope(module.id, "read");
                                }}
                                className={`px-2 py-0.5 rounded font-medium transition-all ${
                                  scope === "read"
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                View Only (Auditor)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 pt-3 border-t border-border/60 shrink-0 bg-card">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={loading} className="rounded-xl font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2 rounded-xl font-semibold bg-primary hover:bg-primary/90 shadow-md">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Administrator Invitation
                </Button>
              </DialogFooter>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
