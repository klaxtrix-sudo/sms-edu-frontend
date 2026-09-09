/**
 * Utilities for dynamic academic sessions and multi-year horizon resolution.
 */

/**
 * Parses an academic session string (e.g. "2026/2027" or "2026-2027") into numerical start and end years.
 */
export function parseAcademicSession(sessionStr: string): { startYear: number; endYear: number } {
  const parts = sessionStr.split(/[/\\-]/).map((s) => parseInt(s.trim(), 10));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { startYear: parts[0], endYear: parts[1] };
  }
  const currentYear = new Date().getFullYear();
  return { startYear: currentYear, endYear: currentYear + 1 };
}

/**
 * Formats a start year into standard academic session format "YYYY/YYYY+1".
 */
export function formatAcademicSession(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

/**
 * Generates an array of available academic sessions centered around the school's active session.
 * 
 * @param currentSession The school's current session (e.g. "2026/2027")
 * @param yearsBack Number of past sessions to include for historical backfill (default: 5)
 * @param yearsForward Number of future sessions to include (default: 2)
 */
export function getAcademicSessionOptions(
  currentSession: string = "2026/2027",
  yearsBack: number = 5,
  yearsForward: number = 2
): string[] {
  const { startYear } = parseAcademicSession(currentSession);
  const sessions: string[] = [];

  // Generate descending from future-most to oldest
  for (let y = startYear + yearsForward; y >= startYear - yearsBack; y--) {
    sessions.push(formatAcademicSession(y));
  }

  // Ensure currentSession is in the list
  if (!sessions.includes(currentSession)) {
    sessions.unshift(currentSession);
  }

  return sessions;
}
