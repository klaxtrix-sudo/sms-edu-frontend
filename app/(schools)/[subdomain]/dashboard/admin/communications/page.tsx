"use client";

import { useEffect, useState } from "react";
import { 
  Send, 
  Users, 
  MessageSquare, 
  Smartphone, 
  History, 
  Loader2,
  Megaphone,
  Bell,
  AlertTriangle,
  Edit,
  Trash2,
  Calendar
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
import { getBackendUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminCommunicationsPage() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isSMSConfigured, setIsSMSConfigured] = useState(false);

  // Form states (Compose)
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [channel, setChannel] = useState("system");

  // Edit states
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editTargetRole, setEditTargetRole] = useState("all");
  const [editChannel, setEditChannel] = useState("system");

  // Delete states
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchHistory();
    checkSMSConfig();
  }, []);

  const checkSMSConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${getBackendUrl()}/broadcasts/config`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setIsSMSConfigured(data.isSMSConfigured);
        if (data.isSMSConfigured) {
          setChannel("all"); // Default to System + SMS if configured
        } else {
          setChannel("system"); // Default to App Notification only
        }
      }
    } catch (e) {
      console.error("Failed to fetch SMS configurations:", e);
    }
  };

  const fetchHistory = async () => {
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${getBackendUrl()}/broadcasts`, {
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

      // Simulate phones for SMS broadcast
      const mockPhones = ["+2348000000000", "+2349000000000"];

      const response = await fetch(`${getBackendUrl()}/broadcasts`, {
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
        toast.success("Announcement posted.");
        setTitle("");
        setMessage("");
        fetchHistory();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to post announcement");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditMessage(item.message);
    const roleVal = item.targetRoles.length > 1 ? "all" : item.targetRoles[0];
    setEditTargetRole(roleVal);
    setEditChannel(item.channel);
  };

  const handleUpdate = async () => {
    if (!editTitle || !editMessage) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/broadcasts/${editingItem._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: editTitle,
          message: editMessage,
          targetRoles: editTargetRole === "all" ? ["student", "teacher", "parent"] : [editTargetRole],
          channel: editChannel
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Announcement updated.");
        setEditingItem(null);
        fetchHistory();
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update announcement");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/broadcasts/${deletingId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Announcement deleted.");
        setDeletingId(null);
        fetchHistory();
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Announcements</h1>
          <p className="text-muted-foreground mt-1.5 text-base font-normal max-w-2xl">
            Send announcements and notice board updates to your school.
          </p>
        </div>
        <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
          <Megaphone className="size-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        
        {/* Compose Announcement Card */}
        <div className="xl:col-span-3">
          <Card className="border border-border/80 shadow-sm bg-card rounded-xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-lg font-semibold text-foreground">Compose Announcement</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Post bulletins to target roles via App Notifications or SMS.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Announcement Title</label>
                <Input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mid-Term Break Starts"
                  className="h-11 rounded-lg border-border focus-visible:ring-primary focus-visible:border-primary text-sm font-medium px-4 bg-background"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Target Audience</label>
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background font-medium px-4 text-sm">
                      <SelectValue placeholder="Select Target" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border">
                      <SelectItem value="all">Entire School</SelectItem>
                      <SelectItem value="teacher">Teaching Staff</SelectItem>
                      <SelectItem value="parent">Parents / Guardians</SelectItem>
                      <SelectItem value="student">Student Body</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Delivery Channel</label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background font-medium px-4 text-sm">
                      <SelectValue placeholder="Select Channel" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border">
                      <SelectItem value="system">App Notification Only</SelectItem>
                      <SelectItem value="all" disabled={!isSMSConfigured}>
                        System + SMS (Priority) {!isSMSConfigured && "(SMS Unconfigured)"}
                      </SelectItem>
                      <SelectItem value="sms" disabled={!isSMSConfigured}>
                        Direct SMS (Critical) {!isSMSConfigured && "(SMS Unconfigured)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {!isSMSConfigured && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 mt-1">
                      <AlertTriangle className="size-3" />
                      SMS isn't set up yet, so direct SMS options are turned off.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Message Body</label>
                <Textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your official announcement here..."
                  className="min-h-[150px] rounded-lg border border-border bg-background focus-visible:ring-primary focus-visible:border-primary text-sm font-normal p-4 leading-relaxed"
                />
              </div>

              <Button 
                onClick={handleSend}
                disabled={loading}
                className="w-full h-11 bg-primary text-white hover:bg-primary/95 rounded-lg font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Publish Announcement <Send className="size-4" />
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* History Card */}
        <div className="xl:col-span-2">
          <Card className="border border-border/80 shadow-sm bg-card rounded-xl p-6 min-h-[500px]">
            <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Post History</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Archive of school-wide announcements.</CardDescription>
              </div>
              <History className="size-4 text-primary/60" />
            </CardHeader>
            <CardContent className="p-0">
              {fetching ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="size-8 animate-spin text-primary/30" />
                </div>
              ) : history.length === 0 ? (
                <div className="py-20 text-center opacity-30">
                  <MessageSquare className="size-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-semibold text-xs text-muted-foreground">No announcements yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <HistoryItem 
                      key={item._id} 
                      item={item} 
                      onEdit={handleStartEdit} 
                      onDelete={(id) => setDeletingId(id)} 
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Announcement Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-lg rounded-2xl border bg-card p-6 shadow-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-foreground">Edit Announcement</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Edit the announcement. Changes apply everywhere it was sent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Announcement Title</label>
              <Input 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Announcement Title"
                className="h-11 rounded-lg border-border focus-visible:ring-primary focus-visible:border-primary text-sm font-medium px-4 bg-background"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Target Audience</label>
                <Select value={editTargetRole} onValueChange={setEditTargetRole}>
                  <SelectTrigger className="h-11 rounded-lg border-border bg-background font-medium px-4 text-sm">
                    <SelectValue placeholder="Select Target" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border">
                    <SelectItem value="all">Entire School</SelectItem>
                    <SelectItem value="teacher">Teaching Staff</SelectItem>
                    <SelectItem value="parent">Parents / Guardians</SelectItem>
                    <SelectItem value="student">Student Body</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Delivery Channel</label>
                <Select value={editChannel} onValueChange={setEditChannel}>
                  <SelectTrigger className="h-11 rounded-lg border-border bg-background font-medium px-4 text-sm">
                    <SelectValue placeholder="Select Channel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border">
                    <SelectItem value="system">App Notification Only</SelectItem>
                    <SelectItem value="all" disabled={!isSMSConfigured}>
                      System + SMS (Priority) {!isSMSConfigured && "(SMS Unconfigured)"}
                    </SelectItem>
                    <SelectItem value="sms" disabled={!isSMSConfigured}>
                      Direct SMS (Critical) {!isSMSConfigured && "(SMS Unconfigured)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Message Body</label>
              <Textarea 
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="Type message..."
                className="min-h-[120px] rounded-lg border border-border bg-background focus-visible:ring-primary focus-visible:border-primary text-sm font-normal p-4 leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditingItem(null)} className="h-11 rounded-lg font-medium text-sm px-6">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading} className="h-11 bg-primary text-white hover:bg-primary/95 rounded-lg font-semibold text-sm px-6 shadow-sm">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Announcement Modal */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md rounded-2xl border bg-card p-6 shadow-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Are you sure you want to delete this announcement? This will also remove the notifications already sent to people, and it can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-4 justify-end">
            <Button variant="outline" onClick={() => setDeletingId(null)} className="h-11 rounded-lg font-medium text-sm px-6">
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={loading} className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg font-semibold text-sm px-6 shadow-sm">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryItem({ item, onEdit, onDelete }: { item: any; onEdit: (item: any) => void; onDelete: (id: string) => void }) {
  const getIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <Smartphone className="size-3" />;
      case 'system': return <Bell className="size-3" />;
      default: return <Megaphone className="size-3" />;
    }
  };

  return (
    <div className="p-4 bg-slate-50/50 rounded-xl border border-border/50 group hover:border-primary/30 transition-all text-left">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="rounded-lg px-2 py-0.5 bg-primary/5 text-primary border-primary/10 font-semibold text-[10px] flex gap-1.5 items-center">
          {getIcon(item.channel)} {item.channel}
        </Badge>
        <span className="text-[10px] font-semibold text-muted-foreground/80">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      </div>
      <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">{item.title}</h4>
      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">
        {item.message}
      </p>
      <div className="flex items-center justify-between mt-4 border-t pt-3 border-border/40">
        <div className="flex gap-1.5">
          {item.targetRoles.map((role: string) => (
            <span key={role} className="text-[10px] font-semibold p-0.5 px-2 bg-background rounded border border-border text-muted-foreground opacity-80 uppercase">
              {role}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100/50" onClick={() => onEdit(item)}>
            <Edit className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(item._id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
