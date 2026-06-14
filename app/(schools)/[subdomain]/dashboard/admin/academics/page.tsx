"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTenant } from "@/components/providers/tenant-provider";
import { createTenantClient } from "@/lib/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  BookOpen, 
  Users, 
  Loader2,
  Trash2,
  Edit2,
  TrendingUp,
  Award
} from "lucide-react";
import { AddClassModal } from "@/components/admin/add-class-modal";
import { AddSubjectModal } from "@/components/admin/add-subject-modal";
import { getClasses, getSubjects } from "@/app/actions/admin-actions";
import { EditClassModal } from "@/components/admin/edit-class-modal";
import { DeleteClassModal } from "@/components/admin/delete-class-modal";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function AcademicsPage() {
  const { subdomain } = useParams();
  const { tenant } = useTenant();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const supabase = createTenantClient();

  const fetchData = async () => {
    if (!tenant?.id) return;
    
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        getClasses(tenant.id, subdomain as string),
        getSubjects(tenant.id, subdomain as string)
      ]);

      if (classesRes.error) throw new Error(classesRes.error);
      if (subjectsRes.error) throw new Error(subjectsRes.error);

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error("Error fetching academics data:", error);
      toast.error("Failed to load academic records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading academics dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Executive Header */}
      <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 text-glow">
            Manage Classes and Subjects
          </h1>
          <p className="text-muted-foreground mt-2 font-medium tracking-tight text-lg">
            Architect and manage your institution's core academic structure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsClassModalOpen(true)} 
            className="gradient-brand px-6 h-12 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform text-white font-bold"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Class
          </Button>
        </div>
      </header>

      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] h-14 bg-slate-100/50 border border-slate-200 p-1.5 rounded-2xl">
          <TabsTrigger value="classes" className="rounded-xl font-bold tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">Class List</TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-xl font-bold tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-emerald-600 transition-all">Subject List</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900">
                <Users className="size-6 text-primary" />
                Class List
                <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary border-transparent">
                  {classes.length} Total
                </Badge>
              </h2>
            </div>
            
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 py-5 pl-8">Class</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 py-5">Assigned Teacher</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 py-5 pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.length === 0 ? (
                    <TableRow className="border-slate-50">
                      <TableCell colSpan={3} className="text-center py-24 text-muted-foreground font-medium italic">
                        No active classes found. Architect your first class to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classes.map((cls) => (
                      <TableRow key={cls.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="font-black text-xl py-6 pl-8 text-slate-900 group-hover:text-primary transition-colors">{cls.name}</TableCell>
                        <TableCell className="font-bold">
                          {cls.profiles?.full_name ? (
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                {cls.profiles.full_name.charAt(0)}
                              </div>
                              <span className="text-slate-700">{cls.profiles.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm font-medium italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
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
                              className="rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                            >
                              <Edit2 className="h-4 w-4" />
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
                              className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="subjects" className="mt-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900">
                <BookOpen className="size-6 text-emerald-500" />
                Subject List
                <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-600 border-transparent">
                  {subjects.length} Total
                </Badge>
              </h2>
              <Button 
                onClick={() => setIsSubjectModalOpen(true)} 
                variant="outline"
                className="px-6 h-12 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 transition-all hover:scale-105 font-bold shadow-sm"
              >
                <Plus className="mr-2 size-5" />
                Add Subject
              </Button>
            </div>
            
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 py-5 pl-8">Subject Code</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 py-5">Name</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 py-5 pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.length === 0 ? (
                    <TableRow className="border-slate-50">
                      <TableCell colSpan={3} className="text-center py-24 text-muted-foreground font-medium italic">
                        No subjects found in the curriculum master.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjects.map((sub) => (
                      <TableRow key={sub.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="pl-8">
                          <Badge variant="outline" className="font-mono bg-emerald-50 text-emerald-600 border-emerald-200 font-black tracking-widest px-3 py-1 text-xs">
                            {sub.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-black text-xl py-6 text-slate-900 group-hover:text-emerald-500 transition-colors">{sub.name}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
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
        </>
      )}
    </div>
  );
}
