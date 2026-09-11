'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { 
  getParents, 
  toggleParentStatus,
  archiveParent,
  unarchiveParent,
  resendParentCredentials,
  deletePendingParent,
  linkStudentToParent
} from '@/app/actions/parent-actions';
import { resetUserPassword } from '@/app/actions/admin-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  MoreHorizontal, 
  Power,
  RotateCcw,
  Archive,
  ArchiveRestore,
  Trash2,
  Copy,
  Link as LinkIcon
} from 'lucide-react';
import { AddParentModal } from "@/components/admin/add-parent-modal";
import { LinkStudentModal } from "@/components/admin/link-student-modal";
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ParentsPage() {
  const { subdomain } = useParams();
  const { tenant } = useTenant();
  const [parents, setParents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  const [selectedParent, setSelectedParent] = useState<any>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isResetting, setIsResetting] = useState(false);
  const [isResending, setIsResending] = useState<Record<string, boolean>>({});
  
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const fetchParents = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    const result = await getParents(tenant.id, subdomain as string, true);
    if (result.success) {
      setParents(result.data || []);
    } else {
      toast.error(result.error || "Failed to load parents");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchParents();
  }, [tenant?.id]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const result = await toggleParentStatus(userId, !currentStatus, subdomain as string);
    if (result.success) {
      toast.success(`Parent access ${!currentStatus ? 'restored' : 'suspended'}.`);
      fetchParents();
    } else {
      toast.error(result.error);
    }
  };

  const handleArchiveParent = async (userId: string) => {
    if (!confirm("Are you sure you want to archive this parent? They will be unlinked from all children.")) return;
    
    try {
      const result = await archiveParent(userId, subdomain as string);
      if (result.success) {
        toast.success("Parent archived and children unlinked.");
        fetchParents();
      } else {
        toast.error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong while archiving.");
    }
  };

  const handleUnarchiveParent = async (userId: string) => {
    const result = await unarchiveParent(userId, subdomain as string);
    if (result.success) {
      toast.success("Parent restored. Note: You must manually re-link their children.");
      fetchParents();
    } else {
      toast.error(result.error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return;

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasNumber || !hasSpecial) {
      toast.error("Password must contain at least one number and one special character.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsResetting(true);
    const result = await resetUserPassword(selectedParent.id, newPassword, subdomain as string);
    if (result.success) {
      toast.success(`Password updated for ${selectedParent.full_name}.`);
      setIsResetModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(result.error);
    }
    setIsResetting(false);
  };

  const handleResendCredentials = async (parent: any) => {
    if (!tenant?.id) return;
    setIsResending(prev => ({ ...prev, [parent.id]: true }));
    
    const result = await resendParentCredentials(parent.id, tenant.id, subdomain as string);
    if (result.success) {
      toast.success(`Activation email resent to ${parent.full_name}.`);
      if (result.activationLink) {
        try {
          await navigator.clipboard.writeText(result.activationLink);
          toast.info("Activation link copied to clipboard!");
        } catch {}
      }
    } else {
      toast.error(result.error || "Failed to resend credentials");
    }
    
    setIsResending(prev => ({ ...prev, [parent.id]: false }));
  };

  const handleCopyActivationLink = async (parent: any) => {
    if (!tenant?.id) return;
    setIsResending(prev => ({ ...prev, [parent.id]: true }));
    
    const result = await resendParentCredentials(parent.id, tenant.id, subdomain as string);
    if (result.success && result.activationLink) {
      try {
        await navigator.clipboard.writeText(result.activationLink);
        toast.success("Activation link copied to clipboard!");
      } catch {
        toast.error("Could not write to clipboard");
      }
    } else {
      toast.error(result.error || "Failed to generate activation link");
    }
    
    setIsResending(prev => ({ ...prev, [parent.id]: false }));
  };

  const handleDeletePendingParent = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this pending parent? This action cannot be undone.')) return;
    
    const result = await deletePendingParent(userId, subdomain as string);
    if (result.success) {
      toast.success("Pending parent deleted.");
      fetchParents();
    } else {
      toast.error(result.error || "Failed to delete pending parent");
    }
  };

  const activeCount = useMemo(() => parents.filter(p => !p.is_archived).length, [parents]);
  const archivedCount = useMemo(() => parents.filter(p => p.is_archived).length, [parents]);

  const filteredParents = parents.filter(p => {
    const matchesSearch = p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'active' ? !p.is_archived : p.is_archived;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Parents</h1>
        <p className="text-muted-foreground mt-2 font-medium">Manage parent accounts and their linked children.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-2 rounded-2xl border border-border/80 shadow-sm text-card-foreground">
        <div className="relative w-full sm:w-96 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-9 h-11 bg-muted/40 border-transparent rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background transition-all text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="inline-flex h-auto p-1.5 bg-muted/60 dark:bg-card/80 border border-border/80 rounded-2xl gap-1.5 shadow-sm backdrop-blur-md">
            <button
              onClick={() => setActiveTab('active')}
              className={cn(
                "relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200",
                activeTab === 'active' 
                  ? "bg-background text-foreground shadow-md border border-border/60" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === 'active'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-primary/10 text-primary"
              )}>
                <Users className="size-3.5 sm:size-4" />
              </div>
              <span>Active Parents</span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-0.5 px-2 py-0.5 text-[11px] font-mono font-bold rounded-full transition-colors border",
                  activeTab === 'active'
                    ? "bg-primary/15 text-primary border-primary/25"
                    : "bg-muted text-muted-foreground border-border/40"
                )}
              >
                {isLoading ? "..." : activeCount}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab('archived')}
              className={cn(
                "relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200",
                activeTab === 'archived' 
                  ? "bg-background text-foreground shadow-md border border-border/60" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === 'archived'
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}>
                <Archive className="size-3.5 sm:size-4" />
              </div>
              <span>Archived</span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-0.5 px-2 py-0.5 text-[11px] font-mono font-bold rounded-full transition-colors border",
                  activeTab === 'archived'
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                    : "bg-muted text-muted-foreground border-border/40"
                )}
              >
                {isLoading ? "..." : archivedCount}
              </Badge>
            </button>
          </div>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="h-11 rounded-xl gradient-brand font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] w-full sm:w-auto text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" /> Add Parent
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden text-card-foreground">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px] text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground py-4 px-6">Parent Details</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground py-4 px-6">Contact Info</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground py-4 px-6">Children</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground py-4 px-6">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground py-4 px-6">Joined</TableHead>
              <TableHead className="w-[80px] text-right py-4 px-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[400px] text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-4">
                    <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Loading parents...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredParents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[400px] text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <div className="size-16 rounded-2xl bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200">
                      <Users className="size-6 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-600">No parents found</p>
                      <p className="text-sm">Try adjusting your search or tab.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredParents.map((parent) => {
                const isPendingSetup = !parent.is_archived && parent.is_active && !parent.onboarding_completed;
                const isSuspended = !parent.is_archived && !parent.is_active;
                const isArchived = parent.is_archived;
                const isActive = !parent.is_archived && parent.is_active && parent.onboarding_completed;

                const childrenCount = parent.students?.length || 0;

                return (
                  <TableRow key={parent.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-border shadow-sm shrink-0">
                          <AvatarImage src={parent.avatar_url || ''} className="object-cover" />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                            {parent.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{parent.full_name}</p>
                          <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase truncate">
                            PARENT ID: {parent.id.split('-')[0].toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="space-y-1.5">
                        {parent.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="size-3.5 text-muted-foreground" />
                            <span className="truncate">{parent.email}</span>
                          </div>
                        )}
                        {parent.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="size-3.5 text-muted-foreground" />
                            <span>{parent.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-bold">
                        {childrenCount} {childrenCount === 1 ? 'Child' : 'Children'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {isArchived && (
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground border-border">Archived</Badge>
                        )}
                        {isPendingSetup && (
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">Pending Setup</Badge>
                        )}
                        {isSuspended && (
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-destructive/10 text-destructive border-destructive/20">Suspended</Badge>
                        )}
                        {isActive && (
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Active</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 font-medium py-4 px-6">
                      {new Date(parent.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right py-4 px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 border-slate-100 shadow-xl rounded-xl">
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-black text-slate-400">Parent Management</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          
                          {isPendingSetup ? (
                            <>
                              <DropdownMenuItem 
                                className="gap-2 text-xs font-bold cursor-pointer text-indigo-600 focus:text-indigo-600 focus:bg-indigo-50"
                                disabled={isResending[parent.id]}
                                onClick={() => handleResendCredentials(parent)}
                              >
                                <Mail className="size-3.5" /> {isResending[parent.id] ? "Resending..." : "Resend Invite Email"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2 text-xs font-bold cursor-pointer"
                                disabled={isResending[parent.id]}
                                onClick={() => handleCopyActivationLink(parent)}
                              >
                                <Copy className="size-3.5" /> Copy Activation Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem 
                                className="gap-2 text-xs font-bold text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                onClick={() => handleDeletePendingParent(parent.id)}
                              >
                                <Trash2 className="size-3.5" /> Delete
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem 
                                className="gap-2 text-xs font-bold cursor-pointer"
                                onClick={() => {
                                  setSelectedParent(parent);
                                  setIsLinkModalOpen(true);
                                }}
                              >
                                <LinkIcon className="size-3.5" /> Link Student
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem 
                                className="gap-2 text-xs font-bold cursor-pointer"
                                onClick={() => {
                                  setSelectedParent(parent);
                                  setIsResetModalOpen(true);
                                }}
                              >
                                <RotateCcw className="size-3.5" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem 
                                className={cn(
                                  "gap-2 text-xs font-bold cursor-pointer",
                                  isSuspended ? "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50" : "text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                                )}
                                onClick={() => handleToggleStatus(parent.id, parent.is_active)}
                              >
                                <Power className="size-3.5" /> {isSuspended ? "Restore Access" : "Suspend Access"}
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuSeparator className="bg-slate-100" />
                          {parent.is_archived ? (
                            <DropdownMenuItem 
                              className="gap-2 text-xs font-bold cursor-pointer"
                              onClick={() => handleUnarchiveParent(parent.id)}
                            >
                              <ArchiveRestore className="size-3.5" /> Restore Parent
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="gap-2 text-xs font-bold text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              onClick={() => handleArchiveParent(parent.id)}
                            >
                              <Archive className="size-3.5" /> Archive Parent
                            </DropdownMenuItem>
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

      <AddParentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => fetchParents()}
        schoolId={tenant?.id || ''}
        subdomain={subdomain as string}
      />

      {isLinkModalOpen && selectedParent && (
        <LinkStudentModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          onSuccess={() => fetchParents()}
          parent={selectedParent}
          schoolId={tenant?.id || ''}
          subdomain={subdomain as string}
        />
      )}

      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedParent?.full_name}. They will be able to log in immediately with this password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput 
                  id="new-password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <PasswordInput 
                  id="confirm-password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsResetModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isResetting || !newPassword || !confirmPassword}>
                {isResetting ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
