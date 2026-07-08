/**
 * Maps a numeric score (0–100) to a WAEC-style grade letter.
 * Mirrors the grade bands used in the backend attempt result-sync worker.
 */
export function scoreToGrade(score: number): string {
  if (score >= 75) return "A1";
  if (score >= 70) return "B2";
  if (score >= 65) return "B3";
  if (score >= 60) return "C4";
  if (score >= 55) return "C5";
  if (score >= 50) return "C6";
  if (score >= 45) return "D7";
  if (score >= 40) return "E8";
  return "F9";
}

/** Returns a short qualitative remark for a grade letter. */
export function gradeRemark(grade: string): string {
  switch (grade) {
    case "A1": return "Excellent";
    case "B2": return "Very Good";
    case "B3": return "Good";
    case "C4": return "Credit";
    case "C5": return "Credit";
    case "C6": return "Credit";
    case "D7": return "Pass";
    case "E8": return "Pass";
    case "F9": return "Fail";
    default: return "Satisfactory";
  }
}
