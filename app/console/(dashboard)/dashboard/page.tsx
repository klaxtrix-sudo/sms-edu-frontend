'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Key, 
  Server, 
  Activity,
  Shield,
  TrendingUp,
  Zap,
  MoreVertical,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, getBackendUrl } from '@/lib/utils';
import axios from 'axios';
import { useConsoleAuthHeaders } from '@/components/console/console-auth-provider';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

const MOCK_TENANTS = []; // Deprecated

export default function ConsoleDashboard() {
  const getConsoleAuthHeaders = useConsoleAuthHeaders();
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [tenants, setTenants] = useState<any[]>([]);
  const [isTenantsLoading, setIsTenantsLoading] = useState(true);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setIsTenantsLoading(true);
      setError(null);
      setTenantsError(null);
      
      const backendUrl = getBackendUrl();
      const headers = getConsoleAuthHeaders();
      
      // Fetch Stats, Tenants, and Audit Logs in parallel
      const [statsRes, tenantsRes, logsRes] = await Promise.all([
        axios.get(`${backendUrl}/stats/console`, headers),
        axios.get(`${backendUrl}/tenant/admin/list`, headers),
        axios.get(`${backendUrl}/audit/admin/logs`, headers)
      ]);

      if (statsRes.data.success) {
        const data = statsRes.data.data;
        setStats([
          {
            title: 'Active Schools',
            value: data.institutions.toString(),
            change: '+1',
            icon: Globe,
            color: 'text-cyan-400',
            description: 'Schools currently set up and running.'
          },
          {
            title: 'Provisioning Rate',
            value: `${data.stability}%`,
            change: 'Stable',
            icon: Server,
            color: 'text-indigo-400',
            description: 'Share of schools with a successful setup.'
          },
          {
            title: 'Available Access Codes',
            value: data.tokens.toString(),
            change: 'Active',
            icon: Key,
            color: 'text-amber-400',
            description: 'Unused codes available for new school sign-ups.'
          },
          {
            title: 'Total Records',
            value: data.volume > 1000 ? `${(data.volume / 1000).toFixed(1)}k` : data.volume.toString(),
            change: 'Live',
            icon: Activity,
            color: 'text-fuchsia-400',
            description: 'Total records across schools, registrations, and access codes.',
          },
        ]);
      }

      if (tenantsRes.data.success) {
        setTenants(tenantsRes.data.data);
      }

      if (logsRes.data.success) {
        setLogs((logsRes.data.data ?? []).slice(0, 4)); // Only show top 4 for the dashboard
      }

      setIsLoading(false);
      setIsTenantsLoading(false);
      setIsLogsLoading(false);
    } catch (err: any) {
      console.error('Data Fetch Error:', err);
      setError("Couldn't load data");
      setTenantsError("Couldn't load schools.");
      setIsLoading(false);
      setIsTenantsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage);
  const paginatedTenants = filteredTenants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <TooltipProvider>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-heading font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-slate-400 text-lg">Overview of all schools on your platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={fetchData}
            variant="outline" 
            className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300 rounded-xl"
            disabled={isLoading || isTenantsLoading}
          >
             <RefreshCw className={cn("w-4 h-4 mr-2", (isLoading || isTenantsLoading) && "animate-spin")} />
             Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="p-6 bg-[#0c0c0c]/50 border-slate-800/50 animate-pulse h-32" />
          ))
        ) : error ? (
          <div className="col-span-full p-8 rounded-2xl bg-red-500/5 border border-red-500/10 flex flex-col items-center justify-center gap-4 text-center">
             <Activity className="w-12 h-12 text-red-500/50" />
             <div className="space-y-1">
                <p className="text-red-400 font-bold uppercase tracking-widest text-sm">{error}</p>
                <p className="text-slate-500 text-xs">We couldn't reach the server. Check your connection and try again.</p>
              </div>
              <Button onClick={fetchData} variant="outline" size="sm" className="border-red-500/20 hover:bg-red-500/10 text-red-300">
                 Try again
              </Button>
          </div>
        ) : (
          stats?.map((stat: any, i: number) => (
            <Tooltip key={stat.title}>
              <TooltipTrigger asChild>
                <Card className="p-6 bg-[#0c0c0c]/50 border-slate-800/50 hover:border-cyan-500/30 transition-all group cursor-help overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <stat.icon className="w-16 h-16" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-slate-900 border border-slate-800", stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.title}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-bold text-white tabular-nums">{stat.value}</span>
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full",
                        stat.change.startsWith('+') || stat.change === 'Stable' || stat.change === 'Live' ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"
                      )}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-center">
                {stat.description}
              </TooltipContent>
            </Tooltip>
          ))
        )}
      </div>

      <div className="space-y-8">
        {/* School Registry Table - Now Full Width */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" /> School Registry
            </h2>
            <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search schools..."
                  className="pl-10 h-10 bg-slate-900/50 border-slate-800 rounded-xl text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          
          <Card className="bg-[#0c0c0c]/50 border-slate-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/50 bg-slate-900/30">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">School</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Domain</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Region</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {isTenantsLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-8 bg-slate-900/10"></td>
                      </tr>
                    ))
                  ) : tenantsError ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-red-400 font-bold mb-2">{tenantsError}</p>
                        <Button onClick={fetchData} variant="outline" size="sm" className="border-red-500/20 text-red-300">Try again</Button>
                      </td>
                    </tr>
                  ) : paginatedTenants.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No schools match your search.</td>
                    </tr>
                  ) : (
                    paginatedTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-200">{tenant.name}</div>
                          <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                            Joined {new Date(tenant.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-cyan-400 text-xs">
                          {tenant.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            tenant.is_provisioned 
                              ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" 
                              : "border-amber-500/20 text-amber-400 bg-amber-500/5"
                          )}>
                            {tenant.is_provisioned ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                            {tenant.is_provisioned ? 'Active' : 'Setting up'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                          {tenant.region || 'US-EAST-1'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-slate-800">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!isTenantsLoading && !tenantsError && totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between bg-slate-900/20">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="border-slate-800 bg-slate-900 text-slate-400 h-8 px-3 rounded-lg hover:text-white"
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="border-slate-800 bg-slate-900 text-slate-400 h-8 px-3 rounded-lg hover:text-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Global Activity Sidebar - Moved below/different row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          <div className="lg:col-span-3 space-y-6">
                 <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-purple-400" /> Recent Activity
                 </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLogsLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-slate-900/30 border border-slate-800/50 animate-pulse" />
                  ))
                ) : logs.length === 0 ? (
                   <div className="col-span-full py-6 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                      No recent activity.
                   </div>
                ) : (
                  logs.map((log: any, i: number) => {
                    // Map backend action to display type
                    let type = 'System';
                    let colorClass = 'bg-cyan-500';
                    let critical = false;

                    if (log.action.includes('REGISTER')) { type = 'Onboard'; colorClass = 'bg-emerald-500'; }
                     if (log.action.includes('GATE') || log.action.includes('CODE')) { type = 'Code'; colorClass = 'bg-amber-500'; }
                    if (log.action.includes('DELETE') || log.action.includes('FAIL')) { type = 'Alert'; colorClass = 'bg-red-500'; critical = true; }

                    return (
                      <div key={log.id} className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 flex gap-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
                        <div className={cn(
                          "w-1 h-full absolute left-0 top-0",
                          colorClass
                        )} />
                        <div className="space-y-1 w-full">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{type}</span>
                              <span className="text-[10px] font-bold text-slate-600">
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-300 leading-snug truncate">
                              {log.details?.institution_name || log.action.replace(/_/g, ' ')}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{log.actor_id}</p>
                        </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  </TooltipProvider>
  );
}
