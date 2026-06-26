"use client";

import { useState, useEffect } from "react";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, GraduationCap, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ParentResultsPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createTenantClient();

  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: students, error } = await supabase
          .from("students")
          .select(`
            id,
            profiles!students_user_id_fkey (full_name)
          `)
          .eq("parent_id", session.user.id);

        if (error) throw error;
        setChildren(students || []);
        if (students && students.length > 0) {
          setSelectedChild(students[0].id);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load children");
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
         <Loader2 className="size-16 animate-spin text-primary/20" />
         <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Academic Results</h1>
          <p className="text-slate-500 mt-2 font-medium">View and download report cards for your children.</p>
        </div>
        
        {children.length > 0 && (
          <div className="w-full md:w-64">
            <Select value={selectedChild || ""} onValueChange={setSelectedChild}>
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map(child => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.profiles.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <Card className="border-none shadow-xl bg-white p-20 text-center rounded-[2rem]">
           <GraduationCap className="size-20 mx-auto text-muted-foreground opacity-20 mb-6" />
           <h3 className="text-2xl font-black text-slate-700">No children linked</h3>
           <p className="text-muted-foreground mt-2">Results will appear here once your children are linked to your account.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mocked results for the selected child */}
          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden group hover:shadow-lg transition-shadow">
            <CardHeader className="bg-primary/5 pb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-primary text-xl font-black italic uppercase">Term 2</CardTitle>
                <CardDescription className="font-bold text-primary/60">2023/2024 Academic Year</CardDescription>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold px-3">Published</Badge>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="size-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900">Termly Report Card</h4>
                  <p className="text-sm text-slate-500 font-medium">Available for download</p>
                </div>
              </div>
              <Button className="w-full rounded-xl h-12 font-bold" variant="outline">
                <Download className="mr-2 size-4" /> Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden group hover:shadow-lg transition-shadow opacity-75">
            <CardHeader className="bg-slate-50 pb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-slate-700 text-xl font-black italic uppercase">Term 1</CardTitle>
                <CardDescription className="font-bold text-slate-500">2023/2024 Academic Year</CardDescription>
              </div>
              <Badge variant="outline" className="text-slate-500 border-slate-200 font-bold px-3">Archived</Badge>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <FileText className="size-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-700">Termly Report Card</h4>
                  <p className="text-sm text-slate-500 font-medium">Available for download</p>
                </div>
              </div>
              <Button className="w-full rounded-xl h-12 font-bold" variant="outline">
                <Download className="mr-2 size-4" /> Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
