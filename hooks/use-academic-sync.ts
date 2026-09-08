"use client";

import { useEffect, useRef } from "react";

export interface AcademicSyncEventDetail {
  type?: string;
  title?: string;
  message?: string;
  metadata?: {
    role?: string;
    action?: "assigned" | "unassigned";
    classId?: string;
    className?: string;
    [key: string]: unknown;
  };
}

/**
 * Custom hook that listens for real-time academic synchronization events
 * (such as class teacher assignments or removals) and tab visibility returns.
 *
 * @param onSync Callback executed to refresh data silently in the background without full-screen spinners.
 * @param deps Optional dependency array.
 */
export function useAcademicSync(
  onSync: (detail?: AcademicSyncEventDetail) => void | Promise<void>,
  deps: React.DependencyList = []
) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    // 1. Listen for real-time WebSocket broadcast bridge event
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<AcademicSyncEventDetail>;
      onSyncRef.current(customEvent.detail);
    };

    window.addEventListener("klaxtrix:academic-sync", handleSync);

    // 2. Tab visibility change: re-sync when user returns to this browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onSyncRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("klaxtrix:academic-sync", handleSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
