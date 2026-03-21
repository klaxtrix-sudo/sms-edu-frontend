'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  Shield, 
  ArrowUpRight,
  ExternalLink,
  Activity,
  Server,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy
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
import { cn } from '@/lib/utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
  is_provisioned: boolean;
}

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BACKEND_URL}/tenant/admin/list`);
      if (response.data.success) {
        setTenants(response.data.data);
      }
    } catch (error) {
      console.error('Fetch Tenants Error:', error);
      toast.error('Failed to sync with Institutional Matrix.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Information Captured', {
      description: `${label} copied to the mission clipboard.`,
    });
  };

  const openPortal = (subdomain: string) => {
    const rootDomain = window.location.host; // Expecting localhost:3000 in dev
    const protocol = window.location.protocol;
    const url = `${protocol}//${subdomain}.${rootDomain}/login`;
    window.open(url, '_blank');
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-800/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-500 mb-2">
             <Globe className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Nodes</span>
          </div>
          <h1 className="text-4xl font-heading font-black tracking-tight text-white uppercase italic text-glow">Node Registry</h1>
          <p className="text-slate-500 text-sm max-w-2xl font-medium italic">Global oversight and synchronization of all provisioned Klaxtrix instances.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button 
             onClick={fetchTenants}
             className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 font-bold px-6 h-12 rounded-xl transition-all flex items-center gap-2"
           >
              <Activity className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Sync Matrix
           </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {[
           { label: 'Total Nodes', value: tenants.length.toString(), color: 'cyan', icon: Globe },
           { label: 'Operational', value: tenants.filter(t => t.is_provisioned).length.toString(), color: 'emerald', icon: Server },
           { label: 'Pending Auth', value: tenants.filter(t => !t.is_provisioned).length.toString(), color: 'amber', icon: Shield },
         ].map((stat, i) => (
           <Card key={i} className="p-6 bg-[#0c0c0c]/50 border-slate-800/50 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
              <div className="space-y-2 relative z-10">
                 <div className="flex items-center gap-3">
                    <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                 </div>
                 <p className={`text-3xl font-black text-white font-heading tabular-nums`}>
                    {isLoading ? '...' : stat.value}
                 </p>
              </div>
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-${stat.color}-500/10 transition-all`} />
           </Card>
         ))}
      </div>

      {/* Main Matrix Table */}
      <Card className="bg-[#0c0c0c]/40 border-slate-800/50 backdrop-blur-xl overflow-hidden rounded-2xl relative shadow-2xl">
        <div className="p-6 border-b border-slate-800/50 flex flex-col md:flex-row gap-4 justify-between bg-slate-900/10">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                placeholder="Filter nodes by name or endpoint..." 
                className="bg-slate-900/50 border-slate-800 pl-10 h-11 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Showing {filteredTenants.length} Managed Nodes</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 bg-slate-900/20">
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Institution Identity</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest text-center">Protocol Area</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Global Endpoint</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Onboarding</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest text-right px-10">Interface</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {isLoading ? (
                <tr>
                   <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                         <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                         <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Querying Global Registry...</span>
                      </div>
                   </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-700" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No matching institutional nodes identified.</span>
                      </div>
                   </td>
                </tr>
              ) : filteredTenants.map((node) => (
                <tr key={node.id} className="group hover:bg-cyan-500/5 transition-all duration-300">
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                       <div className="size-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-500/50 transition-all shadow-inner">
                          <Shield className="w-5 h-5" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight italic">{node.name}</span>
                          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">ID: {node.id.slice(0, 8)}...</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <Badge className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter",
                      node.is_provisioned 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    )}>
                      {node.is_provisioned ? <CheckCircle2 className="w-3 h-3 mr-1.5 inline" /> : <Clock className="w-3 h-3 mr-1.5 inline" />}
                      {node.is_provisioned ? 'Operational' : 'Sync Pending'}
                    </Badge>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2 group/link cursor-pointer" onClick={() => copyToClipboard(node.subdomain, 'Subdomain')}>
                       <div className="font-mono text-[11px] text-cyan-400 font-bold bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10 group-hover/link:bg-cyan-400/10 transition-colors">
                         {node.subdomain}.klaxtrix.com
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-xs text-slate-500 font-bold tabular-nums">
                    {new Date(node.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-6 text-right px-10">
                     <div className="flex items-center justify-end gap-3">
                        <Button
                          onClick={() => openPortal(node.subdomain)}
                          className="h-9 px-4 bg-slate-900 hover:bg-cyan-600 hover:text-white text-slate-400 border border-slate-800 hover:border-cyan-500 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg overflow-hidden group/btn"
                        >
                           <ExternalLink className="w-3.5 h-3.5 mr-2 group-hover/btn:scale-110 transition-transform" />
                           Open Node
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-white">
                               <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0c0c0c] border border-slate-800 text-slate-300 w-48 shadow-2xl">
                             <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-cyan-500/10 focus:text-cyan-400 font-bold text-xs" onClick={() => copyToClipboard(node.id, 'School ID')}>
                                <Copy className="w-4 h-4" /> Copy Secure ID
                             </DropdownMenuItem>
                             <DropdownMenuSeparator className="bg-slate-800/50" />
                             <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-red-500/10 focus:text-red-400 font-bold text-xs">
                                <AlertCircle className="w-4 h-4" /> Terminate Node
                             </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer System Status */}
      <div className="flex flex-col md:flex-row gap-6">
         <div className="flex-1 p-6 rounded-2xl bg-[#0c0c0c]/40 border border-slate-800/50 flex gap-5 items-center">
            <div className="size-12 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-500 shadow-inner">
               <Shield className="w-6 h-6" />
            </div>
            <div className="space-y-1">
               <h4 className="text-cyan-400 text-xs font-black uppercase tracking-[0.2em] italic">Encryption Layer Active</h4>
               <p className="text-[11px] font-bold text-slate-600 leading-relaxed max-w-2xl">
                  ALL INSTITUTIONAL MATRICES ARE SECURED WITH AES-256-GCM. MASTER ORCHESTRATION KEYS ARE STORED IN A CLASSIFIED HARDENED ENVIRONMENT.
               </p>
            </div>
         </div>
         
         <Card className="p-6 bg-slate-900/40 border-slate-800 flex items-center justify-between gap-8 min-w-[300px]">
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Matrix Integrity</p>
               <h3 className="text-xl font-black text-white italic">100% ONLINE</h3>
            </div>
            <div className="flex gap-1">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="w-1.5 h-6 bg-cyan-500/40 rounded-full animate-pulse-slow" style={{ animationDelay: `${i * 150}ms` }} />
               ))}
            </div>
         </Card>
      </div>
    </div>
  );
}
