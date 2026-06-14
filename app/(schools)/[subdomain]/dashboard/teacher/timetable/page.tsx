"use client";

import { useEffect, useState } from "react";
import { TimetableView } from "@/components/dashboard/timetable-view";
import { useTenant } from "@/components/providers/tenant-provider";
import { Loader2 } from "lucide-react";

export default function TeacherTimetablePage() {
  const { supabase, isLoading: isTenantLoading } = useTenant();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getTeacherId() {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      setTeacherId(user?.id || null);
      setLoading(false);
    }
    getTeacherId();
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
        teacherId={teacherId || undefined} 
        title="My Teaching Schedule" 
        description="Track your scheduled periods across all assigned classrooms."
      />
    </div>
  );
}
