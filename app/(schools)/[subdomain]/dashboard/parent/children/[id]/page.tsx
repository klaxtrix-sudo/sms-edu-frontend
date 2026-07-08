"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, GraduationCap, Clock, CalendarDays, Heart, MapPin, BookOpen, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimetableView } from "@/components/dashboard/timetable-view";
import { useParentChildren } from "@/hooks/use-parent-children";
import { useChildAcademics } from "@/hooks/use-child-academics";
import { useTenant } from "@/components/providers/tenant-provider";
import { ErrorState } from "@/components/dashboard/query-states";
import { getBackendUrl } from "@/lib/utils";
import { gradeRemark } from "@/lib/grade-scale";

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  totalPoints: number;
}

interface ExamTimetableEntry {
  id: string;
  exam_title: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
}

export default function ChildDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const childId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : undefined;
  const { child, loading, error, refetch } = useParentChildren(childId);
  const { academicCycle } = useTenant();
  const { attendancePct, avgGrade, avgScore, results } = useChildAcademics(
    childId,
    academicCycle?.academicYear,
    academicCycle?.currentTerm
  );
  const { supabase } = useTenant();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [examTimetable, setExamTimetable] = useState<ExamTimetableEntry[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  // Fetch assignments + exam timetable for the child's class.
  useEffect(() => {
    if (!child?.class_id || !supabase) return;
    const fetchExtras = async () => {
      setLoadingExtras(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const headers = { "Authorization": `Bearer ${session.access_token}` };

        const [assignRes, examRes] = await Promise.all([
          fetch(`${getBackendUrl()}/assignments/class/${child.class_id}`, { headers }),
          fetch(`${getBackendUrl()}/exam-timetables?classId=${child.class_id}`, { headers }),
        ]);

        const [assignData, examData] = await Promise.all([assignRes.json(), examRes.json()]);
        if (assignData.success) setAssignments(assignData.data || []);
        if (examData.success) setExamTimetable(examData.data || []);
      } catch (e) {
        console.error("Failed to fetch assignments/exam timetable:", e);
      } finally {
        setLoadingExtras(false);
      }
    };
    fetchExtras();
  }, [child?.class_id, supabase]);

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
         <Loader2 className="size-16 animate-spin text-primary/20" />
         <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Details...</p>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button variant="ghost" onClick={() => router.push("/dashboard/parent/children")} className="mb-4 text-slate-500 font-bold hover:text-primary">
          <ArrowLeft className="mr-2 size-4" /> Back to Children
        </Button>
        <ErrorState
          message={error || "Child not found or you do not have access to this record."}
          onRetry={refetch}
        />
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

      {/* Profile Header */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl flex flex-col md:flex-row items-center md:items-start gap-8">
        <Avatar className="size-40 rounded-[2.5rem] border-8 border-primary/5 shadow-2xl">
          <AvatarImage src={profile?.avatar_url || undefined} />
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
              <span className="font-bold text-slate-700 capitalize">{child.gender || 'N/A'}</span>
            </div>
            {child.date_of_birth && (
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">DOB</span>
                <span className="font-bold text-slate-700">{new Date(child.date_of_birth).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance + Academics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-emerald-50/50 pb-6">
            <CardTitle className="text-emerald-700 flex items-center gap-2 text-xl font-black italic uppercase">
              <Clock className="size-5" /> Attendance
            </CardTitle>
            <CardDescription className="font-medium text-emerald-600/70">Current Term Overview</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-8">
               <div className="text-6xl font-black tabular-nums tracking-tighter text-slate-900">
                 {attendancePct !== null ? (
                   <>{attendancePct}<span className="text-2xl text-slate-400">%</span></>
                 ) : (
                   <span className="text-2xl text-slate-400">No records</span>
                 )}
               </div>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Present Days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-primary/5 pb-6">
            <CardTitle className="text-primary flex items-center gap-2 text-xl font-black italic uppercase">
              <GraduationCap className="size-5" /> Academics
            </CardTitle>
            <CardDescription className="font-medium text-primary/60">Average Grade · {academicCycle?.academicYear || ""} Term {academicCycle?.currentTerm || 1}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-8">
               <div className="text-6xl font-black tabular-nums tracking-tighter text-slate-900">
                 {avgGrade !== null ? avgGrade : <span className="text-2xl text-slate-400">No results</span>}
               </div>
               {avgScore !== null && (
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{avgScore}/100 · {gradeRemark(avgGrade || "")}</p>
               )}
               {results.length > 0 && (
                 <div className="mt-4 space-y-1 text-left max-h-32 overflow-y-auto">
                   {results.slice(0, 5).map((r) => (
                     <div key={r.id} className="flex justify-between text-xs py-1 border-b border-slate-50">
                       <span className="font-bold text-slate-600">{r.subject_name}</span>
                       <span className="font-black text-primary">{r.total_score} ({r.grade})</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timetable */}
      <TimetableView
        classId={child.class_id || undefined}
        title="Class Schedule"
        description="Weekly subject periods and classroom assignments."
      />

      {/* Assignments + Exam Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-violet-50 pb-6">
            <CardTitle className="text-violet-700 flex items-center gap-2 text-xl font-black italic uppercase">
              <BookOpen className="size-5" /> Assignments
            </CardTitle>
            <CardDescription className="font-medium text-violet-600/70">Current homework for {className}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingExtras ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-violet-300" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground italic">No assignments posted yet.</div>
            ) : (
              <div className="space-y-3">
                {assignments.slice(0, 5).map((a) => (
                  <div key={a._id} className="flex items-center justify-between p-3 bg-violet-50/30 rounded-xl border border-violet-100/50">
                    <div>
                      <p className="font-bold text-sm text-slate-700">{a.title}</p>
                      <p className="text-xs text-muted-foreground">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold capitalize">{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-amber-50 pb-6">
            <CardTitle className="text-amber-700 flex items-center gap-2 text-xl font-black italic uppercase">
              <CalendarDays className="size-5" /> Exam Timetable
            </CardTitle>
            <CardDescription className="font-medium text-amber-600/70">Upcoming exams for {className}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingExtras ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-amber-300" />
              </div>
            ) : examTimetable.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground italic">No exams scheduled yet.</div>
            ) : (
              <div className="space-y-3">
                {examTimetable.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-amber-50/30 rounded-xl border border-amber-100/50">
                    <div>
                      <p className="font-bold text-sm text-slate-700">{e.exam_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.exam_date).toLocaleDateString()} · {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}
                        {e.room && ` · ${e.room}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health & Background */}
      <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-rose-50 pb-6">
          <CardTitle className="text-rose-700 flex items-center gap-2 text-xl font-black italic uppercase">
            <Heart className="size-5" /> Health &amp; Background
          </CardTitle>
          <CardDescription className="font-medium text-rose-600/70">Medical and demographic information on file</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoField label="Blood Group" value={child.blood_group || null} />
            <InfoField label="Genotype" value={child.genotype || null} />
            <InfoField label="Medical Conditions" value={child.medical_conditions || null} />
            <InfoField label="State of Origin" value={child.state_of_origin || null} />
            <InfoField label="LGA" value={child.lga || null} />
            <InfoField label="Religion" value={child.religion || null} />
            <InfoField label="Residential Address" value={child.residential_address || null} />
            <InfoField label="Previous School" value={child.previous_school || null} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-sm text-slate-700">{value || <span className="text-muted-foreground italic font-normal">Not provided</span>}</p>
    </div>
  );
}
