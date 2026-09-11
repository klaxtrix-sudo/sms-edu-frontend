'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { getAuditLogs } from '@/app/actions/subadmin-actions';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  RefreshCw, 
  UserCheck, 
  FileText, 
  CreditCard, 
  UserCog, 
  Lock, 
  Eye, 
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
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
import { motion, AnimatePresence } from 'framer-motion';

const MODULE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; badge: string }> = {
  finance: { label: "Finance", icon: CreditCard, badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  admins: { label: "Administrators", icon: UserCog, badge: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  academics: { label: "Academics", icon: FileText, badge: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  exams: { label: "Examinations", icon: FileText, badge: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  settings: { label: "Settings", icon: Lock, badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  students: { label: "Students", icon: UserCheck, badge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
  teachers: { label: "Teachers", icon: UserCheck, badge: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
};

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
        toast.error(res.error || "Failed to load audit logs.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit logs.");
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
  const adminMutationsCount = useMemo(() => logs.filter(l => l.module === 'admins').length, [logs]);
  const financeMutationsCount = useMemo(() => logs.filter(l => l.module === 'finance').length, [logs]);

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('RECORD') || action.includes('ACTIVATE')) {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('UPDATE') || action.includes('RESET')) {
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
    if (action.includes('DELETE') || action.includes('SUSPEND') || action.includes('REVOKE')) {
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
    if (action.includes('RESEND') || action.includes('REMINDER')) {
      return 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30';
    }
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header & Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
              <ShieldCheck className="size-3.5" /> Security & Compliance
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold py-1 px-2 text-muted-foreground border-border/60">
              SOC 2 / ISO 27001 Audit Ready
            </Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-foreground">
            Institutional Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Tamper-evident chronological log of administrative operations, financial ledger records, and role mutations.
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Recorded Events</span>
            <History className="size-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-foreground tabular-nums">{total}</p>
          <p className="text-[11px] text-muted-foreground">Persisted in institutional PostgreSQL cluster</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-border/60 bg-card/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Access & Admin Mutations</span>
            <UserCog className="size-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-purple-500 tabular-nums">{adminMutationsCount}</p>
          <p className="text-[11px] text-muted-foreground">Permission grants, invitations, suspensions</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-border/60 bg-card/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Finance & Ledger Logs</span>
            <CreditCard className="size-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-500 tabular-nums">{financeMutationsCount}</p>
          <p className="text-[11px] text-muted-foreground">Fee structures, manual payment recordings</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search by actor name, target, or action type..." 
            className="pl-9 h-10 bg-background/50 border-border/80 rounded-xl text-xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-2">
          <Select value={selectedModule} onValueChange={(val) => { setSelectedModule(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] h-10 text-xs rounded-xl border-border/80">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Modules</SelectItem>
              <SelectItem value="finance" className="text-xs">Finance & Fees</SelectItem>
              <SelectItem value="admins" className="text-xs">Administrators</SelectItem>
              <SelectItem value="academics" className="text-xs">Academics</SelectItem>
              <SelectItem value="exams" className="text-xs">Examinations</SelectItem>
              <SelectItem value="settings" className="text-xs">Settings</SelectItem>
              <SelectItem value="students" className="text-xs">Students</SelectItem>
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

      {/* Audit Log Table */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60">
              <TableHead className="text-[10px] uppercase font-black tracking-wider py-4 px-5">Timestamp</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-wider">Action</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-wider">Module</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-wider">Actor</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-wider">Target Entity</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-wider text-right pr-5">Payload</TableHead>
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
                    <p className="text-muted-foreground font-medium text-xs">No audit events match the selected criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const moduleConf = MODULE_CONFIG[log.module] || { label: log.module, badge: "bg-muted text-muted-foreground" };
                const IconComponent = moduleConf.icon || FileText;

                return (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors border-border/40 text-xs">
                    {/* Timestamp */}
                    <TableCell className="py-4 px-5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>

                    {/* Action */}
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] font-mono font-bold px-2 py-0.5 border uppercase tracking-wider", getActionBadge(log.action))}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>

                    {/* Module */}
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] font-bold px-2 py-0.5 border gap-1", moduleConf.badge)}
                      >
                        <IconComponent className="size-3" />
                        <span>{moduleConf.label}</span>
                      </Badge>
                    </TableCell>

                    {/* Actor */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                          {log.actor_name ? log.actor_name[0].toUpperCase() : 'A'}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-xs">{log.actor_name || "System"}</p>
                          <p className="text-[10px] text-muted-foreground">{log.actor_role || "admin"}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Target */}
                    <TableCell>
                      <span className="font-medium text-foreground">{log.target_name || log.target_id || "—"}</span>
                    </TableCell>

                    {/* Inspect Payload Button */}
                    <TableCell className="text-right pr-5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInspectLog(log)}
                        className="h-7 px-2.5 text-xs font-semibold gap-1 hover:bg-primary/10 hover:text-primary rounded-lg"
                      >
                        <Eye className="size-3.5" />
                        <span>Inspect</span>
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
            Showing <strong className="text-foreground">{logs.length}</strong> of <strong className="text-foreground">{total}</strong> records
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

      {/* Payload Details Modal */}
      <Dialog open={!!inspectLog} onOpenChange={(open) => !open && setInspectLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Code2 className="size-5 text-primary" />
              Audit Event Snapshot
            </DialogTitle>
            <DialogDescription className="text-xs">
              Immutable telemetry payload registered for event <code>{inspectLog?.id}</code>
            </DialogDescription>
          </DialogHeader>

          {inspectLog && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground font-medium">Timestamp:</span>
                  <p className="font-semibold text-foreground mt-0.5">{new Date(inspectLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Action:</span>
                  <p className="font-semibold text-foreground mt-0.5">{inspectLog.action}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Actor:</span>
                  <p className="font-semibold text-foreground mt-0.5">{inspectLog.actor_name} ({inspectLog.actor_role})</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Target Entity:</span>
                  <p className="font-semibold text-foreground mt-0.5">{inspectLog.target_name || inspectLog.target_id || "None"}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" />
                  Mutation Details & State Diff (JSON)
                </span>
                <pre className="p-4 rounded-xl bg-muted/60 dark:bg-black/50 border border-border/80 text-[11px] font-mono text-foreground overflow-x-auto leading-relaxed max-h-64">
                  {JSON.stringify(inspectLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
