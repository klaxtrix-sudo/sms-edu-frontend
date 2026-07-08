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
 * - Computes total outstanding fees (fee_structures − successful fee_payments)
 *   across all children for the current term/year.
 * - Computes per-child attendance % and average grade.
 * - Builds a performance trend chart from historical results.
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
      const stats: Record<string, ChildStat> = {};
      let totalOutstanding = 0;
      const termAverages: Map<string, number[]> = new Map();

      for (const child of children) {
        // 1. Fee structures for this child's class (current term/year)
        let owedForChild = 0;
        if (child.class_id && child.school_id) {
          const { data: feeStructures } = await supabase
            .from("fee_structures")
            .select("id, amount, academic_year, term")
            .eq("class_id", child.class_id)
            .eq("school_id", child.school_id)
            .eq("academic_year", year)
            .eq("term", term);

          if (feeStructures && feeStructures.length > 0) {
            // Fetch successful payments for this child
            const { data: payments } = await supabase
              .from("fee_payments")
              .select("fee_structure_id, amount, status")
              .eq("student_id", child.id)
              .eq("status", "success");

            const paidFeeIds = new Set((payments || []).map((p) => p.fee_structure_id));
            for (const fs of feeStructures) {
              if (!paidFeeIds.has(fs.id)) {
                owedForChild += Number(fs.amount);
              }
            }
          }
        }
        totalOutstanding += owedForChild;

        // 2. Attendance
        const { data: attendance } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", child.id);

        let attPct: number | null = null;
        if (attendance && attendance.length > 0) {
          const present = attendance.filter(
            (a) => a.status === "present" || a.status === "late"
          ).length;
          attPct = Math.round((present / attendance.length) * 100);
        }

        // 3. Results for current term (for avg grade)
        let resultsQuery = supabase
          .from("results")
          .select("total_score, academic_year, term")
          .eq("student_id", child.id);

        if (year) resultsQuery = resultsQuery.eq("academic_year", year);
        if (term) resultsQuery = resultsQuery.eq("term", term);

        const { data: currentResults } = await resultsQuery;

        let avgScore: number | null = null;
        let avgGrade: string | null = null;
        if (currentResults && currentResults.length > 0) {
          avgScore = Math.round(
            currentResults.reduce((s, r) => s + Number(r.total_score), 0) / currentResults.length
          );
          avgGrade = scoreToGrade(avgScore);
        }

        stats[child.id] = {
          childId: child.id,
          attendancePct: attPct,
          avgGrade,
          avgScore,
        };

        // 4. Historical results for performance chart (all terms)
        const { data: allResults } = await supabase
          .from("results")
          .select("total_score, academic_year, term")
          .eq("student_id", child.id)
          .order("academic_year", { ascending: true })
          .order("term", { ascending: true });

        if (allResults) {
          for (const r of allResults) {
            const key = `${r.academic_year}-T${r.term}`;
            if (!termAverages.has(key)) termAverages.set(key, []);
            termAverages.get(key)!.push(Number(r.total_score));
          }
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
