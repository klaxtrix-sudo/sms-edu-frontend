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
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Search, 
  Loader2, 
  Save, 
  X,
  Plus,
  ChevronDown
} from "lucide-react";
import { createTenantClient } from "@/lib/supabase/client";
import { getClassSubjectTeachers, saveClassSubjectAssignments } from "@/app/actions/admin-actions";
import { toast } from "sonner";

interface SubjectSearchSelectProps {
  subjects: any[];
  selectedSubjectId: string;
  onSelect: (subjectId: string) => void;
  disabledSubjects: string[];
}

function SubjectSearchSelect({ subjects, selectedSubjectId, onSelect, disabledSubjects }: SubjectSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  
  useEffect(() => {
    setSearch(selectedSubject ? `${selectedSubject.name} (${selectedSubject.code})` : "");
  }, [selectedSubjectId, subjects]);

  const filtered = subjects.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <div 
        className="relative flex items-center bg-white border border-slate-200/80 rounded-xl px-3 py-2 cursor-pointer shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20"
        onClick={() => setIsOpen(true)}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setSearch(""); // Clear on focus to allow fresh searching
            setIsOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              const current = subjects.find(s => s.id === selectedSubjectId);
              setSearch(current ? `${current.name} (${current.code})` : "");
              setIsOpen(false);
            }, 200);
          }}
          placeholder="Select Subject..."
          className="w-full bg-transparent border-none text-xs font-semibold focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
        />
        <ChevronDown className="size-4 text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-[200px] overflow-y-auto custom-scrollbar p-1">
          {filtered.length === 0 ? (
            <div className="py-2.5 px-3 text-xs text-slate-400 italic">No matches found</div>
          ) : (
            filtered.map((s) => {
              const isDisabled = disabledSubjects.includes(s.id) && s.id !== selectedSubjectId;
              return (
                <div
                  key={s.id}
                  onMouseDown={() => {
                    if (!isDisabled) {
                      onSelect(s.id);
                      setIsOpen(false);
                    }
                  }}
                  className={`flex items-center justify-between py-2 px-3 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                    s.id === selectedSubjectId 
                      ? "bg-indigo-50 text-indigo-600" 
                      : isDisabled
                      ? "opacity-40 cursor-not-allowed bg-slate-50"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="font-mono text-[9px] opacity-60">{s.code}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface AssignmentRow {
  key: string;
  subjectId: string;
  teacherId: string;
}

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
  const [rows, setRows] = useState<AssignmentRow[]>([]);
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

      if (assignmentsRes.success && assignmentsRes.data) {
        const initialRows = assignmentsRes.data.map((a: any) => ({
          key: Math.random().toString(),
          subjectId: a.subject_id,
          teacherId: a.teacher_id || ""
        }));
        setRows(initialRows.length > 0 ? initialRows : [{ key: Math.random().toString(), subjectId: "", teacherId: "" }]);
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

  const handleAddRow = () => {
    setRows(prev => [...prev, { key: Math.random().toString(), subjectId: "", teacherId: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length > 0 ? updated : [{ key: Math.random().toString(), subjectId: "", teacherId: "" }];
    });
  };

  const handleRowChange = (index: number, field: "subjectId" | "teacherId", value: string) => {
    setRows(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleSave = async () => {
    if (!classData?.id) return;
    setSaving(true);
    try {
      // Validate that at least one row has a selected subject, or confirm clearing all
      const validRows = rows.filter(r => r.subjectId !== "");
      
      const payload = validRows.map(r => ({
        subjectId: r.subjectId,
        teacherId: r.teacherId === "none" || r.teacherId === "" ? null : r.teacherId
      }));

      const res = await saveClassSubjectAssignments(classData.id, payload, schoolId, subdomain);
      if (res.error) throw new Error(res.error);

      toast.success("Subject teacher assignments updated successfully!");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  if (!classData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col p-0 border-none shadow-2xl bg-card rounded-[2rem] overflow-hidden">
        {/* Top Accent line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 shrink-0" />
        
        {/* Header Area */}
        <div className="p-6 md:p-8 pb-4 shrink-0">
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
        </div>

        {/* Scrollable list of rows */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 space-y-4 min-h-[220px] max-h-[50vh] custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold text-slate-400">Syncing assignments...</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div 
                    key={row.key}
                    className="flex items-end gap-3 p-4 bg-slate-50/40 border border-slate-100 hover:border-slate-200/80 rounded-2xl transition-all"
                  >
                    {/* Subject searchable dropdown */}
                    <div className="flex-1 min-w-0">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Subject</label>
                      <SubjectSearchSelect
                        subjects={subjects}
                        selectedSubjectId={row.subjectId}
                        onSelect={(subId) => handleRowChange(index, "subjectId", subId)}
                        disabledSubjects={rows.map(r => r.subjectId)}
                      />
                    </div>

                    {/* Teacher dropdown select */}
                    <div className="flex-1 min-w-0">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Assigned Teacher</label>
                      <Select 
                        value={row.teacherId || "none"} 
                        onValueChange={(val) => handleRowChange(index, "teacherId", val)}
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

                    {/* Remove row button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRow(index)}
                      className="size-10 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all shrink-0"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Assignment Row Button */}
              <Button
                variant="outline"
                onClick={handleAddRow}
                className="w-full py-5 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 font-extrabold rounded-2xl flex items-center justify-center gap-2 text-xs tracking-wider uppercase"
              >
                <Plus className="size-4" /> Add Subject Assignment
              </Button>
            </>
          )}
        </div>

        {/* Footer actions - Fixed cut-off by adding shrink-0 and large bottom padding */}
        <div className="p-6 pb-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-[2rem] shrink-0">
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
