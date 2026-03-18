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
  Edit2
} from "lucide-react";
import { AddClassModal } from "@/components/admin/add-class-modal";
import { AddSubjectModal } from "@/components/admin/add-subject-modal";
import { toast } from "sonner";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Academics</h1>
        <p className="text-muted-foreground mt-1">Manage school classes, subjects, and academic structure.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/[0.03] border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <CardDescription>Active classroom units</CardDescription>
            </div>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/[0.03] border-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Core Subjects</CardTitle>
              <CardDescription>Curriculum components</CardDescription>
            </div>
            <BookOpen className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Class Directory</h2>
            <Button onClick={() => setIsClassModalOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Class
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Class Teacher</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No classes found. Create your first class to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.profiles?.full_name || "Not Assigned"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Subject Curriculum</h2>
            <Button onClick={() => setIsSubjectModalOpen(true)} size="sm" variant="secondary">
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No subjects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-xs font-bold uppercase">{sub.code}</TableCell>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
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
