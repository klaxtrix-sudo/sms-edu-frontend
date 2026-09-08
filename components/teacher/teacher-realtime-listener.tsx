"use client";

import { useEffect } from "react";
import { useTenant } from "@/components/providers/tenant-provider";

interface TeacherRealtimeListenerProps {
  userId: string;
}

/**
 * Headless real-time observer component for the Teacher Dashboard.
 * Subscribes to the teacher's private Supabase Realtime channel and Postgres
 * table changes, dispatching application-wide synchronization events to ensure
 * all teacher dashboard components react immediately without a full-page reload.
 */
export function TeacherRealtimeListener({ userId }: TeacherRealtimeListenerProps) {
  const { supabase } = useTenant();

  useEffect(() => {
    if (!userId || !supabase) return;

    // 1. Subscribe to teacher's private Realtime channel for instant broadcast events
    const broadcastChannel = supabase
      .channel(`teacher-sync-${userId}`)
      .on("broadcast", { event: "notification" }, (eventPayload) => {
        const payload = (eventPayload as { payload?: { type?: string; metadata?: Record<string, unknown> } })?.payload;
        if (payload?.type === "academic" || payload?.metadata?.role === "class_teacher") {
          window.dispatchEvent(new CustomEvent("klaxtrix:academic-sync", { detail: payload }));
        }
      })
      .on("broadcast", { event: "academic-sync" }, (eventPayload) => {
        const payload = (eventPayload as { payload?: unknown })?.payload;
        window.dispatchEvent(new CustomEvent("klaxtrix:academic-sync", { detail: payload }));
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classes",
        },
        (payload) => {
          window.dispatchEvent(new CustomEvent("klaxtrix:academic-sync", { detail: payload }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, [userId, supabase]);

  return null;
}
