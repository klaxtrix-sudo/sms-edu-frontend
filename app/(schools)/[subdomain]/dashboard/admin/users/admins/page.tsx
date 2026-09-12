'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { createClient } from '@/lib/supabase/client';
import { 
  getAdmins, 
  toggleAdminStatus, 
  resendAdminCredentials, 
  deleteSubAdmin,
  sendPendingInvitationReminders
} from '@/app/actions/subadmin-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  UserCog, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  MoreHorizontal, 
  Power, 
  Shield, 
  Sparkles, 
  Copy, 
  Trash2, 
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  Clock,
  BellRing
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AddAdminModal } from '@/components/admin/add-admin-modal';
import { EditAdminPermissionsModal } from '@/components/admin/edit-admin-permissions-modal';

const MODULE_TAGS: Record<string, { label: string; badgeClass: string }> = {
  finance: { label: "Finance", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  academics: { label: "Academics", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  students: { label: "Students", badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  teachers: { label: "Teachers", badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  parents: { label: "Parents", badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  attendance: { label: "Attendance", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  exams: { label: "Exams", badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  results: { label: "Results", badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  communications: { label: "Communications", badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  analytics: { label: "Analytics", badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  settings: { label: "Settings", badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  admins: { label: "Admins", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
};

function formatPermissionTag(perm: string) {
  const [mod, scope] = perm.split(':');
  const tag = MODULE_TAGS[mod] || { label: mod, badgeClass: "bg-muted text-muted-foreground border-border" };
  if (scope === 'read') {
    return {
      label: `${tag.label} (Viewer)`,
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    };
  }
  if (scope === 'manage') {
    return {
      label: `${tag.label} (Manage)`,
      badgeClass: tag.badgeClass,
    };
  }
  return tag;
}

export default function AdminsDirectoryPage() {
  const { subdomain } = useParams();
  const { tenant } = useTenant();

  const [admins, setAdmins] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super' | 'sub'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  // Resend / copy link loading state
  const [isActionLoading, setIsActionLoading] = useState<Record<string, boolean>>({});

  // Delete dialog state
  const [adminToDelete, setAdminToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAdmins = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    const result = await getAdmins(tenant.id, subdomain as string);
    if (result.success) {
      setAdmins(result.data || []);
    } else {
      toast.error(result.error || "Failed to load administrators");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    async function loadCallerIdentity() {
      if (!tenant?.supabaseUrl || !tenant?.supabaseAnonKey) return;
      try {
        const supabase = createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
      } catch (err) {
        console.error("Failed to load user session", err);
      }
    }
    loadCallerIdentity();
    fetchAdmins();
  }, [tenant?.id, tenant?.supabaseUrl, tenant?.supabaseAnonKey, subdomain]);

  const handleToggleStatus = async (admin: any) => {
    if (admin.is_super_admin) {
      toast.error("Super Administrator access cannot be suspended.");
      return;
    }
    const newStatus = !admin.is_active;
    const result = await toggleAdminStatus(admin.id, newStatus, subdomain as string);
    if (result.success) {
      toast.success(`Administrator access ${newStatus ? 'restored' : 'suspended'}.`);
      fetchAdmins();
    } else {
      toast.error(result.error || "Failed to update administrator status.");
    }
  };

  const handleCopyActivationLink = async (admin: any) => {
    if (!tenant?.id) return;
    setIsActionLoading(prev => ({ ...prev, [admin.id]: true }));
    
    try {
      const result = await resendAdminCredentials(admin.id, tenant.id, subdomain as string);
      if (result.success && result.activationLink) {
        await navigator.clipboard.writeText(result.activationLink);
        toast.success(`Activation link copied for ${admin.full_name}!`);
        fetchAdmins();
      } else {
        toast.error(result.error || "Failed to generate activation link.");
      }
    } catch (err) {
      toast.error("Failed to write link to clipboard.");
    } finally {
      setIsActionLoading(prev => ({ ...prev, [admin.id]: false }));
    }
  };

  const handleResendCredentials = async (admin: any) => {
    if (!tenant?.id) return;
    setIsActionLoading(prev => ({ ...prev, [admin.id]: true }));

    const result = await resendAdminCredentials(admin.id, tenant.id, subdomain as string);
    if (result.success) {
      toast.success(`Activation email resent to ${admin.email}.`);
      fetchAdmins();
      if (result.activationLink) {
        try {
          await navigator.clipboard.writeText(result.activationLink);
          toast.info("Activation link also copied to clipboard!");
        } catch {}
      }
    } else {
      toast.error(result.error || "Failed to resend activation email.");
    }

    setIsActionLoading(prev => ({ ...prev, [admin.id]: false }));
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setIsDeleting(true);

    const result = await deleteSubAdmin(adminToDelete.id, subdomain as string);
    if (result.success) {
      toast.success(`Administrator ${adminToDelete.full_name} deleted.`);
      setAdminToDelete(null);
      fetchAdmins();
    } else {
      toast.error(result.error || "Failed to delete administrator.");
    }
    setIsDeleting(false);
  };

  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const handleSendReminders = async () => {
    if (!tenant?.id) return;
    setIsSendingReminders(true);
    try {
      const res = await sendPendingInvitationReminders(tenant.id, subdomain as string);
      if (res.success) {
        if (res.count === 0) {
          toast.info("No pending staff invitations require reminders at this time.");
        } else {
          toast.success(`Dispatched reminders & renewed links for ${res.count} staff members.`);
          fetchAdmins();
        }
      } else {
        toast.error(res.error || "Failed to dispatch reminders.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminders.");
    } finally {
      setIsSendingReminders(false);
    }
  };

  const superAdminCount = useMemo(() => admins.filter(a => a.is_super_admin).length, [admins]);
  const subAdminCount = useMemo(() => admins.filter(a => !a.is_super_admin).length, [admins]);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return admins.filter(admin => {
      const matchesSearch = !q || (
        Boolean(admin.full_name && admin.full_name.toLowerCase().includes(q)) ||
        Boolean(admin.email && admin.email.toLowerCase().includes(q)) ||
        Boolean(admin.custom_role_title && admin.custom_role_title.toLowerCase().includes(q))
      );

      const matchesRole = 
        roleFilter === 'all' ? true :
        roleFilter === 'super' ? admin.is_super_admin :
        !admin.is_super_admin;

      return Boolean(matchesSearch && matchesRole);
    });
  }, [admins, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Institutional Administrators
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage administrative personnel and assign dashboard roles and permissions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            disabled={isSendingReminders}
            onClick={handleSendReminders}
            className="h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl font-bold border-primary/20 hover:bg-primary/5 flex items-center justify-center gap-2 text-xs w-full sm:w-auto"
          >
            {isSendingReminders ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4 text-primary" />}
            <span>Dispatch Pending Reminders</span>
          </Button>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl gradient-brand font-bold text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-xs w-full sm:w-auto"
          >
            <UserPlus className="size-4" />
            <span>Invite Administrator</span>
          </Button>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-card p-3 sm:p-4 rounded-2xl border border-primary/10 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, or role title..." 
            className="pl-10 h-10 sm:h-11 bg-background/50 border-primary/10 rounded-xl text-xs sm:text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center overflow-x-auto no-scrollbar p-1.5 bg-muted/60 dark:bg-card/80 border border-border/80 rounded-2xl gap-1.5 shadow-sm backdrop-blur-md shrink-0">
          <button 
            onClick={() => setRoleFilter('all')}
            className={cn(
              "relative flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0",
              roleFilter === 'all' 
                ? "bg-background text-foreground shadow-md border border-border/60" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>All</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {isLoading ? "..." : admins.length}
            </Badge>
          </button>

          <button 
            onClick={() => setRoleFilter('super')}
            className={cn(
              "relative flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0",
              roleFilter === 'super' 
                ? "bg-background text-foreground shadow-md border border-border/60" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shield className="size-3 text-amber-500" />
            <span>Super Admins</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {isLoading ? "..." : superAdminCount}
            </Badge>
          </button>

          <button 
            onClick={() => setRoleFilter('sub')}
            className={cn(
              "relative flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0",
              roleFilter === 'sub' 
                ? "bg-background text-foreground shadow-md border border-border/60" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCog className="size-3 text-primary" />
            <span>Admins</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {isLoading ? "..." : subAdminCount}
            </Badge>
          </button>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="bg-card rounded-2xl border border-primary/10 shadow-xl overflow-hidden">
        <Table className="min-w-[680px]">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-primary/10">
              <TableHead className="font-bold uppercase tracking-widest text-[10px] py-5 px-6">Administrator</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Contact Info</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Roles</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Joined</TableHead>
              <TableHead className="text-right px-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-primary/5">
                  <TableCell className="py-5 px-6"><div className="h-5 w-40 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-36 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-6 w-48 bg-muted rounded-full"></div></TableCell>
                  <TableCell><div className="h-6 w-20 bg-muted rounded-full"></div></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted rounded"></div></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : filteredAdmins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <UserCog className="size-12 text-muted/20" />
                    <p className="text-muted-foreground font-medium italic">No administrators found matching your filter.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAdmins.map((admin) => {
                const isSuper = admin.is_super_admin;
                const permissions: string[] = Array.isArray(admin.permissions) ? admin.permissions : [];
                const isPendingSetup = !isSuper && admin.is_active && !admin.onboarding_completed;
                const isInviteExpired = isPendingSetup && admin.invitation_expires_at && new Date() > new Date(admin.invitation_expires_at);
                const isSelf = admin.id === currentUserId;

                return (
                  <TableRow key={admin.id} className="hover:bg-primary/[0.02] transition-colors border-primary/5 group/row">
                    {/* Administrator Profile */}
                    <TableCell className="py-5 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover/row:scale-105",
                          isSuper 
                            ? "bg-amber-500/15 text-amber-600 border border-amber-500/30" 
                            : "bg-primary/10 text-primary border border-primary/20"
                        )}>
                          {admin.full_name ? admin.full_name.substring(0, 1).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm tracking-tight text-foreground">{admin.full_name}</p>
                            {isSelf && (
                              <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 text-muted-foreground">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-primary mt-0.5">
                            {isSuper ? "Super Administrator" : (admin.custom_role_title || "Admin")}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3 text-muted-foreground/70" />
                          <span>{admin.email}</span>
                        </div>
                        {admin.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Phone className="size-3 text-muted-foreground/70" />
                            <span>{admin.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Assigned Modules / Permissions */}
                    <TableCell>
                      {isSuper || permissions.includes('*') ? (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[11px] gap-1 px-2.5 py-1">
                          <Sparkles className="size-3 text-amber-500" />
                          <span>Full System Access (Super Admin)</span>
                        </Badge>
                      ) : permissions.length === 0 ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No Modules Assigned
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {permissions.slice(0, 3).map((perm) => {
                            const tag = formatPermissionTag(perm);
                            return (
                              <Badge 
                                key={perm} 
                                variant="outline" 
                                className={cn("text-[10px] font-bold px-2 py-0.5 border", tag.badgeClass)}
                              >
                                {tag.label}
                              </Badge>
                            );
                          })}
                          {permissions.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0.5">
                              +{permissions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={cn(
                          "rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                          !admin.is_active 
                            ? "bg-red-500/10 text-red-500 border-red-500/20" 
                            : isInviteExpired
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 w-fit"
                              : isPendingSetup
                                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        {!admin.is_active 
                          ? "Suspended" 
                          : isInviteExpired
                            ? (<span className="flex items-center gap-1"><Clock className="size-3" /> Expired (72h)</span>)
                            : isPendingSetup 
                              ? "Pending Setup" 
                              : "Active"}
                      </Badge>
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : "—"}
                    </TableCell>

                    {/* Actions Dropdown */}
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 border-primary/20 glass-panel">
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-black text-primary/70">
                            Administrator Actions
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-primary/10" />

                          {isSuper ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                              <Shield className="size-3.5 text-amber-500" />
                              <span>Super Admin (Protected)</span>
                            </div>
                          ) : (
                            <>
                              <DropdownMenuItem 
                                className="gap-2 text-xs font-medium cursor-pointer"
                                onClick={() => {
                                  setSelectedAdmin(admin);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <SlidersHorizontal className="size-3.5 text-primary" /> Edit Permissions & Role
                              </DropdownMenuItem>

                              {isPendingSetup && admin.is_active && (
                                <>
                                  <DropdownMenuItem 
                                    className="gap-2 text-xs font-medium cursor-pointer"
                                    disabled={isActionLoading[admin.id]}
                                    onClick={() => handleCopyActivationLink(admin)}
                                  >
                                    <Copy className="size-3.5 text-blue-500" /> 
                                    {isActionLoading[admin.id] 
                                      ? "Generating..." 
                                      : isInviteExpired 
                                        ? "Renew Link & Copy" 
                                        : "Copy Activation Link"}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    className="gap-2 text-xs font-medium cursor-pointer text-indigo-600 focus:text-indigo-600 focus:bg-indigo-500/10"
                                    disabled={isActionLoading[admin.id]}
                                    onClick={() => handleResendCredentials(admin)}
                                  >
                                    <Mail className="size-3.5" /> 
                                    {isActionLoading[admin.id] 
                                      ? "Sending..." 
                                      : isInviteExpired 
                                        ? "Renew Link & Resend" 
                                        : "Resend Invite Email"}
                                  </DropdownMenuItem>
                                </>
                              )}

                              <DropdownMenuSeparator className="bg-primary/10" />

                              {!isSelf && (
                                <>
                                  <DropdownMenuItem 
                                    className="gap-2 text-xs font-medium cursor-pointer"
                                    onClick={() => handleToggleStatus(admin)}
                                  >
                                    <Power className={cn("size-3.5", admin.is_active ? "text-amber-500" : "text-emerald-500")} />
                                    {admin.is_active ? "Suspend Administrator" : "Reactivate Administrator"}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    className="gap-2 text-xs font-medium cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-500/10"
                                    onClick={() => setAdminToDelete(admin)}
                                  >
                                    <Trash2 className="size-3.5" /> Delete Administrator
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Admin Modal */}
      {isAddModalOpen && tenant?.id && (
        <AddAdminModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchAdmins}
          schoolId={tenant.id}
          subdomain={subdomain as string}
        />
      )}

      {/* Edit Admin Permissions Modal */}
      {isEditModalOpen && selectedAdmin && (
        <EditAdminPermissionsModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAdmin(null);
          }}
          onSuccess={fetchAdmins}
          adminUser={selectedAdmin}
          subdomain={subdomain as string}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!adminToDelete} onOpenChange={(open) => !open && setAdminToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] p-6 border-red-500/20 bg-card">
          <DialogHeader>
            <div className="size-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
              <Trash2 className="size-6" />
            </div>
            <DialogTitle className="text-xl font-bold">Delete Administrator Account</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Are you sure you want to delete <span className="font-bold text-foreground">{adminToDelete?.full_name}</span> ({adminToDelete?.is_super_admin ? "Super Administrator" : (adminToDelete?.custom_role_title || "Admin")})?
              This will revoke their access and permanently delete their login credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setAdminToDelete(null)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAdmin}
              disabled={isDeleting}
              className="rounded-xl font-bold"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
