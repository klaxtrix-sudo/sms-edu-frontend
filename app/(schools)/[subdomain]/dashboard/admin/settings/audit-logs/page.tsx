'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { getAuditLogs } from '@/app/actions/subadmin-actions';
import { 
  History, 
  Search, 
  ShieldCheck, 
  RefreshCw, 
  UserCheck, 
  FileText, 
  CreditCard, 
  UserCog, 
  Lock, 
  Eye, 
  ChevronLeft,
  ChevronRight,
  Sliders,
  Copy,
  Code2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MODULE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; badge: string }> = {
  finance: { label: "Finance & Fees", icon: CreditCard, badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  admins: { label: "Staff & Admin", icon: UserCog, badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  academics: { label: "Classes & Academics", icon: FileText, badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  exams: { label: "Exams & Grading", icon: FileText, badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  settings: { label: "Security & Settings", icon: Lock, badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  students: { label: "Students & Admissions", icon: UserCheck, badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  teachers: { label: "Teachers & Staff", icon: UserCheck, badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
};

const ACTION_LABELS: Record<string, string> = {
  UPDATE_SECURITY_SETTINGS: "Updated Security Settings",
  ADMIN_INVITE: "Invited Staff Member",
  ADMIN_PERMISSION_UPDATE: "Updated Permissions",
  ADMIN_INVITATION_RESEND: "Resent Staff Invitation",
  ADMIN_DELETE: "Removed Administrator",
  BATCH_INVITATION_REMINDERS_SENT: "Sent Invitation Reminders",
  FEE_STRUCTURE_CREATE: "Created Fee Item",
  FEE_STRUCTURE_CREATE_BATCH: "Created Fee Schedule",
  FEE_STRUCTURE_UPDATE: "Updated Fee Item",
  FEE_STRUCTURE_DELETE: "Deleted Fee Item",
  FEE_PAYMENT_RECORD: "Recorded Payment",
  PAYMENT_REVERSE: "Reversed Payment",
  CREATE_STUDENT: "Enrolled Student",
  UPDATE_STUDENT: "Updated Student Profile",
  DELETE_STUDENT: "Removed Student",
  CREATE_CLASS: "Created Classroom",
  UPDATE_CLASS: "Updated Classroom",
  ASSIGN_TEACHER: "Assigned Subject Teacher",
};

function formatActionName(action: string): string {
  if (!action) return "Activity";
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .toLowerCase()
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRole(role?: string): string {
  if (!role) return "Staff Member";
  const lower = role.toLowerCase();
  if (lower === "admin") return "School Administrator";
  if (lower === "super_admin") return "Super Administrator";
  if (lower === "teacher") return "Teacher";
  if (lower === "student") return "Student";
  if (lower === "parent") return "Parent";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatTargetName(targetName?: string | null, targetId?: string | null, action?: string): string {
  if (targetName && targetName.trim() && targetName !== "None") return targetName;
  if (action?.includes("SECURITY") || action?.includes("SETTINGS")) return "Security Policies";
  if (action?.includes("FEE")) return "Fee Schedule";
  if (action?.includes("ADMIN")) return "Staff Account";
  if (action?.includes("STUDENT")) return "Student Record";
  if (targetId) return `Item (${targetId.slice(0, 8)})`;
  return "General System";
}

const DETAIL_KEY_LABELS: Record<string, string> = {
  student_portal_access: "Student Direct Portal Sign-In",
  lock_post_term_results: "Lock Scores After Term Ends",
  parent_contact_privacy: "Parent Contact Privacy",
  require_password_change: "Require Password Reset on First Login",
  session_timeout_minutes: "Session Inactivity Timeout",
  enhanced_password_policy: "Enhanced Staff Password Security",
  fee_name: "Fee Item Name",
  amount: "Amount",
  term: "Academic Term",
  session: "Academic Session",
  class_name: "Classroom",
  permissions: "Granted Permissions",
  email: "Email Address",
  full_name: "Staff Name",
  phone: "Phone Number",
  custom_role_title: "Assigned Role",
};

function formatDetailKey(key: string): string {
  if (DETAIL_KEY_LABELS[key]) return DETAIL_KEY_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function renderDetailValue(key: string, value: any): React.ReactNode {
  if (typeof value === "boolean") {
    return value ? (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
        Enabled
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs font-semibold">
        Disabled
      </Badge>
    );
  }

  if (key === "session_timeout_minutes" && typeof value === "number") {
    if (value >= 60) {
      const hours = value / 60;
      return <span className="font-semibold text-foreground">{value} minutes ({hours} {hours === 1 ? 'hour' : 'hours'})</span>;
    }
    return <span className="font-semibold text-foreground">{value} minutes</span>;
  }

  if ((key.includes("amount") || key.includes("fee") || key.includes("price")) && typeof value === "number") {
    return <span className="font-bold text-foreground">₦{value.toLocaleString()}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground text-xs italic">None</span>;
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        {value.map((item, idx) => (
          <Badge key={idx} variant="outline" className="text-[11px] font-medium bg-muted/60 text-foreground border-border">
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </Badge>
        ))}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    return <pre className="text-[11px] font-mono text-foreground bg-muted/40 p-1.5 rounded">{JSON.stringify(value, null, 2)}</pre>;
  }

  return <span className="font-medium text-foreground">{String(value)}</span>;
}

export default function AuditLogsPage() {
  const { subdomain } = useParams();
  const { tenant } = useTenant();

  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectLog, setInspectLog] = useState<any | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const pageSize = 20;

  const fetchLogs = async () => {
    if (!tenant?.id || !subdomain) return;
    setIsLoading(true);
    try {
      const res = await getAuditLogs(tenant.id, subdomain as string, {
        module: selectedModule !== 'all' ? selectedModule : undefined,
        search: searchQuery.trim() ? searchQuery.trim() : undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });

      if (res.success) {
        setLogs(res.data || []);
        setTotal(res.total || 0);
      } else {
        toast.error(res.error || "Failed to load activity logs.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load activity logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tenant?.id, subdomain, selectedModule, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Quick Stats
  const adminChangesCount = useMemo(() => logs.filter(l => l.module === 'admins').length, [logs]);
  const financeRecordsCount = useMemo(() => logs.filter(l => l.module === 'finance').length, [logs]);

  const getActionBadge = (action: string) => {
    const upper = action.toUpperCase();
    if (upper.includes('CREATE') || upper.includes('RECORD') || upper.includes('ACTIVATE') || upper.includes('ENROLL')) {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
    if (upper.includes('UPDATE') || upper.includes('RESET') || upper.includes('EDIT')) {
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
    if (upper.includes('DELETE') || upper.includes('SUSPEND') || upper.includes('REVOKE') || upper.includes('REMOVE')) {
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
    if (upper.includes('RESEND') || upper.includes('REMINDER') || upper.includes('SEND')) {
      return 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30';
    }
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header & Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-bold tracking-wider bg-primary/5 text-primary border-primary/20">
              <ShieldCheck className="size-3.5" /> Security & Accountability
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold py-1 px-2 text-muted-foreground border-border/60">
              Verified Activity History
            </Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-foreground">
            School Activity & Audit Log
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            A clear, chronological record of all administrative actions, fee updates, and account changes made across your school.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={isLoading}
          className="h-10 px-4 rounded-xl border-border/80 hover:bg-muted font-bold text-xs gap-2 shadow-xs"
        >
          <RefreshCw className={cn("size-3.5", isLoading && "animate-spin text-primary")} />
          Refresh Log
        </Button>
      </div>

      {/* Metric Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-border/60 bg-card/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Recorded Actions</span>
            <History className="size-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-foreground tabular-nums">{total}</p>
          <p className="text-[11px] text-muted-foreground">Tracked securely across your school database</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-border/60 bg-card/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff & Permission Changes</span>
            <UserCog className="size-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-purple-500 tabular-nums">{adminChangesCount}</p>
          <p className="text-[11px] text-muted-foreground">Staff invitations, role updates, and account changes</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-border/60 bg-card/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Financial & Fee Records</span>
            <CreditCard className="size-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-500 tabular-nums">{financeRecordsCount}</p>
          <p className="text-[11px] text-muted-foreground">Fee schedules, student payments, and billings</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search by staff name, affected item, or action..." 
            className="pl-9 h-10 bg-background/50 border-border/80 rounded-xl text-xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-2">
          <Select value={selectedModule} onValueChange={(val) => { setSelectedModule(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-[200px] h-10 text-xs rounded-xl border-border/80">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              <SelectItem value="finance" className="text-xs">Finance & Fees</SelectItem>
              <SelectItem value="admins" className="text-xs">Staff & Administrators</SelectItem>
              <SelectItem value="academics" className="text-xs">Classes & Academics</SelectItem>
              <SelectItem value="exams" className="text-xs">Exams & Grading</SelectItem>
              <SelectItem value="settings" className="text-xs">Security & Settings</SelectItem>
              <SelectItem value="students" className="text-xs">Students & Admissions</SelectItem>
            </SelectContent>
          </Select>

          {searchQuery && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
              className="text-xs h-10 px-3 text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60">
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-4 px-5">Date & Time</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Action Taken</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Category</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Performed By</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Affected Item</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right pr-5">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-border/40">
                  <TableCell className="py-4 px-5"><div className="h-4 w-28 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-5 w-32 bg-muted rounded-full"></div></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-28 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted rounded"></div></TableCell>
                  <TableCell className="text-right pr-5"><div className="h-7 w-16 bg-muted rounded ml-auto"></div></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <History className="size-10 text-muted/30" />
                    <p className="text-muted-foreground font-medium text-xs">No activity records match your search or filter.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const moduleConf = MODULE_CONFIG[log.module] || { label: log.module, badge: "bg-muted text-muted-foreground" };
                const IconComponent = moduleConf.icon || FileText;

                return (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors border-border/40 text-xs">
                    {/* Date & Time */}
                    <TableCell className="py-4 px-5 text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </TableCell>

                    {/* Action Taken */}
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] font-semibold px-2 py-0.5 border tracking-normal", getActionBadge(log.action))}
                      >
                        {formatActionName(log.action)}
                      </Badge>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] font-semibold px-2 py-0.5 border gap-1.5", moduleConf.badge)}
                      >
                        <IconComponent className="size-3" />
                        <span>{moduleConf.label}</span>
                      </Badge>
                    </TableCell>

                    {/* Performed By */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                          {log.actor_name ? log.actor_name[0].toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-xs">{log.actor_name || "System Automation"}</p>
                          <p className="text-[10px] text-muted-foreground">{formatRole(log.actor_role)}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Affected Item */}
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {formatTargetName(log.target_name, log.target_id, log.action)}
                      </span>
                    </TableCell>

                    {/* Details Button */}
                    <TableCell className="text-right pr-5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setInspectLog(log);
                          setShowRawJson(false);
                        }}
                        className="h-7 px-2.5 text-xs font-semibold gap-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground"
                      >
                        <Eye className="size-3.5" />
                        <span>View Details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border/60 bg-muted/20 text-xs">
          <p className="text-muted-foreground">
            Showing <strong className="text-foreground">{logs.length}</strong> of <strong className="text-foreground">{total}</strong> activity records
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="h-8 px-2.5 text-xs rounded-lg border-border/80 gap-1"
            >
              <ChevronLeft className="size-3.5" /> Previous
            </Button>
            <span className="px-2 text-xs font-medium text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="h-8 px-2.5 text-xs rounded-lg border-border/80 gap-1"
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Details Modal */}
      <Dialog open={!!inspectLog} onOpenChange={(open) => { if (!open) { setInspectLog(null); setShowRawJson(false); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-heading font-bold">
              <FileText className="size-5 text-primary" />
              Activity Record Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Recorded on {inspectLog && new Date(inspectLog.created_at).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })} • Ref ID: <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{inspectLog?.id?.slice(0, 8)}</code>
            </DialogDescription>
          </DialogHeader>

          {inspectLog && (
            <div className="space-y-5 py-2">
              {/* Key Event Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/40 p-4 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground font-medium">Date & Time:</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {new Date(inspectLog.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Action Taken:</span>
                  <div className="mt-0.5">
                    <Badge variant="outline" className={cn("text-[11px] font-semibold px-2 py-0.5 border", getActionBadge(inspectLog.action))}>
                      {formatActionName(inspectLog.action)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Performed By:</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {inspectLog.actor_name || "System Automation"}{" "}
                    <span className="text-muted-foreground font-normal">({formatRole(inspectLog.actor_role)})</span>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Affected Item:</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {formatTargetName(inspectLog.target_name, inspectLog.target_id, inspectLog.action)}
                  </p>
                </div>
              </div>

              {/* Human-Readable Recorded Changes & Information */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="size-3.5 text-primary" />
                  Recorded Changes & Information
                </span>

                {inspectLog.details && Object.keys(inspectLog.details).length > 0 ? (
                  <div className="rounded-xl border border-border/80 overflow-hidden divide-y divide-border/60 bg-card">
                    {Object.entries(inspectLog.details).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 text-xs gap-2 hover:bg-muted/20">
                        <span className="font-medium text-muted-foreground">{formatDetailKey(key)}</span>
                        <div className="sm:text-right">{renderDetailValue(key, value)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground text-center">
                    No additional configuration changes were recorded for this action.
                  </div>
                )}
              </div>

              {/* Optional Raw Technical Payload Accordion */}
              <div className="pt-1 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 gap-1.5 font-medium"
                >
                  <Code2 className="size-3.5" />
                  <span>{showRawJson ? "Hide Technical Details" : "View Technical Details (JSON)"}</span>
                </Button>

                {showRawJson && (
                  <div className="mt-2 space-y-2 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-mono">Raw Event Data</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(inspectLog.details || {}, null, 2));
                          toast.success("Copied raw data to clipboard");
                        }}
                        className="h-6 text-[10px] px-2 gap-1"
                      >
                        <Copy className="size-3" />
                        Copy JSON
                      </Button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-muted/60 dark:bg-black/60 border border-border/80 text-[11px] font-mono text-foreground overflow-x-auto leading-relaxed max-h-56">
                      {JSON.stringify(inspectLog.details || {}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
