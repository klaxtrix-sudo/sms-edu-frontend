"use client";

import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Award, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  GraduationCap, 
  Loader2, 
  Printer, 
  Send, 
  ArrowLeft, 
  Eye, 
  PenTool, 
  AlertCircle,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { 
  getClassBroadsheetData, 
  publishClassResults, 
  updateClassTermStatus,
  ClassBroadsheetData 
} from "@/app/actions/academic-actions";
import { createTenantClient } from "@/lib/supabase/client";
import { getBackendUrl, cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClassBroadsheetProps {
  subdomain: string;
  schoolId: string;
  classId: string;
  academicYear: string;
  term: number;
  termLabel: string;
  onBack: () => void;
  onSelectSubject: (subjectId: string) => void;
}

export function ClassBroadsheet({
  subdomain,
  schoolId,
  classId,
  academicYear,
  term,
  termLabel,
  onBack,
  onSelectSubject,
}: ClassBroadsheetProps) {
  const [data, setData] = useState<ClassBroadsheetData | null>(null);
  const [loading, setLoading] = useState(true);

  // Publish Dialog states
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [notifySMS, setNotifySMS] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const supabase = createTenantClient();

  useEffect(() => {
    loadBroadsheet();
  }, [classId, academicYear, term]);

  const loadBroadsheet = async () => {
    setLoading(true);
    try {
      const res = await getClassBroadsheetData(classId, academicYear, term, schoolId, subdomain);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.error || "Failed to load broadsheet data");
      }
    } catch (err: any) {
      console.error("Broadsheet error:", err);
      toast.error(err.message || "Failed to load class broadsheet");
    } finally {
      setLoading(false);
    }
  };

  // Lifecycle status transition handler
  const handleUpdateStatus = async (status: 'draft' | 'submitted' | 'approved' | 'published' | 'archived') => {
    if (!data) return;
    setUpdatingStatus(true);
    try {
      const res = await updateClassTermStatus(
        classId,
        academicYear,
        term,
        status,
        null,
        subdomain
      );
      if (!res.success) throw new Error(res.error);
      toast.success(
        status === 'submitted'
          ? 'Grading cycle submitted for administrative review!'
          : status === 'approved'
          ? 'Class results approved and locked!'
          : status === 'published'
          ? 'Class results published to parents!'
          : 'Class results reopened to draft.'
      );
      loadBroadsheet();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update grading cycle status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Publish / Unpublish Class Results
  const handlePublishToggle = async (publishState: boolean) => {
    if (!data) return;
    setPublishing(true);
    try {
      const res = await publishClassResults(
        classId,
        data.className,
        academicYear,
        term,
        subdomain,
        publishState
      );

      if (!res.success) throw new Error(res.error);

      // If publishing and notifications requested, dispatch via broadcasts API
      if (publishState && (notifyInApp || notifySMS)) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch(`${getBackendUrl()}/broadcasts`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                title: `${data.className} Results Published`,
                message: `Official ${termLabel} academic evaluation results for ${data.className} (${academicYear}) are now published. You can view report cards on the portal.`,
                category: "academic",
                targetRoles: ["parent", "student"],
                targetClassId: classId,
                channel: notifySMS ? "all" : "system",
              }),
            });
          }
        } catch (dispatchErr) {
          console.error("Notification dispatch warning:", dispatchErr);
        }
      }

      toast.success(
        publishState
          ? `${data.className} results published to parent and student portals!`
          : `${data.className} results reverted to review draft.`
      );

      setIsPublishModalOpen(false);
      loadBroadsheet();
    } catch (err: any) {
      toast.error(err.message || "Failed to update publication status");
    } finally {
      setPublishing(false);
    }
  };

  // CSV BroadSheet Export
  const exportBroadsheetCsv = () => {
    if (!data) return;

    const subjectHeaders = data.subjects.map(s => `"${s.name}"`).join(",");
    const rows = data.students.map(s => {
      const subjectCells = data.subjects.map(subj => {
        const scoreObj = s.subjectScores[subj.id];
        return scoreObj ? scoreObj.total : "";
      }).join(",");

      const attStr = s.attendance && s.attendance.totalDays > 0
        ? `${s.attendance.percentage}% (${s.attendance.presentDays}/${s.attendance.totalDays} days)`
        : "—";

      return `"${s.positionStr}","${s.admissionNo}","${s.fullName}",${subjectCells},"${s.totalScore}","${s.averageScore}%","${s.status}","${attStr}"`;
    });

    const csvContent = [
      `"Rank","Admission No","Student Name",${subjectHeaders},"Total Score","Average %","Status","Attendance"`,
      ...rows,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${data.className}_BroadSheet_${academicYear.replace("/", "-")}_T${term}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Master broadsheet CSV downloaded!");
  };

  // Print BroadSheet
  const printBroadsheet = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Aggregating master broadsheet matrix and student standings...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center border border-dashed rounded-2xl space-y-3 bg-card">
        <AlertCircle className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-bold text-foreground">Broadsheet Data Unavailable</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header & Executive Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            title="Return to All Classrooms (Readiness Matrix)"
            className="h-8.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 rounded-xl border border-border/60 hover:bg-muted"
          >
            <ArrowLeft className="size-3.5" /> Classes
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{data.className} Master BroadSheet</h2>
              {data.status === 'published' ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Published to Parents
                </Badge>
              ) : data.status === 'approved' ? (
                <Badge className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="size-3" /> Grades Approved (Locked)
                </Badge>
              ) : data.status === 'submitted' ? (
                <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold flex items-center gap-1">
                  <TrendingUp className="size-3" /> In Review (Submitted)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs font-bold">
                  Draft
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive student academic performance matrix with automated class positioning, attendance, and grade averages.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Print Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={printBroadsheet}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-border hover:bg-muted"
          >
            <Printer className="size-3.5 mr-1.5" />
            Print Sheet
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportBroadsheetCsv}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-border hover:bg-muted"
          >
            <Download className="size-3.5 mr-1.5" />
            Export CSV
          </Button>

          {/* Submit for Review (if draft) */}
          {data.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus('submitted')}
              disabled={updatingStatus}
              className="h-9 px-3 text-xs font-semibold rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            >
              {updatingStatus ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Send className="size-3.5 mr-1.5" />}
              Submit for Review
            </Button>
          )}

          {/* Approve Grades (if draft or submitted) */}
          {(data.status === 'draft' || data.status === 'submitted') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus('approved')}
              disabled={updatingStatus}
              className="h-9 px-3 text-xs font-semibold rounded-xl border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
            >
              {updatingStatus ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="size-3.5 mr-1.5" />}
              Approve Grades
            </Button>
          )}

          {/* Publish / Unpublish Toggle */}
          {data.status === 'published' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePublishToggle(false)}
              disabled={publishing || updatingStatus}
              className="h-9 px-3 text-xs font-bold rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
            >
              {(publishing || updatingStatus) && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Revert to Draft
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsPublishModalOpen(true)}
              disabled={publishing || updatingStatus}
              className="h-9 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
            >
              <Send className="size-3.5 mr-1.5" />
              Publish to Parents
            </Button>
          )}

          {/* Reopen to Draft if approved or submitted */}
          {(data.status === 'submitted' || data.status === 'approved') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUpdateStatus('draft')}
              disabled={updatingStatus}
              className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground rounded-xl"
            >
              Reopen Draft
            </Button>
          )}
        </div>
      </div>

      {/* 2. Executive Performance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Class Average */}
        <Card className="bg-card border-border/80 shadow-xs p-4 rounded-xl">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Class Average</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{data.classMetrics.classAverage}%</span>
            <span className="text-[10px] font-bold text-muted-foreground">Mean across subjects</span>
          </div>
        </Card>

        {/* Pass Rate */}
        <Card className="bg-card border-border/80 shadow-xs p-4 rounded-xl">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overall Pass Rate</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-500">{data.classMetrics.overallPassRate}%</span>
            <span className="text-[10px] font-bold text-muted-foreground">Standard 40% benchmark</span>
          </div>
        </Card>

        {/* Class Headcount */}
        <Card className="bg-card border-border/80 shadow-xs p-4 rounded-xl">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Class Population</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{data.classMetrics.totalStudents}</span>
            <span className="text-[10px] font-bold text-muted-foreground">{data.subjects.length} subjects</span>
          </div>
        </Card>

        {/* Top Performer Card */}
        <Card className="bg-card border-border/80 shadow-xs p-4 rounded-xl">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Class Valedictorian (1st)</span>
          <div className="mt-1">
            <p className="font-bold text-sm text-foreground truncate">
              {data.classMetrics.topPerformers[0]?.name || "—"}
            </p>
            <p className="text-[11px] font-bold text-primary mt-0.5">
              {data.classMetrics.topPerformers[0] ? `${data.classMetrics.topPerformers[0].average}% Aggregate` : "No scores"}
            </p>
          </div>
        </Card>
      </div>

      {/* 3. Master BroadSheet Table */}
      <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto max-h-[65vh]">
          <Table className="relative">
            <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm shadow-xs">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[70px] text-center text-xs font-black">Rank</TableHead>
                <TableHead className="w-[140px] min-w-[135px] text-xs font-bold whitespace-nowrap">Adm No</TableHead>
                <TableHead className="w-[200px] min-w-[160px] text-xs font-bold">Student Name</TableHead>

                {/* Subject Columns */}
                {data.subjects.map((subj) => (
                  <TableHead 
                    key={subj.id}
                    onClick={() => onSelectSubject(subj.id)}
                    className="min-w-[110px] text-center text-xs font-bold cursor-pointer hover:text-primary transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="truncate">{subj.name}</span>
                      <PenTool className="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </div>
                  </TableHead>
                ))}

                <TableHead className="w-[95px] text-center text-xs font-black">Total</TableHead>
                <TableHead className="w-[90px] text-center text-xs font-black">Average</TableHead>
                <TableHead className="w-[85px] text-center text-xs font-bold">Status</TableHead>
                <TableHead className="w-[105px] text-center text-xs font-bold">Attendance</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3 + data.subjects.length + 4}
                    className="h-36 text-center text-muted-foreground text-xs font-medium"
                  >
                    No students enrolled in {data.className} for the {academicYear} academic session.
                  </TableCell>
                </TableRow>
              ) : (
                data.students.map((student) => {
                  const isFirst = student.rank === 1 && student.averageScore > 0;
                  const isSecond = student.rank === 2 && student.averageScore > 0;
                  const isThird = student.rank === 3 && student.averageScore > 0;

                  return (
                    <TableRow key={student.studentId} className="hover:bg-muted/30 transition-colors">
                    {/* Rank Badge */}
                    <TableCell className="text-center font-black text-xs">
                      {isFirst ? (
                        <span className="size-6 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 inline-flex items-center justify-center text-[10px] font-black">
                          🥇 1st
                        </span>
                      ) : isSecond ? (
                        <span className="size-6 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30 inline-flex items-center justify-center text-[10px] font-black">
                          🥈 2nd
                        </span>
                      ) : isThird ? (
                        <span className="size-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30 inline-flex items-center justify-center text-[10px] font-black">
                          🥉 3rd
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-semibold">
                          {student.averageScore > 0 ? student.positionStr : "—"}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground font-semibold whitespace-nowrap">
                      {student.admissionNo}
                    </TableCell>

                    <TableCell 
                      className="font-medium text-xs text-foreground whitespace-nowrap truncate max-w-[220px]"
                      title={student.fullName}
                    >
                      {student.fullName}
                    </TableCell>

                    {/* Subject Score Cells */}
                    {data.subjects.map((subj) => {
                      const res = student.subjectScores[subj.id];
                      return (
                        <TableCell key={subj.id} className="text-center text-xs p-2">
                          {res ? (
                            <span className={cn(
                              "inline-block font-bold px-2 py-0.5 rounded-md text-[11px]",
                              res.total >= 70 ? "text-emerald-500 bg-emerald-500/10" :
                              res.total >= 50 ? "text-foreground bg-muted/60" :
                              "text-rose-500 bg-rose-500/10"
                            )}>
                              {res.total}
                              <span className="text-[9px] ml-1 font-semibold opacity-70">
                                ({res.grade})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-[11px]">—</span>
                          )}
                        </TableCell>
                      );
                    })}

                    {/* Total Score */}
                    <TableCell className="text-center font-black text-xs text-foreground">
                      {student.averageScore > 0 ? student.totalScore : "—"}
                    </TableCell>

                    {/* Average */}
                    <TableCell className="text-center font-black text-xs text-primary">
                      {student.averageScore > 0 ? `${student.averageScore}%` : "—"}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {student.averageScore > 0 ? (
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            student.status === "Pass" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          )}
                        >
                          {student.status}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Pending</span>
                      )}
                    </TableCell>

                    {/* Attendance */}
                    <TableCell className="text-center">
                      {student.attendance && student.attendance.totalDays > 0 ? (
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-foreground">
                            {student.attendance.percentage}%
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {student.attendance.presentDays}/{student.attendance.totalDays} days
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}

              {/* Bottom Class Subject Summary Row */}
              <TableRow className="bg-muted/70 font-bold border-t-2 border-border/80">
                <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                  Class Subject Averages
                </TableCell>

                {data.subjects.map((subj) => {
                  const summary = data.subjectSummaries[subj.id];
                  return (
                    <TableCell key={subj.id} className="text-center text-xs font-black text-foreground">
                      {summary && summary.classAverage > 0 ? `${summary.classAverage}%` : "—"}
                    </TableCell>
                  );
                })}

                <TableCell className="text-center font-black text-xs text-foreground">
                  —
                </TableCell>
                <TableCell className="text-center font-black text-xs text-primary">
                  {data.classMetrics.classAverage}%
                </TableCell>
                <TableCell className="text-center text-[10px] font-bold text-emerald-500">
                  {data.classMetrics.overallPassRate}% Pass
                </TableCell>
                <TableCell className="text-center text-[10px] font-bold text-muted-foreground">
                  —
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 4. Pre-Flight Publish Confirmation Modal */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-500" />
              Publish {data.className} Results
            </DialogTitle>
            <DialogDescription>
              Release official {termLabel} terminal grades to parents and students on their portals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Academic Cycle:</span>
                <span className="font-bold text-foreground">{academicYear} • {termLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classroom:</span>
                <span className="font-bold text-foreground">{data.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Students to Release:</span>
                <span className="font-bold text-foreground">{data.classMetrics.totalStudents}</span>
              </div>
            </div>

            {/* Notification Checkboxes */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Dispatch Broadcasts
              </label>

              {/* In-App Notifications Checkbox */}
              <div className="flex items-start space-x-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setNotifyInApp(!notifyInApp)}>
                <Checkbox 
                  checked={notifyInApp} 
                  onCheckedChange={(checked) => setNotifyInApp(!!checked)} 
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    In-App Portal Notifications
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Instantly notifies all linked student and parent user accounts via notification drawer and noticeboard bulletin.
                  </p>
                </div>
              </div>

              {/* Termii SMS Notification Checkbox */}
              <div className="flex items-start space-x-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setNotifySMS(!notifySMS)}>
                <Checkbox 
                  checked={notifySMS} 
                  onCheckedChange={(checked) => setNotifySMS(!!checked)} 
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-blue-500" />
                    SMS Broadcast to Parents (Termii)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Sends carrier SMS text messages to registered parent phone numbers notifying them report cards are available.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsPublishModalOpen(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              onClick={() => handlePublishToggle(true)}
              disabled={publishing}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
            >
              {publishing && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Confirm & Publish Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
