import { getBackendUrl } from "@/lib/utils";

export interface NotificationPayload {
  userId: string;
  type?: 'academic' | 'system' | 'result' | 'exam' | 'payment' | 'announcement';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Dispatches in-app notifications to the tenant MongoDB store via the backend API,
 * and broadcasts a lightweight real-time event via Supabase Realtime for instant toasts.
 */
export async function dispatchInAppNotifications(
  subdomain: string,
  notifications: NotificationPayload[],
  accessToken?: string,
  tenantSupabase?: unknown
): Promise<{ success: boolean; count: number }> {
  if (!notifications || notifications.length === 0) {
    return { success: true, count: 0 };
  }

  // 1. Dispatch to backend API (persists in MongoDB)
  let backendDispatched = false;
  try {
    const res = await fetch(`${getBackendUrl()}/notifications/dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ notifications }),
    });

    if (res.ok) {
      backendDispatched = true;
    } else {
      console.warn(`[Notification Dispatcher] Backend returned ${res.status}:`, await res.text());
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Notification Dispatcher] Failed to post notifications to backend:", message);
  }

  // 2. Broadcast real-time event via Supabase Realtime channel for instant toasts & badge counters
  if (tenantSupabase && typeof tenantSupabase === 'object' && 'channel' in (tenantSupabase as Record<string, any>)) {
    const client = tenantSupabase as {
      channel: (name: string) => {
        subscribe: () => Promise<unknown>;
        send: (msg: { type: 'broadcast'; event: string; payload: unknown }) => Promise<unknown>;
      };
      removeChannel: (channel: unknown) => void;
    };

    for (const n of notifications) {
      try {
        const notifChannel = client.channel(`user-notifications-${n.userId}`);
        await notifChannel.subscribe();
        await notifChannel.send({
          type: 'broadcast',
          event: 'notification',
          payload: n,
        });
        if (n.type === 'academic') {
          await notifChannel.send({
            type: 'broadcast',
            event: 'academic-sync',
            payload: n,
          });
        }
        client.removeChannel(notifChannel);

        const teacherChannel = client.channel(`teacher-sync-${n.userId}`);
        await teacherChannel.subscribe();
        await teacherChannel.send({
          type: 'broadcast',
          event: 'academic-sync',
          payload: n,
        });
        client.removeChannel(teacherChannel);
      } catch (realtimeErr: unknown) {
        const message = realtimeErr instanceof Error ? realtimeErr.message : String(realtimeErr);
        console.error("[Notification Dispatcher] Realtime broadcast error:", message);
      }
    }
  }

  return { success: backendDispatched, count: notifications.length };
}
