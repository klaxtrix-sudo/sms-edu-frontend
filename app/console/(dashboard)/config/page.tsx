'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Shield,
  Lock,
  Mail,
  Palette,
  Power,
  RefreshCcw,
  Plus,
  Trash2,
  KeyRound,
  UserCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { cn, getBackendUrl } from '@/lib/utils';
import { getConsoleAuthHeaders, getConsoleUser } from '@/lib/console-auth';

const BACKEND_URL = getBackendUrl();

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  last_login: string;
  created_at: string;
}

interface PlatformConfig {
  maintenance_mode: { enabled: boolean; message: string };
  branding: { primary_color: string; logo_url: string };
}

export default function ConfigPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [newAdmin, setNewAdmin] = useState({ username: '', email: '', password: '', role: 'admin', creatorPassword: '' });
  const [profileUpdate, setProfileUpdate] = useState({ email: '', password: '', creatorPassword: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteCreatorPassword, setDeleteCreatorPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [adminRes, configRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/console/admins`, getConsoleAuthHeaders()),
        axios.get(`${BACKEND_URL}/console/settings`, getConsoleAuthHeaders())
      ]);
      
      if (adminRes.data.success) setAdmins(adminRes.data.data);
      if (configRes.data.success) setConfig(configRes.data.data);
      
      let user = getConsoleUser();
      if (user && !user.id) {
        // Legacy session without ID - refresh from backend
        const meRes = await axios.get(`${BACKEND_URL}/console/me`, getConsoleAuthHeaders());
        if (meRes.data.success) {
          user = meRes.data.data;
          // Synchronize localStorage
          const token = localStorage.getItem('klaxtrix_console_token');
          if (token) {
            localStorage.setItem('klaxtrix_console_user', JSON.stringify(user));
          }
        }
      }
      setCurrentUser(user);
    } catch (error) {
      console.error('Config Fetch Error:', error);
      toast.error('Failed to load administrative parameters.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetCreateForm = () => {
    setNewAdmin({ username: '', email: '', password: '', role: 'admin', creatorPassword: '' });
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.username.trim()) { toast.error('Username is required.'); return; }
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(newAdmin.username.trim())) {
      toast.error('Invalid username', { description: '3-30 chars: letters, numbers, dots, hyphens, underscores.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdmin.email.trim())) { toast.error('A valid email is required.'); return; }
    if (newAdmin.password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (!newAdmin.creatorPassword) { toast.error('Confirm with your password to authorize this creation.'); return; }

    try {
      setIsCreating(true);
      const response = await axios.post(`${BACKEND_URL}/console/admins`, newAdmin, getConsoleAuthHeaders());
      if (response.data.success) {
        toast.success('Administrative node established successfully.');
        fetchData();
        resetCreateForm();
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message;
      if (error.response?.data?.errors) {
        const fieldErrors = error.response.data.errors;
        const firstField = Object.keys(fieldErrors)[0];
        toast.error(fieldErrors[firstField]?.[0] || 'Validation failed.');
      } else {
        toast.error(msg || 'Failed to create admin.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser?.id) return;
    if (!profileUpdate.creatorPassword) { toast.error('Confirm with your password to authorize this update.'); return; }
    if (profileUpdate.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileUpdate.email.trim())) {
      toast.error('A valid email is required.'); return;
    }
    if (profileUpdate.password && profileUpdate.password.length < 8) {
      toast.error('New password must be at least 8 characters.'); return;
    }

    try {
      setIsUpdating(true);
      const response = await axios.patch(`${BACKEND_URL}/console/admins/${currentUser.id}`, profileUpdate, getConsoleAuthHeaders());
      if (response.data.success) {
        toast.success('Your profile parameters have been updated.');
        setProfileUpdate({ email: '', password: '', creatorPassword: '' });
      }
    } catch (error: any) {
      const msg = error.response?.data?.message;
      if (error.response?.data?.errors) {
        const fieldErrors = error.response.data.errors;
        const firstField = Object.keys(fieldErrors)[0];
        toast.error(fieldErrors[firstField]?.[0] || 'Validation failed.');
      } else {
        toast.error(msg || 'Failed to update your profile.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === currentUser?.id) {
      toast.error('Security Protocol: You cannot purge your own administrative node.');
      setDeleteTarget(null);
      return;
    }
    if (!deleteCreatorPassword) { toast.error('Confirm with your password to authorize this purge.'); return; }

    try {
      setIsDeleting(true);
      const response = await axios.delete(`${BACKEND_URL}/console/admins/${deleteTarget.id}`, {
        ...getConsoleAuthHeaders(),
        data: { creatorPassword: deleteCreatorPassword },
      });
      if (response.data.success) {
        toast.success(`Node ${deleteTarget.username} has been purged from the registry.`);
        setDeleteTarget(null);
        setDeleteCreatorPassword('');
        fetchData();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message;
      if (error.response?.data?.errors) {
        const fieldErrors = error.response.data.errors;
        const firstField = Object.keys(fieldErrors)[0];
        toast.error(fieldErrors[firstField]?.[0] || 'Validation failed.');
      } else {
        toast.error(msg || 'Purge protocol failed.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      const newValue = { ...config?.maintenance_mode, enabled };
      const response = await axios.patch(`${BACKEND_URL}/console/settings/maintenance_mode`, { value: newValue }, getConsoleAuthHeaders());
      if (response.data.success) {
        toast.success(enabled ? 'Maintenance Matrix Engaged.' : 'Maintenance Matrix Rescinded.');
        fetchData();
      }
    } catch (error) {
       toast.error('Security Protocol Failure: Cannot toggle maintenance mode.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-800/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
             <Settings className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Console Management</span>
          </div>
          <h1 className="text-4xl font-heading font-black tracking-tight text-white uppercase text-glow">Configuration</h1>
          <p className="text-slate-500 text-sm max-w-2xl font-medium">Advanced governance for master administrators and platform-wide security protocols.</p>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Reload functionality moved to breadcrumbs or automatic sync */}
        </div>
      </div>

      <Tabs defaultValue="admins" className="space-y-6">
        <TabsList className="bg-[#0b0b0b] border border-slate-800 p-1 h-14 rounded-2xl gap-2">
          <TabsTrigger value="admins" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 rounded-xl px-6 font-bold uppercase tracking-tighter text-xs gap-2">
            <Users className="w-4 h-4" /> Administrative Team
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 rounded-xl px-6 font-bold uppercase tracking-tighter text-xs gap-2">
            <UserCircle className="w-4 h-4" /> My Profile
          </TabsTrigger>
          <TabsTrigger value="governance" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 rounded-xl px-6 font-bold uppercase tracking-tighter text-xs gap-2">
            <Shield className="w-4 h-4" /> Platform Governance
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Administrators */}
        <TabsContent value="admins" className="space-y-6">
          <Card className="bg-[#0c0c0c]/50 border-slate-800 p-0 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> Active Master Nodes
               </h2>
               {currentUser?.role === 'super-admin' ? (
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetCreateForm(); }}>
                   <DialogTrigger asChild>
                     <Button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl gap-2 h-10 px-4">
                        <Plus className="w-4 h-4" /> Create Admin
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="bg-[#0c0c0c] border-slate-800 text-white max-h-[85vh] flex flex-col overflow-hidden p-0">
                     <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800/60">
                       <DialogTitle className="text-xl font-black uppercase tracking-tight">Access Escalation</DialogTitle>
                     </DialogHeader>
                     <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5 min-h-0">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Admin Username</label>
                           <Input
                             placeholder="e.g. solomon.admin"
                             className="bg-slate-900 border-slate-800 h-12 rounded-xl"
                             value={newAdmin.username}
                             onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Primary Email</label>
                           <Input
                             type="email"
                             placeholder="orbital@klaxtrix.com"
                             className="bg-slate-900 border-slate-800 h-12 rounded-xl"
                             value={newAdmin.email}
                             onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Secure Passphrase</label>
                           <Input
                             type="password"
                             placeholder="Min. 8 characters"
                             className="bg-slate-900 border-slate-800 h-12 rounded-xl"
                             value={newAdmin.password}
                             onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Clearance Level</label>
                           <Select value={newAdmin.role} onValueChange={(v) => setNewAdmin({ ...newAdmin, role: v })}>
                             <SelectTrigger className="bg-slate-900 border-slate-800 h-12 rounded-xl text-sm">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                               <SelectItem value="admin">Admin</SelectItem>
                               <SelectItem value="viewer">Viewer</SelectItem>
                               <SelectItem value="super-admin">Super Admin</SelectItem>
                             </SelectContent>
                           </Select>
                        </div>
                        {newAdmin.role === 'super-admin' && (
                          <div className="flex gap-2.5 items-center p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                            <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                              Super-admin grants full privileges, including the ability to create more super-admins. This action is audited.
                            </p>
                          </div>
                        )}
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
                           <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Confirm With Your Password</label>
                           <Input
                             type="password"
                             placeholder="••••••••"
                             className="bg-slate-900 border-slate-800 h-12 rounded-xl"
                             value={newAdmin.creatorPassword}
                             onChange={(e) => setNewAdmin({ ...newAdmin, creatorPassword: e.target.value })}
                           />
                        </div>
                     </div>
                     <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-800/60">
                        <Button
                          onClick={handleCreateAdmin}
                          disabled={isCreating}
                          className={cn(
                            "w-full h-12 font-black uppercase rounded-xl",
                            newAdmin.role === 'super-admin'
                              ? "bg-red-600 hover:bg-red-500 text-white"
                              : "bg-indigo-500 hover:bg-indigo-600 text-white"
                          )}
                        >
                          {isCreating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Provisioning…</>
                          ) : (
                            newAdmin.role === 'super-admin' ? 'Initialize Super-Admin Node' : 'Initialize Node'
                          )}
                        </Button>
                     </DialogFooter>
                   </DialogContent>
                </Dialog>
               ) : null}
            </div>
            <Table>
              <TableHeader className="bg-slate-900/40">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Administrator</TableHead>
                  <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Role</TableHead>
                  <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Last Telemetry</TableHead>
                  <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id} className="border-slate-800 hover:bg-slate-900/20 transition-colors">
                    <TableCell>
                       <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black">
                             {admin.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-slate-100">{admin.username}</span>
                             <span className="text-[10px] text-slate-500">{admin.email}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className={cn(
                          "text-[9px] font-black tracking-tighter uppercase",
                          admin.role === 'super-admin' ? "border-indigo-500/50 text-indigo-400" : "border-slate-800 text-slate-500"
                       )}>
                          {admin.role}
                       </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-slate-400">
                       {admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never Recorded'}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={admin.id === currentUser?.id}
                          onClick={() => { setDeleteTarget(admin); setDeleteCreatorPassword(''); }}
                          className={cn(
                            "text-slate-600 hover:text-red-400",
                            admin.id === currentUser?.id && "opacity-20 cursor-not-allowed grayscale"
                          )}
                        >
                           <Trash2 className="w-4 h-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
             </Table>
           </Card>

           {/* Delete Confirmation Dialog (re-auth required) */}
           <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteCreatorPassword(''); } }}>
              <DialogContent className="bg-[#0c0c0c] border-slate-800 text-white max-h-[85vh] flex flex-col overflow-hidden p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800/60">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-red-400">Purge Administrative Node</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5 min-h-0">
                 <div className="flex gap-2.5 items-center p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                   <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                   <p className="text-[11px] font-bold leading-relaxed">
                     You are about to permanently purge <strong className="text-white">{deleteTarget?.username}</strong>. This action is irreversible and audited.
                   </p>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Confirm With Your Password</label>
                   <Input
                     type="password"
                     placeholder="••••••••"
                     className="bg-slate-900 border-slate-800 h-12 rounded-xl"
                     value={deleteCreatorPassword}
                     onChange={(e) => setDeleteCreatorPassword(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleDeleteAdmin()}
                   />
                 </div>
                </div>
                <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-800/60">
                  <div className="flex gap-3 w-full">
                   <Button
                     variant="ghost"
                     className="flex-1 h-12 rounded-xl text-slate-400"
                     onClick={() => { setDeleteTarget(null); setDeleteCreatorPassword(''); }}
                     disabled={isDeleting}
                   >
                     Cancel
                   </Button>
                   <Button
                     className="flex-1 h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase rounded-xl"
                     onClick={handleDeleteAdmin}
                     disabled={isDeleting || !deleteCreatorPassword}
                   >
                     {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Purging…</> : 'Purge Node'}
                   </Button>
                 </div>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         </TabsContent>

        {/* Tab 2: Profile */}
        <TabsContent value="profile" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="bg-[#0c0c0c]/50 border-slate-800 p-8 space-y-6">
              <div className="space-y-1">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-indigo-400" /> Identity Lockdown
                 </h2>
                 <p className="text-xs text-slate-500">Update your master administrative credentials.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Institutional Email</label>
                    <Input 
                      className="bg-slate-900 border-slate-800 h-12 rounded-xl"
                      value={profileUpdate.email}
                      onChange={(e) => setProfileUpdate({ ...profileUpdate, email: e.target.value })}
                    />
                 </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">New Secure Passphrase</label>
                     <Input
                       type="password"
                       placeholder="Leave blank to keep current"
                       className="bg-slate-900 border-slate-800 h-12 rounded-xl"
                       value={profileUpdate.password}
                       onChange={(e) => setProfileUpdate({ ...profileUpdate, password: e.target.value })}
                     />
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Confirm With Your Password</label>
                     <Input
                       type="password"
                       placeholder="••••••••"
                       className="bg-slate-900 border-slate-800 h-12 rounded-xl"
                       value={profileUpdate.creatorPassword}
                       onChange={(e) => setProfileUpdate({ ...profileUpdate, creatorPassword: e.target.value })}
                     />
                  </div>
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isUpdating}
                    className="w-full bg-slate-100 hover:bg-white text-black font-black uppercase rounded-xl h-12 mt-4"
                  >
                    {isUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</> : 'Update Node Credentials'}
                  </Button>
              </div>
           </Card>

           <Card className="bg-[#0c0c0c]/30 border-slate-800 p-8 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4">
              <div className="size-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                 <Shield className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="space-y-1">
                 <h3 className="text-white font-bold underline decoration-indigo-500">Level 5 Clearance</h3>
                 <p className="text-xs text-slate-500 font-medium">Authentication session expires in 24 hours.</p>
              </div>
           </Card>
        </TabsContent>

        {/* Tab 3: Governance */}
        <TabsContent value="governance" className="space-y-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-[#0c0c0c]/50 border-slate-800 p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Power className="w-5 h-5 text-red-500" /> Maintenance Matrix
                       </h2>
                       <p className="text-xs text-slate-500">Toggle platform-wide access restriction.</p>
                    </div>
                    <Switch 
                       checked={config?.maintenance_mode.enabled || false} 
                       onCheckedChange={handleToggleMaintenance}
                       className="data-[state=checked]:bg-red-500" 
                    />
                 </div>
                 <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-[10px] font-bold text-red-400 leading-relaxed uppercase tracking-tighter">
                    WARNING: Engaging the maintenance matrix will immediately restrict access for all school portal users except master administrators.
                 </div>
              </Card>

              <Card className="bg-[#0c0c0c]/50 border-slate-800 p-8 space-y-6">
                 <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                       <Palette className="w-5 h-5 text-indigo-400" /> Platform Branding
                    </h2>
                    <p className="text-xs text-slate-500">Global UI visual parameters.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="size-12 rounded-xl border-2 border-slate-800 flex items-center justify-center font-black bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]">K</div>
                       <div className="flex-1 space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">Primary Color HEX</label>
                          <Input value="#06b6d4" readOnly className="bg-slate-900 border-slate-800 h-10 rounded-lg text-xs" />
                       </div>
                    </div>
                 </div>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
