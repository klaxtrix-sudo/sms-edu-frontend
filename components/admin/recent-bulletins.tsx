"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bell, Calendar, Megaphone, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { getBackendUrl } from "@/lib/utils";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function RecentBulletins() {
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBulletin, setSelectedBulletin] = useState<any | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBulletins() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

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
        console.error('Failed to fetch live broadcasts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBulletins();
  }, []);

  const getIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <Smartphone className="size-4 text-primary" />;
      case 'system': return <Bell className="size-4 text-primary" />;
      default: return <Megaphone className="size-4 text-primary" />;
    }
  };

  return (
    <div className="lg:col-span-3 glass-panel rounded-[2rem] p-8 border border-white/5 bg-white/5 group overflow-hidden relative flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold">Recent Bulletins</h3>
          <Button variant="link" className="text-primary gap-2 p-0 group-hover:translate-x-1 transition-transform" asChild>
            <Link href="/dashboard/admin/communications">
              View All <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        
        <div className="space-y-4 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : bulletins.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm font-medium">
              No active announcements posted.
            </div>
          ) : (
            bulletins.slice(0, 2).map((broadcast: any) => {
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
                  className="group/item glass-panel !bg-white/[0.03] rounded-2xl p-6 border-white/5 hover:border-primary/30 transition-colors cursor-pointer block"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400 pointer-events-none capitalize">
                          {broadcast.channel}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          Posted {formattedDate}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg group-hover/item:text-primary transition-colors">
                        {broadcast.title}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {broadcast.message}
                      </p>
                    </div>
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                      <ArrowRight className="size-5" />
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
        <DialogContent className="max-w-md rounded-2xl border bg-card p-6 shadow-lg">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {selectedBulletin && getIcon(selectedBulletin.channel)}
                {selectedBulletin?.channel}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="size-3" />
                {selectedBulletin && new Date(selectedBulletin.createdAt).toLocaleDateString()}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold leading-snug">
              {selectedBulletin?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/80">
              Audience: {selectedBulletin?.targetRoles.join(", ")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedBulletin?.message}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Background animation blob */}
      <div className="absolute -bottom-24 -right-24 size-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
    </div>
  );
}
