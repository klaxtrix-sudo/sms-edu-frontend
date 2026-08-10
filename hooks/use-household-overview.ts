"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/components/providers/tenant-provider";
import { useParentChildren, type ParentChild } from "@/hooks/use-parent-children";
import { scoreToGrade } from "@/lib/grade-scale";

interface ChildStat {
  childId: string;
  attendancePct: number | null;
  avgGrade: string | null;
  avgScore: number | null;
}

interface TermPerformance {
  month: string;
  performance: number;
}

export interface HouseholdOverviewData {
  outstandingBalance: number;
  childStats: Record<string, ChildStat>;
  performanceData: TermPerformance[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Aggregates financial + academic data across all linked children
 * for the household overview page.
 *
 * Uses batch queries with `.in()` filters to avoid N+1 query patterns.
 */
export function useHouseholdOverview(): HouseholdOverviewData {
  const { supabase, academicCycle } = useTenant();
  const { children } = useParentChildren();
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [childStats, setChildStats] = useState<Record<string, ChildStat>>({});
  const [performanceData, setPerformanceData] = useState<TermPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = academicCycle?.academicYear || "";
  const term = academicCycle?.currentTerm ?? 1;

  const fetchOverview = useCallback(async () => {
    if (!supabase || children.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const childIds = children.map((c) => c.id);
      const classIds = Array.from(new Set(children.map((c) => c.class_id).filter(Boolean))) as string[];
      const schoolIds = Array.from(new Set(children.map((c) => c.school_id).filter(Boolean))) as string[];

      // 1. Batch fetch fee structures for all children's classes
      let feeStructures: any[] = [];
      if (classIds.length > 0 && year && term) {
        const { data } = await supabase
          .from("fee_structures")
          .select("id, amount, class_id, school_id")
          .in("class_id", classIds)
          .in("school_id", schoolIds)
          .eq("academic_year", year)
          .eq("term", term);
        feeStructures = data || [];
      }

      // 2. Batch fetch successful payments for all children
      let payments: any[] = [];
      if (childIds.length > 0) {
        const { data } = await supabase
          .from("fee_payments")
          .select("fee_structure_id, student_id, amount, status")
          .in("student_id", childIds)
          .eq("status", "success");
        payments = data || [];
      }

      // 3. Batch fetch attendance for all children
      const { data: attendance } = await supabase
        .from("attendance")
        .select("student_id, status")
        .in("student_id", childIds);

      // 4. Batch fetch current term results
      let currentResultsQuery = supabase
        .from("results")
        .select("student_id, total_score, academic_year, term")
        .in("student_id", childIds);
      if (year) currentResultsQuery = currentResultsQuery.eq("academic_year", year);
      if (term) currentResultsQuery = currentResultsQuery.eq("term", term);
      const { data: currentResults } = await currentResultsQuery;

      // 5. Batch fetch all historical results for performance chart
      const { data: allResults } = await supabase
        .from("results")
        .select("student_id, total_score, academic_year, term")
        .in("student_id", childIds)
        .order("academic_year", { ascending: true })
        .order("term", { ascending: true });

      // ── Process data per-child ──

      const stats: Record<string, ChildStat> = {};
      let totalOutstanding = 0;
      const termAverages: Map<string, number[]> = new Map();

      // Index payments by student_id for O(1) lookup
      const paymentsByStudent = new Map<string, Set<string>>();
      for (const p of payments) {
        if (!paymentsByStudent.has(p.student_id)) {
          paymentsByStudent.set(p.student_id, new Set());
        }
        paymentsByStudent.get(p.student_id)!.add(p.fee_structure_id);
      }

      for (const child of children) {
        // Fee calculation
        let owedForChild = 0;
        if (child.class_id && child.school_id) {
          const childFees = feeStructures.filter(
            (fs) => fs.class_id === child.class_id && fs.school_id === child.school_id
          );
          const paidFeeIds = paymentsByStudent.get(child.id) || new Set();
          for (const fs of childFees) {
            if (!paidFeeIds.has(fs.id)) {
              owedForChild += Number(fs.amount);
            }
          }
        }
        totalOutstanding += owedForChild;

        // Attendance calculation
        const childAttendance = (attendance || []).filter((a) => a.student_id === child.id);
        let attPct: number | null = null;
        if (childAttendance.length > 0) {
          const present = childAttendance.filter(
            (a) => a.status === "present" || a.status === "late"
          ).length;
          attPct = Math.round((present / childAttendance.length) * 100);
        }

        // Current term results
        const childResults = (currentResults || []).filter((r) => r.student_id === child.id);
        let avgScore: number | null = null;
        let avgGrade: string | null = null;
        if (childResults.length > 0) {
          avgScore = Math.round(
            childResults.reduce((s, r) => s + Number(r.total_score), 0) / childResults.length
          );
          avgGrade = scoreToGrade(avgScore);
        }

        stats[child.id] = { childId: child.id, attendancePct: attPct, avgGrade, avgScore };

        // Historical results for chart
        const childAllResults = (allResults || []).filter((r) => r.student_id === child.id);
        for (const r of childAllResults) {
          const key = `${r.academic_year}-T${r.term}`;
          if (!termAverages.has(key)) termAverages.set(key, []);
          termAverages.get(key)!.push(Number(r.total_score));
        }
      }

      setOutstandingBalance(totalOutstanding);
      setChildStats(stats);

      // Build performance chart data from aggregated term averages.
      const chartData: TermPerformance[] = Array.from(termAverages.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // last 6 terms
        .map(([key, scores]) => {
          const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
          const [, termPart] = key.split("-T");
          return { month: `T${termPart}`, performance: avg };
        });

      setPerformanceData(chartData.length > 0 ? chartData : [
        { month: "T1", performance: 0 },
        { month: "T2", performance: 0 },
        { month: "T3", performance: 0 },
      ]);
    } catch (err: any) {
      setError(err?.message || "Failed to load household data.");
    } finally {
      setLoading(false);
    }
  }, [supabase, children, year, term]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return {
    outstandingBalance,
    childStats,
    performanceData,
    loading,
    error,
    refetch: fetchOverview,
  };
}
