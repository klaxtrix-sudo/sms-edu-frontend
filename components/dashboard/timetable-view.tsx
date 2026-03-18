"use client";

import { useEffect, useState } from "react";
import { 
  Clock, 
  MapPin,
  BookOpen,
  Loader2,
  CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

interface TimetableViewProps {
  classId?: string;
  teacherId?: string;
  title?: string;
  description?: string;
}

export function TimetableView({ classId, teacherId, title, description }: TimetableViewProps) {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchTimetable();
  }, [classId, teacherId]);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("timetables")
        .select(`
          *,
          subjects(name, code),
          classes(name)
        `)
        .order("start_time", { ascending: true });

      if (classId) {
        query = query.eq("class_id", classId);
      } else if (teacherId) {
        // Find classes where this teacher is a class teacher OR teaches subjects (later integration)
        // For now, only class teacher schedules if teacherId is provided
        const { data: teacherClasses } = await supabase
          .from("classes")
          .select("id")
          .eq("class_teacher_id", teacherId);
        
        const teacherClassIds = (teacherClasses as any[])?.map(c => c.id) || [];
        if (teacherClassIds.length > 0) {
          query = query.in("class_id", teacherClassIds);
        } else {
          setTimetable([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setTimetable(data || []);
    } catch (error) {
      toast.error("Failed to sync timetable");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="size-10 animate-spin text-primary/40" />
        <p className="text-muted-foreground font-bold animate-pulse">Syncing Weekly Schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 p-8 rounded-3xl backdrop-blur-xl border border-border/50 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tighter text-primary">{title || "Weekly Schedule"}</h2>
          <p className="text-muted-foreground font-medium">{description || "Review your subject periods and room assignments."}</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl text-primary font-black text-sm uppercase tracking-widest">
            <CalendarDays className="size-5" />
            Active Session
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {DAYS.map((day) => (
          <div key={day.value} className="space-y-6">
            <div className="text-center p-3 rounded-2xl bg-muted/50 border border-border/50">
              <span className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">{day.label}</span>
            </div>
            
            <div className="space-y-4">
              {timetable
                .filter(item => item.day_of_week === day.value)
                .map((item) => (
                  <div key={item.id} className="relative group animate-in slide-in-from-top-2 duration-500">
                    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl hover:translate-x-1 transition-all duration-300">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-full" />
                      <CardHeader className="p-4 pb-1">
                        <CardTitle className="text-sm font-black flex items-center justify-between gap-2">
                          <span className="line-clamp-1">{item.subjects?.name}</span>
                          <span className="text-[10px] opacity-40 uppercase">{item.subjects?.code}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-1 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-tight">
                          <Clock className="size-3 text-primary/60" />
                          {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                        </div>
                        {item.room && (
                          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/70 italic bg-muted/30 p-1.5 rounded-lg w-fit">
                            <MapPin className="size-3 text-primary/40" />
                            {item.room}
                          </div>
                        )}
                        {teacherId && (
                           <div className="text-[10px] font-black text-primary uppercase tracking-tighter pt-1 border-t border-border/30">
                              {item.classes?.name}
                           </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              
              {timetable.filter(item => item.day_of_week === day.value).length === 0 && (
                <div className="h-24 rounded-2xl bg-muted/20 border border-dashed border-border/30 flex items-center justify-center text-xs text-muted-foreground/40 font-medium italic p-4 text-center">
                  Free Period
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
