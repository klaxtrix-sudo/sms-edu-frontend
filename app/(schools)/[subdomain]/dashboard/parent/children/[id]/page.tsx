"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, GraduationCap, Clock, CalendarDays, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ChildDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createTenantClient();

  useEffect(() => {
    const fetchChildDetails = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: student, error } = await supabase
          .from("students")
          .select(`
            *,
            classes (name),
            profiles!students_user_id_fkey (full_name, avatar_url, email, phone, gender, date_of_birth, address)
          `)
          .eq("id", id)
          .eq("parent_id", session.user.id)
          .single();

        if (error || !student) {
          throw new Error("Child not found or access denied.");
        }
        setChild(student);
      } catch (error: any) {
        toast.error(error.message);
        router.push("/dashboard/parent/children");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchChildDetails();
  }, [id, router, supabase]);

  if (loading || !child) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
         <Loader2 className="size-16 animate-spin text-primary/20" />
         <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Details...</p>
      </div>
    );
  }

  const profile = child.profiles;
  const className = child.classes?.name || "Unassigned";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-slate-500 font-bold hover:text-primary">
        <ArrowLeft className="mr-2 size-4" /> Back to Children
      </Button>

      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl flex flex-col md:flex-row items-center md:items-start gap-8">
        <Avatar className="size-40 rounded-[2.5rem] border-8 border-primary/5 shadow-2xl">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-black text-5xl">
            {profile?.full_name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center md:text-left space-y-4">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] px-4 py-1 rounded-full">
            {className}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 leading-none">{profile?.full_name}</h1>
          <p className="text-lg text-slate-500 font-bold uppercase tracking-widest">Adm No: {child.admission_no}</p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gender</span>
              <span className="font-bold text-slate-700 capitalize">{profile?.gender || 'N/A'}</span>
            </div>
            {profile?.date_of_birth && (
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">DOB</span>
                <span className="font-bold text-slate-700">{new Date(profile.date_of_birth).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-emerald-50/50 pb-6">
            <CardTitle className="text-emerald-700 flex items-center gap-2 text-xl font-black italic uppercase">
              <Clock className="size-5" /> Attendance
            </CardTitle>
            <CardDescription className="font-medium text-emerald-600/70">Current Term Overview</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-8">
               <div className="text-6xl font-black tabular-nums tracking-tighter text-slate-900">94<span className="text-2xl text-slate-400">%</span></div>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Present Days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-primary/5 pb-6">
            <CardTitle className="text-primary flex items-center gap-2 text-xl font-black italic uppercase">
              <GraduationCap className="size-5" /> Academics
            </CardTitle>
            <CardDescription className="font-medium text-primary/60">Average Grade</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-8">
               <div className="text-6xl font-black tabular-nums tracking-tighter text-slate-900">B+</div>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Satisfactory</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-amber-50 pb-6">
            <CardTitle className="text-amber-700 flex items-center gap-2 text-xl font-black italic uppercase">
              <CalendarDays className="size-5" /> Timetable
            </CardTitle>
            <CardDescription className="font-medium text-amber-600/70">Today's Schedule</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
               {/* Placeholder schedule */}
               <div className="flex justify-between items-center text-sm">
                 <span className="font-bold text-slate-700">Mathematics</span>
                 <span className="text-muted-foreground">08:00 AM</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="font-bold text-slate-700">English</span>
                 <span className="text-muted-foreground">09:00 AM</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="font-bold text-slate-700">Basic Science</span>
                 <span className="text-muted-foreground">10:30 AM</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
