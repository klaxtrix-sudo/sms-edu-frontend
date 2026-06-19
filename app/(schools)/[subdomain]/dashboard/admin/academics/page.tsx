"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTenant } from "@/components/providers/tenant-provider";
import { createTenantClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  BookOpen, 
  Users, 
  Loader2,
  Trash2,
  Edit2,
  AlertCircle
} from "lucide-react";
import { AddClassModal } from "@/components/admin/add-class-modal";
import { AddSubjectModal } from "@/components/admin/add-subject-modal";
import { getClasses, getSubjects, deleteSubject } from "@/app/actions/admin-actions";
import { EditClassModal } from "@/components/admin/edit-class-modal";
import { DeleteClassModal } from "@/components/admin/delete-class-modal";
import { ManageSubjectTeachersModal } from "@/components/admin/manage-subject-teachers-modal";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function AcademicsPage() {
  const { subdomain } = useParams();
  const { tenant } = useTenant();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("classes");
  
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Subject-Teacher assignment states
  const [isSubjectTeacherModalOpen, setIsSubjectTeacherModalOpen] = useState(false);
  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState<any>(null);
  const [classAssignments, setClassAssignments] = useState<any[]>([]);
  
  const supabase = createTenantClient();

  const fetchData = async () => {
    if (!tenant?.id) return;
    
    try {
      const [classesRes, subjectsRes, assignmentsRes] = await Promise.all([
        getClasses(tenant.id, subdomain as string),
        getSubjects(tenant.id, subdomain as string),
        supabase.from("class_subject_teachers").select("class_id, subject_id")
      ]);

      if (classesRes.error) throw new Error(classesRes.error);
      if (subjectsRes.error) throw new Error(subjectsRes.error);

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setClassAssignments(assignmentsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching academics data:", error);
      toast.error(error.message || "Failed to load academic records");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!subdomain || !tenant?.id) return;
    if (!confirm(`Are you sure you want to delete the subject "${subjectName}"? This action cannot be undone.`)) return;

    try {
      const res = await deleteSubject(subjectId, subdomain as string);
      if (res.error) throw new Error(res.error);
      toast.success(`Subject "${subjectName}" deleted successfully`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete subject");
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-400 font-medium text-sm animate-pulse">Loading academics dashboard...</p>
      </div>
    );
  }

  const unassignedClassesCount = classes.filter(c => !c.profiles?.full_name).length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Executive Header */}
      <header className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
            Academic Structure
          </h1>
          <p className="text-slate-500 font-medium tracking-tight text-base sm:text-lg">
            Configure classrooms, assign class teachers, and manage the curriculum master.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {activeTab === "classes" ? (
              <motion.div
                key="add-class-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <Button 
                  onClick={() => setIsClassModalOpen(true)} 
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-6 h-12 rounded-2xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-white font-black text-sm"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Class
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="add-subject-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <Button 
                  onClick={() => setIsSubjectModalOpen(true)} 
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-6 h-12 rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-white font-black text-sm"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Subject
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Dynamic Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Classes Card */}
        <div className="relative overflow-hidden group bg-gradient-to-br from-indigo-50/40 via-white to-white border border-slate-100 hover:border-indigo-100 rounded-[2rem] p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100/20 rounded-bl-[4rem] transition-all duration-300 group-hover:scale-110" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Total Classes</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{classes.length}</h3>
            </div>
          </div>
        </div>

        {/* Total Subjects Card */}
        <div className="relative overflow-hidden group bg-gradient-to-br from-emerald-50/40 via-white to-white border border-slate-100 hover:border-emerald-100 rounded-[2rem] p-6 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/20 rounded-bl-[4rem] transition-all duration-300 group-hover:scale-110" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-600 shadow-sm shadow-emerald-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Total Subjects</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{subjects.length}</h3>
            </div>
          </div>
        </div>

        {/* Unassigned Classes Card */}
        <div className="relative overflow-hidden group bg-gradient-to-br from-amber-50/40 via-white to-white border border-slate-100 hover:border-amber-100 rounded-[2rem] p-6 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/20 rounded-bl-[4rem] transition-all duration-300 group-hover:scale-110" />
          <div className="flex items-center gap-4">
            <div className={`size-12 rounded-2xl flex items-center justify-center shadow-sm ${
              unassignedClassesCount > 0 
                ? "bg-amber-50 border border-amber-200 text-amber-600 shadow-amber-100" 
                : "bg-slate-50 border border-slate-200 text-slate-400"
            }`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Unassigned Classes</p>
              <h3 className={`text-3xl font-black mt-1 tracking-tight ${
                unassignedClassesCount > 0 ? "text-amber-600" : "text-slate-800"
              }`}>{unassignedClassesCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Custom Tab List */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-5">
          <TabsList className="grid grid-cols-2 w-full max-w-[340px] h-12 bg-slate-100/60 border border-slate-200/50 p-1 rounded-2xl">
            <TabsTrigger 
              value="classes" 
              className="rounded-xl font-bold tracking-tight text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              Class List
            </TabsTrigger>
            <TabsTrigger 
              value="subjects" 
              className="rounded-xl font-bold tracking-tight text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Subject List
            </TabsTrigger>
          </TabsList>
          
          <div className="hidden sm:block">
            <Badge variant="outline" className={`font-black uppercase tracking-wider px-3 py-1 rounded-xl text-[10px] ${
              activeTab === "classes" 
                ? "bg-indigo-50/50 text-indigo-600 border-indigo-100" 
                : "bg-emerald-50/50 text-emerald-600 border-emerald-100"
            }`}>
              {activeTab === "classes" ? `${classes.length} Classes` : `${subjects.length} Subjects`}
            </Badge>
          </div>
        </div>

        {/* Classes Content */}
        <TabsContent value="classes" className="mt-8 outline-none">
          <AnimatePresence mode="wait">
            {classes.length === 0 ? (
              <motion.div 
                key="empty-classes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center text-center py-24 px-4 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/40"
              >
                <div className="size-16 rounded-3xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-800">No Active Classes</h3>
                <p className="text-slate-400 text-sm max-w-sm mt-1">Configure your institution's grade levels and classrooms to start registering students.</p>
                <Button 
                  onClick={() => setIsClassModalOpen(true)}
                  className="mt-6 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 shadow-sm font-extrabold rounded-xl px-5 h-11"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add First Class
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="grid-classes"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {classes.map((cls) => (
                  <div 
                    key={cls.id} 
                    className="relative overflow-hidden group bg-white border border-slate-100 hover:border-indigo-100/70 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[190px]"
                  >
                    {/* Background Soft Glow */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-indigo-50/0 to-indigo-50/20 group-hover:to-indigo-50/70 rounded-full blur-xl transition-all duration-300" />
                    
                    {/* Card Header */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500 bg-indigo-50/60 px-3 py-1 rounded-lg">Classroom</span>
                        
                        {/* Hover Actions */}
                        <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button 
                            onClick={() => {
                              setSelectedClass({
                                id: cls.id,
                                name: cls.name,
                                teacherId: cls.class_teacher_id
                              });
                              setIsEditClassModalOpen(true);
                            }}
                            variant="ghost" 
                            size="icon" 
                            className="size-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            onClick={() => {
                              setSelectedClass({
                                id: cls.id,
                                name: cls.name
                              });
                              setIsDeleteClassModalOpen(true);
                            }}
                            variant="ghost" 
                            size="icon" 
                            className="size-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                        {cls.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-bold text-[10px] rounded-lg">
                          {classAssignments.filter((a) => a.class_id === cls.id).length} Subjects
                        </Badge>
                        <Button 
                          onClick={() => {
                            setSelectedClassForSubjects({ id: cls.id, name: cls.name });
                            setIsSubjectTeacherModalOpen(true);
                          }}
                          variant="ghost" 
                          className="h-7 text-[10px] font-black uppercase tracking-wider px-3 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all flex items-center gap-1.5"
                        >
                          Manage Subjects
                        </Button>
                      </div>
                    </div>

                    {/* Card Footer: Teacher Section */}
                    <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between">
                      {cls.profiles?.full_name ? (
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-500/10">
                            {cls.profiles.full_name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Class Teacher</p>
                            <p className="text-xs font-bold text-slate-700 leading-tight">{cls.profiles.full_name}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/60 border border-amber-100/40">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Unassigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Subjects Content */}
        <TabsContent value="subjects" className="mt-8 outline-none">
          <AnimatePresence mode="wait">
            {subjects.length === 0 ? (
              <motion.div 
                key="empty-subjects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center text-center py-24 px-4 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/40"
              >
                <div className="size-16 rounded-3xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-500 mb-4 shadow-sm">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-800">No Subjects Configured</h3>
                <p className="text-slate-400 text-sm max-w-sm mt-1">Add courses and curriculum modules to build your school's official subject registry.</p>
                <Button 
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="mt-6 bg-white hover:bg-slate-50 text-emerald-600 border border-slate-200 shadow-sm font-extrabold rounded-xl px-5 h-11"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add First Subject
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="grid-subjects"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {subjects.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="relative overflow-hidden group bg-white border border-slate-100 hover:border-emerald-100/70 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[190px]"
                  >
                    {/* Background Soft Glow */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-emerald-50/0 to-emerald-50/20 group-hover:to-emerald-50/70 rounded-full blur-xl transition-all duration-300" />
                    
                    {/* Card Header */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500 bg-emerald-50/60 px-3 py-1 rounded-lg">Curriculum</span>
                        
                        {/* Hover Actions */}
                        <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button 
                            onClick={() => {
                              toast.info("Subject updating can be performed directly through curriculum modals.");
                            }}
                            variant="ghost" 
                            size="icon" 
                            className="size-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            onClick={() => handleDeleteSubject(sub.id, sub.name)}
                            variant="ghost" 
                            size="icon" 
                            className="size-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
                        {sub.name}
                      </h3>
                    </div>

                    {/* Card Footer: Subject Code */}
                    <div className="pt-6 border-t border-slate-50 mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-lg bg-emerald-100/50 flex items-center justify-center text-emerald-600">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subject Code</span>
                      </div>
                      <Badge variant="outline" className="font-mono bg-emerald-50 text-emerald-600 border-emerald-200 font-extrabold tracking-widest px-3 py-1 text-xs">
                        {sub.code}
                      </Badge>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {tenant?.id && (
        <>
          <AddClassModal 
            isOpen={isClassModalOpen} 
            onClose={() => setIsClassModalOpen(false)} 
            onSuccess={fetchData} 
            schoolId={tenant.id}
          />

          <EditClassModal 
            isOpen={isEditClassModalOpen} 
            onClose={() => setIsEditClassModalOpen(false)} 
            onSuccess={fetchData} 
            schoolId={tenant.id}
            initialData={selectedClass || { id: "", name: "" }}
          />

          <DeleteClassModal 
            isOpen={isDeleteClassModalOpen} 
            onClose={() => setIsDeleteClassModalOpen(false)} 
            onSuccess={fetchData}
            classData={selectedClass || { id: "", name: "" }}
          />

          <AddSubjectModal 
            isOpen={isSubjectModalOpen} 
            onClose={() => setIsSubjectModalOpen(false)} 
            onSuccess={fetchData} 
            schoolId={tenant.id}
          />

          {selectedClassForSubjects && (
            <ManageSubjectTeachersModal 
              isOpen={isSubjectTeacherModalOpen}
              onClose={() => {
                setIsSubjectTeacherModalOpen(false);
                setSelectedClassForSubjects(null);
              }}
              onSuccess={fetchData}
              classData={selectedClassForSubjects}
              subjects={subjects}
              schoolId={tenant.id}
              subdomain={subdomain as string}
            />
          )}
        </>
      )}
    </div>
  );
}
