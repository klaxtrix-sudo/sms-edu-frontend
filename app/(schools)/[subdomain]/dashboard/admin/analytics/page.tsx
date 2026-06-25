"use client";

import { useEffect, useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Clock, 
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  CalendarDays,
  CheckCircle2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    attendance: { rate: 88, trend: "+2.4%" },
    academics: { avgScore: 74, trend: "+1.2%" },
    finance: { collected: 85, trend: "+5.1%" },
    activeUsers: { count: 1250, trend: "+12" }
  });
  
  const supabase = createClient();

  useEffect(() => {
    // Simulating analytics aggregation
    setTimeout(() => setLoading(false), 1500);
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-primary italic uppercase">School Analytics</h1>
          <p className="text-muted-foreground mt-2 text-xl font-medium max-w-2xl opacity-80">
            See how your school is doing across attendance, academics, and fees.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl border border-border/50 backdrop-blur-xl">
           <div className="px-4 py-2 bg-background/50 rounded-xl border border-border/50 text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <CalendarDays className="size-4" /> Term 2 Analysis
           </div>
           <Select defaultValue="30">
              <SelectTrigger className="w-32 bg-background/50 border-none ring-1 ring-border rounded-xl font-bold">
                 <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="7">Last 7 Days</SelectItem>
                 <SelectItem value="30">Last 30 Days</SelectItem>
                 <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
           </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <AnalyticsStatCard 
          title="School Attendance" 
          value={`${stats.attendance.rate}%`} 
          trend={stats.attendance.trend}
          icon={Clock}
          color="primary"
          description="Average daily presence rate"
        />
        <AnalyticsStatCard 
          title="Academic Score" 
          value={`${stats.academics.avgScore}%`} 
          trend={stats.academics.trend}
          icon={GraduationCap}
          color="emerald"
          description="Average across all assessments"
        />
        <AnalyticsStatCard 
          title="Revenue Targeted" 
          value={`${stats.finance.collected}%`} 
          trend={stats.finance.trend}
          icon={CreditCard}
          color="blue"
          description="Fee collection efficiency"
        />
        <AnalyticsStatCard 
          title="Campus Activity" 
          value="Online" 
          trend="Active Now"
          icon={Users}
          color="amber"
          description="Real-time portal engagement"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
           <CardHeader className="p-10 pb-0">
              <CardTitle className="text-4xl font-black tracking-tighter uppercase italic text-primary">Performance Trends</CardTitle>
              <CardDescription className="text-lg font-medium opacity-80">How your school has grown this term.</CardDescription>
           </CardHeader>
           <CardContent className="p-10 pt-10 h-[400px] flex items-center justify-center bg-gradient-to-t from-primary/5 to-transparent">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                   <Loader2 className="size-16 animate-spin text-primary opacity-20" />
                   <span className="text-xl font-black text-muted-foreground animate-pulse tracking-widest uppercase">Loading chart...</span>
                </div>
              ) : (
                <div className="w-full h-full flex items-end justify-around gap-4 pb-10">
                   {[65, 80, 72, 90, 85, 95, 88].map((h, i) => (
                     <div key={i} className="flex flex-col items-center gap-4 group w-full">
                        <div 
                          className="w-full bg-primary/20 rounded-2xl group-hover:bg-primary transition-all duration-500 relative" 
                          style={{ height: `${h}%` }}
                        >
                           <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              {h}%
                           </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-muted-foreground opacity-40">Week {i + 1}</span>
                     </div>
                   ))}
                </div>
              )}
           </CardContent>
        </Card>

        <Card className="lg:col-span-1 border-none shadow-3xl bg-card/60 backdrop-blur-2xl rounded-[3rem] p-10 flex flex-col justify-between">
           <div>
              <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-primary mb-2">Priority Alerts</CardTitle>
              <CardDescription className="text-base font-medium opacity-80 mb-10">Things that may need your attention.</CardDescription>
              
              <div className="space-y-6">
                 <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20 flex items-start gap-4 animate-pulse">
                    <div className="size-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg mt-1">
                       <AlertCircle size={24} />
                    </div>
                    <div>
                       <h5 className="text-sm font-black text-rose-600 uppercase tracking-widest">Attendance Dip</h5>
                       <p className="text-xs font-bold text-rose-500 mt-1">Grade 10 Attendance has fallen below 75% threshold this week.</p>
                    </div>
                 </div>
                 
                 <div className="p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20 flex items-start gap-4">
                    <div className="size-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg mt-1">
                       <CheckCircle2 size={24} />
                    </div>
                    <div>
                       <h5 className="text-sm font-black text-amber-600 uppercase tracking-widest">Fee Collection</h5>
                       <p className="text-xs font-bold text-amber-500 mt-1">85% of Term 2 fees paid via Paystack.</p>
                    </div>
                 </div>
              </div>
           </div>

           <Button className="w-full h-16 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-primary/20 mt-10 uppercase italic">Generate Term Report</Button>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsStatCard({ title, value, trend, icon: Icon, color, description }: any) {
  const colorMap: any = {
    primary: "text-primary bg-primary/10 border-primary/20",
    emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-600 bg-amber-500/10 border-amber-500/20"
  };

  const isUp = trend.startsWith("+") || trend === "Active Now";

  return (
    <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden group hover:translate-y-[-8px] transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-8 pt-8">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.34em] text-muted-foreground opacity-60">
          {title}
        </CardTitle>
        <div className={cn("p-2.5 rounded-2xl shadow-inner", colorMap[color])}>
          <Icon size={20} />
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <div className="text-5xl font-black tabular-nums tracking-tighter text-foreground mt-2">{value}</div>
        <div className="flex items-center justify-between mt-6">
          <div className={cn(
             "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md",
             isUp ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
          )}>
            {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {trend}
          </div>
          <span className="text-[9px] font-bold text-muted-foreground opacity-60 max-w-[80px] text-right leading-tight">
            ({description})
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
