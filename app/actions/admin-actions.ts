/**
 * Barrel re-export — preserves backward compatibility for all existing imports.
 *
 * The original 1,100-line monolithic file has been split into domain-specific modules:
 *   - teacher-actions.ts  — Teacher CRUD, archival, credential management
 *   - student-actions.ts  — Student CRUD, passport upload, password reset
 *   - academic-actions.ts — Class/Subject CRUD, results, metrics, onboarding, assignments
 *
 * New code should import directly from the specific module for clarity.
 */

// Teacher actions
export {
  toggleTeacherStatus,
  archiveTeacher,
  unarchiveTeacher,
  updateTeacher,
  getTeachers,
  deletePendingTeacher,
  createTeacher,
  resendTeacherCredentials,
} from "./teacher-actions";

// Student actions
export {
  createStudent,
  updateStudent,
  deleteStudent,
  uploadStudentPassport,
  resetStudentPassword,
} from "./student-actions";

// Academic actions (classes, subjects, results, metrics, onboarding)
export {
  getClasses,
  getSubjects,
  getAcademicOverview,
  assignClassTeacher,
  createClass,
  createSubject,
  updateClass,
  deleteClass,
  deleteSubject,
  saveResults,
  getResultMetrics,
  saveResultMetrics,
  getClassSubjectTeachers,
  saveClassSubjectAssignments,
  completeOnboarding,
  resetUserPassword,
} from "./academic-actions";
