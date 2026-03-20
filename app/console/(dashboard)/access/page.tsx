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
import { toast } from 'sonner';

const MOCK_CODES = [
  { id: '1', code: 'KLAX-2026-X8Y2', status: 'active', institution: '-', created: '2026-03-20', expires: '2026-04-20', usage: '0/1' },
  { id: '2', code: 'KLAX-2026-M9N1', status: 'used', institution: 'Monidams Academy', created: '2026-03-18', expires: '2026-04-18', usage: '1/1' },
  { id: '3', code: 'KLAX-2026-P4Q5', status: 'active', institution: '-', created: '2026-03-19', expires: '2026-04-19', usage: '0/1' },
  { id: '4', code: 'KLAX-2026-R7T3', status: 'expired', institution: '-', created: '2026-02-15', expires: '2026-03-15', usage: '0/1' },
  { id: '5', code: 'KLAX-2026-B1C8', status: 'used', institution: 'Grace Hill International', created: '2026-03-10', expires: '2026-04-10', usage: '1/1' },
];

export default function AccessManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCode = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast.success('Access Code Generated', {
        description: 'New secure gate KLAX-2026-H4J9 created and logged.',
      });
    }, 1200);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to Clipboard', {
      description: `Access code ${code} is ready for distribution.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 gap-1.5 py-1 px-3 uppercase text-[10px] font-bold tracking-wider animate-pulse-slow"><ShieldCheck className="w-3 h-3" /> Active</Badge>;
      case 'used':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 py-1 px-3 uppercase text-[10px] font-bold tracking-wider"><CheckCircle2 className="w-3 h-3" /> Redeemed</Badge>;
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
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Verification</span>
          </div>
          <h1 className="text-4xl font-heading font-black tracking-tight text-white uppercase italic">Access Matrix</h1>
          <p className="text-slate-500 text-sm max-w-2xl font-medium">Generate and coordinate institutional onboarding gates for the global Klaxtrix node network.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             className="bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white"
           >
              <Filter className="w-4 h-4 mr-2" />
              Filter Gates
           </Button>
           <Button 
             onClick={handleGenerateCode}
             disabled={isGenerating}
             className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 h-12 rounded-xl shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] transition-all flex items-center gap-2"
           >
              {isGenerating ? <Zap className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate Secure Code
           </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { label: 'Total Gates', value: '42', color: 'slate' },
           { label: 'Active Gates', value: '15', color: 'cyan' },
           { label: 'Redeemed', value: '24', color: 'emerald' },
           { label: 'Expirations', value: '3', color: 'red' },
         ].map((stat, i) => (
           <Card key={i} className="p-4 bg-[#0c0c0c]/50 border-slate-800/50 relative overflow-hidden group">
              <div className="space-y-1 relative z-10">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                 <p className={`text-2xl font-black text-${stat.color === 'slate' ? 'white' : stat.color + '-400'} font-heading`}>{stat.value}</p>
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
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Access Gate</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Assigned Institutional Node</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest text-center">Usage</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Expiration</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {MOCK_CODES.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-900/50 transition-all">
                          <Tag className="w-3.5 h-3.5" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-white font-mono tracking-wider tabular-nums">{item.code}</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Genesis Protocol Code</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       {item.institution !== '-' ? (
                          <>
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-sm font-bold text-slate-300">{item.institution}</span>
                          </>
                       ) : (
                          <span className="text-sm font-bold text-slate-600 italic">Unassigned Gate</span>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[11px] font-black text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800/50 tabular-nums">{item.usage}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-500">
                       <Calendar className="w-3 h-3" />
                       <span className="text-[11px] font-bold uppercase tracking-tight">{item.expires}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Button 
                         variant="outline" 
                         size="icon" 
                         className="w-8 h-8 rounded-lg bg-slate-900/50 border-slate-800 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                         onClick={() => copyToClipboard(item.code)}
                       >
                          <Copy className="w-3.5 h-3.5" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="w-8 h-8 rounded-lg text-slate-600 hover:text-white"
                       >
                          <MoreVertical className="w-4 h-4" />
                       </Button>
                    </div>
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
                 <Clock className="w-3 h-3" /> Latest Session Activity:
              </div>
              <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                 KLAX-2026-X8Y2 Generated by Admin (2m ago)
              </div>
           </div>
           <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-all">
              Full Protocol Logs <ArrowUpRight className="w-3 h-3 ml-1" />
           </div>
        </div>
      </Card>
      
      {/* Footer Warning */}
      <div className="p-6 rounded-2xl bg-[#0c0c0c]/40 border border-slate-800/50 flex gap-5 items-center">
         <div className="w-12 h-12 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500">
            <ShieldCheck className="w-6 h-6" />
         </div>
         <div className="space-y-1">
            <h4 className="text-red-400 text-xs font-black uppercase tracking-[0.2em] italic">Access Protocols Enforced</h4>
            <p className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-3xl">
               ATTENTION: EVERY ACCESS CODE GENERATED IS AUDITED BY THE GLOBAL GOVERNANCE LAYER. CODES ARE CRYPTOGRAPHICALLY LINKED TO THE ISSUING ADMIN SESSION. SHARING CODES OUTSIDE OF VERIFIED INSTITUTIONAL CHANNELS IS A VIOLATION OF KLAXTRIX SECURITY COMPLIANCE.
            </p>
         </div>
      </div>
    </div>
  );
}
