"use client";

import { useEffect, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
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
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  User, 
  Search, 
  Loader2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { createTenantClient } from "@/lib/supabase/client";
import { getClassSubjectTeachers, saveClassSubjectAssignments } from "@/app/actions/admin-actions";
import { toast } from "sonner";

interface ManageSubjectTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  classData: { id: string; name: string } | null;
  subjects: any[];
  schoolId: string;
  subdomain: string;
}

export function ManageSubjectTeachersModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  classData,
  subjects,
  schoolId,
  subdomain
}: ManageSubjectTeachersModalProps) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // subject_id -> teacher_id
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const supabase = createTenantClient();

  useEffect(() => {
    if (isOpen && classData?.id) {
      fetchTeachersAndAssignments();
    }
  }, [isOpen, classData?.id]);

  const fetchTeachersAndAssignments = async () => {
    if (!classData?.id) return;
    setLoading(true);
    try {
      // 1. Fetch all active teachers in parallel
      const [{ data: teacherData }, assignmentsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "teacher")
          .eq("is_archived", false)
          .order("full_name"),
        getClassSubjectTeachers(classData.id, subdomain)
      ]);

      setTeachers(teacherData || []);

      // 2. Map existing assignments
      if (assignmentsRes.success && assignmentsRes.data) {
        const map: Record<string, string> = {};
        assignmentsRes.data.forEach((a: any) => {
          map[a.subject_id] = a.teacher_id;
        });
        setAssignments(map);
      } else if (assignmentsRes.error) {
        throw new Error(assignmentsRes.error);
      }
    } catch (error: any) {
      console.error("Error loading teachers/assignments:", error);
      toast.error(error.message || "Failed to load assignment details");
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherChange = (subjectId: string, teacherId: string) => {
    setAssignments(prev => ({
      ...prev,
      [subjectId]: teacherId === "none" ? "" : teacherId
    }));
  };

  const handleSave = async () => {
    if (!classData?.id) return;
    setSaving(true);
    try {
      const payload = Object.entries(assignments).map(([subjectId, teacherId]) => ({
        subjectId,
        teacherId: teacherId || null
      }));

      const res = await saveClassSubjectAssignments(classData.id, payload, schoolId, subdomain);
      if (res.error) throw new Error(res.error);

      toast.success("Subject teacher assignments updated!");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!classData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-0 border-none shadow-2xl bg-card rounded-[2rem] overflow-hidden">
        {/* Top Accent line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        
        {/* Header Area */}
        <div className="p-6 md:p-8 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600 shadow-sm">
                <BookOpen className="size-5" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">
                Subject Teachers: {classData.name}
              </DialogTitle>
            </div>
            <DialogDescription className="font-medium text-slate-400">
              Assign specialized educators to curriculum subjects for this classroom.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative mt-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input 
              placeholder="Search subjects by name or code..."
              className="pl-9 h-11 border-slate-200/80 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus-visible:ring-1 text-sm font-semibold placeholder:font-normal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable list of subjects */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-4 space-y-3 min-h-[250px] max-h-[40vh] custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold text-slate-400">Syncing assignments...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-16 text-center text-slate-400 italic font-semibold text-sm">
              No subjects found matching your search.
            </div>
          ) : (
            filteredSubjects.map((subject) => {
              const assignedTeacherId = assignments[subject.id] || "";
              const isAssigned = !!assignedTeacherId;
              
              return (
                <div 
                  key={subject.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/40 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/80 rounded-2xl transition-all"
                >
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-800 leading-tight">
                        {subject.name}
                      </p>
                      <Badge variant="outline" className="font-mono bg-white text-slate-500 border-slate-200/80 font-bold px-2 py-0.5 text-[9px]">
                        {subject.code}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {isAssigned ? (
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="size-2.5" /> Assigned
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="size-2.5" /> Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full sm:w-[220px]">
                    <Select 
                      value={assignedTeacherId || "none"} 
                      onValueChange={(val) => handleTeacherChange(subject.id, val)}
                    >
                      <SelectTrigger className="w-full h-10 bg-white border-slate-200/80 rounded-xl text-xs font-semibold shadow-sm focus:ring-0">
                        <SelectValue placeholder="Assign teacher..." />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200">
                        <SelectItem value="none" className="text-xs font-bold text-slate-500">Unassigned</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs font-semibold">
                            {t.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-[2rem]">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="h-11 rounded-xl text-xs font-black uppercase tracking-widest px-6"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="h-11 rounded-xl text-xs font-black uppercase tracking-widest px-8 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" /> Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
