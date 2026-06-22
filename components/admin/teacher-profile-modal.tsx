"use client";

import { useEffect, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Users, 
  CheckCircle2, 
  ShieldCheck,
  Building2,
  Loader2,
  Clock,
  BookOpen
} from "lucide-react";
import { createTenantClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: any;
}

export function TeacherProfileModal({ isOpen, onClose, teacher }: TeacherProfileModalProps) {
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createTenantClient();

  useEffect(() => {
    if (isOpen && teacher?.id) {
      const fetchAssignments = async () => {
        setLoading(true);
        try {
          const [{ data: classesData, error: classesError }, { data: subjectsData, error: subjectsError }] = await Promise.all([
            supabase
              .from("classes")
              .select("id, name")
              .eq("class_teacher_id", teacher.id),
            supabase
              .from("class_subject_teachers")
              .select(`
                class_id,
                subject_id,
                classes:class_id ( name ),
                subjects:subject_id ( name, code )
              `)
              .eq("teacher_id", teacher.id)
          ]);
          
          if (!classesError) {
            setAssignedClasses(classesData || []);
          }
          if (!subjectsError) {
            setAssignedSubjects(subjectsData || []);
          }
        } catch (err) {
          console.error("Error fetching teacher assignments:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchAssignments();
    }
  }, [isOpen, teacher?.id, supabase]);

  if (!teacher) return null;

  const permissions = [
    { title: "Attendance Tracking", desc: "Manage student attendance for assigned classes." },
    { title: "Academic Results", desc: "Upload and update student subject scores." },
    { title: "Homework Management", desc: "Distribute and evaluate class assignments." },
    { title: "Student Roster", desc: "View detailed academic profiles of students." }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] flex flex-col overflow-hidden border-slate-200 bg-white shadow-2xl p-0">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-primary z-50" />
        
        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-10">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                <User className="size-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight text-glow">Teacher Profile</DialogTitle>
                <DialogDescription className="font-medium">Comprehensive view of teacher records and access.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8">
            {/* Header / Identity Section */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-indigo-500/5 rounded-3xl -m-2 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              <div className="relative p-6 rounded-[2rem] bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center gap-6">
                <div className="size-20 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-primary/20 border-4 border-white group-hover:scale-105 transition-transform">
                  <User className="size-10" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <h3 className="font-black text-2xl tracking-tight leading-none">{teacher.full_name}</h3>
                    <Badge 
                      variant={teacher.is_archived ? "outline" : (teacher.is_active ? (teacher.onboarding_completed ? "default" : "secondary") : "secondary")} 
                      className={cn(
                        "w-fit mx-auto md:mx-0 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest",
                        teacher.is_archived ? "bg-slate-500/10 text-slate-500 border-slate-500/20" : 
                        (teacher.is_active ? 
                          (teacher.onboarding_completed ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20") 
                          : "bg-red-500/10 text-red-500 border-red-500/20")
                      )}
                    >
                      {teacher.is_archived ? "Archived" : (teacher.is_active ? (teacher.onboarding_completed ? "Active" : "Pending Setup") : "Suspended")}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                      <Mail className="size-3.5 text-primary" />
                      {teacher.email}
                    </div>
                    {teacher.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                        <Phone className="size-3.5 text-primary" />
                        {teacher.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Assignments Section */}
              <div className="space-y-6">
                {/* Form Classes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
                      <Building2 className="size-3.5 text-primary" /> Class (Form Teacher)
                    </h4>
                    {loading && <Loader2 className="size-3 animate-spin text-primary/40" />}
                  </div>
                  
                  <div className="space-y-2 min-h-[70px]">
                    {assignedClasses.length > 0 ? (
                      assignedClasses.map((cls, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={cls.id} 
                          className="flex items-center gap-4 p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 group hover:bg-primary/10 transition-all hover:translate-x-1"
                        >
                          <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                            <Users className="size-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-sm tracking-tight">{cls.name}</span>
                            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Main Educator</span>
                          </div>
                        </motion.div>
                      ))
                    ) : !loading ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-muted/10 rounded-[1.5rem] border border-dashed border-border/50 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 italic leading-tight">
                          No Form Class Assigned
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Subject Assignments */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
                    <BookOpen className="size-3.5 text-primary" /> Subject Assignments
                  </h4>
                  
                  <div className="space-y-2 min-h-[120px] max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {assignedSubjects.length > 0 ? (
                      assignedSubjects.map((sub, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={idx} 
                          className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 group hover:bg-indigo-50 transition-all hover:translate-x-1"
                        >
                          <div className="size-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                            <BookOpen className="size-4" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{sub.subjects?.name}</p>
                            <p className="text-[9px] font-black text-indigo-500/75 uppercase tracking-widest leading-none mt-1">{sub.classes?.name}</p>
                          </div>
                          <Badge variant="outline" className="font-mono bg-white text-slate-500 border-slate-200 text-[8px] font-bold">
                            {sub.subjects?.code}
                          </Badge>
                        </motion.div>
                      ))
                    ) : !loading ? (
                      <div className="flex flex-col items-center justify-center p-8 bg-muted/10 rounded-[1.5rem] border border-dashed border-border/50 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 italic leading-tight">
                          No Subject Assignments
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-primary" /> Roles
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {permissions.map((p, idx) => (
                      <div key={idx} className="flex gap-4 items-start group">
                        <div className="mt-1 bg-emerald-500/10 rounded-lg p-1.5 border border-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                          <CheckCircle2 className="size-3.5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black tracking-tight">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground font-medium leading-tight">{p.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-auto">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
                        <div className="flex items-center gap-2">
                           <Clock className="size-3" />
                           Joined {new Date(teacher.created_at).toLocaleDateString()}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono border-none opacity-50 p-0 h-auto">#{teacher.id.substring(0, 12)}</Badge>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button 
              onClick={onClose}
              className="text-xs font-black uppercase tracking-widest px-10 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm hover:shadow-primary/5"
            >
              Close
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
