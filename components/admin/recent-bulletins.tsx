"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bell, Calendar, Megaphone, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/components/providers/tenant-provider";
import { getBackendUrl } from "@/lib/utils";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface RecentBulletinsProps {
  initialBulletins?: any[];
}

export function RecentBulletins({ initialBulletins }: RecentBulletinsProps) {
  const { supabase, isLoading: isTenantLoading } = useTenant();
  const [bulletins, setBulletins] = useState<any[]>(initialBulletins || []);
  const [loading, setLoading] = useState(!initialBulletins);
  const [selectedBulletin, setSelectedBulletin] = useState<any | null>(null);

  useEffect(() => {
    if (initialBulletins) {
      setBulletins(initialBulletins);
      setLoading(false);
      return;
    }

    async function fetchBulletins() {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${getBackendUrl()}/broadcasts`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const result = await response.json();
        if (result.success) {
          setBulletins(result.data || []);
        }
      } catch (error) {
        console.error('[RecentBulletins] Failed to fetch broadcasts:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!isTenantLoading && supabase) {
      fetchBulletins();
    }
  }, [supabase, isTenantLoading, initialBulletins]);

  const getIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <Smartphone className="size-3.5 text-primary" />;
      case 'system': return <Bell className="size-3.5 text-primary" />;
      default: return <Megaphone className="size-3.5 text-primary" />;
    }
  };

  return (
    <div className="lg:col-span-3 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-border/50 bg-card/40 backdrop-blur-xl group overflow-hidden relative flex flex-col justify-between shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div className="space-y-0.5">
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Megaphone className="size-4 text-primary" />
              Recent Bulletins
            </h3>
            <p className="text-xs text-muted-foreground font-medium">Broadcasts and institution notices</p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs font-bold text-primary gap-1.5 h-8 px-2.5 rounded-lg group-hover:translate-x-0.5 transition-transform" asChild>
            <Link href="/dashboard/admin/communications">
              View All <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        
        <div className="space-y-3 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : bulletins.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs font-medium border border-dashed border-border/60 rounded-2xl p-6">
              No active announcements posted. Use Quick Actions or Communications to broadcast an update.
            </div>
          ) : (
            bulletins.slice(0, 3).map((broadcast: any) => {
              const dateObj = new Date(broadcast.createdAt);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              return (
                <div 
                  key={broadcast._id} 
                  onClick={() => setSelectedBulletin(broadcast)}
                  className="group/item rounded-xl p-4 border border-border/50 bg-background/50 hover:border-primary/40 hover:bg-background/80 transition-all cursor-pointer block shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold capitalize py-0 px-2">
                          {broadcast.channel}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {formattedDate}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-foreground group-hover/item:text-primary transition-colors truncate">
                        {broadcast.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {broadcast.message}
                      </p>
                    </div>
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 mt-1">
                      <ArrowRight className="size-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedBulletin} onOpenChange={(open) => !open && setSelectedBulletin(null)}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-2xl">
          <DialogHeader className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                {selectedBulletin && getIcon(selectedBulletin.channel)}
                {selectedBulletin?.channel}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 pr-6">
                <Calendar className="size-3" />
                {selectedBulletin && new Date(selectedBulletin.createdAt).toLocaleDateString()}
              </span>
            </div>
            <DialogTitle className="text-lg font-bold leading-snug text-foreground">
              {selectedBulletin?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Target: {selectedBulletin?.targetRoles?.join(", ") || "School Community"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedBulletin?.message}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
