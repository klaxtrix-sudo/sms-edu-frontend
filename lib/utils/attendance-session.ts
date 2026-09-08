import { type AcademicCycle } from "@/components/providers/tenant-provider";

export interface SchoolHoliday {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  holiday_type: "public_holiday" | "mid_term_break" | "school_recess" | "special_closure";
  description?: string | null;
}

export type SchoolSessionStatus = 
  | "HOLIDAY_BREAK" 
  | "WEEKEND" 
  | "PUBLIC_HOLIDAY" 
  | "MID_TERM_BREAK" 
  | "IN_SESSION_ACTIVE";

export interface SessionStatusConfig {
  status: SchoolSessionStatus;
  badgeLabel: string;
  badgeClass: string;
  isInstructional: boolean;
  message: string;
  buttonLabel: string;
  buttonVariant: "default" | "outline" | "secondary";
  holidayName?: string;
}

/**
 * Finds if a date falls into any configured school holiday or mid-term break.
 */
export function getMatchingHoliday(
  dateInput: string | Date,
  holidays?: SchoolHoliday[]
): SchoolHoliday | undefined {
  if (!holidays || holidays.length === 0) return undefined;

  let dateStr: string;
  if (typeof dateInput === "string") {
    dateStr = dateInput.split("T")[0];
  } else {
    // Format YYYY-MM-DD local
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, "0");
    const d = String(dateInput.getDate()).padStart(2, "0");
    dateStr = `${y}-${m}-${d}`;
  }

  return holidays.find((h) => {
    const start = h.start_date.split("T")[0];
    const end = h.end_date.split("T")[0];
    return dateStr >= start && dateStr <= end;
  });
}

/**
 * Determines whether a given date is an active instructional day,
 * a weekend, a public holiday, a mid-term break, or an end-of-term recess.
 */
export function getSchoolSessionStatus(
  dateInput: string | Date,
  academicCycle: AcademicCycle | null,
  holidays?: SchoolHoliday[]
): SchoolSessionStatus {
  const d = typeof dateInput === "string" 
    ? new Date(dateInput.includes("T") ? dateInput : `${dateInput}T00:00:00`) 
    : dateInput;
  const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

  // 1. Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "WEEKEND";
  }

  // 2. Scheduled Holidays / Mid-Term Breaks check (takes precedence over general term bounds)
  const matchingHoliday = getMatchingHoliday(dateInput, holidays);
  if (matchingHoliday) {
    return matchingHoliday.holiday_type === "mid_term_break"
      ? "MID_TERM_BREAK"
      : "PUBLIC_HOLIDAY";
  }

  // 3. Academic Cycle / Term bounds check
  if (academicCycle) {
    if (academicCycle.currentWeek === null) {
      if (academicCycle.termBegins && academicCycle.termEnds) {
        const start = academicCycle.termBegins.split("T")[0];
        const end = academicCycle.termEnds.split("T")[0];
        const checkStr = typeof dateInput === "string"
          ? dateInput.split("T")[0]
          : dateInput.toISOString().split("T")[0];

        if (checkStr < start || checkStr > end) {
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
  academicCycle: AcademicCycle | null,
  holidays?: SchoolHoliday[]
): boolean {
  return getSchoolSessionStatus(dateInput, academicCycle, holidays) === "IN_SESSION_ACTIVE";
}

/**
 * Returns UI metadata (labels, badge styling, descriptions, action labels)
 * for a classroom's attendance card.
 */
export function getAttendanceCardConfig(
  sessionStatus: SchoolSessionStatus,
  isMarked: boolean,
  holidayName?: string
): SessionStatusConfig {
  if (sessionStatus === "PUBLIC_HOLIDAY") {
    const label = holidayName ? `Holiday: ${holidayName}` : "Public Holiday";
    return {
      status: "PUBLIC_HOLIDAY",
      badgeLabel: label,
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold",
      isInstructional: false,
      message: holidayName 
        ? `School is closed in observance of ${holidayName}. Regular attendance resumes on the next school day.`
        : "School is closed for public holiday. Regular attendance resumes tomorrow.",
      buttonLabel: "Attendance History",
      buttonVariant: "outline",
      holidayName,
    };
  }

  if (sessionStatus === "MID_TERM_BREAK") {
    const label = holidayName ? `Break: ${holidayName}` : "Mid-Term Break";
    return {
      status: "MID_TERM_BREAK",
      badgeLabel: label,
      badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold",
      isInstructional: false,
      message: holidayName
        ? `School is currently on ${holidayName}. Daily attendance is paused until classes resume.`
        : "School is currently on mid-term break. Daily roll call resumes on session resumption.",
      buttonLabel: "Attendance History",
      buttonVariant: "outline",
      holidayName,
    };
  }

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
