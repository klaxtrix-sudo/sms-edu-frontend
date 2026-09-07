"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/components/providers/tenant-provider";
import { getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Bell, Smartphone, Megaphone, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ParentNotificationsPage() {
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { supabase } = useTenant();

  useEffect(() => {
    if (!supabase) return;
    const fetchBulletins = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${getBackendUrl()}/broadcasts`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const result = await res.json();
        if (result.success && result.data) {
          setBulletins(result.data);
        }
      } catch (error: any) {
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };
    fetchBulletins();
  }, [supabase]);

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
         <Loader2 className="size-16 animate-spin text-primary/20" />
         <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="text-center md:text-left">
        <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">School Notifications</h1>
        <p className="text-muted-foreground mt-2 font-medium">Stay updated with the latest announcements from the school.</p>
      </div>

      {bulletins.length === 0 ? (
        <Card className="border border-border/80 shadow-xl bg-card p-20 text-center rounded-[2rem]">
           <Bell className="size-20 mx-auto text-muted-foreground opacity-20 mb-6" />
           <h3 className="text-2xl font-black text-foreground">No Notifications</h3>
           <p className="text-muted-foreground mt-2">You're all caught up! New announcements will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {bulletins.map(bulletin => {
            const dateObj = new Date(bulletin.createdAt);
            
            return (
              <Card key={bulletin._id} className="border border-border/80 shadow-md hover:shadow-lg transition-all duration-300 rounded-[2rem] overflow-hidden group bg-card">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:w-32 md:border-r border-border md:pr-6 shrink-0">
                       <div className="text-center">
                          <div className="text-4xl font-black tracking-tighter text-foreground">{dateObj.getDate()}</div>
                          <div className="text-sm font-bold uppercase tracking-widest text-primary mt-1">{dateObj.toLocaleString('en-US', { month: 'short' })}</div>
                       </div>
                       <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[9px] mt-0 md:mt-4">
                          {bulletin.channel}
                       </Badge>
                    </div>
                    <div className="flex-1 space-y-4">
                       <h3 className="text-2xl font-bold tracking-tight text-foreground leading-snug group-hover:text-primary transition-colors uppercase">{bulletin.title}</h3>
                       <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{bulletin.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
