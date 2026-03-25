'use client';

import React, { useState } from 'react';
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
  ArrowUpRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const MOCK_TENANTS = [
  { id: 1, name: 'Monidams Academy', subdomain: 'monidams', cloud: 'Healthy', region: 'us-east-1', created: '2 days ago' },
  { id: 2, name: 'Grace Hill International', subdomain: 'gracehill', cloud: 'Healthy', region: 'eu-west-1', created: '1 week ago' },
  { id: 3, name: 'Lighthouse Preparatory', subdomain: 'lighthouse', cloud: 'Warning', region: 'us-west-2', created: '3 hours ago' },
  { id: 4, name: 'Sterling Heights High', subdomain: 'sterling', cloud: 'Healthy', region: 'ap-south-1', created: '14 days ago' },
];

const STATS = [
  { title: 'Global Nodes', value: '42', change: '+12%', icon: Globe, color: 'text-cyan-400' },
  { title: 'Cloud Matrix Health', value: '98.4%', change: '+0.2%', icon: Server, color: 'text-emerald-400' },
  { title: 'Active Gates', value: '15', change: '-2', icon: Key, color: 'text-amber-400' },
  { title: 'Data Pulse', value: '1.2M', change: '+24k', icon: Activity, color: 'text-purple-400' },
];

export default function ConsoleDashboard() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-heading font-bold tracking-tight text-white italic">Operations Hub</h1>
          <p className="text-slate-400 text-lg">Centralized oversight of the Klaxtrix global institutional network.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300 rounded-xl">
             Download Matrix Report
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)]">
             <Plus className="w-4 h-4 mr-2" /> New Access Gate
          </Button>
        </div>
      </div>

      {/* Statistics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <Card key={stat.title} className="p-6 bg-[#0c0c0c]/50 border-slate-800/50 hover:border-cyan-500/30 transition-all group overflow-hidden relative">
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
                  stat.change.startsWith('+') ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
                )}>
                  {stat.change}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Institutional Nodes Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" /> Institutional Matrix
            </h2>
            <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
               <Input 
                 placeholder="Filter nodes..." 
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
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Institution</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Endpoint</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cloud Matrix</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ops Area</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {MOCK_TENANTS.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{tenant.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Joined {tenant.created}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-cyan-400 text-xs">
                        {tenant.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'solabacademy.com.ng'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          tenant.cloud === 'Healthy' 
                            ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" 
                            : "border-amber-500/20 text-amber-400 bg-amber-500/5"
                        )}>
                          {tenant.cloud === 'Healthy' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                          {tenant.cloud.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        {tenant.region}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-slate-800">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Global Activity Sidebar */}
        <div className="space-y-6">
           <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-purple-400" /> Command Log
           </h2>
           <div className="space-y-4">
              {[
                { type: 'Sync', msg: 'Data matrix parity verified for Node 42', time: '2m ago' },
                { type: 'Gate', msg: 'New Institutional Access Code generated (KLAX-99)', time: '14m ago' },
                { type: 'Alert', msg: 'High latency detected in AP-SOUTH-1 cluster', time: '41m ago', critical: true },
                { type: 'Onboard', msg: 'Sterling Heights High activated global endpoint', time: '1h ago' },
              ].map((log, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 flex gap-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
                   <div className={cn(
                     "w-1 h-full absolute left-0 top-0",
                     log.critical ? "bg-red-500" : (log.type === 'Gate' ? "bg-amber-500" : "bg-cyan-500")
                   )} />
                   <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{log.type}</span>
                         <span className="text-[10px] font-bold text-slate-600">{log.time}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-300 leading-snug">{log.msg}</p>
                   </div>
                </div>
              ))}
           </div>
           
           <Card className="p-6 bg-gradient-to-br from-cyan-600/20 to-purple-600/20 border-cyan-500/20 relative overflow-hidden group cursor-pointer hover:border-cyan-500/40 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                 <Shield className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10 space-y-4">
                 <h3 className="text-lg font-bold text-white italic">Executive Guard v1.0</h3>
                 <p className="text-xs text-slate-300 leading-relaxed font-semibold">Your session is secured with end-to-end mission encryption. All terminal commands are logged for platform integrity.</p>
                 <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest">
                    View Security Protocols <ArrowUpRight className="w-4 h-4" />
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
