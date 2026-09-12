'use client';

import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Award } from 'lucide-react';

interface PerformanceChartProps {
  data?: { month: string; performance: number }[];
}

const defaultData = [
  { month: 'Jan', performance: 0 },
  { month: 'Feb', performance: 0 },
  { month: 'Mar', performance: 0 },
  { month: 'Apr', performance: 0 },
  { month: 'May', performance: 0 },
  { month: 'Jun', performance: 0 },
];

export function PerformanceChart({ data = defaultData }: PerformanceChartProps) {
  const chartData = data && data.length > 0 ? data : defaultData;
  const hasRealData = chartData.some((d) => d.performance > 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative h-[280px] sm:h-[300px] w-full select-none"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'currentColor', fontSize: 11 }}
            className="text-muted-foreground font-medium"
            dy={8}
          />
          <YAxis 
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', fontSize: 10 }}
            className="text-muted-foreground font-mono"
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip 
            formatter={(value: any) => [`${value}%`, 'Average Score']}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card) / 0.95)', 
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--card-foreground))',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              fontSize: '12px',
              fontWeight: 600
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
          />
          <Area 
            type="monotone" 
            dataKey="performance" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorPerformance)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Clean informative watermark overlay when no graded records exist */}
      {!hasRealData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-background/20 backdrop-blur-[1px] rounded-2xl">
          <div className="flex flex-col items-center gap-2 text-center p-4 max-w-xs">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <Award className="size-4 opacity-70" />
            </div>
            <p className="text-xs font-bold text-foreground">
              Awaiting Graded Assessments
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Academic trends will chart automatically as students complete exams and tests.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
