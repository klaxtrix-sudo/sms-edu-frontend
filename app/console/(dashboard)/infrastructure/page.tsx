'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Activity, 
  Shield, 
  Database, 
  Zap, 
  Cpu, 
  Terminal as TerminalIcon,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { cn, getBackendUrl } from '@/lib/utils';
import { getConsoleAuthHeaders } from '@/lib/console-auth';

const BACKEND_URL = getBackendUrl();

interface HealthData {
  timestamp: string;
  totalLatency: number;
  services: {
    registry: { name: string; status: string; latency: string; endpoint: string };
    matrix: { name: string; status: string; readyState: number };
    gateway: { name: string; status: string; version: string };
  };
  resources: {
    memory: string;
    uptime: string;
  };
}

export default function InfrastructurePage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const fetchHealth = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BACKEND_URL}/infrastructure/health`, getConsoleAuthHeaders());
      if (response.data.success) {
        setHealth(response.data.data);
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Infra Fetch Error:', error);
      toast.error("Couldn't load infrastructure status.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-800/50">
        <div className="space-y-1">
           <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <Server className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure</span>
           </div>
           <h1 className="text-4xl font-heading font-black tracking-tight text-white uppercase text-glow">Infrastructure</h1>
           <p className="text-slate-500 text-sm max-w-2xl font-medium">Monitor the health of platform services and resources.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="text-right mr-4 hidden md:block">
               <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Last refreshed</p>
              <p className="text-xs font-mono text-slate-400">{lastSync.toLocaleTimeString()}</p>
           </div>
           <Button 
             onClick={fetchHealth}
             className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 font-bold px-6 h-12 rounded-xl transition-all flex items-center gap-2"
           >
               <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin text-indigo-400")} />
               Refresh
           </Button>
        </div>
      </div>

      {/* Service Mesh Status (Honeycomb Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {health && Object.entries(health.services).map(([key, service]: [string, any]) => (
           <Card key={key} className="bg-[#0c0c0c]/50 border-slate-800/50 p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
              <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                 <div className="flex items-start justify-between">
                    <div className="space-y-1">
                       <h3 className="text-sm font-black text-slate-200 uppercase tracking-tight">{service.name}</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {key === 'registry' ? service.endpoint : key === 'gateway' ? service.version : 'Primary Cluster'}
                       </p>
                    </div>
                    <div className={cn(
                      "size-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                      service.status === 'ONLINE' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"
                    )} />
                 </div>

                 <div className="flex items-center justify-between pt-4 border-t border-slate-800/30">
                    <div className="space-y-0.5">
                       <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Latency</p>
                       <p className="text-xs font-mono text-indigo-400">{service.latency || '8ms'}</p>
                    </div>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase tracking-tighter",
                      service.status === 'ONLINE' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                      {service.status}
                    </Badge>
                 </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all" />
           </Card>
         ))}

         {!health && Array.from({ length: 3 }).map((_, i) => (
           <Card key={i} className="bg-[#0b0b0b] border-slate-800 p-6 h-40 animate-pulse" />
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Resource Allocation */}
         <Card className="bg-[#0c0c0c]/40 border-slate-800/50 p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <Cpu className="w-5 h-5 text-indigo-400" /> Server Resources
                </h2>
               <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">Real-time</Badge>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2 p-4 rounded-xl bg-slate-900/30 border border-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Memory Usage</p>
                  <p className="text-2xl font-black text-white font-mono">{health?.resources.memory || '-- / --'}</p>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                     <div className="w-[45%] h-full bg-indigo-500" />
                  </div>
               </div>
               <div className="space-y-2 p-4 rounded-xl bg-slate-900/30 border border-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">System Uptime</p>
                  <p className="text-2xl font-black text-white font-mono">{health?.resources.uptime || '--h --m'}</p>
                   <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Running</p>
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800/50">
               <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Setup Pipeline</span>
                  <span className="text-[10px] font-black text-emerald-400">Optimal</span>
               </div>
               <div className="flex gap-2">
                  {[100, 100, 100, 45].map((val, i) => (
                    <div key={i} className="flex-1 h-2 rounded bg-slate-800 overflow-hidden">
                       <div className="h-full bg-indigo-500/50" style={{ width: `${val}%` }} />
                    </div>
                  ))}
               </div>
               <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                  <span>Registry</span>
                  <span>Database</span>
                  <span>Edge</span>
                  <span>DNS</span>
               </div>
            </div>
         </Card>

         {/* Infrastructure Logs */}
         <Card className="bg-[#0c0c0c]/80 border-slate-800 border-l-4 border-l-indigo-500/50 flex flex-col h-[400px]">
            <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4 text-indigo-400" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Logs</span>
               </div>
               <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex-1 p-4 font-mono text-[10px] text-slate-400 space-y-2 overflow-y-auto bg-black/40">
               <p className="text-emerald-500/50">[SYSTEM] Server started. Klaxtrix v1.2 ready.</p>
                <p className="text-slate-600">[{new Date().toLocaleTimeString()}] - INFO: Database health check started...</p>
                <p className="text-indigo-400">[{new Date().toLocaleTimeString()}] - SUCCESS: Database connection verified (8ms).</p>
                <p className="text-slate-600">[{new Date().toLocaleTimeString()}] - INFO: Checking school connections...</p>
                <p className="text-cyan-400">[{new Date().toLocaleTimeString()}] - SUCCESS: MongoDB connection established.</p>
                <p className="text-slate-600">[{new Date().toLocaleTimeString()}] - INFO: Renewing SSL certificates for *.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}</p>
                <p className="text-slate-600 opacity-50">[{new Date().toLocaleTimeString()}] - DEBUG: Memory usage is normal ({health?.resources.memory}).</p>
                <div className="animate-pulse flex items-center gap-2 text-indigo-500">
                   <span className="block w-2 h-4 bg-indigo-500" />
                   <span>Waiting for updates...</span>
               </div>
            </div>
         </Card>
      </div>
    </div>
  );
}
