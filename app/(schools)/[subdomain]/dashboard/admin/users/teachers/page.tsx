'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { 
  getTeachers, 
  createTeacher, 
  toggleTeacherStatus,
  resetUserPassword
} from '@/app/actions/admin-actions';
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
  DialogTrigger,
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
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function TeachersPage() {
  const { subdomain } = useParams();
  const { tenant } = useTenant();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });

  const fetchTeachers = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    const result = await getTeachers(tenant.id);
    if (result.success) {
      setTeachers(result.data || []);
    } else {
      toast.error(result.error || "Failed to load teachers");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeachers();
  }, [tenant?.id]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;

    setIsSubmitting(true);
    const result = await createTeacher({
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      schoolId: tenant.id,
      subdomain: subdomain as string
    });

    if (result.success) {
      toast.success("Teacher account protocols initialized.");
      setIsAddModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '' });
      fetchTeachers();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const result = await toggleTeacherStatus(userId, !currentStatus, subdomain as string);
    if (result.success) {
      toast.success(`Teacher access ${!currentStatus ? 'restored' : 'suspended'}.`);
      fetchTeachers();
    } else {
      toast.error(result.error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;

    // Minimum length/complexity check
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

    setIsResetting(true);
    const result = await resetUserPassword(selectedTeacher.id, newPassword, subdomain as string);
    if (result.success) {
      toast.success(`Password for ${selectedTeacher.full_name} has been updated.`);
      setIsResetModalOpen(false);
      setNewPassword('');
    } else {
      toast.error(result.error);
    }
    setIsResetting(false);
  };

  const filteredTeachers = teachers.filter(t => 
    t.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-glow">Professional Teachers</h1>
          <p className="text-muted-foreground mt-1">Manage teaching staff and institutional access levels.</p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 px-6 h-12 rounded-xl gradient-brand shadow-lg shadow-primary/20 hover:scale-105 transition-transform text-white">
              <UserPlus className="size-5" />
              Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-2 border-primary/20 bg-white">
            <form onSubmit={handleAddTeacher}>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">Register New Teacher</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Configure login credentials and personal records for the new teacher.
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">First Name</Label>
                    <Input 
                      id="firstName" 
                      placeholder="Jane" 
                      required 
                      className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors"
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Last Name</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Doe" 
                      required 
                      className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors"
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Login Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="teacher@school.com" 
                    required 
                    className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Initial Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="+234..." 
                    className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
                  <AlertCircle className="size-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-slate-600">
                    <span className="font-bold text-primary italic">Note:</span> Subject and Class assignments can be configured from the <Link href="/dashboard/admin/academics" className="text-primary hover:underline font-bold">Academics Portal</Link> or the teacher's individual profile once subjects are established.
                  </div>
                </div>
              </div>

              <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl gradient-brand font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                >
                  {isSubmitting ? "Initializing Account..." : "Confirm Teacher Addition"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
          <DialogContent className="sm:max-w-[400px] border-2 border-primary/20 bg-white p-0 overflow-hidden">
            <form onSubmit={handleResetPassword}>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">Reset Password</DialogTitle>
                <DialogDescription>
                  Updating access credentials for <span className="font-bold text-primary">{selectedTeacher?.full_name}</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" title="At least 8 chars, 1 number, 1 special char" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">New Secure Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 focus:bg-white transition-colors"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Must be <span className="text-slate-600 font-medium">8+ characters</span> with at least <span className="text-slate-600 font-medium">one number</span> and <span className="text-slate-600 font-medium">one special character</span>.
                  </p>
                </div>
              </div>

              <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100">
                <Button 
                  type="submit" 
                  disabled={isResetting}
                  className="w-full h-12 rounded-xl gradient-brand font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                >
                  {isResetting ? "Updating..." : "Update Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls Area */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-primary/5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-10 h-11 bg-background/50 border-primary/10 rounded-xl"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-xl">
          <Users className="size-4 text-primary" />
          <span className="text-sm font-bold text-primary">{filteredTeachers.length} Total</span>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-card rounded-2xl border border-primary/5 shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-primary/5">
              <TableHead className="font-bold uppercase tracking-widest text-[10px] py-6 px-8">Teacher Details</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Contact Info</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Joined</TableHead>
              <TableHead className="text-right px-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-primary/5">
                  <TableCell className="py-6 px-8"><div className="h-4 w-32 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-40 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-6 w-16 bg-muted rounded-full"></div></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted rounded"></div></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Users className="size-12 text-muted/20" />
                    <p className="text-muted-foreground font-medium italic">No faculty members found matching your search.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id} className="hover:bg-primary/[0.02] transition-colors border-primary/5 group/row">
                  <TableCell className="py-6 px-8">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary group-hover/row:scale-110 transition-transform">
                        {teacher.full_name?.substring(0, 1) || 'T'}
                      </div>
                      <div>
                        <p className="font-bold text-sm tracking-tight">{teacher.full_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Teacher ID: {teacher.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="size-3" />
                        {teacher.email}
                      </div>
                      {teacher.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                          <Phone className="size-3" />
                          {teacher.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={teacher.is_active ? "default" : "secondary"} className={cn(
                      "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      teacher.is_active ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
                    )}>
                      {teacher.is_active ? "Active" : "Suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(teacher.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 border-primary/20 glass-panel">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-black text-primary/70">Faculty Management</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-primary/10" />
                        <DropdownMenuItem className="gap-2 text-xs font-medium cursor-pointer">
                          <ExternalLink className="size-3.5" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 text-xs font-medium cursor-pointer"
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setIsResetModalOpen(true);
                          }}
                        >
                          <RotateCcw className="size-3.5" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-primary/10" />
                        <DropdownMenuItem 
                          className={cn(
                            "gap-2 text-xs font-bold cursor-pointer",
                            teacher.is_active ? "text-red-500 focus:text-red-500 focus:bg-red-500/10" : "text-green-500 focus:text-green-500 focus:bg-green-500/10"
                          )}
                          onClick={() => handleToggleStatus(teacher.id, teacher.is_active)}
                        >
                          <Power className="size-3.5" /> 
                          {teacher.is_active ? "Suspend Access" : "Restore Access"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
