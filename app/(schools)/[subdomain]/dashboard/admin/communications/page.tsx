"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  Calendar,
  GraduationCap,
  CreditCard,
  Radio,
  CheckCircle2,
  Lock,
  Search,
  Eye,
  RefreshCw,
  Info,
  ExternalLink,
  FileText,
  Sparkles,
  Layers,
  ChevronRight
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getBackendUrl } from "@/lib/utils";
import { useTenant } from "@/components/providers/tenant-provider";

type BroadcastCategory = 'general' | 'urgent' | 'academic' | 'event' | 'fees';
type DeliveryChannel = 'all' | 'system' | 'sms';
type TargetRole = 'admin' | 'teacher' | 'student' | 'parent';

interface BroadcastItem {
  _id: string;
  title: string;
  message: string;
  category: BroadcastCategory;
  targetRoles: TargetRole[];
  targetClassId?: string | null;
  channel: DeliveryChannel;
  senderId: string;
  schoolId: string;
  recipientCount?: number;
  smsCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface StatsData {
  totalAnnouncements: number;
  totalInAppDelivered: number;
  totalSMSDispatched: number;
}

interface ClassOption {
  id: string;
  name: string;
}

const CATEGORY_CONFIG: Record<BroadcastCategory, { label: string; icon: any; colorClass: string; badgeClass: string }> = {
  general: {
    label: "General Notice",
    icon: Megaphone,
    colorClass: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  urgent: {
    label: "Urgent Bulletin",
    icon: AlertTriangle,
    colorClass: "text-rose-600 dark:text-rose-400",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
  academic: {
    label: "Academic Notice",
    icon: GraduationCap,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  },
  event: {
    label: "Event & Assembly",
    icon: Calendar,
    colorClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  fees: {
    label: "Tuition & Fees",
    icon: CreditCard,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
};

const PRESET_TEMPLATES = [
  {
    name: "Mid-Term Resumption",
    category: "academic" as BroadcastCategory,
    title: "Mid-Term Resumption Notice",
    targetRoles: ["student", "parent", "teacher"] as TargetRole[],
    message: "Dear Parents and Students, Klaxtrix Academy resumes academic sessions on Monday at 7:45 AM prompt. All students are expected in full school uniform.",
  },
  {
    name: "Fee Settlement Notice",
    category: "fees" as BroadcastCategory,
    title: "Tuition & Outstanding Fee Settlement",
    targetRoles: ["parent"] as TargetRole[],
    message: "Dear Parent/Guardian, this is a kind reminder that outstanding term tuition fees must be settled by Friday. Thank you for your continued partnership.",
  },
  {
    name: "PTA General Assembly",
    category: "event" as BroadcastCategory,
    title: "General PTA Assembly Notice",
    targetRoles: ["parent", "teacher"] as TargetRole[],
    message: "The Term PTA General Meeting will convene this Saturday at 10:00 AM in the School Assembly Hall. Your attendance and valuable insights are highly appreciated.",
  },
  {
    name: "Examination Schedule",
    category: "academic" as BroadcastCategory,
    title: "Official Examination Timetable Published",
    targetRoles: ["student", "parent", "teacher"] as TargetRole[],
    message: "The official examination timetable has been published on the school portal. Please ensure students review dates and come well prepared.",
  },
  {
    name: "Emergency Weather Closure",
    category: "urgent" as BroadcastCategory,
    title: "Urgent: Early Dismissal Notice",
    targetRoles: ["student", "parent", "teacher"] as TargetRole[],
    message: "Due to severe local weather advisories, school activities will conclude early today at 1:00 PM. School buses will depart immediately at 1:15 PM.",
  },
];

export default function AdminCommunicationsPage() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "";
  const { tenant, supabase: tenantSupabase } = useTenant();
  const supabase = tenantSupabase || createClient();

  // State: Data
  const [history, setHistory] = useState<BroadcastItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalAnnouncements: 0,
    totalInAppDelivered: 0,
    totalSMSDispatched: 0,
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [fetching, setFetching] = useState(true);

  // State: SMS Config
  const [isSMSConfigured, setIsSMSConfigured] = useState(false);
  const [smsSenderId, setSmsSenderId] = useState("KLAXTRIX");
  const [smsBalance, setSmsBalance] = useState<number | null>(null);

  // Form states (Composer Studio)
  const [category, setCategory] = useState<BroadcastCategory>("general");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRoles, setTargetRoles] = useState<TargetRole[]>(["parent", "teacher", "student"]);
  const [targetClassId, setTargetClassId] = useState<string>("all");
  const [channel, setChannel] = useState<DeliveryChannel>("system");

  // Pre-flight confirmation modal
  const [showPreflight, setShowPreflight] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal states
  const [editingItem, setEditingItem] = useState<BroadcastItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editCategory, setEditCategory] = useState<BroadcastCategory>("general");
  const [editTargetRoles, setEditTargetRoles] = useState<TargetRole[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Right Column View Tabs: 'preview' or 'history'
  const [activeTab, setActiveTab] = useState<"preview" | "history">("preview");
  const [previewMode, setPreviewMode] = useState<"noticeboard" | "sms">("noticeboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [historyFilterCategory, setHistoryFilterCategory] = useState<string>("all");

  // SMS character & segment calculation
  const charCount = message.length;
  const smsSegments = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  useEffect(() => {
    loadAllData();
  }, [tenant?.id]);

  const loadAllData = async () => {
    setFetching(true);
    await Promise.all([
      fetchSMSConfig(),
      fetchStats(),
      fetchHistory(),
      fetchClasses(),
    ]);
    setFetching(false);
  };

  const fetchSMSConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${getBackendUrl()}/broadcasts/config`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setIsSMSConfigured(data.isSMSConfigured);
        if (data.senderId) setSmsSenderId(data.senderId);
        if (data.balance !== undefined && data.balance !== null) setSmsBalance(data.balance);
        if (data.isSMSConfigured) {
          setChannel("all");
        } else {
          setChannel("system");
        }
      }
    } catch (e) {
      console.error("Failed to check SMS config:", e);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${getBackendUrl()}/broadcasts/stats`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch broadcast stats:", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${getBackendUrl()}/broadcasts`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch broadcast history:", e);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');
      if (data) {
        setClasses(data);
      }
    } catch (e) {
      console.error("Failed to fetch classes:", e);
    }
  };

  // Role toggle handler
  const handleRoleToggle = (role: TargetRole) => {
    if (targetRoles.includes(role)) {
      if (targetRoles.length === 1) {
        toast.error("At least one target role must remain selected.");
        return;
      }
      setTargetRoles(targetRoles.filter((r) => r !== role));
    } else {
      setTargetRoles([...targetRoles, role]);
    }
  };

  const handleSelectAllRoles = () => {
    if (targetRoles.length === 4) {
      setTargetRoles(["parent"]);
    } else {
      setTargetRoles(["admin", "teacher", "student", "parent"]);
    }
  };

  const applyTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    setCategory(tpl.category);
    setTitle(tpl.title);
    setMessage(tpl.message);
    setTargetRoles(tpl.targetRoles);
    toast.info(`Applied template: "${tpl.name}"`);
  };

  const handlePreflightCheck = () => {
    if (!title.trim()) {
      toast.error("Please provide an announcement title.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please provide an announcement message.");
      return;
    }
    if (targetRoles.length === 0) {
      toast.error("Please select at least one target audience role.");
      return;
    }
    if ((channel === 'sms' || channel === 'all') && !isSMSConfigured) {
      toast.error("SMS delivery cannot be selected because Termii is unconfigured.");
      return;
    }
    setShowPreflight(true);
  };

  const handleDispatch = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        title: title.trim(),
        message: message.trim(),
        category,
        targetRoles,
        targetClassId: targetClassId === "all" ? null : targetClassId,
        channel,
      };

      const res = await fetch(`${getBackendUrl()}/broadcasts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Announcement published successfully!");
        if (data.warning) {
          toast.warning(data.warning);
        }
        setTitle("");
        setMessage("");
        setShowPreflight(false);
        setActiveTab("history");
        await Promise.all([fetchHistory(), fetchStats()]);
      } else {
        throw new Error(data.message || "Failed to publish announcement");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to publish announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (item: BroadcastItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditMessage(item.message);
    setEditCategory(item.category || "general");
    setEditTargetRoles(item.targetRoles || ["parent"]);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editTitle.trim() || !editMessage.trim()) {
      toast.error("Please fill in both title and message.");
      return;
    }

    setEditLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/broadcasts/${editingItem._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          message: editMessage.trim(),
          category: editCategory,
          targetRoles: editTargetRoles,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Noticeboard bulletin updated.");
        setEditingItem(null);
        await fetchHistory();
      } else {
        throw new Error(data.message || "Failed to update announcement");
      }
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${getBackendUrl()}/broadcasts/${deletingId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Announcement removed and notifications recalled.");
        setDeletingId(null);
        await Promise.all([fetchHistory(), fetchStats()]);
      } else {
        throw new Error(data.message || "Failed to delete");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete announcement");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered post history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = 
        historyFilterCategory === "all" || item.category === historyFilterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [history, searchQuery, historyFilterCategory]);

  const selectedClassName = useMemo(() => {
    if (targetClassId === "all") return "Entire School (All Classes)";
    const found = classes.find((c) => c.id === targetClassId);
    return found ? found.name : "Selected Class";
  }, [targetClassId, classes]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* Header & Executive Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5">
              School Noticeboard & SMS Hub
            </Badge>
            {tenant?.name && (
              <span className="text-xs font-medium text-muted-foreground">• {tenant.name}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Communications</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Broadcast emergency alerts, academic bulletins, and SMS notices directly to students, parents, and faculty.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={fetching}
            className="h-10 px-3.5 border-border text-foreground hover:bg-muted font-medium text-xs rounded-lg transition-all"
          >
            <RefreshCw className={`size-3.5 mr-2 ${fetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/dashboard/admin/settings/integrations">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3.5 border-border text-foreground hover:bg-muted font-medium text-xs rounded-lg transition-all"
            >
              <ExternalLink className="size-3.5 mr-2 text-primary" />
              Integration Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Bulletins */}
        <Card className="bg-card border-border/80 shadow-sm p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Announcements
            </span>
            <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Megaphone className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.totalAnnouncements}
            </span>
            <span className="text-xs text-muted-foreground">published</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            School-wide & class bulletins
          </p>
        </Card>

        {/* Metric 2: Noticeboard Reach */}
        <Card className="bg-card border-border/80 shadow-sm p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              In-App Notices Delivered
            </span>
            <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.totalInAppDelivered.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">notifications</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Reaching active student, parent & staff accounts
          </p>
        </Card>

        {/* Metric 3: SMS Dispatched */}
        <Card className="bg-card border-border/80 shadow-sm p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Carrier SMS Transmitted
            </span>
            <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Smartphone className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.totalSMSDispatched.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">SMS sent</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Direct priority carrier broadcasts
          </p>
        </Card>

        {/* Metric 4: SMS Gateway Status */}
        <Card className={`border-border/80 shadow-sm p-4 rounded-xl relative overflow-hidden ${
          isSMSConfigured ? "bg-card" : "bg-amber-500/[0.03] border-amber-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Termii SMS Gateway
            </span>
            <div className={`size-9 rounded-lg flex items-center justify-center ${
              isSMSConfigured 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
              {isSMSConfigured ? <CheckCircle2 className="size-4" /> : <Lock className="size-4" />}
            </div>
          </div>
          
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-block size-2 rounded-full ${isSMSConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-base font-bold text-foreground">
              {isSMSConfigured ? "Ready & Active" : "SMS Offline"}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {isSMSConfigured 
                ? `Sender: ${smsSenderId} ${smsBalance !== null ? `(₦${smsBalance.toLocaleString()})` : ""}`
                : "Setup required in settings"}
            </span>
            {!isSMSConfigured && (
              <Link 
                href="/dashboard/admin/settings/integrations"
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
              >
                Connect <ChevronRight className="size-3" />
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Main Dual-Panel Workspace: Left Studio & Right Device Preview / History */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Announcement Studio Composer (7 cols on XL) */}
        <div className="xl:col-span-7 space-y-6">
          <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
            <CardHeader className="p-6 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" /> Announcement Studio
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Draft, categorize, target, and transmit messages across channels.
                  </CardDescription>
                </div>

                {/* Preset Templates Selector */}
                <div className="flex items-center gap-2">
                  <Select onValueChange={(idx) => applyTemplate(PRESET_TEMPLATES[parseInt(idx)])}>
                    <SelectTrigger className="h-8 text-xs font-medium border-border/80 bg-muted/30 px-3 w-auto min-w-[150px]">
                      <FileText className="size-3 mr-1.5 text-primary" />
                      <SelectValue placeholder="Quick Templates" />
                    </SelectTrigger>
                    <SelectContent align="end" className="w-[240px]">
                      {PRESET_TEMPLATES.map((tpl, idx) => (
                        <SelectItem key={tpl.name} value={idx.toString()} className="text-xs py-2">
                          <span className="font-semibold">{tpl.name}</span>
                          <span className="block text-[10px] text-muted-foreground capitalize">{tpl.category} notice</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* 1. Category Selection Pills */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Bulletin Category</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Determines noticeboard badge styling</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as BroadcastCategory[]).map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const Icon = cfg.icon;
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          isSelected
                            ? `${cfg.badgeClass} border-current font-bold shadow-xs scale-[1.01]`
                            : "border-border/70 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{cfg.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Announcement Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Announcement Title</label>
                  <span className="text-[10px] text-muted-foreground">{title.length}/200</span>
                </div>
                <Input
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mid-Term Resumption & Examination Schedules"
                  className="h-11 rounded-lg border-border bg-background text-sm font-medium px-4 focus-visible:ring-primary"
                />
              </div>

              {/* 3. Target Audience & Classroom Scope */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="size-3.5 text-primary" /> Target Audience Roles
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllRoles}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    {targetRoles.length === 4 ? "Deselect All" : "Select Entire School"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'parent' as TargetRole, label: 'Parents / Guardians' },
                    { id: 'teacher' as TargetRole, label: 'Teaching Staff' },
                    { id: 'student' as TargetRole, label: 'Students Body' },
                    { id: 'admin' as TargetRole, label: 'School Admins' },
                  ].map((role) => {
                    const active = targetRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleToggle(role.id)}
                        className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          active
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                            : "bg-background border-border/70 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>

                {/* Optional Class Scope */}
                <div className="pt-2 border-t border-border/40 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Classroom Scope</span>
                    <p className="text-[11px] text-muted-foreground">Restrict recipients to a specific class or entire school.</p>
                  </div>
                  <Select value={targetClassId} onValueChange={setTargetClassId}>
                    <SelectTrigger className="h-9 text-xs font-medium border-border bg-background w-full sm:w-[220px]">
                      <SelectValue placeholder="Select Class Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs font-semibold">
                        Entire School (All Classes)
                      </SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id} className="text-xs">
                          Class: {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 4. Delivery Channel Selection Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Delivery Channel</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option A: In-App Noticeboard */}
                  <div
                    onClick={() => setChannel("system")}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all text-left relative ${
                      channel === "system"
                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary/40 shadow-xs"
                        : "border-border/70 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Radio className="size-3.5" />
                      </div>
                      {channel === "system" && <CheckCircle2 className="size-4 text-primary" />}
                    </div>
                    <p className="text-xs font-bold text-foreground">Noticeboard Only</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Push notification & dashboard bulletin post.
                    </p>
                  </div>

                  {/* Option B: Noticeboard + Direct SMS */}
                  <div
                    onClick={() => {
                      if (!isSMSConfigured) return;
                      setChannel("all");
                    }}
                    className={`p-3.5 rounded-xl border transition-all text-left relative ${
                      !isSMSConfigured
                        ? "opacity-60 cursor-not-allowed border-dashed border-border/70 bg-muted/20"
                        : channel === "all"
                        ? "cursor-pointer border-primary bg-primary/[0.04] ring-1 ring-primary/40 shadow-xs"
                        : "cursor-pointer border-border/70 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="size-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Send className="size-3.5" />
                      </div>
                      {channel === "all" ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : !isSMSConfigured ? (
                        <Lock className="size-3.5 text-muted-foreground" />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-foreground">Noticeboard + SMS</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Omnichannel bulletin and priority SMS alert.
                    </p>
                    {!isSMSConfigured && (
                      <span className="inline-block mt-1 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                        Requires Termii Setup
                      </span>
                    )}
                  </div>

                  {/* Option C: Direct SMS Only */}
                  <div
                    onClick={() => {
                      if (!isSMSConfigured) return;
                      setChannel("sms");
                    }}
                    className={`p-3.5 rounded-xl border transition-all text-left relative ${
                      !isSMSConfigured
                        ? "opacity-60 cursor-not-allowed border-dashed border-border/70 bg-muted/20"
                        : channel === "sms"
                        ? "cursor-pointer border-primary bg-primary/[0.04] ring-1 ring-primary/40 shadow-xs"
                        : "cursor-pointer border-border/70 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Smartphone className="size-3.5" />
                      </div>
                      {channel === "sms" ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : !isSMSConfigured ? (
                        <Lock className="size-3.5 text-muted-foreground" />
                      ) : null}
                    </div>
                    <p className="text-xs font-bold text-foreground">Direct SMS Only</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Urgent carrier SMS delivered to phone numbers.
                    </p>
                    {!isSMSConfigured && (
                      <span className="inline-block mt-1 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                        Requires Termii Setup
                      </span>
                    )}
                  </div>
                </div>

                {/* SMS Unconfigured Callout Banner */}
                {!isSMSConfigured && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-start sm:items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        Termii SMS gateway is unconfigured. Direct SMS channels are locked to prevent failed deliveries.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/admin/settings/integrations"
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
                    >
                      Configure Termii <ChevronRight className="size-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* 5. Message Body with Character & Segment Counter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Message Body</label>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                    <span>{charCount} characters</span>
                    {(channel === 'all' || channel === 'sms') && (
                      <span className="font-semibold text-primary">
                        • {smsSegments} SMS {smsSegments > 1 ? 'segments' : 'segment'} (~160 chars)
                      </span>
                    )}
                  </div>
                </div>

                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Draft your school bulletin or announcement here..."
                  className="min-h-[140px] rounded-lg border-border bg-background p-4 text-sm font-normal leading-relaxed focus-visible:ring-primary"
                />

                {(channel === 'all' || channel === 'sms') && smsSegments > 1 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                    <Info className="size-3 shrink-0" />
                    Message exceeds 160 characters and will be billed as {smsSegments} SMS segments per recipient.
                  </p>
                )}
              </div>

              {/* Action Button: Review & Publish */}
              <Button
                type="button"
                onClick={handlePreflightCheck}
                disabled={submitting}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg font-bold text-sm shadow-sm transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  Review & Publish Announcement <Send className="size-4" />
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Device Preview & Searchable History (5 cols on XL) */}
        <div className="xl:col-span-5 space-y-6">
          <Card className="border border-border/80 shadow-sm bg-card rounded-xl overflow-hidden min-h-[600px]">
            <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <TabsList className="h-9 bg-background border border-border/70 p-1 rounded-lg">
                      <TabsTrigger value="preview" className="text-xs font-semibold px-3 flex items-center gap-1.5">
                        <Eye className="size-3.5" /> Live Preview
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-xs font-semibold px-3 flex items-center gap-1.5">
                        <History className="size-3.5" /> Post History ({history.length})
                      </TabsTrigger>
                    </TabsList>

                    {activeTab === "preview" && (
                      <div className="flex items-center bg-background border border-border/70 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setPreviewMode("noticeboard")}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            previewMode === "noticeboard"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Noticeboard
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode("sms")}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            previewMode === "sms"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Smartphone
                        </button>
                      </div>
                    )}
                  </div>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              
              {/* TAB 1: Live Interactive Preview */}
              {activeTab === "preview" && (
                <div className="space-y-4">
                  {previewMode === "noticeboard" ? (
                    /* Noticeboard View */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Noticeboard Simulator</span>
                        <span>Audience View</span>
                      </div>

                      <div className="border border-border/90 bg-background rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {tenant?.name ? tenant.name.substring(0, 2).toUpperCase() : "KL"}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground leading-tight">
                                {tenant?.name || "Klaxtrix Academy"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Official School Notice</p>
                            </div>
                          </div>

                          <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${CATEGORY_CONFIG[category].badgeClass}`}>
                            {CATEGORY_CONFIG[category].label}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-foreground">
                            {title || "Announcement Title Preview"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                            {message || "The message you draft in the editor will render here in real-time as seen by students, parents, and faculty."}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">Target:</span>
                            {targetRoles.map((r) => (
                              <span key={r} className="uppercase px-1.5 py-0.5 rounded bg-muted font-bold text-[9px]">
                                {r}
                              </span>
                            ))}
                          </div>
                          <span>Scope: {selectedClassName}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-[11px] text-muted-foreground flex items-center gap-2">
                        <Info className="size-3.5 text-primary shrink-0" />
                        <span>Students & parents will receive an immediate in-app bell notification and noticeboard banner.</span>
                      </div>
                    </div>
                  ) : (
                    /* Smartphone SMS View */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Direct Carrier SMS Simulator</span>
                        <span>{isSMSConfigured ? "Termii Online" : "SMS Offline"}</span>
                      </div>

                      {/* Mock Smartphone Frame */}
                      <div className="max-w-[300px] mx-auto rounded-[36px] border-4 border-slate-800 dark:border-slate-700 bg-slate-950 p-3 shadow-xl text-white">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between px-2 pt-1 pb-2 text-[10px] text-slate-400">
                          <span>9:41</span>
                          <div className="size-3 rounded-full bg-slate-800 mx-auto" />
                          <span>5G 100%</span>
                        </div>

                        {/* Message Thread Header */}
                        <div className="text-center pb-3 border-b border-slate-800/80 mb-3">
                          <div className="size-9 rounded-full bg-primary/20 text-primary font-bold mx-auto flex items-center justify-center text-xs mb-1">
                            {smsSenderId.substring(0, 2).toUpperCase()}
                          </div>
                          <p className="text-xs font-bold text-white tracking-wide">{smsSenderId}</p>
                          <p className="text-[9px] text-slate-400">SMS / Text Message</p>
                        </div>

                        {/* Message Bubble */}
                        <div className="space-y-1 my-6 min-h-[140px] flex flex-col justify-end">
                          <div className="bg-primary/90 text-primary-foreground p-3 rounded-2xl rounded-tr-xs text-xs shadow-md leading-relaxed">
                            <span className="font-bold">{title ? `${title}: ` : ""}</span>
                            <span>{message || "Official announcement preview will appear formatted here as delivered to recipient mobile numbers..."}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 self-end px-1">Today • Just now</span>
                        </div>

                        {/* Phone Home Bar */}
                        <div className="h-1 w-24 bg-slate-700 rounded-full mx-auto mt-4 mb-1" />
                      </div>

                      <div className="text-center text-[11px] text-muted-foreground">
                        Estimated: {charCount} chars • {smsSegments} SMS page(s)
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Searchable Post History */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  {/* Search and Filter */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="size-3.5 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search bulletins..."
                        className="pl-9 h-9 text-xs rounded-lg border-border bg-background"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {["all", "urgent", "academic", "fees", "event", "general"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setHistoryFilterCategory(cat)}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border capitalize transition-all shrink-0 ${
                            historyFilterCategory === cat
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {fetching ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Loading bulletins...</span>
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <MessageSquare className="size-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold">No announcements found</p>
                      <p className="text-[11px] mt-0.5">Use the studio to publish your first bulletin.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {filteredHistory.map((item) => {
                        const catConfig = CATEGORY_CONFIG[item.category || "general"];
                        const Icon = catConfig.icon;
                        return (
                          <div
                            key={item._id}
                            className="p-3.5 rounded-xl border border-border/70 bg-background/80 hover:border-primary/40 transition-all text-left space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0.5 ${catConfig.badgeClass} flex items-center gap-1`}>
                                <Icon className="size-2.5" />
                                {catConfig.label}
                              </Badge>

                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(item.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.message}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  {item.recipientCount || 0} In-App
                                </span>
                                {item.smsCount ? (
                                  <span className="font-semibold text-primary">
                                    • {item.smsCount} SMS
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleStartEdit(item)}
                                >
                                  <Edit className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeletingId(item._id)}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pre-Flight Broadcast Confirmation Modal */}
      <Dialog open={showPreflight} onOpenChange={setShowPreflight}>
        <DialogContent className="max-w-lg rounded-2xl border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Pre-Flight Broadcast Review
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please inspect the recipient scope and delivery channels before launching.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Category:</span>
                <Badge variant="outline" className={`font-bold ${CATEGORY_CONFIG[category].badgeClass}`}>
                  {CATEGORY_CONFIG[category].label}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Audience Roles:</span>
                <div className="flex gap-1">
                  {targetRoles.map((r) => (
                    <span key={r} className="uppercase px-1.5 py-0.5 rounded bg-background border border-border font-bold text-[9px]">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Scope:</span>
                <span className="font-semibold text-foreground">{selectedClassName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Delivery Method:</span>
                <span className="font-bold text-primary capitalize">
                  {channel === "all" ? "In-App Noticeboard + Direct SMS" : channel === "sms" ? "Direct SMS" : "In-App Noticeboard"}
                </span>
              </div>
            </div>

            {/* Message Preview Box */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-1">
              <p className="font-bold text-foreground text-xs">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{message}</p>
            </div>

            {(channel === 'all' || channel === 'sms') && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-600" /> Carrier Transmission Notice
                </p>
                SMS broadcasts will be queued immediately via Termii Bulk API ({smsSegments} segment(s)/recipient). Once dispatched to mobile telecommunication carriers, SMS transmissions cannot be recalled.
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setShowPreflight(false)}
              className="h-10 text-xs font-semibold px-4"
            >
              Back to Editing
            </Button>
            <Button
              onClick={handleDispatch}
              disabled={submitting}
              className="h-10 text-xs font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-2 animate-spin" /> Dispatched...
                </>
              ) : (
                <>
                  Confirm & Dispatch <Send className="size-3.5 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-lg rounded-2xl border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Update Noticeboard Bulletin
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Updates the live announcement on student, parent, and faculty noticeboards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="size-3.5 text-primary shrink-0" />
              <span>
                Carrier SMS messages already transmitted to mobile devices cannot be updated. Edits update in-app notifications and noticeboards.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CATEGORY_CONFIG) as BroadcastCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEditCategory(cat)}
                    className={`p-2 rounded-lg border text-xs font-semibold capitalize ${
                      editCategory === cat
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
                className="h-10 text-xs rounded-lg border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Message</label>
              <Textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="Message"
                className="min-h-[120px] text-xs rounded-lg border-border bg-background"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
              disabled={editLoading}
              className="h-10 text-xs font-semibold px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editLoading}
              className="h-10 text-xs font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {editLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Announcement Modal */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md rounded-2xl border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Recall & Delete Announcement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to permanently delete this bulletin? This will recall and remove the notice from all recipient noticeboards and notifications.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 mt-4 justify-end">
            <Button
              variant="outline"
              disabled={deleteLoading}
              onClick={() => setDeletingId(null)}
              className="h-10 text-xs font-semibold px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="h-10 text-xs font-bold px-6 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Confirm Deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
