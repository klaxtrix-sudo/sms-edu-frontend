'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Copy, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Tag,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import axios from 'axios';
import { cn, getBackendUrl } from '@/lib/utils';
import { getConsoleAuthHeaders } from '@/lib/console-auth';
import AuditLogsDrawer from '@/components/console/audit-logs-drawer';
import { Trash2 } from 'lucide-react';

const BACKEND_URL = getBackendUrl();

const MOCK_CODES = [
  { id: '1', code: 'X8Y2M9N1', status: 'active', institution: '-', created: '2026-03-20', expires: '2026-04-20', usage: '0/1' },
  { id: '2', code: 'P4Q5R7T3', status: 'used', institution: 'Monidams Academy', created: '2026-03-18', expires: '2026-04-18', usage: '1/1' },
  { id: '3', code: 'B1C8L2O9', status: 'active', institution: '-', created: '2026-03-19', expires: '2026-04-19', usage: '0/1' },
  { id: '4', code: 'T5U6V7W8', status: 'expired', institution: '-', created: '2026-02-15', expires: '2026-03-15', usage: '0/1' },
];

export default function AccessManagementPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Fetch real codes from backend
  const fetchCodes = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BACKEND_URL}/access/admin/list`, getConsoleAuthHeaders());
      if (response.data.success) {
        setCodes(response.data.data);
      }
    } catch (error) {
       toast.error("Couldn't load access codes.");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCodes();
  }, []);

  const handleGenerateCode = async () => {
    try {
      setIsGenerating(true);
      const response = await axios.post(`${BACKEND_URL}/access/admin/generate`, {}, getConsoleAuthHeaders());
      
       if (response.data.success) {
         toast.success('Code generated', {
           description: `Code ${response.data.data.code} is ready to share with a school.`,
         });
         fetchCodes(); // Refresh list
       }
     } catch (error) {
       toast.error("Couldn't generate the code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to Clipboard', {
      description: `Access code ${code} is ready to share.`,
    });
  };

  const handleDeleteCode = async (id: string, code: string) => {
    try {
      const response = await axios.delete(`${BACKEND_URL}/access/admin/delete/${id}`, getConsoleAuthHeaders());
      if (response.data.success) {
        toast.success('Code deleted', {
          description: `Code ${code} has been deleted.`,
        });
        setPendingDeleteId(null);
        fetchCodes();
      }
    } catch (error) {
      toast.error("Couldn't delete the code. Please try again.");
      setPendingDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 gap-1.5 py-1 px-3 uppercase text-[10px] font-bold tracking-wider animate-pulse-slow"><ShieldCheck className="w-3 h-3" /> Active</Badge>;
      case 'used':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 py-1 px-3 uppercase text-[10px] font-bold tracking-wider"><CheckCircle2 className="w-3 h-3" /> Used</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 gap-1.5 py-1 px-3 uppercase text-[10px] font-bold tracking-wider"><AlertCircle className="w-3 h-3" /> Expired</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-800/50">
        <div className="space-y-1">
           <div className="flex items-center gap-2 text-cyan-500 mb-2">
             <Key className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Onboarding</span>
           </div>
           <h1 className="text-4xl font-heading font-black tracking-tight text-white uppercase text-glow">Access Codes</h1>
           <p className="text-slate-500 text-sm max-w-2xl font-medium">Generate codes that let new schools sign up.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button 
             onClick={handleGenerateCode}
             disabled={isGenerating}
             className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 h-12 rounded-xl shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] transition-all flex items-center gap-2"
           >
               {isGenerating ? <Zap className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
               Generate code
           </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
            { label: 'Total Codes', value: codes.length.toString(), color: 'slate' },
            { label: 'Active Codes', value: codes.filter(c => c.status === 'active').length.toString(), color: 'cyan' },
            { label: 'Used', value: codes.filter(c => c.status === 'used').length.toString(), color: 'emerald' },
            { label: 'Expirations', value: codes.filter(c => c.status === 'expired').length.toString(), color: 'red' },
         ].map((stat, i) => (
           <Card key={i} className="p-4 bg-[#0c0c0c]/50 border-slate-800/50 relative overflow-hidden group">
              <div className="space-y-1 relative z-10">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                 <p className={`text-2xl font-black text-${stat.color === 'slate' ? 'white' : stat.color + '-400'} font-heading tabular-nums animate-in slide-in-from-bottom-2 duration-500`}>
                    {isLoading ? '...' : stat.value}
                 </p>
              </div>
              <div className={`absolute top-0 right-0 w-16 h-16 bg-${stat.color}-500/5 blur-2xl -mr-8 -mt-8`} />
           </Card>
         ))}
      </div>

      {/* Main Matrix Table */}
      <Card className="bg-[#0c0c0c]/40 border-slate-800/50 backdrop-blur-xl overflow-hidden rounded-2xl relative">
        {/* Table Search Header */}
        <div className="p-6 border-b border-slate-800/50 flex flex-col md:flex-row gap-4 justify-between bg-slate-900/20">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                placeholder="Search codes or institutions..." 
                className="bg-slate-900/50 border-slate-800 pl-10 h-11 text-sm text-slate-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
           </div>
           <div className="flex gap-2">
              <Badge variant="outline" className="bg-slate-900 border-slate-800 text-slate-500 py-1.5 px-3">Sort by: Latest</Badge>
              <Badge variant="outline" className="bg-slate-900 border-slate-800 text-slate-500 py-1.5 px-3">Show: 10</Badge>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Code</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Used by</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest text-center">Uses</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Expires</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {isLoading ? (
                <tr>
                   <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                   <Zap className="w-8 h-8 text-cyan-500 animate-spin" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading...</span>
                      </div>
                   </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-20 text-center">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No access codes yet. Generate one to get started.</span>
                   </td>
                </tr>
              ) : codes.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.institution_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                <tr key={item.id} className="group hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-900/50 transition-all">
                          <Tag className="w-3.5 h-3.5" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-white font-mono tracking-wider tabular-nums">{item.code}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       {item.institution_name ? (
                           <>
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-sm font-bold text-slate-300">{item.institution_name}</span>
                           </>
                        ) : (
                           <span className="text-sm font-bold text-slate-600">Not used yet</span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[11px] font-black text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800/50 tabular-nums">{item.usage_count}/{item.usage_limit}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-500">
                       <Calendar className="w-3 h-3" />
                       <span className="text-[11px] font-bold uppercase tracking-tight">
                         {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'NO EXPIRY'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {pendingDeleteId === item.id ? (
                      <div className="flex items-center justify-end gap-2">
                         <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Delete?</span>
                        <Button
                          size="sm"
                          className="h-7 px-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-wider"
                          onClick={() => handleDeleteCode(item.id, item.code)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-3 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-wider"
                          onClick={() => setPendingDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8 rounded-lg bg-slate-900/50 border-slate-800 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                          onClick={() => copyToClipboard(item.code)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg text-slate-600 hover:text-white"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-300">
                            <DropdownMenuItem
                              onSelect={() => item.status !== 'used' && setPendingDeleteId(item.id)}
                              disabled={item.status === 'used'}
                              className={cn(
                                "gap-2",
                                item.status === 'used'
                                  ? "text-slate-600 cursor-not-allowed opacity-50"
                                  : "text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                              )}
                            >
                              <Trash2 className="w-4 h-4" /> Delete code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <DropdownMenuItem
                              disabled={item.status === 'used'}
                              className={cn(
                                "gap-2",
                                item.status === 'used'
                                  ? "cursor-not-allowed opacity-50"
                                  : "cursor-pointer"
                              )}
                            >
                              <Zap className="w-4 h-4" /> Expire now
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audit Log Overlay (Floating Indicator) */}
        <div className="p-4 bg-slate-900/40 border-t border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <Clock className="w-3 h-3" /> Latest activity:
               </div>
               <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                  {codes.length > 0 ? `${codes[0].code} created on ${new Date(codes[0].created_at).toLocaleDateString()}` : 'No activity yet.'}
               </div>
             </div>
            <div
              onClick={() => setIsLogsOpen(true)}
              className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-all group"
            >
               View all activity <ArrowUpRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
           </div>
        </div>
      </Card>

      <AuditLogsDrawer isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} />
      
      {/* Footer Warning */}
      <div className="p-6 rounded-2xl bg-[#0c0c0c]/40 border border-slate-800/50 flex gap-5 items-center">
         <div className="w-12 h-12 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500">
            <ShieldCheck className="w-6 h-6" />
         </div>
          <div className="space-y-1">
             <h4 className="text-red-400 text-xs font-black uppercase tracking-[0.2em]">Security note</h4>
             <p className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-3xl">
                Every access code is tied to the admin who generated it. Only share codes with schools you've approved.
             </p>
          </div>
      </div>
    </div>
  );
}
