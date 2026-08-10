/**
 * Grade calculation utilities — client-side.
 *
 * The canonical grade scale is stored per-school in `institutional_configs`
 * (config_key = 'grade_scale'). This module provides the default WAEC scale
 * as a fallback and helper functions for client-side rendering.
 *
 * The thresholds here MUST match the backend's `src/utils/grade-scale.ts`.
 */

export interface GradeEntry {
  minScore: number;
  grade: string;
  remark: string;
}

/**
 * Default WAEC grading scale.
 * Must stay in sync with sms-edu-backend/src/utils/grade-scale.ts.
 */
export const DEFAULT_GRADE_SCALE: readonly GradeEntry[] = [
  { minScore: 80, grade: 'A1', remark: 'Excellent' },
  { minScore: 75, grade: 'B2', remark: 'Very Good' },
  { minScore: 70, grade: 'B3', remark: 'Good' },
  { minScore: 65, grade: 'C4', remark: 'Credit' },
  { minScore: 60, grade: 'C5', remark: 'Credit' },
  { minScore: 50, grade: 'C6', remark: 'Credit' },
  { minScore: 45, grade: 'D7', remark: 'Pass' },
  { minScore: 40, grade: 'E8', remark: 'Pass' },
  { minScore: 0,  grade: 'F9', remark: 'Fail' },
];

/**
 * Maps a numeric score (0–100) to a grade letter using the given scale.
 *
 * @param score The numeric score to grade.
 * @param scale A custom grade scale (sorted descending by minScore).
 *              Falls back to DEFAULT_GRADE_SCALE.
 */
export function scoreToGrade(score: number, scale: readonly GradeEntry[] = DEFAULT_GRADE_SCALE): string {
  for (const entry of scale) {
    if (score >= entry.minScore) {
      return entry.grade;
    }
  }
  return scale[scale.length - 1].grade;
}

/**
 * Returns the remark for a given grade letter using the provided scale.
 *
 * @param grade The grade letter to look up.
 * @param scale A custom grade scale. Falls back to DEFAULT_GRADE_SCALE.
 */
export function gradeRemark(grade: string, scale: readonly GradeEntry[] = DEFAULT_GRADE_SCALE): string {
  const entry = scale.find(e => e.grade === grade);
  return entry?.remark ?? 'Satisfactory';
}
