"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Shield, UserCog } from "lucide-react";
import { updateAdminPermissions } from "@/app/actions/subadmin-actions";
import { toast } from "sonner";

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

interface EditAdminPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminUser: any;
  subdomain: string;
}

export function EditAdminPermissionsModal({
  isOpen,
  onClose,
  onSuccess,
  adminUser,
  subdomain,
}: EditAdminPermissionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (adminUser) {
      setCustomRoleTitle(adminUser.custom_role_title || "Sub-Admin");
      setSelectedPermissions(Array.isArray(adminUser.permissions) ? adminUser.permissions : []);
    }
  }, [adminUser]);

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

  const togglePermission = (moduleId: string) => {
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
  };

  const setModuleScope = (moduleId: string, scope: "manage" | "read") => {
    setSelectedPermissions((prev) => {
      const filtered = prev.filter(
        (p) => p !== moduleId && p !== `${moduleId}:manage` && p !== `${moduleId}:read`
      );
      return [...filtered, `${moduleId}:${scope}`];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;

    if (!customRoleTitle.trim()) {
      toast.error("Administrative role title cannot be empty.");
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error("Please assign at least one module permission.");
      return;
    }

    setLoading(true);
    try {
      const result = await updateAdminPermissions(
        adminUser.id,
        {
          customRoleTitle: customRoleTitle.trim(),
          permissions: selectedPermissions,
        },
        subdomain
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Permissions updated for ${adminUser.full_name}.`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update permissions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 flex flex-col max-h-[88vh] overflow-hidden rounded-[2rem] border border-border/80 bg-card text-card-foreground shadow-2xl">
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 pb-4 shrink-0 border-b border-border/60">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <UserCog className="w-5 h-5" />
                </div>
                Edit Permissions
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Modify assigned modules for <strong className="text-foreground">{adminUser?.full_name}</strong> ({adminUser?.email}).
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-title" className="text-xs font-semibold">Administrative Title</Label>
              <Input
                id="edit-role-title"
                value={customRoleTitle}
                onChange={(e) => setCustomRoleTitle(e.target.value)}
                placeholder="e.g. Bursar, Academic Officer"
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Granted Modules ({selectedPermissions.length} selected)
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
              <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="rounded-xl font-semibold">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2 rounded-xl font-semibold bg-primary hover:bg-primary/90 shadow-md">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Permissions
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
