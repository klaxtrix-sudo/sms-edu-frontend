"use client";

import { useEffect, useState } from "react";
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  MapPin,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddTimetableEntryModal } from "@/components/admin/add-timetable-entry-modal";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

export default function AdminTimetablePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createTenantClient();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) fetchTimetable();
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from("classes").select("*");
      setClasses(data || []);
      if (data && data.length > 0) {
        setSelectedClass(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      toast.error("Failed to load classes");
      setLoading(false);
    }
  };

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("timetables")
        .select(`
          *,
          subjects(name, code),
          profiles:teacher_id(full_name)
        `)
        .eq("class_id", selectedClass)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setTimetable(data || []);
    } catch (error) {
      toast.error("Error loading timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this slot?")) return;
    try {
      const { error } = await supabase.from("timetables").delete().eq("id", id);
      if (error) throw error;
      toast.success("Period removed from schedule");
      fetchTimetable();
    } catch (error) {
      toast.error("Deletion failed");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary">Academic Scheduler</h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage weekly subject rotations and room assignments.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Current Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[220px] bg-background/50 border-none ring-1 ring-border rounded-xl font-bold shadow-lg">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-5 flex gap-2">
                 <AddTimetableEntryModal onSuccess={fetchTimetable} defaultClassId={selectedClass} />
                 <Button variant="outline" size="icon" className="size-10 rounded-xl shadow-lg">
                    <Download className="size-4" />
                 </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {DAYS.map((day) => (
          <div key={day.value} className="space-y-4">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
              <span className="text-sm font-black uppercase tracking-widest text-primary">{day.label}</span>
            </div>
            
            <div className="space-y-4 min-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="size-6 animate-spin text-primary/30" />
                </div>
              ) : (
                timetable
                  .filter(item => item.day_of_week === day.value)
                  .map((item) => (
                    <ScheduleCard key={item.id} item={item} onDelete={handleDelete} />
                  ))
              )}

              {!loading && timetable.filter(item => item.day_of_week === day.value).length === 0 && (
                <div className="border-2 border-dashed border-muted/50 rounded-2xl h-32 flex items-center justify-center text-muted-foreground text-xs italic p-4 text-center">
                  No subjects scheduled.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleCard({ item, onDelete }: any) {
  return (
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-primary/70">{item.subjects?.code}</div>
          <button 
            onClick={() => onDelete(item.id)}
            className="size-6 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
        <CardTitle className="text-sm font-black mt-1 line-clamp-1">{item.subjects?.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
          <Clock className="size-3" />
          {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
        </div>
        {item.room && (
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground italic">
            <MapPin className="size-3" />
            {item.room}
          </div>
        )}
        {item.profiles?.full_name && (
          <div className="text-[10px] font-medium text-muted-foreground/80 border-t border-border/20 pt-1.5 mt-1.5 flex items-center gap-1.5">
            <span className="font-bold text-primary/70">Teacher:</span>
            <span className="italic">{item.profiles.full_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
