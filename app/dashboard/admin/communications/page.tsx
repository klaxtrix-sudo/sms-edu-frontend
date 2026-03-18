"use client";

import { useEffect, useState } from "react";
import { 
  Send, 
  Users, 
  MessageSquare, 
  Smartphone, 
  History, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Bell,
  Filter,
  Search
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function AdminCommunicationsPage() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [channel, setChannel] = useState("all");

  const supabase = createClient();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/broadcasts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch broadcast history");
    } finally {
      setFetching(false);
    }
  };

  const handleSend = async () => {
    if (!title || !message) {
      toast.error("Please provide both a title and message.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // In a real scenario, we'd fetch actual phone numbers for the target role
      // For this implementation, we simulate phones for the Termii mock
      const mockPhones = ["+2348000000000", "+2349000000000"];

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/broadcasts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title,
          message,
          targetRoles: targetRole === "all" ? ["student", "teacher", "parent"] : [targetRole],
          channel,
          phones: channel === "all" || channel === "sms" ? mockPhones : []
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Broadcast dispatched successfully!");
        setTitle("");
        setMessage("");
        fetchHistory();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send broadcast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-primary italic uppercase leading-none">Global Broadcast</h1>
          <p className="text-muted-foreground mt-2 text-xl font-medium max-w-2xl opacity-80">
            Dispatch multi-channel announcements to the entire school ecosystem.
          </p>
        </div>
        <div className="size-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-2xl animate-pulse">
           <Megaphone className="size-10 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
        <div className="xl:col-span-3 space-y-10">
          <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-10">
             <CardHeader className="p-0 mb-8">
                <CardTitle className="text-2xl font-black tracking-tighter uppercase italic text-primary">Compose Message</CardTitle>
                <CardDescription className="text-sm font-bold opacity-60">High-delivery outreach via System and Direct SMS.</CardDescription>
             </CardHeader>
             <CardContent className="p-0 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-2">Announcement Title</label>
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mid-Term Break Commencement"
                    className="h-16 rounded-2xl border-2 border-border/50 bg-background/50 focus-visible:ring-primary focus-visible:border-primary text-lg font-bold px-6"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-2">Target Audience</label>
                      <Select value={targetRole} onValueChange={setTargetRole}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-border/50 bg-background/50 font-bold px-6">
                          <SelectValue placeholder="Select Target" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2">
                          <SelectItem value="all">Entire School</SelectItem>
                          <SelectItem value="teacher">Teaching Staff</SelectItem>
                          <SelectItem value="parent">Parents / Guardians</SelectItem>
                          <SelectItem value="student">Student Body</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-2">Delivery Channel</label>
                      <Select value={channel} onValueChange={setChannel}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-border/50 bg-background/50 font-bold px-6">
                          <SelectValue placeholder="Select Channel" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2">
                          <SelectItem value="all">System + SMS (Priority)</SelectItem>
                          <SelectItem value="system">App Notification Only</SelectItem>
                          <SelectItem value="sms">Direct SMS (Critical)</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-2">Message Body</label>
                  <Textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your official announcement here..."
                    className="min-h-[200px] rounded-3xl border-2 border-border/50 bg-background/50 focus-visible:ring-primary focus-visible:border-primary text-lg font-medium p-8 leading-relaxed"
                  />
                </div>

                <Button 
                  onClick={handleSend}
                  disabled={loading}
                  className="w-full h-20 bg-primary text-white hover:bg-primary/90 rounded-[2rem] font-black text-2xl shadow-4xl transition-all active:scale-95 uppercase tracking-tighter italic"
                >
                  {loading ? (
                    <Loader2 className="size-8 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-3">
                      Dispatch Global Alert <Send className="size-6" />
                    </span>
                  )}
                </Button>
             </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2 space-y-10">
           <Card className="border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-10 min-h-[600px]">
              <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between">
                <div>
                   <CardTitle className="text-2xl font-black tracking-tighter uppercase italic text-primary">Dispatch History</CardTitle>
                   <CardDescription className="text-sm font-bold opacity-60">Archive of school-wide announcements.</CardDescription>
                </div>
                <History className="size-5 text-primary/40" />
              </CardHeader>
              <CardContent className="p-0">
                 {fetching ? (
                   <div className="py-20 flex flex-col items-center gap-4">
                      <Loader2 className="size-10 animate-spin text-primary/20" />
                   </div>
                 ) : history.length === 0 ? (
                   <div className="py-20 text-center opacity-20">
                      <MessageSquare className="size-16 mx-auto mb-4" />
                      <p className="font-black uppercase tracking-widest text-xs">No Records Yet</p>
                   </div>
                 ) : (
                   <div className="space-y-6">
                      {history.map((item) => (
                        <HistoryItem key={item._id} item={item} />
                      ))}
                   </div>
                 )}
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ item }: { item: any }) {
  const getIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <Smartphone className="size-4" />;
      case 'system': return <Bell className="size-4" />;
      default: return <Megaphone className="size-4" />;
    }
  };

  return (
    <div className="p-6 bg-muted/30 rounded-[2rem] border border-border/50 group hover:border-primary/30 transition-all text-left">
       <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="rounded-full px-3 py-1 bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest flex gap-2 items-center">
             {getIcon(item.channel)} {item.channel}
          </Badge>
          <span className="text-[10px] font-black uppercase text-muted-foreground opacity-40">
             {new Date(item.createdAt).toLocaleDateString()}
          </span>
       </div>
       <h4 className="text-lg font-black tracking-tighter uppercase italic group-hover:text-primary transition-colors">{item.title}</h4>
       <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed font-medium">
          {item.message}
       </p>
       <div className="flex flex-wrap gap-2 mt-4">
          {item.targetRoles.map((role: string) => (
             <span key={role} className="text-[9px] font-black uppercase p-1 px-2 bg-background rounded-md text-muted-foreground opacity-60 border border-border">
                {role}
             </span>
          ))}
       </div>
    </div>
  );
}
