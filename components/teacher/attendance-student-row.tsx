"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceStudentRowProps {
  student: {
    id: string;
    admission_no: string;
    profiles?: {
      full_name?: string | null;
    } | null;
  };
  status: AttendanceStatus;
  remarks: string;
  disabled?: boolean;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onRemarksChange: (studentId: string, remarks: string) => void;
}

const statusOptions: {
  status: AttendanceStatus;
  label: string;
  activeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    status: "present",
    label: "Present",
    activeClass: "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 font-bold",
    icon: CheckCircle2,
  },
  {
    status: "absent",
    label: "Absent",
    activeClass: "bg-rose-600 text-white shadow-md shadow-rose-500/20 font-bold",
    icon: XCircle,
  },
  {
    status: "late",
    label: "Late",
    activeClass: "bg-amber-600 text-white shadow-md shadow-amber-500/20 font-bold",
    icon: Clock,
  },
  {
    status: "excused",
    label: "Excused",
    activeClass: "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold",
    icon: AlertCircle,
  },
];

export const AttendanceStudentRow = React.memo(function AttendanceStudentRow({
  student,
  status,
  remarks,
  disabled = false,
  onStatusChange,
  onRemarksChange,
}: AttendanceStudentRowProps) {
  // Local state for remarks to eliminate typing lag across the roster
  const [localRemarks, setLocalRemarks] = useState(remarks);

  useEffect(() => {
    setLocalRemarks(remarks);
  }, [remarks]);

  const handleBlur = () => {
    if (localRemarks !== remarks) {
      onRemarksChange(student.id, localRemarks);
    }
  };

  const initial = student.profiles?.full_name?.charAt(0) || "S";

  return (
    <TableRow className="hover:bg-accent/20 transition-colors group border-b border-border/40">
      {/* 1. Student Identity */}
      <TableCell className="py-4 pl-6 md:pl-8">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary group-hover:scale-105 transition-transform shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors truncate">
              {student.profiles?.full_name || "Unknown Student"}
            </div>
            <div className="text-[11px] text-muted-foreground font-semibold tracking-wider uppercase opacity-75 truncate">
              {student.admission_no}
            </div>
          </div>
        </div>
      </TableCell>

      {/* 2. Accessible Segmented Pill Control */}
      <TableCell className="py-4 text-center">
        <div className="inline-flex p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/60 gap-1 select-none">
          {statusOptions.map((opt) => {
            const isActive = status === opt.status;
            const Icon = opt.icon;
            return (
              <button
                key={opt.status}
                type="button"
                disabled={disabled}
                onClick={() => onStatusChange(student.id, opt.status)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  isActive
                    ? opt.activeClass
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}
                title={`Mark ${student.profiles?.full_name || 'student'} as ${opt.label}`}
              >
                <Icon className={cn("size-3.5", isActive ? "text-white" : "opacity-60")} />
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden uppercase">{opt.label.charAt(0)}</span>
              </button>
            );
          })}
        </div>
      </TableCell>

      {/* 3. Isolated Remarks Input */}
      <TableCell className="py-4 pr-6 md:pr-8">
        <Input
          placeholder="Add optional note..."
          value={localRemarks}
          disabled={disabled}
          onChange={(e) => setLocalRemarks(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="bg-transparent border border-border/40 hover:border-border/80 focus:border-primary/60 rounded-xl text-xs md:text-sm h-9 placeholder:text-muted-foreground/50 transition-colors"
        />
      </TableCell>
    </TableRow>
  );
});

export const AttendanceStudentCard = React.memo(function AttendanceStudentCard({
  student,
  status,
  remarks,
  disabled = false,
  onStatusChange,
  onRemarksChange,
}: AttendanceStudentRowProps) {
  // Local state for remarks to eliminate typing lag across the roster
  const [localRemarks, setLocalRemarks] = useState(remarks);

  useEffect(() => {
    setLocalRemarks(remarks);
  }, [remarks]);

  const handleBlur = () => {
    if (localRemarks !== remarks) {
      onRemarksChange(student.id, localRemarks);
    }
  };

  const initial = student.profiles?.full_name?.charAt(0) || "S";

  return (
    <div className="p-4 bg-card/60 rounded-2xl border border-border/60 space-y-3 shadow-xs transition-colors">
      {/* 1. Student Identity Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-foreground truncate">
              {student.profiles?.full_name || "Unknown Student"}
            </div>
            <div className="text-[11px] text-muted-foreground font-semibold tracking-wider uppercase opacity-75 truncate">
              {student.admission_no}
            </div>
          </div>
        </div>

        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
          status === "present" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30" :
          status === "absent" ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30" :
          status === "late" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30" :
          "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
        )}>
          {status}
        </span>
      </div>

      {/* 2. Full-Width 4-Way Segmented Touch Controls */}
      <div className="grid grid-cols-4 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/60 gap-1 select-none">
        {statusOptions.map((opt) => {
          const isActive = status === opt.status;
          const Icon = opt.icon;
          return (
            <button
              key={opt.status}
              type="button"
              disabled={disabled}
              onClick={() => onStatusChange(student.id, opt.status)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]",
                isActive
                  ? opt.activeClass
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              )}
              title={`Mark ${student.profiles?.full_name || 'student'} as ${opt.label}`}
            >
              <Icon className={cn("size-4 mb-0.5", isActive ? "text-white" : "opacity-60")} />
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Remarks Input */}
      <div>
        <Input
          placeholder="Add optional remarks..."
          value={localRemarks}
          disabled={disabled}
          onChange={(e) => setLocalRemarks(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="bg-background/60 border border-border/60 focus:border-primary/60 rounded-xl text-xs h-9 placeholder:text-muted-foreground/50 transition-colors"
        />
      </div>
    </div>
  );
});
