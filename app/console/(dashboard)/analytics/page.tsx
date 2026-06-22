'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  Globe,
  RefreshCcw,
  Zap,
  ArrowUpRight,
  School
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { cn, getBackendUrl } from '@/lib/utils';
import { useConsoleAuthHeaders } from '@/components/console/console-auth-provider';

const BACKEND_URL = getBackendUrl();

interface AnalyticsData {
  aggregate: {
    totalStudents: number;
    totalTeachers: number;
    totalExams: number;
    activeSchools: number;
  };
  growth: Array<{ month: string; enrollment: number; growth: number }>;
  distribution: Array<{ name: string; value: number }>;
}

interface PulseEvent {
  id: string;
  timestamp: string;
  school: string;
  event: string;
  description: string;
}

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function AnalyticsPage() {
  const getConsoleAuthHeaders = useConsoleAuthHeaders();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [pulse, setPulse] = useState<PulseEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const [ovRes, pulseRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/analytics/platform/overview`, getConsoleAuthHeaders()),
        axios.get(`${BACKEND_URL}/analytics/platform/pulse`, getConsoleAuthHeaders())
      ]);
      
      if (ovRes.data.success) setData(ovRes.data.data);
      if (pulseRes.data.success) setPulse(pulseRes.data.data);
    } catch (error) {
      console.error('Analytics Fetch Error:', error);
      toast.error("Couldn't load analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-800/50">
        <div className="space-y-1">
           <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Platform Insights</span>
           </div>
           <h1 className="text-4xl font-heading font-black tracking-tight text-white uppercase text-glow">Analytics</h1>
           <p className="text-slate-500 text-sm max-w-2xl font-medium">Track growth and activity across all schools.</p>
        </div>
        
        <Button 
          onClick={fetchAnalytics}
          className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 font-bold px-6 h-12 rounded-xl transition-all flex items-center gap-2"
        >
           <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin text-cyan-400")} />
           Refresh
        </Button>
      </div>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
            { label: 'Total Students', value: data?.aggregate.totalStudents.toLocaleString(), icon: Users, color: 'text-cyan-400' },
            { label: 'Total Teachers', value: data?.aggregate.totalTeachers.toLocaleString(), icon: GraduationCap, color: 'text-violet-400' },
            { label: 'Exams Completed', value: data?.aggregate.totalExams.toLocaleString(), icon: BookOpen, color: 'text-fuchsia-400' },
            { label: 'Active Schools', value: data?.aggregate.activeSchools.toLocaleString(), icon: School, color: 'text-emerald-400' }
         ].map((stat, i) => (
           <Card key={i} className="bg-[#0b0b0b]/50 border-slate-800/50 p-6 flex items-start justify-between group hover:border-slate-700 transition-all">
              <div className="space-y-2">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                 <h3 className="text-3xl font-black text-white">{stat.value || '--'}</h3>
                 <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <ArrowUpRight className="w-3 h-3" /> 12% Growth
                 </div>
              </div>
              <div className={cn("p-3 rounded-xl bg-slate-900/50 border border-slate-800 group-hover:scale-110 transition-transform", stat.color)}>
                 <stat.icon className="w-5 h-5" />
              </div>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Growth Area Chart */}
         <Card className="lg:col-span-2 bg-[#0c0c0c]/50 border-slate-800/50 p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                   <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-cyan-400" /> Enrollment Growth
                   </h2>
                   <p className="text-xs text-slate-500 font-medium">Monthly student enrollment over time.</p>
                </div>
                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">Live</Badge>
            </div>

            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.growth || []}>
                     <defs>
                        <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                     <XAxis 
                        dataKey="month" 
                        stroke="#475569" 
                        fontSize={10} 
                        fontWeight={700}
                        axisLine={false}
                        tickLine={false}
                     />
                     <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        fontWeight={700}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v/1000}k`}
                     />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#06b6d4', fontWeight: 800 }}
                     />
                     <Area 
                        type="monotone" 
                        dataKey="enrollment" 
                        stroke="#06b6d4" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorEnroll)" 
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </Card>

         {/* Distribution & Pulse */}
         <div className="space-y-8 flex flex-col">
            <Card className="flex-1 bg-[#0c0c0c]/50 border-slate-800/50 p-8 space-y-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                   <Globe className="w-5 h-5 text-violet-400" /> Schools by Region
                </h2>
               <div className="h-[200px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={data?.distribution || []}
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                        >
                           {data?.distribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                     <span className="text-2xl font-black text-white">{data?.aggregate.activeSchools || 0}</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Active Schools</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  {data?.distribution.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                       <div className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">{d.name}</span>
                       <span className="text-[10px] font-black text-white ml-auto">{d.value}</span>
                    </div>
                  ))}
               </div>
            </Card>

            <Card className="flex-1 bg-[#0c0c0c]/80 border-slate-800 border-l-4 border-l-cyan-500/50 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-cyan-900/5">
                  <div className="flex items-center gap-2">
                     <Zap className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Live Activity</span>
                  </div>
               </div>
               <div className="p-4 space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar bg-black/40">
                  {pulse.map((item) => (
                    <div key={item.id} className="space-y-1 group border-b border-slate-800/30 pb-3 last:border-0">
                       <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-tighter">{item.school}</span>
                          <span className="text-[8px] font-mono text-slate-600">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <p className="text-[10px] font-bold text-slate-200">{item.event}</p>
                       <p className="text-[9px] text-slate-500 truncate group-hover:text-slate-400 transition-colors uppercase tracking-tight">{item.description}</p>
                    </div>
                  ))}
                  {pulse.length === 0 && (
                     <div className="py-8 text-center space-y-2">
                        <Activity className="w-6 h-6 text-slate-800 mx-auto animate-pulse" />
                         <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No recent activity.</p>
                     </div>
                  )}
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
}
