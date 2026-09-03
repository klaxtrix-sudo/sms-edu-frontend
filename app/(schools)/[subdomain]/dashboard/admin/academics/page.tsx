"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTenant } from "@/components/providers/tenant-provider";
import { createTenantClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  BookOpen, 
  Users, 
  Loader2,
  Trash2, 
  Edit2, 
  AlertCircle,
  Search,
  X,
  List,
  LayoutGrid,
  MoreHorizontal,
  GraduationCap
} from "lucide-react";
import { AddClassModal } from "@/components/admin/add-class-modal";
import { AddSubjectModal } from "@/components/admin/add-subject-modal";
import { getAcademicOverview, assignClassTeacher } from "@/app/actions/admin-actions";
import { EditClassModal } from "@/components/admin/edit-class-modal";
import { DeleteClassModal } from "@/components/admin/delete-class-modal";
import { DeleteSubjectModal } from "@/components/admin/delete-subject-modal";
import { ManageSubjectTeachersModal } from "@/components/admin/manage-subject-teachers-modal";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AcademicsPage() {
  const { subdomain } = useParams();
  const { tenant } = useTenant();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("classes");
  
  // View mode switcher: "table" (default) or "cards"
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [classTeacherFilter, setClassTeacherFilter] = useState<"all" | "assigned" | "unassigned">("all");

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Teachers list for quick assignment
  const [teachers, setTeachers] = useState<any[]>([]);

  // Subject deletion modal state
  const [isDeleteSubjectModalOpen, setIsDeleteSubjectModalOpen] = useState(false);
  const [selectedSubjectForDelete, setSelectedSubjectForDelete] = useState<any>(null);

  // Subject-Teacher assignment states
  const [isSubjectTeacherModalOpen, setIsSubjectTeacherModalOpen] = useState(false);
  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState<any>(null);
  const [classAssignments, setClassAssignments] = useState<any[]>([]);

  // Retrieve user view preference from localStorage on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("klaxtrix_academics_view_mode") as "table" | "cards" | null;
      if (savedMode === "table" || savedMode === "cards") {
        setViewMode(savedMode);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const handleViewModeChange = (mode: "table" | "cards") => {
    setViewMode(mode);
    try {
      localStorage.setItem("klaxtrix_academics_view_mode", mode);
    } catch {
      // Ignore localStorage write errors
    }
  };

  const fetchData = async () => {
    if (!subdomain) return;
    
    try {
      const res = await getAcademicOverview(subdomain as string);
      if (res.error) throw new Error(res.error);

      if (res.data) {
        setClasses(res.data.classes || []);
        setSubjects(res.data.subjects || []);
        setClassAssignments(res.data.assignments || []);
        setTeachers(res.data.teachers || []);
      }
    } catch (error: any) {
      console.error("Error fetching academics data:", error);
      toast.error(error.message || "Failed to load classes and subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subdomain]);

  // Filtered Classes computation
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        cls.name.toLowerCase().includes(query) ||
        (cls.profiles?.full_name && cls.profiles.full_name.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (classTeacherFilter === "assigned") return !!cls.profiles?.full_name;
      if (classTeacherFilter === "unassigned") return !cls.profiles?.full_name;
      return true;
    });
  }, [classes, searchQuery, classTeacherFilter]);

  // Filtered Subjects computation
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        sub.name.toLowerCase().includes(query) ||
        sub.code.toLowerCase().includes(query)
      );
    });
  }, [subjects, searchQuery]);

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Executive Header */}
      <header className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
            Academic Structure
          </h1>
          <p className="text-slate-500 font-medium tracking-tight text-base sm:text-lg">
            Set up classes, assign class teachers, and manage subjects.
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

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearchQuery(""); }} className="w-full">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <TabsList className="grid grid-cols-2 w-full md:w-[340px] h-12 bg-slate-100/60 border border-slate-200/50 p-1 rounded-2xl">
            <TabsTrigger 
              value="classes" 
              className="rounded-xl font-bold tracking-tight text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              Class List ({classes.length})
            </TabsTrigger>
            <TabsTrigger 
              value="subjects" 
              className="rounded-xl font-bold tracking-tight text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Subject List ({subjects.length})
            </TabsTrigger>
          </TabsList>
          
          {/* View Switcher Controls */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-inner">
              <button
                onClick={() => handleViewModeChange("table")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all",
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => handleViewModeChange("cards")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all",
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Instant Search & Quick Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "classes" ? "Search classes or class teachers..." : "Search subjects or subject codes..."}
              className="pl-10 pr-9 h-11 rounded-xl bg-white border-slate-200/80 shadow-sm focus-visible:ring-indigo-500 text-sm font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters for Classes */}
          {activeTab === "classes" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={classTeacherFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setClassTeacherFilter("all")}
                className={cn(
                  "rounded-xl text-xs font-bold h-9 px-3.5",
                  classTeacherFilter === "all" 
                    ? "bg-slate-900 text-white hover:bg-slate-800" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                All ({classes.length})
              </Button>
              <Button
                variant={classTeacherFilter === "assigned" ? "default" : "outline"}
                size="sm"
                onClick={() => setClassTeacherFilter("assigned")}
                className={cn(
                  "rounded-xl text-xs font-bold h-9 px-3.5",
                  classTeacherFilter === "assigned" 
                    ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                Assigned ({classes.length - unassignedClassesCount})
              </Button>
              <Button
                variant={classTeacherFilter === "unassigned" ? "default" : "outline"}
                size="sm"
                onClick={() => setClassTeacherFilter("unassigned")}
                className={cn(
                  "rounded-xl text-xs font-bold h-9 px-3.5",
                  classTeacherFilter === "unassigned" 
                    ? "bg-amber-600 text-white hover:bg-amber-700" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                Unassigned ({unassignedClassesCount})
              </Button>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CLASSES TAB CONTENT
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="classes" className="mt-6 outline-none">
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
                <h3 className="text-lg font-black text-slate-800">No classes yet</h3>
                <p className="text-slate-400 text-sm max-w-sm mt-1">Add your classes and grade levels so you can start enrolling students.</p>
                <Button 
                  onClick={() => setIsClassModalOpen(true)}
                  className="mt-6 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 shadow-sm font-extrabold rounded-xl px-5 h-11"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add First Class
                </Button>
              </motion.div>
            ) : filteredClasses.length === 0 ? (
              <motion.div
                key="no-matches-classes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50"
              >
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No matching classes found</h4>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filter.</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSearchQuery(""); setClassTeacherFilter("all"); }}
                  className="mt-3 text-xs font-bold text-indigo-600"
                >
                  Clear Filters
                </Button>
              </motion.div>
            ) : viewMode === "table" ? (
              /* Modern Interactive Table View */
              <motion.div 
                key="table-classes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden"
              >
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-[11px] uppercase tracking-wider text-slate-500 py-4 pl-6">
                        Class Name
                      </TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-wider text-slate-500 py-4">
                        Class Teacher
                      </TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-wider text-slate-500 py-4">
                        Subjects Offered
                      </TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-wider text-slate-500 py-4 text-right pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((cls) => {
                      const subjectCount = classAssignments.filter((a) => a.class_id === cls.id).length;
                      return (
                        <TableRow 
                          key={cls.id} 
                          className="hover:bg-slate-50/70 transition-colors border-b border-slate-100/80 group"
                        >
                          {/* Class Name */}
                          <TableCell className="py-4 pl-6 font-bold">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 shrink-0 font-black text-xs">
                                <GraduationCap className="w-4 h-4" />
                              </div>
                              <span className="text-base font-black text-slate-900 tracking-tight">
                                {cls.name}
                              </span>
                            </div>
                          </TableCell>

                          {/* Class Teacher with Inline Quick Assignment */}
                          <TableCell className="py-4 font-medium">
                            <div className="flex items-center gap-2 max-w-[240px]">
                              <Select
                                value={cls.class_teacher_id || "none"}
                                onValueChange={async (newTeacherId) => {
                                  const teacherIdToSave = newTeacherId === "none" ? null : newTeacherId;
                                  const assignedTeacher = teachers.find((t) => t.id === teacherIdToSave);

                                  // Optimistic UI update
                                  setClasses((prev) =>
                                    prev.map((c) =>
                                      c.id === cls.id
                                        ? {
                                            ...c,
                                            class_teacher_id: teacherIdToSave,
                                            profiles: assignedTeacher ? { full_name: assignedTeacher.full_name } : null,
                                          }
                                        : c
                                    )
                                  );

                                  try {
                                    const res = await assignClassTeacher(cls.id, teacherIdToSave, subdomain as string);
                                    if (res.error) throw new Error(res.error);
                                    toast.success(
                                      teacherIdToSave
                                        ? `Assigned ${assignedTeacher?.full_name} to ${cls.name}`
                                        : `Removed class teacher from ${cls.name}`
                                    );
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to assign teacher");
                                    fetchData();
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 px-2 bg-transparent hover:bg-slate-100/70 border border-transparent hover:border-slate-200 rounded-lg transition-all text-xs font-bold focus:ring-0 w-auto min-w-[140px]">
                                  <SelectValue placeholder="Assign teacher...">
                                    {cls.profiles?.full_name ? (
                                      <div className="flex items-center gap-2">
                                        <div className="size-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm shadow-indigo-500/10 shrink-0">
                                          {cls.profiles.full_name.charAt(0)}
                                        </div>
                                        <span className="text-xs font-bold text-slate-800 truncate">
                                          {cls.profiles.full_name}
                                        </span>
                                      </div>
                                    ) : (
                                      <Badge 
                                        variant="outline" 
                                        className="bg-amber-50 text-amber-700 border-amber-200/80 font-bold text-[10px] px-2 py-0.5 rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-amber-100/70 transition-colors"
                                      >
                                        <AlertCircle className="w-3 h-3 text-amber-500" />
                                        Unassigned
                                      </Badge>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-[260px]">
                                  <SelectItem value="none" className="text-xs font-bold text-slate-500">
                                    Unassigned
                                  </SelectItem>
                                  {teachers.map((t) => (
                                    <SelectItem key={t.id} value={t.id} className="text-xs font-semibold">
                                      {t.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>

                          {/* Subjects Offered */}
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className="bg-indigo-50 text-indigo-700 border-none font-extrabold text-xs rounded-lg px-2.5 py-1"
                              >
                                {subjectCount} {subjectCount === 1 ? "Subject" : "Subjects"}
                              </Badge>
                              <Button
                                onClick={() => {
                                  setSelectedClassForSubjects({ id: cls.id, name: cls.name });
                                  setIsSubjectTeacherModalOpen(true);
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/80 rounded-lg px-2.5"
                              >
                                Manage
                              </Button>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1">
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
                                className="size-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition-all"
                                title="Edit Class"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="size-8 rounded-lg hover:bg-slate-100 text-slate-500 transition-all"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedClassForSubjects({ id: cls.id, name: cls.name });
                                      setIsSubjectTeacherModalOpen(true);
                                    }}
                                    className="text-xs font-bold gap-2 cursor-pointer"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                                    Manage Subjects
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedClass({
                                        id: cls.id,
                                        name: cls.name,
                                        teacherId: cls.class_teacher_id
                                      });
                                      setIsEditClassModalOpen(true);
                                    }}
                                    className="text-xs font-bold gap-2 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                                    Edit Class
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedClass({
                                        id: cls.id,
                                        name: cls.name
                                      });
                                      setIsDeleteClassModalOpen(true);
                                    }}
                                    className="text-xs font-bold text-rose-600 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-700"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Class
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </motion.div>
            ) : (
              /* Enhanced Cards Grid View */
              <motion.div 
                key="grid-classes"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredClasses.map((cls) => (
                  <div 
                    key={cls.id} 
                    className="relative overflow-hidden group bg-white border border-slate-100 hover:border-indigo-100/70 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[190px]"
                  >
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-indigo-50/0 to-indigo-50/20 group-hover:to-indigo-50/70 rounded-full blur-xl transition-all duration-300 pointer-events-none" />
                    
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                          {cls.name}
                        </h3>
                        <div className="flex gap-1 shrink-0">
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
                            className="size-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all text-slate-400 hover:text-indigo-600"
                            title="Edit Class"
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
                            className="size-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      
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

        {/* ─────────────────────────────────────────────────────────────
            SUBJECTS TAB CONTENT
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="subjects" className="mt-6 outline-none">
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
                <h3 className="text-lg font-black text-slate-800">No subjects yet</h3>
                <p className="text-slate-400 text-sm max-w-sm mt-1">Add the subjects your school offers.</p>
                <Button 
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="mt-6 bg-white hover:bg-slate-50 text-emerald-600 border border-slate-200 shadow-sm font-extrabold rounded-xl px-5 h-11"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add First Subject
                </Button>
              </motion.div>
            ) : filteredSubjects.length === 0 ? (
              <motion.div
                key="no-matches-subjects"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50"
              >
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No matching subjects found</h4>
                <p className="text-xs text-slate-400 mt-1">No subjects match your search query.</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-xs font-bold text-emerald-600"
                >
                  Clear Search
                </Button>
              </motion.div>
            ) : viewMode === "table" ? (
              /* Modern Interactive Table View */
              <motion.div 
                key="table-subjects"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden"
              >
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-[11px] uppercase tracking-wider text-slate-500 py-4 pl-6">
                        Subject Name
                      </TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-wider text-slate-500 py-4">
                        Subject Code
                      </TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-wider text-slate-500 py-4">
                        Classes Offering
                      </TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-wider text-slate-500 py-4 text-right pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((sub) => {
                      const offeringClassesCount = new Set(
                        classAssignments.filter((a) => a.subject_id === sub.id).map((a) => a.class_id)
                      ).size;

                      return (
                        <TableRow 
                          key={sub.id} 
                          className="hover:bg-slate-50/70 transition-colors border-b border-slate-100/80 group"
                        >
                          {/* Subject Name */}
                          <TableCell className="py-4 pl-6 font-bold">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-600 shrink-0 font-black text-xs">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <span className="text-base font-black text-slate-900 tracking-tight">
                                {sub.name}
                              </span>
                            </div>
                          </TableCell>

                          {/* Subject Code */}
                          <TableCell className="py-4">
                            <Badge 
                              variant="outline" 
                              className="font-mono bg-emerald-50/80 text-emerald-700 border-emerald-200 font-extrabold tracking-widest px-3 py-1 text-xs rounded-lg"
                            >
                              {sub.code}
                            </Badge>
                          </TableCell>

                          {/* Classes Offering */}
                          <TableCell className="py-4">
                            {offeringClassesCount > 0 ? (
                              <Badge 
                                variant="secondary" 
                                className="bg-slate-100 text-slate-700 border-none font-bold text-xs rounded-lg px-2.5 py-1"
                              >
                                {offeringClassesCount} {offeringClassesCount === 1 ? "Class" : "Classes"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium italic">
                                Not assigned yet
                              </span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-4 pr-6 text-right">
                            <Button 
                              onClick={() => {
                                setSelectedSubjectForDelete({ id: sub.id, name: sub.name, code: sub.code });
                                setIsDeleteSubjectModalOpen(true);
                              }}
                              variant="ghost" 
                              size="icon" 
                              className="size-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                              title="Delete Subject"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </motion.div>
            ) : (
              /* Enhanced Cards Grid View */
              <motion.div 
                key="grid-subjects"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredSubjects.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="relative overflow-hidden group bg-white border border-slate-100 hover:border-emerald-100/70 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[190px]"
                  >
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-emerald-50/0 to-emerald-50/20 group-hover:to-emerald-50/70 rounded-full blur-xl transition-all duration-300 pointer-events-none" />
                    
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
                          {sub.name}
                        </h3>
                        <div className="flex gap-1 shrink-0">
                          <Button 
                            onClick={() => {
                              setSelectedSubjectForDelete({ id: sub.id, name: sub.name, code: sub.code });
                              setIsDeleteSubjectModalOpen(true);
                            }}
                            variant="ghost" 
                            size="icon" 
                            className="size-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

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

      {/* Modals */}
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

          <DeleteSubjectModal
            isOpen={isDeleteSubjectModalOpen}
            onClose={() => {
              setIsDeleteSubjectModalOpen(false);
              setSelectedSubjectForDelete(null);
            }}
            onSuccess={fetchData}
            subjectData={selectedSubjectForDelete}
          />
        </>
      )}
    </div>
  );
}
