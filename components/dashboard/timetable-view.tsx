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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/components/providers/tenant-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAcademicSync } from "@/hooks/use-academic-sync";

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
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
  const { supabase } = useTenant();

  useEffect(() => {
    if (supabase) fetchTimetable();
  }, [classId, teacherId, supabase]);

  // Real-time synchronization: silently refresh timetable on assignment changes
  useAcademicSync(() => {
    if (supabase) fetchTimetable();
  });

  const fetchTimetable = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = supabase
        .from("timetables")
        .select(`
          *,
          subjects(name, code),
          classes(name),
          profiles:teacher_id(full_name)
        `)
        .order("start_time", { ascending: true });

      if (classId) {
        query = query.eq("class_id", classId);
      } else if (teacherId) {
        // Retrieve all timetable slots directly assigned to this teacher
        query = query.eq("teacher_id", teacherId);
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

  const currentWeekday = new Date().getDay();
  const defaultDay = (currentWeekday >= 1 && currentWeekday <= 5) ? currentWeekday : 1;
  const [mobileSelectedDay, setMobileSelectedDay] = useState<number | 'all'>(defaultDay);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 sm:p-20 gap-4">
        <Loader2 className="size-10 animate-spin text-primary/40" />
        <p className="text-muted-foreground font-bold animate-pulse text-sm">Syncing Weekly Schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/50 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl backdrop-blur-xl border border-border/50 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-primary">{title || "Weekly Schedule"}</h2>
          <p className="text-muted-foreground text-sm sm:text-base font-medium">{description || "Review your subject periods and room assignments."}</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 rounded-2xl text-primary font-black text-xs sm:text-sm uppercase tracking-widest self-start sm:self-auto shrink-0">
          <CalendarDays className="size-4 sm:size-5" />
          Active Session
        </div>
      </div>

      {/* Mobile Day-Picker Tab Bar */}
      <div className="block lg:hidden space-y-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 p-1 bg-muted/50 dark:bg-muted/30 rounded-2xl border border-border/60">
          {DAYS.map((day) => {
            const isActive = mobileSelectedDay === day.value;
            const count = timetable.filter(t => t.day_of_week === day.value).length;
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => setMobileSelectedDay(day.value)}
                className={cn(
                  "flex-1 min-w-[52px] py-2 px-1 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-0.5",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{day.short}</span>
                <span className={cn("text-[9px] px-1.5 rounded-full font-mono font-semibold", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground/60")}>
                  {count}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileSelectedDay('all')}
            className={cn(
              "py-2 px-2.5 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-0.5 shrink-0",
              mobileSelectedDay === 'all'
                ? "bg-background text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>All</span>
            <span className={cn("text-[9px] px-1.5 rounded-full font-mono font-semibold", mobileSelectedDay === 'all' ? "bg-primary/10 text-primary" : "text-muted-foreground/60")}>
              {timetable.length}
            </span>
          </button>
        </div>

        {/* Selected Day View for Mobile */}
        <div className="space-y-6">
          {(mobileSelectedDay === 'all' ? DAYS : DAYS.filter(d => d.value === mobileSelectedDay)).map((day) => {
            const daySlots = timetable.filter(item => item.day_of_week === day.value);
            return (
              <div key={day.value} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
                    {day.label}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                    {daySlots.length} {daySlots.length === 1 ? 'Period' : 'Periods'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {daySlots.map((item) => (
                    <PeriodCard key={item.id} item={item} teacherId={teacherId} />
                  ))}

                  {daySlots.length === 0 && (
                    <div className="h-20 rounded-2xl bg-muted/20 border border-dashed border-border/40 flex items-center justify-center text-xs text-muted-foreground/50 font-medium italic">
                      No periods scheduled on {day.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop 5-Day Columns Grid */}
      <div className="hidden lg:grid grid-cols-5 gap-6">
        {DAYS.map((day) => {
          const daySlots = timetable.filter(item => item.day_of_week === day.value);
          return (
            <div key={day.value} className="space-y-6">
              <div className="text-center p-3 rounded-2xl bg-muted/50 border border-border/50">
                <span className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">{day.label}</span>
              </div>
              
              <div className="space-y-4">
                {daySlots.map((item) => (
                  <PeriodCard key={item.id} item={item} teacherId={teacherId} />
                ))}
                
                {daySlots.length === 0 && (
                  <div className="h-24 rounded-2xl bg-muted/20 border border-dashed border-border/30 flex items-center justify-center text-xs text-muted-foreground/40 font-medium italic p-4 text-center">
                    Free Period
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodCard({ item, teacherId }: { item: any; teacherId?: string }) {
  return (
    <div className="relative group animate-in slide-in-from-top-2 duration-500">
      <Card className="border-none shadow-md bg-card/75 backdrop-blur-xl hover:translate-x-1 transition-all duration-300">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-full" />
        <CardHeader className="p-3.5 sm:p-4 pb-1">
          <CardTitle className="text-sm font-black flex items-center justify-between gap-2">
            <span className="line-clamp-1">{item.subjects?.name}</span>
            <span className="text-[10px] opacity-40 uppercase shrink-0">{item.subjects?.code}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-4 pt-1 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-tight">
            <Clock className="size-3 text-primary/60 shrink-0" />
            <span>{item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}</span>
          </div>
          {item.room && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70 italic bg-muted/30 p-1.5 rounded-lg w-fit">
              <MapPin className="size-3 text-primary/40 shrink-0" />
              <span>{item.room}</span>
            </div>
          )}
          {teacherId ? (
            <div className="text-[10px] font-black text-primary uppercase tracking-tighter pt-1 border-t border-border/30">
              {item.classes?.name}
            </div>
          ) : (
            item.profiles?.full_name && (
              <div className="text-[10px] font-medium text-muted-foreground/80 pt-1 border-t border-border/30 flex items-center gap-1.5">
                <span className="font-bold text-primary/70">Teacher:</span>
                <span className="italic truncate">{item.profiles.full_name}</span>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
