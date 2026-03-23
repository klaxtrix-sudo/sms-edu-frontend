"use client";

import { useEffect, useState } from "react";
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  CreditCard,
  Trash2,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getBackendUrl } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationDrawer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${getBackendUrl()}/notifications`, {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (result.success) setNotifications(result.data);
    } catch (error) {
      console.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`${getBackendUrl()}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${authSession?.access_token}` },
      });
      const result = await res.json();
      if (result.success) {
        setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
      }
    } catch (error) {
      toast.error("Error marking as read");
    }
  };

  const markAllRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${getBackendUrl()}/notifications/read-all`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success("Everything caught up!");
    } catch (error) {
      toast.error("Cleanup failed");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
      case 'result': return <CheckCircle2 className="size-5 text-green-500" />;
      case 'error': return <AlertCircle className="size-5 text-destructive" />;
      case 'payment': return <CreditCard className="size-5 text-primary" />;
      case 'exam': return <MessageSquare className="size-5 text-orange-500" />;
      default: return <Bell className="size-5 text-muted-foreground" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl font-bold">Notifications</SheetTitle>
              <SheetDescription>Stay updated with academic and financial alerts.</SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-primary text-xs font-semibold hover:bg-primary/10">
                Mark all as read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="size-20 bg-accent/40 rounded-full flex items-center justify-center mb-6">
                <Bell className="size-10 text-muted-foreground opacity-30" />
              </div>
              <h3 className="text-xl font-bold">All caught up!</h3>
              <p className="text-muted-foreground mt-2">New notifications will appear here as they arrive.</p>
            </div>
          )}

          <div className="divide-y">
            {notifications.map((n) => (
              <div 
                key={n._id} 
                className={cn(
                  "p-6 transition-colors hover:bg-accent/50 group cursor-pointer relative",
                  !n.read && "bg-primary/[0.03]"
                )}
                onClick={() => !n.read && markAsRead(n._id)}
              >
                {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                <div className="flex gap-4">
                  <div className="mt-1">{getIcon(n.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={cn("text-sm font-semibold", !n.read ? "text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
