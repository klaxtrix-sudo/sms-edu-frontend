"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/components/providers/tenant-provider";
import { scoreToGrade } from "@/lib/grade-scale";
import { getBackendUrl } from "@/lib/utils";

/** A single result row joined with its subject name. */
export interface ChildResult {
  id: string;
  subject_id: string;
  subject_name: string;
  academic_year: string;
  term: number;
  scores: Record<string, any>;
  total_score: number;
  grade: string;
  remark: string;
}

/** Aggregated academics for a child in the current term. */
export interface ChildAcademics {
  attendancePct: number | null;
  avgScore: number | null;
  avgGrade: string | null;
  rank?: number | null;
  positionStr?: string | null;
  snapshot?: any | null;
  results: ChildResult[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches attendance + results for a single child and computes aggregates.
 * Prefers fast, finalized MongoDB snapshots when available.
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
  const [rank, setRank] = useState<number | null>(null);
  const [positionStr, setPositionStr] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any | null>(null);
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
      // 0. Check if an official compiled MongoDB snapshot exists for this child & term
      try {
        const { data: { session } } = await (supabase as any).auth.getSession();
        if (session?.access_token && year && term) {
          const snapRes = await fetch(
            `${getBackendUrl()}/academic/snapshots/student?studentId=${encodeURIComponent(childId)}&academicYear=${encodeURIComponent(year)}&term=${encodeURIComponent(term)}`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );
          if (snapRes.ok) {
            const snapJson = await snapRes.json();
            const snap = snapJson.data;
            if (snap && snap.subjects && snap.subjects.length > 0) {
              setSnapshot(snap);
              setRank(snap.rank || null);
              setPositionStr(snap.positionStr || null);
              setAttendancePct(snap.attendance?.percentage ?? null);
              setAvgScore(snap.averageScore ?? null);
              setAvgGrade(scoreToGrade(snap.averageScore ?? 0));

              const mappedSnap: ChildResult[] = snap.subjects.map((s: any) => ({
                id: s.subjectId,
                subject_id: s.subjectId,
                subject_name: s.subjectName,
                academic_year: snap.academicYear,
                term: snap.term,
                scores: s.scores || {},
                total_score: s.total,
                grade: s.grade,
                remark: s.remark,
              }));
              setResults(mappedSnap);
              setLoading(false);
              return;
            }
          }
        }
      } catch (snapErr) {
        console.warn('[useChildAcademics] Snapshot fallback to relational:', snapErr);
      }
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
    rank,
    positionStr,
    snapshot,
    results,
    loading,
    error,
    refetch: fetchAcademics,
  };
}
