"use client";

import { useEffect, useState } from "react";
import { TimetableView } from "@/components/dashboard/timetable-view";
import { useTenant } from "@/components/providers/tenant-provider";
import { Loader2 } from "lucide-react";

export default function StudentTimetablePage() {
  const { supabase, isLoading: isTenantLoading } = useTenant();
  const [classId, setClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudentClass() {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student } = await supabase
        .from("students")
        .select("class_id")
        .eq("user_id", user.id)
        .single();

      setClassId((student as any)?.class_id || null);
      setLoading(false);
    }
    fetchStudentClass();
  }, [supabase]);

  if (isTenantLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-10 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      <TimetableView 
        classId={classId || undefined} 
        title="My Class Schedule" 
        description="Review your weekly subject periods and classroom assignments."
      />
    </div>
  );
}
