"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/components/providers/tenant-provider";
import { scoreToGrade } from "@/lib/grade-scale";

/** A single result row joined with its subject name. */
export interface ChildResult {
  id: string;
  subject_id: string;
  subject_name: string;
  academic_year: string;
  term: number;
  scores: Record<string, number>;
  total_score: number;
  grade: string;
  remark: string;
}

/** Aggregated academics for a child in the current term. */
export interface ChildAcademics {
  attendancePct: number | null;
  avgScore: number | null;
  avgGrade: string | null;
  results: ChildResult[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches attendance + results for a single child and computes aggregates.
 *
 * Used by the household overview (per-child cards) and the child detail page.
 * Gated on `useTenant()` so it never queries the master DB.
 */
export function useChildAcademics(
  childId: string | undefined,
  academicYear?: string,
  currentTerm?: number
): ChildAcademics {
  const { supabase, academicCycle } = useTenant();
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [avgGrade, setAvgGrade] = useState<string | null>(null);
  const [results, setResults] = useState<ChildResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = academicYear || academicCycle?.academicYear || "";
  const term = currentTerm ?? academicCycle?.currentTerm ?? 1;

  const fetchAcademics = useCallback(async () => {
    if (!supabase || !childId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch attendance for the current term (approximate: all attendance rows)
      const { data: attendance, error: attErr } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", childId);

      if (attErr) throw attErr;

      if (attendance && attendance.length > 0) {
        const present = attendance.filter(
          (a) => a.status === "present" || a.status === "late"
        ).length;
        setAttendancePct(Math.round((present / attendance.length) * 100));
      } else {
        setAttendancePct(null);
      }

      // 2. Fetch results for the current term/year, joined with subjects
      let resultsQuery = supabase
        .from("results")
        .select(`
          id,
          subject_id,
          academic_year,
          term,
          scores,
          total_score,
          grade,
          remark,
          subjects (name)
        `)
        .eq("student_id", childId);

      if (year) resultsQuery = resultsQuery.eq("academic_year", year);
      if (term) resultsQuery = resultsQuery.eq("term", term);

      const { data: resultsData, error: resErr } = await resultsQuery;

      if (resErr) throw resErr;

      const mapped: ChildResult[] = (resultsData ?? []).map((r: any) => ({
        id: r.id,
        subject_id: r.subject_id,
        subject_name: r.subjects?.name || "Unknown",
        academic_year: r.academic_year,
        term: r.term,
        scores: r.scores || {},
        total_score: Number(r.total_score),
        grade: r.grade,
        remark: r.remark,
      }));

      setResults(mapped);

      if (mapped.length > 0) {
        const avg = Math.round(
          mapped.reduce((sum, r) => sum + r.total_score, 0) / mapped.length
        );
        setAvgScore(avg);
        setAvgGrade(scoreToGrade(avg));
      } else {
        setAvgScore(null);
        setAvgGrade(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load academic data.");
    } finally {
      setLoading(false);
    }
  }, [supabase, childId, year, term]);

  useEffect(() => {
    fetchAcademics();
  }, [fetchAcademics]);

  return {
    attendancePct,
    avgScore,
    avgGrade,
    results,
    loading,
    error,
    refetch: fetchAcademics,
  };
}
