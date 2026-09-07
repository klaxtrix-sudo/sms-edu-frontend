"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Clock, 
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { SchoolAnalyticsData } from "@/app/actions/analytics-actions";

interface AnalyticsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  data: SchoolAnalyticsData | null;
}

export function AnalyticsReportModal({
  isOpen,
  onClose,
  schoolName,
  data,
}: AnalyticsReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const { academicCycle, metrics, classComparisons, priorityAlerts } = data;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-6 sm:p-8 shadow-2xl">
        <div ref={reportRef} className="space-y-6 print:m-0 print:p-0">
          
          {/* Header */}
          <DialogHeader className="border-b border-border/80 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-2 py-0.5">
                    Executive Briefing
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    {academicCycle.academicYear} • {academicCycle.termLabel}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-bold text-foreground">
                  {schoolName || "School"} Term Executive Report
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Official analytics summary covering attendance, academic standing, and tuition realization.
                </DialogDescription>
              </div>

              <div className="text-right text-[11px] text-muted-foreground">
                <span className="block font-semibold text-foreground">Report Date:</span>
                {new Date().toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </DialogHeader>

          {/* Core Metric Pillars Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border bg-muted/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Attendance Rate
              </span>
              <p className="text-xl font-bold text-foreground mt-1">
                {metrics.attendance.rate}%
              </p>
              <span className="text-[10px] text-muted-foreground">
                {metrics.attendance.presentCount} present entries
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Academic Score
              </span>
              <p className="text-xl font-bold text-foreground mt-1">
                {metrics.academics.avgScore}%
              </p>
              <span className="text-[10px] text-muted-foreground">
                {metrics.academics.passRate}% pass rate
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Fee Collection
              </span>
              <p className="text-xl font-bold text-foreground mt-1">
                {metrics.finance.rate}%
              </p>
              <span className="text-[10px] text-muted-foreground">
                ₦{metrics.finance.collected.toLocaleString()} collected
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Community
              </span>
              <p className="text-xl font-bold text-foreground mt-1">
                {metrics.community.totalStudents}
              </p>
              <span className="text-[10px] text-muted-foreground">
                Enrolled students
              </span>
            </div>
          </div>

          {/* Section: Academic & Class Ranking */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <GraduationCap className="size-4 text-primary" /> Class Academic Standing
            </h4>
            <div className="border border-border/70 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                  <tr>
                    <th className="p-3">Class</th>
                    <th className="p-3">Enrolled</th>
                    <th className="p-3">Attendance Rate</th>
                    <th className="p-3 text-right">Average Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {classComparisons.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No class records recorded yet for this session.
                      </td>
                    </tr>
                  ) : (
                    classComparisons.map((c) => (
                      <tr key={c.classId} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-bold text-foreground">{c.className}</td>
                        <td className="p-3 text-muted-foreground">{c.studentCount} students</td>
                        <td className="p-3">
                          <span className={c.attendanceRate < 75 ? "text-rose-600 font-bold" : "text-foreground"}>
                            {c.attendanceRate}%
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-foreground">
                          {c.avgScore > 0 ? `${c.avgScore}%` : "Pending"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Financial Realization Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <CreditCard className="size-4 text-primary" /> Tuition Inflow & Realization
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground font-medium">Targeted Fees</span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  ₦{metrics.finance.targeted.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Realized Collections</span>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ₦{metrics.finance.collected.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Outstanding Balance</span>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  ₦{Math.max(0, metrics.finance.targeted - metrics.finance.collected).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Operational Anomalies & Action Items */}
          {priorityAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" /> Key Observations & Attention Items
              </h4>
              <div className="space-y-2">
                {priorityAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl border border-border/70 bg-muted/20 flex items-start gap-2.5 text-xs"
                  >
                    <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <div>
                      <p className="font-bold text-foreground">{alert.title}</p>
                      <p className="text-muted-foreground mt-0.5 leading-snug">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signoff / Verification footer */}
          <div className="pt-6 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-2">
            <span>Prepared by Klaxtrix SMS-EDU Intelligence Engine</span>
            <span>Principal / Administrator Official Copy</span>
          </div>

        </div>

        <DialogFooter className="mt-4 flex gap-2 justify-end print:hidden">
          <Button variant="outline" onClick={onClose} className="h-10 text-xs font-semibold px-4">
            Close
          </Button>
          <Button
            onClick={handlePrint}
            className="h-10 text-xs font-bold px-5 bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2"
          >
            <Printer className="size-3.5" /> Print / Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
