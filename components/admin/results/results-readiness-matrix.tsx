"use client";

import React from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  GraduationCap, 
  PenTool, 
  TrendingUp, 
  Users, 
  AlertCircle,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { TermGradingReadinessData, ClassReadinessItem, TeacherReadinessWatchItem } from "@/app/actions/academic-actions";

interface ResultsReadinessMatrixProps {
  data: TermGradingReadinessData | null;
  loading: boolean;
  onSelectClass: (classId: string, initialMode?: "scoresheet" | "broadsheet", subjectId?: string) => void;
}

export function ResultsReadinessMatrix({
  data,
  loading,
  onSelectClass,
}: ResultsReadinessMatrixProps) {
  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-muted-foreground">Aggregating grading readiness across classes...</p>
      </div>
    );
  }

  if (!data || data.classList.length === 0) {
    return (
      <div className="p-12 border border-dashed border-border/80 rounded-2xl bg-card/40 text-center space-y-4">
        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
          <GraduationCap className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">No Academic Classrooms Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Get started by setting up classrooms and assigning curriculum subjects in the Academics setup hub.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-400">
      {/* 1. Executive Term Readiness KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Overall Completion Rate */}
        <Card className="bg-card border-border/80 shadow-sm p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Grading Progress
            </span>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">
              {data.overallCompletionPct}%
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              {data.completedSubjectSheets} of {data.totalSubjectSheets} sheets
            </span>
          </div>
          <Progress value={data.overallCompletionPct} className="h-1.5 mt-3" />
        </Card>

        {/* KPI 2: Active Classrooms */}
        <Card className="bg-card border-border/80 shadow-sm p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Classrooms
            </span>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <BookOpen className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">
              {data.totalClasses}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              {data.totalStudents} enrolled
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Configured academic streams
          </p>
        </Card>

        {/* KPI 3: Published Classes */}
        <Card className="bg-card border-border/80 shadow-sm p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Published to Parents
            </span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">
              {data.publishedClassesCount}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              of {data.totalClasses} classes
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Verified report cards live
          </p>
        </Card>

        {/* KPI 4: Pending Actionable Sheets */}
        <Card className="bg-card border-border/80 shadow-sm p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Sheets
            </span>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">
              {Math.max(0, data.totalSubjectSheets - data.completedSubjectSheets)}
            </span>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Awaiting entry
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Subject score sheets incomplete
          </p>
        </Card>
      </div>

      {/* 2. Main Grid: Left Class Readiness Cards & Right Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Classroom Readiness Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" /> Classroom Readiness Matrix
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select any classroom to open its Master BroadSheet or record scores for a specific subject.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border">
              {data.academicYear} • {data.termLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.classList.map((c) => {
              return (
                <Card 
                  key={c.classId}
                  className="bg-card border-border/80 shadow-xs hover:border-primary/50 transition-all duration-200 rounded-xl overflow-hidden group"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                          {c.className}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {c.classTeacherName ? `Teacher: ${c.classTeacherName}` : "No form teacher assigned"}
                        </p>
                      </div>

                      {c.isPublished ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold shrink-0">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold shrink-0">
                          In Review
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">Subjects Graded</span>
                        <span className="font-bold text-foreground">
                          {c.gradedSubjects} / {c.totalSubjects} ({c.completionPct}%)
                        </span>
                      </div>
                      <Progress value={c.completionPct} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="size-3" /> {c.studentCount} Students
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectClass(c.classId, "broadsheet")}
                        className="h-8 text-xs font-semibold rounded-lg border-border hover:bg-muted"
                      >
                        <FileSpreadsheet className="size-3.5 mr-1.5 text-indigo-500" />
                        BroadSheet
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => onSelectClass(c.classId, "scoresheet")}
                        className="h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <PenTool className="size-3.5 mr-1.5" />
                        Enter Scores
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Teacher Submission Watchlist */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="size-4 text-amber-500" /> Pending Score Sheets
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subjects currently awaiting grading input. Click to jump directly.
            </p>
          </div>

          <Card className="bg-card border-border/80 shadow-xs rounded-xl overflow-hidden">
            <div className="divide-y divide-border/60">
              {data.watchlist.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-foreground">All Sheets Complete!</p>
                  <p className="text-[11px] text-muted-foreground">Every assigned classroom subject has scores recorded.</p>
                </div>
              ) : (
                data.watchlist.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => onSelectClass(item.classId, "scoresheet", item.subjectId)}
                    className="p-3.5 hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                          {item.subjectName}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {item.className}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {item.teacherName ? `Teacher: ${item.teacherName}` : "Unassigned teacher"} • {item.gradedCount}/{item.totalStudents} graded
                      </p>
                    </div>

                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
