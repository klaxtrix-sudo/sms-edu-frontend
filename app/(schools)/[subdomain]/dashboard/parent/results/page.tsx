"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, GraduationCap, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ResultSlipPDF } from "@/components/shared/result-slip-template";
import { useParentChildren, type ParentChild } from "@/hooks/use-parent-children";
import { useChildAcademics, type ChildResult } from "@/hooks/use-child-academics";
import { useTenant } from "@/components/providers/tenant-provider";
import { EmptyState, ErrorState } from "@/components/dashboard/query-states";

/** Groups results by term+year for display. */
interface TermGroup {
  key: string;
  term: number;
  year: string;
  results: ChildResult[];
}

/** Maps ChildResult[] to the shape ResultSlipPDF expects. */
function toSlipRows(results: ChildResult[]) {
  return results.map((r) => {
    // Split scores JSONB into CA vs Exam by metric name heuristic.
    const entries = Object.entries(r.scores);
    const caScore = entries
      .filter(([k]) => /ca/i.test(k))
      .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
    const examScore = entries
      .filter(([k]) => /exam/i.test(k))
      .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
    return {
      subject: r.subject_name,
      ca: caScore || "—",
      exam: examScore || "—",
      total: r.total_score,
      grade: r.grade,
    };
  });
}

export default function ParentResultsPage() {
  const { children, loading, error, refetch } = useParentChildren();
  const { academicCycle, tenant } = useTenant();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Auto-select the first child once the list loads.
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const { results, loading: resultsLoading } = useChildAcademics(
    selectedChildId || undefined,
    academicCycle?.academicYear,
    academicCycle?.currentTerm
  );

  // Group results by term+year.
  const termGroups: TermGroup[] = useMemo(() => {
    const map = new Map<string, TermGroup>();
    for (const r of results) {
      const key = `${r.academic_year}-T${r.term}`;
      if (!map.has(key)) {
        map.set(key, { key, term: r.term, year: r.academic_year, results: [] });
      }
      map.get(key)!.results.push(r);
    }
    return Array.from(map.values()).sort((a, b) =>
      b.year === a.year ? b.term - a.term : b.year.localeCompare(a.year)
    );
  }, [results]);

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
         <Loader2 className="size-16 animate-spin text-primary/20" />
         <p className="font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Loading Results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Academic Results</h1>
          <p className="text-slate-500 mt-2 font-medium">View and download report cards for your children.</p>
        </div>
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Academic Results</h1>
          <p className="text-slate-500 mt-2 font-medium">View and download report cards for your children.</p>
        </div>

        {children.length > 0 && (
          <div className="w-full md:w-64">
            <Select value={selectedChildId || ""} onValueChange={setSelectedChildId}>
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map(child => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.profiles?.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No children linked"
          message="Results will appear here once your children are linked to your account."
        />
      ) : resultsLoading ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <Loader2 className="size-12 animate-spin text-primary/20" />
          <p className="font-bold text-muted-foreground animate-pulse">Loading results...</p>
        </div>
      ) : termGroups.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No results published yet"
          message={`No results found for ${selectedChild?.profiles?.full_name || "this child"} in the current term (${academicCycle?.academicYear || "—"}, Term ${academicCycle?.currentTerm || 1}).`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {termGroups.map((group, idx) => {
            const isLatest = idx === 0;
            const slipStudent = {
              full_name: selectedChild?.profiles?.full_name || "—",
              admission_no: selectedChild?.admission_no || "—",
              class_name: selectedChild?.classes?.name || "—",
            };
            const slipRows = toSlipRows(group.results);
            return (
              <Card
                key={group.key}
                className={`border-none shadow-md bg-white rounded-[2rem] overflow-hidden group hover:shadow-lg transition-shadow ${!isLatest ? "opacity-75" : ""}`}
              >
                <CardHeader className={`${isLatest ? "bg-primary/5" : "bg-slate-50"} pb-6 flex flex-row items-center justify-between`}>
                  <div>
                    <CardTitle className={`${isLatest ? "text-primary" : "text-slate-700"} text-xl font-black italic uppercase`}>
                      Term {group.term}
                    </CardTitle>
                    <CardDescription className={`font-bold ${isLatest ? "text-primary/60" : "text-slate-500"}`}>
                      {group.year} Academic Year
                    </CardDescription>
                  </div>
                  <Badge className={isLatest ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold px-3" : ""} variant={isLatest ? "default" : "outline"}>
                    {isLatest ? "Published" : "Archived"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`size-12 rounded-2xl ${isLatest ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"} flex items-center justify-center`}>
                      <FileText className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-slate-900">Termly Report Card</h4>
                      <p className="text-sm text-slate-500 font-medium">
                        {group.results.length} subject{group.results.length !== 1 ? "s" : ""} · Available for download
                      </p>
                    </div>
                  </div>
                  {/* Subject summary */}
                  <div className="space-y-2 mb-6">
                    {group.results.slice(0, 4).map((r) => (
                      <div key={r.id} className="flex justify-between text-sm py-1 border-b border-slate-50">
                        <span className="font-bold text-slate-700">{r.subject_name}</span>
                        <span className="font-black text-primary">{r.total_score} ({r.grade})</span>
                      </div>
                    ))}
                    {group.results.length > 4 && (
                      <p className="text-xs text-muted-foreground italic pt-1">+ {group.results.length - 4} more subjects</p>
                    )}
                  </div>
                  <PDFDownloadLink
                    document={
                      <ResultSlipPDF
                        student={slipStudent}
                        results={slipRows}
                        term={`Term ${group.term}`}
                        year={group.year}
                        schoolName={tenant?.name || "Klaxtrix Academy"}
                      />
                    }
                    fileName={`result-${slipStudent.full_name.replace(/\s/g, "-")}-T${group.term}-${group.year}.pdf`}
                  >
                    {({ loading: pdfLoading }) => (
                      <Button className="w-full rounded-xl h-12 font-bold" variant="outline" disabled={pdfLoading}>
                        {pdfLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
                        Download PDF
                      </Button>
                    )}
                  </PDFDownloadLink>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
