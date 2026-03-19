"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function AcademicsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single() as any;

      if (profile?.school_id) {
        setSchoolId(profile.school_id as string);

        const [classesRes, subjectsRes] = await Promise.all([
          (supabase as any)
            .from("classes")
            .select(`
              id,
              name,
              profiles:teacher_id (
                full_name
              )
            `)
            .eq("school_id", profile.school_id)
            .order("name"),
          (supabase as any)
            .from("subjects")
            .select("*")
            .eq("school_id", profile.school_id)
            .order("name")
        ]);

        if (classesRes.error) throw classesRes.error;
        if (subjectsRes.error) throw subjectsRes.error;

        setClasses(classesRes.data || []);
        setSubjects(subjectsRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching academics data:", error);
      toast.error("Failed to load academic records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      <header className="relative overflow-hidden glass-panel rounded-[2.5rem] p-10 group bg-white/5 border-white/10">
        <div className="relative z-10 space-y-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-2">
            Curriculum Alpha
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-glow">
            Academics <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500">Framework</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl font-medium">
            Architecting the future of education. Manage your school's classes, subjects, and core academic structure below.
          </p>
        </div>
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 size-64 bg-emerald-500/20 blur-[100px] rounded-full group-hover:bg-emerald-500/30 transition-colors" />
      </header>

      {/* Bento Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel rounded-[1.8rem] p-6 group hover:translate-y-[-4px] transition-all duration-300 border border-white/5 bg-white/5 overflow-hidden">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 mb-4 shadow-lg group-hover:scale-110 transition-transform">
            <Users className="size-full text-white" />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Active Classes</span>
            <div className="text-3xl font-black">{classes.length}</div>
          </div>
        </div>

        <div className="glass-panel rounded-[1.8rem] p-6 group hover:translate-y-[-4px] transition-all duration-300 border border-white/5 bg-white/5 overflow-hidden">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 mb-4 shadow-lg group-hover:scale-110 transition-transform">
            <BookOpen className="size-full text-white" />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Core Subjects</span>
            <div className="text-3xl font-black">{subjects.length}</div>
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel rounded-[1.8rem] p-6 flex items-center justify-between border border-white/5 bg-white/5 group hover:bg-white/10 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 p-3 shadow-lg">
              <Award className="size-full text-white" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Curriculum Audit</h4>
              <p className="text-xs text-muted-foreground font-medium">Verify standard compliance</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/20">
            <Plus className="size-5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] h-14 bg-white/5 border-white/10 p-1 rounded-2xl">
          <TabsTrigger value="classes" className="rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-primary font-bold">Class Directory</TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-primary font-bold">Subject Master</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-[2rem] border-white/5 bg-white/5 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <Users className="size-6 text-primary" />
                Class Directory
              </h2>
              <Button 
                onClick={() => setIsClassModalOpen(true)} 
                className="gradient-brand px-6 h-11 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Class
              </Button>
            </div>
            
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold py-5 text-foreground h-auto">Class Name</TableHead>
                    <TableHead className="font-bold py-5 text-foreground h-auto">Assigned Faculty</TableHead>
                    <TableHead className="text-right font-bold py-5 text-foreground h-auto pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.length === 0 ? (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={3} className="text-center py-20 text-muted-foreground font-medium italic">
                        No active classes found. Architect your first class to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classes.map((cls) => (
                      <TableRow key={cls.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="font-bold text-lg py-5 pl-6 group-hover:text-primary transition-colors">{cls.name}</TableCell>
                        <TableCell className="font-medium text-muted-foreground">
                          {cls.profiles?.full_name ? (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                              {cls.profiles.full_name}
                            </Badge>
                          ) : (
                            <span className="opacity-40 italic">Not Assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary transition-all"><Edit2 className="h-4 w-4" /></Button>
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

        <TabsContent value="subjects" className="mt-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-[2rem] border-white/5 bg-white/5 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <BookOpen className="size-6 text-emerald-500" />
                Subject Master
              </h2>
              <Button 
                onClick={() => setIsSubjectModalOpen(true)} 
                variant="outline"
                className="px-6 h-11 rounded-xl border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all hover:scale-105"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Subject
              </Button>
            </div>
            
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold py-5 text-foreground h-auto">Subject Code</TableHead>
                    <TableHead className="font-bold py-5 text-foreground h-auto">Name</TableHead>
                    <TableHead className="text-right font-bold py-5 text-foreground h-auto pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.length === 0 ? (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={3} className="text-center py-20 text-muted-foreground font-medium italic">
                        No subjects found in the curriculum master.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjects.map((sub) => (
                      <TableRow key={sub.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell>
                          <Badge variant="outline" className="font-mono bg-emerald-500/5 text-emerald-500 border-emerald-500/20 font-black tracking-widest px-3">
                            {sub.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-lg py-5 group-hover:text-emerald-500 transition-colors">{sub.name}</TableCell>
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

      {schoolId && (
        <>
          <AddClassModal 
            isOpen={isClassModalOpen} 
            onClose={() => setIsClassModalOpen(false)} 
            onSuccess={fetchData} 
            schoolId={schoolId}
          />
          <AddSubjectModal 
            isOpen={isSubjectModalOpen} 
            onClose={() => setIsSubjectModalOpen(false)} 
            onSuccess={fetchData} 
            schoolId={schoolId}
          />
        </>
      )}
    </div>
  );
}
