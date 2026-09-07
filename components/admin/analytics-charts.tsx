"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  TrendingUp, 
  GraduationCap, 
  Clock, 
  CreditCard, 
  BarChart2, 
  Layers 
} from "lucide-react";
import { PerformanceTrendPoint, ClassPerformanceComparison } from "@/app/actions/analytics-actions";

interface AnalyticsChartsProps {
  trends: PerformanceTrendPoint[];
  classComparisons: ClassPerformanceComparison[];
  collectedRevenue: number;
  targetedRevenue: number;
}

export function AnalyticsCharts({
  trends,
  classComparisons,
  collectedRevenue,
  targetedRevenue,
}: AnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<"attendance" | "classes" | "revenue">("attendance");

  // Custom Dark Mode Aware Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 border border-border/80 backdrop-blur-md p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="font-semibold" style={{ color: entry.color || entry.fill }}>
              {entry.name || "Value"}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomRevenueTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 border border-border/80 backdrop-blur-md p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="font-semibold" style={{ color: entry.fill }}>
              {entry.name}: ₦{Number(entry.value).toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const revenueBarData = [
    { name: "Targeted Inflow", amount: targetedRevenue, fill: "#6366f1" },
    { name: "Realized Collection", amount: collectedRevenue, fill: "#10b981" },
    { 
      name: "Outstanding Balance", 
      amount: Math.max(0, targetedRevenue - collectedRevenue), 
      fill: "#f59e0b" 
    },
  ];

  return (
    <div className="space-y-4">
      {/* Chart Selector Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "attendance"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-3.5" /> Attendance Pulse
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "classes"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="size-3.5" /> Class Comparisons
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("revenue")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "revenue"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="size-3.5" /> Tuition Realization
          </button>
        </div>

        <div className="text-[11px] font-medium text-muted-foreground">
          {activeTab === "attendance" && "Average student presence rate over time"}
          {activeTab === "classes" && "Average score across academic grades"}
          {activeTab === "revenue" && "Expected vs. collected school fees"}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[320px] w-full pt-2">
        {activeTab === "attendance" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.7} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                dy={8}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="attendance"
                name="Attendance"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#attendanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === "classes" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classComparisons.slice(0, 8)}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.7} />
              <XAxis
                dataKey="className"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                dy={8}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="avgScore"
                name="Average Score"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === "revenue" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.7} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => `₦${(v / 1000).toLocaleString()}k`}
              />
              <Tooltip content={<CustomRevenueTooltip />} />
              <Bar
                dataKey="amount"
                name="Amount"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
