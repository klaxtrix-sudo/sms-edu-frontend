import { type AcademicCycle } from "@/components/providers/tenant-provider";

export type SchoolSessionStatus = "HOLIDAY_BREAK" | "WEEKEND" | "IN_SESSION_ACTIVE";

export interface SessionStatusConfig {
  status: SchoolSessionStatus;
  badgeLabel: string;
  badgeClass: string;
  isInstructional: boolean;
  message: string;
  buttonLabel: string;
  buttonVariant: "default" | "outline" | "secondary";
}

/**
 * Determines whether a given date is an active instructional day,
 * a weekend, or falls into a holiday / term break.
 */
export function getSchoolSessionStatus(
  dateInput: string | Date,
  academicCycle: AcademicCycle | null
): SchoolSessionStatus {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

  // 1. Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "WEEKEND";
  }

  // 2. Academic Cycle / Holiday check
  if (academicCycle) {
    // If currentWeek is explicitly null or term dates are specified and date is out of range
    if (academicCycle.currentWeek === null) {
      // Check if selected date is within term bounds if termBegins/termEnds exist
      if (academicCycle.termBegins && academicCycle.termEnds) {
        const start = new Date(academicCycle.termBegins);
        const end = new Date(academicCycle.termEnds);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const checkTime = new Date(d);
        checkTime.setHours(12, 0, 0, 0);

        if (checkTime < start || checkTime > end) {
          return "HOLIDAY_BREAK";
        }
      } else {
        return "HOLIDAY_BREAK";
      }
    }
  }

  return "IN_SESSION_ACTIVE";
}

/**
 * Convenience helper returning whether regular school classes occur on this date.
 */
export function isInstructionalDay(
  dateInput: string | Date,
  academicCycle: AcademicCycle | null
): boolean {
  return getSchoolSessionStatus(dateInput, academicCycle) === "IN_SESSION_ACTIVE";
}

/**
 * Returns UI metadata (labels, badge styling, descriptions, action labels)
 * for a classroom's attendance card.
 */
export function getAttendanceCardConfig(
  sessionStatus: SchoolSessionStatus,
  isMarked: boolean
): SessionStatusConfig {
  if (sessionStatus === "HOLIDAY_BREAK") {
    return {
      status: "HOLIDAY_BREAK",
      badgeLabel: "Holiday / Break",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold",
      isInstructional: false,
      message: "School is currently on holiday break. Regular attendance resumes on term resumption.",
      buttonLabel: "Attendance History",
      buttonVariant: "outline",
    };
  }

  if (sessionStatus === "WEEKEND") {
    return {
      status: "WEEKEND",
      badgeLabel: "Weekend Recess",
      badgeClass: "bg-muted text-muted-foreground border border-border/80 font-bold",
      isInstructional: false,
      message: "Weekend recess — regular school sessions resume on Monday.",
      buttonLabel: "View Past Attendance",
      buttonVariant: "outline",
    };
  }

  if (isMarked) {
    return {
      status: "IN_SESSION_ACTIVE",
      badgeLabel: "Marked",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold",
      isInstructional: true,
      message: "Today's roll call is complete.",
      buttonLabel: "Review / Edit Roster",
      buttonVariant: "outline",
    };
  }

  return {
    status: "IN_SESSION_ACTIVE",
    badgeLabel: "Pending",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold",
    isInstructional: true,
    message: "Take morning roll call for today.",
    buttonLabel: "Mark Daily Attendance",
    buttonVariant: "default",
  };
}
