"use server";

import { requireActionAuth } from "@/lib/supabase/action-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { scoreToGrade, gradeRemark } from "@/lib/grade-scale";
import { getBackendUrl } from "@/lib/utils";

const CreateClassSchema = z.object({
  name: z.string().trim().min(1, "Class name cannot be empty").max(60, "Class name cannot exceed 60 characters"),
  teacherId: z.string().trim().uuid("Invalid teacher ID").nullable().optional().or(z.literal("")),
});

const UpdateClassSchema = z.object({
  name: z.string().trim().min(1, "Class name cannot be empty").max(60, "Class name cannot exceed 60 characters"),
  teacherId: z.string().trim().uuid("Invalid teacher ID").nullable().optional().or(z.literal("")),
});

const CreateSubjectSchema = z.object({
  name: z.string().trim().min(2, "Subject name must be at least 2 characters").max(80, "Subject name cannot exceed 80 characters"),
  code: z.string().trim().min(1, "Subject code is required").max(15, "Subject code cannot exceed 15 characters"),
});

const SubjectAssignmentItemSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  teacherId: z.string().uuid("Invalid teacher ID").nullable().optional().or(z.literal("")).or(z.literal("none")),
});

const SaveAssignmentsSchema = z.array(SubjectAssignmentItemSchema);

export async function getAcademicOverview(subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin', 'teacher', 'student', 'parent']);

    const [classesRes, subjectsRes, assignmentsRes, teachersRes] = await Promise.all([
      (tenantSupabase as any)
        .from('classes')
        .select(`
          id,
          name,
          class_teacher_id,
          profiles:class_teacher_id (
            id,
            full_name
          )
        `)
        .eq('school_id', schoolId)
        .order('name'),
      (tenantSupabase as any)
        .from('subjects')
        .select('id, name, code, created_at')
        .eq('school_id', schoolId)
        .order('name'),
      (tenantSupabase as any)
        .from('class_subject_teachers')
        .select('class_id, subject_id, teacher_id')
        .eq('school_id', schoolId),
      (tenantSupabase as any)
        .from('profiles')
        .select('id, full_name')
        .eq('school_id', schoolId)
        .eq('role', 'teacher')
        .eq('is_archived', false)
        .order('full_name'),
    ]);

    if (classesRes.error) throw classesRes.error;
    if (subjectsRes.error) throw subjectsRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;

    return {
      success: true,
      data: {
        classes: classesRes.data || [],
        subjects: subjectsRes.data || [],
        assignments: assignmentsRes.data || [],
        teachers: teachersRes.data || [],
      },
    };
  } catch (error: any) {
    console.error('[Admin Actions] getAcademicOverview Error:', error.message);
    return { error: error.message || 'Failed to fetch academic overview.' };
  }
}

export async function assignClassTeacher(classId: string, teacherId: string | null, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  if (!classId) return { error: 'Class ID is required.' };

  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin']);

    const cleanTeacherId = teacherId && teacherId !== 'none' && teacherId.trim() !== '' ? teacherId.trim() : null;

    const { error } = await (tenantSupabase as any)
      .from('classes')
      .update({ class_teacher_id: cleanTeacherId })
      .eq('id', classId)
      .eq('school_id', schoolId);

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    console.error('[Admin Actions] assignClassTeacher Error:', error.message);
    return { error: error.message || 'Failed to update class teacher.' };
  }
}

export async function getClasses(schoolId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to fetch classes.' };
  try {
    const { tenantSupabase, schoolId: verifiedSchoolId } = await requireActionAuth(subdomain, ['admin', 'teacher', 'student', 'parent']);
    const { data, error } = await (tenantSupabase as any)
      .from('classes')
      .select(`
        id,
        name,
        profiles:class_teacher_id (
          full_name
        )
      `)
      .eq('school_id', verifiedSchoolId)
      .order('name');

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('[Admin Actions] getClasses Error:', error.message);
    return { error: error.message || 'Failed to fetch classes.' };
  }
}

export async function getSubjects(schoolId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to fetch subjects.' };
  try {
    const { tenantSupabase, schoolId: verifiedSchoolId } = await requireActionAuth(subdomain, ['admin', 'teacher', 'student', 'parent']);
    const { data, error } = await (tenantSupabase as any)
      .from('subjects')
      .select('*')
      .eq('school_id', verifiedSchoolId)
      .order('name');

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('[Admin Actions] getSubjects Error:', error.message);
    return { error: error.message || 'Failed to fetch subjects.' };
  }
}

export async function createClass(data: any) {
  const { subdomain } = data || {};
  if (!subdomain) return { error: 'Subdomain is required to create a class.' };

  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin']);

    // 1. Zod Validation
    const parsed = CreateClassSchema.parse({
      name: data.name,
      teacherId: data.teacherId || null,
    });

    const cleanName = parsed.name.trim();
    const cleanTeacherId = parsed.teacherId && parsed.teacherId !== "" ? parsed.teacherId : null;

    // 2. Prevent duplicate class name in this school
    const { data: existingClass } = await (tenantSupabase as any)
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existingClass) {
      return { error: `A class named "${cleanName}" already exists in this school.` };
    }

    // 3. Scoped insert with verified schoolId
    const { error } = await (tenantSupabase as any)
      .from('classes')
      .insert({
        name: cleanName,
        class_teacher_id: cleanTeacherId,
        school_id: schoolId,
      });

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message || 'Invalid class data' };
    }
    return { error: error.message || 'Failed to create class' };
  }
}

export async function createSubject(data: any) {
  const { subdomain } = data || {};
  if (!subdomain) return { error: 'Subdomain is required to create a subject.' };

  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin']);

    // 1. Zod Validation
    const parsed = CreateSubjectSchema.parse({
      name: data.name,
      code: data.code,
    });

    const cleanName = parsed.name.trim();
    const cleanCode = parsed.code.trim().toUpperCase();

    // 2. Prevent duplicate subject name or code in this school
    const { data: existingSubject } = await (tenantSupabase as any)
      .from('subjects')
      .select('id, name, code')
      .eq('school_id', schoolId)
      .or(`name.ilike.${cleanName},code.ilike.${cleanCode}`)
      .limit(1);

    if (existingSubject && existingSubject.length > 0) {
      const match = existingSubject[0];
      if (match.code.toUpperCase() === cleanCode) {
        return { error: `Subject code "${cleanCode}" is already in use by ${match.name}.` };
      }
      return { error: `A subject named "${cleanName}" already exists.` };
    }

    // 3. Scoped insert with verified schoolId
    const { error } = await (tenantSupabase as any)
      .from('subjects')
      .insert({
        name: cleanName,
        code: cleanCode,
        school_id: schoolId,
      });

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message || 'Invalid subject data' };
    }
    return { error: error.message || 'Failed to create subject' };
  }
}

export async function updateClass(classId: string, data: any, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to update a class.' };
  if (!classId) return { error: 'Class ID is required.' };

  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin']);

    // 1. Zod Validation
    const parsed = UpdateClassSchema.parse({
      name: data?.name,
      teacherId: data?.teacherId || null,
    });

    const cleanName = parsed.name.trim();
    const cleanTeacherId = parsed.teacherId && parsed.teacherId !== "" ? parsed.teacherId : null;

    // 2. Check duplicate name on other classes
    const { data: duplicate } = await (tenantSupabase as any)
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .ilike('name', cleanName)
      .neq('id', classId)
      .maybeSingle();

    if (duplicate) {
      return { error: `Another class named "${cleanName}" already exists in this school.` };
    }

    // 3. Scoped update with verified schoolId
    const { error } = await (tenantSupabase as any)
      .from('classes')
      .update({
        name: cleanName,
        class_teacher_id: cleanTeacherId,
      })
      .eq('id', classId)
      .eq('school_id', schoolId);

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message || 'Invalid class data' };
    }
    return { error: error.message || 'Failed to update class' };
  }
}

export async function deleteClass(classId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to delete a class.' };
  if (!classId) return { error: 'Class ID is required.' };

  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin']);

    // Pre-flight Dependency Guard 1: Enrolled Students
    const { count: studentCount } = await (tenantSupabase as any)
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('school_id', schoolId);

    if (studentCount && studentCount > 0) {
      return {
        error: `Cannot delete class: ${studentCount} student(s) are currently enrolled in this class. Please reassign or graduate students first to prevent data loss.`,
      };
    }

    // Pre-flight Dependency Guard 2: Historical Academic Results
    const { count: resultsCount } = await (tenantSupabase as any)
      .from('results')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('school_id', schoolId);

    if (resultsCount && resultsCount > 0) {
      return {
        error: `Cannot delete class: ${resultsCount} historical academic result(s) are recorded for this class. Deleting it would permanently corrupt report cards.`,
      };
    }

    // Pre-flight Dependency Guard 3: Fee Structures
    const { count: feeCount } = await (tenantSupabase as any)
      .from('fee_structures')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('school_id', schoolId);

    if (feeCount && feeCount > 0) {
      return {
        error: `Cannot delete class: ${feeCount} fee structure(s) are linked to this class. Remove or reassign them first.`,
      };
    }

    // Pre-flight Dependency Guard 4: Active Timetables
    const { count: timetableCount } = await (tenantSupabase as any)
      .from('timetables')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('school_id', schoolId);

    if (timetableCount && timetableCount > 0) {
      return {
        error: `Cannot delete class: An active timetable is linked to this class. Clear the timetable schedule first.`,
      };
    }

    // Safe to delete: Scoped deletion
    const { error } = await (tenantSupabase as any)
      .from('classes')
      .delete()
      .eq('id', classId)
      .eq('school_id', schoolId);

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete class' };
  }
}

export async function deleteSubject(subjectId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to delete a subject.' };
  if (!subjectId) return { error: 'Subject ID is required.' };

  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin']);

    // Pre-flight Dependency Guard 1: Student Results
    const { count: resultsCount } = await (tenantSupabase as any)
      .from('results')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', subjectId)
      .eq('school_id', schoolId);

    if (resultsCount && resultsCount > 0) {
      return {
        error: `Cannot delete subject: ${resultsCount} historical student result(s) are linked to this subject. Deleting it would permanently wipe past academic grades.`,
      };
    }

    // Pre-flight Dependency Guard 2: Active Class Assignments
    const { count: assignmentCount } = await (tenantSupabase as any)
      .from('class_subject_teachers')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', subjectId)
      .eq('school_id', schoolId);

    if (assignmentCount && assignmentCount > 0) {
      return {
        error: `Cannot delete subject: It is currently assigned to ${assignmentCount} classroom(s). Please unassign it from all classrooms before deleting.`,
      };
    }

    // Safe to delete: Scoped deletion
    const { error } = await (tenantSupabase as any)
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('school_id', schoolId);

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete subject' };
  }
}

export async function saveResults(resultsData: any[], subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to save results.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher']);

    // Filter out unentered / blank rows: only save rows where at least one metric score has been entered
    const validRows = (resultsData || []).filter((r) => {
      if (!r.student_id || !r.class_id || !r.subject_id) return false;
      if (!r.scores || typeof r.scores !== 'object') return false;
      const scoreValues = Object.values(r.scores);
      return scoreValues.some((val) => val !== null && val !== undefined && val !== "" && !isNaN(Number(val)));
    });

    if (validRows.length === 0) {
      return { success: true, count: 0, message: "No score entries to save." };
    }

    const { error } = await (tenantSupabase as any)
      .from('results')
      .upsert(validRows, {
        onConflict: 'student_id,subject_id,academic_year,term',
      });

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics/results');
    revalidatePath('/dashboard/teacher/results');
    return { success: true, count: validRows.length };
  } catch (error: any) {
    return { error: error.message || 'Failed to save results' };
  }
}

export async function getResultMetrics(
  classId: string | null,
  subjectId: string | null,
  schoolId: string,
  subdomain: string
) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher']);
    
    // If classId and subjectId are provided, check for custom metrics first
    if (classId && subjectId) {
      const { data: customMetrics, error: customError } = await (tenantSupabase as any)
        .from('result_metrics')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId);

      if (!customError && customMetrics && customMetrics.length > 0) {
        return { success: true, data: customMetrics, isCustom: true };
      }
    }

    // Fallback to default school-wide metrics (where class_id and subject_id are null)
    const { data: defaultMetrics, error: defaultError } = await (tenantSupabase as any)
      .from('result_metrics')
      .select('*')
      .eq('school_id', schoolId)
      .is('class_id', null)
      .is('subject_id', null);

    if (defaultError) throw defaultError;

    // If no default metrics exist, return system default templates
    if (!defaultMetrics || defaultMetrics.length === 0) {
      const systemDefaults = [
        { name: 'First Test', weight: 20, is_default_template: true },
        { name: 'Second Test', weight: 20, is_default_template: true },
        { name: 'Exam', weight: 60, is_default_template: true }
      ];
      return { success: true, data: systemDefaults, isCustom: false, isTemplate: true };
    }

    return { success: true, data: defaultMetrics, isCustom: false };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch result metrics' };
  }
}

export async function saveResultMetrics(
  metricsData: any[],
  subdomain: string
) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  
  // Validate total weight is exactly 100
  const totalWeight = metricsData.reduce((sum, m) => sum + Number(m.weight || 0), 0);
  if (totalWeight !== 100) {
    return { error: `Total metrics weight must equal exactly 100. Current total: ${totalWeight}` };
  }

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    
    // Prepare for upsert
    // First, let's delete any existing metrics for this class/subject or default if we are overwriting
    const sample = metricsData[0];
    if (sample) {
      let query = (tenantSupabase as any).from('result_metrics').delete().eq('school_id', sample.school_id);
      if (sample.class_id && sample.subject_id) {
        query = query.eq('class_id', sample.class_id).eq('subject_id', sample.subject_id);
      } else {
        query = query.is('class_id', null).is('subject_id', null);
      }
      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;
    }

    // Now insert the new ones
    const cleanData = metricsData.map(({ id, created_at, updated_at, is_default_template, ...m }) => m); // strip auto fields
    const { data, error } = await (tenantSupabase as any)
      .from('result_metrics')
      .insert(cleanData)
      .select();

    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    return { error: error.message || 'Failed to save result metrics' };
  }
}

export async function getClassSubjectTeachers(classId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  if (!classId) return { error: 'Class ID is required.' };
  try {
    const { tenantSupabase, schoolId: verifiedSchoolId } = await requireActionAuth(subdomain, ['admin', 'teacher']);
    const { data, error } = await (tenantSupabase as any)
      .from('class_subject_teachers')
      .select('subject_id, teacher_id')
      .eq('class_id', classId)
      .eq('school_id', verifiedSchoolId);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('[Admin Actions] getClassSubjectTeachers Error:', error.message);
    return { error: error.message || 'Failed to fetch class subject teachers.' };
  }
}

export async function saveClassSubjectAssignments(
  classId: string,
  assignments: { subjectId: string; teacherId: string | null }[],
  schoolId: string,
  subdomain: string
) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  if (!classId) return { error: 'Class ID is required.' };

  try {
    const { tenantSupabase, schoolId: verifiedSchoolId } = await requireActionAuth(subdomain, ['admin']);

    // 1. Zod Validation
    const parsedAssignments = SaveAssignmentsSchema.parse(assignments || []);

    // 2. Scoped deletion of existing assignments for this class
    const { error: deleteError } = await (tenantSupabase as any)
      .from('class_subject_teachers')
      .delete()
      .eq('class_id', classId)
      .eq('school_id', verifiedSchoolId);

    if (deleteError) throw deleteError;

    // 3. Map all selected curriculum subjects, allowing teacher_id to be null if unassigned
    const recordsToInsert = parsedAssignments
      .filter(a => a.subjectId && a.subjectId.trim() !== '')
      .map(a => {
        const hasTeacher = Boolean(a.teacherId && a.teacherId !== 'none' && a.teacherId.trim() !== '');
        return {
          school_id: verifiedSchoolId,
          class_id: classId,
          subject_id: a.subjectId,
          teacher_id: hasTeacher ? a.teacherId : null,
        };
      });

    // 4. Perform bulk insert if there are any records
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await (tenantSupabase as any)
        .from('class_subject_teachers')
        .insert(recordsToInsert);

      if (insertError) throw insertError;
    }

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message || 'Invalid assignment data' };
    }
    console.error('[Admin Actions] saveClassSubjectAssignments Error:', error.message);
    return { error: error.message || 'Failed to save subject assignments.' };
  }
}

export async function completeOnboarding(userId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher', 'parent', 'student']);
    const { error } = await (tenantSupabase as any)
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to complete onboarding' };
  }
}

export async function resetUserPassword(userId: string, newPassword: string, subdomain?: string) {
  if (!subdomain) return { error: "Subdomain is required for security credential updates." };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error: authError } = await tenantSupabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (authError) return { error: authError.message };

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// Academic Results & Master Broadsheet Subsystem Actions
// ---------------------------------------------------------------------------

function formatOrdinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

/**
 * Returns subjects configured for a specific classroom via class_subject_teachers.
 * Falls back to all school subjects if no specific assignments have been made yet.
 */
export async function getClassCurriculumSubjects(
  classId: string,
  schoolId: string,
  subdomain: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  if (!subdomain) return { success: false, error: 'Subdomain is required.' };
  if (!classId) return { success: false, error: 'Class ID is required.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher']);

    // 1. Fetch subjects assigned to this class
    const { data: assignments, error: assignError } = await (tenantSupabase as any)
      .from('class_subject_teachers')
      .select(`
        subject_id,
        teacher_id,
        subjects:subject_id ( id, name, code ),
        teacher:teacher_id ( id, full_name )
      `)
      .eq('school_id', schoolId)
      .eq('class_id', classId);

    if (assignError) throw assignError;

    if (assignments && assignments.length > 0) {
      const subjectMap = new Map<string, any>();
      assignments.forEach((a: any) => {
        if (a.subjects?.id && !subjectMap.has(a.subjects.id)) {
          subjectMap.set(a.subjects.id, {
            id: a.subjects.id,
            name: a.subjects.name,
            code: a.subjects.code,
            teacherName: a.teacher?.full_name || null,
          });
        }
      });
      const classSubjects = Array.from(subjectMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      if (classSubjects.length > 0) {
        return { success: true, data: classSubjects };
      }
    }

    // 2. Fallback: all school subjects
    const { data: allSubjects, error: allErr } = await (tenantSupabase as any)
      .from('subjects')
      .select('id, name, code')
      .eq('school_id', schoolId)
      .order('name');

    if (allErr) throw allErr;
    return { success: true, data: allSubjects || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch class curriculum' };
  }
}

export interface ClassReadinessItem {
  classId: string;
  className: string;
  studentCount: number;
  totalSubjects: number;
  gradedSubjects: number;
  completionPct: number;
  isPublished: boolean;
  classTeacherName?: string;
}

export interface TeacherReadinessWatchItem {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  status: 'graded' | 'pending';
  gradedCount: number;
  totalStudents: number;
}

export interface TermGradingReadinessData {
  academicYear: string;
  term: number;
  termLabel: string;
  totalClasses: number;
  totalStudents: number;
  totalSubjectSheets: number;
  completedSubjectSheets: number;
  overallCompletionPct: number;
  publishedClassesCount: number;
  classList: ClassReadinessItem[];
  watchlist: TeacherReadinessWatchItem[];
}

/**
 * Computes institutional grading completion across all classes for an active term.
 */
export async function getTermGradingReadiness(
  academicYear: string,
  term: number,
  schoolId: string,
  subdomain: string
): Promise<{ success: boolean; data?: TermGradingReadinessData; error?: string }> {
  if (!subdomain) return { success: false, error: 'Subdomain is required.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher']);

    // 1. Fetch all classes, students, curriculum assignments, and existing results in parallel
    const [classesRes, studentsRes, assignmentsRes, allSubjectsRes, resultsRes, configRes] =
      await Promise.all([
        (tenantSupabase as any)
          .from('classes')
          .select('id, name, class_teacher_id, profiles:class_teacher_id ( full_name )')
          .eq('school_id', schoolId)
          .order('name'),
        (tenantSupabase as any)
          .from('students')
          .select('id, class_id')
          .eq('school_id', schoolId),
        (tenantSupabase as any)
          .from('class_subject_teachers')
          .select(`
            class_id,
            subject_id,
            subjects:subject_id ( id, name ),
            teacher:teacher_id ( full_name )
          `)
          .eq('school_id', schoolId),
        (tenantSupabase as any)
          .from('subjects')
          .select('id, name')
          .eq('school_id', schoolId)
          .order('name'),
        (tenantSupabase as any)
          .from('results')
          .select('class_id, subject_id, student_id')
          .eq('school_id', schoolId)
          .eq('academic_year', academicYear)
          .eq('term', term),
        (tenantSupabase as any)
          .from('institutional_configs')
          .select('config_value')
          .eq('school_id', schoolId)
          .eq('config_key', 'published_results')
          .maybeSingle(),
      ]);

    const classes = classesRes.data || [];
    const students = studentsRes.data || [];
    const assignments = assignmentsRes.data || [];
    const allSubjects = allSubjectsRes.data || [];
    const results = resultsRes.data || [];
    const publishedMap = configRes.data?.config_value || {};

    // Map student count per class
    const classStudentCount: Record<string, number> = {};
    students.forEach((s: any) => {
      if (s.class_id) {
        classStudentCount[s.class_id] = (classStudentCount[s.class_id] || 0) + 1;
      }
    });

    // Map results recorded count per (class_id + subject_id)
    const classSubjectResultsCount: Record<string, number> = {};
    results.forEach((r: any) => {
      const key = `${r.class_id}_${r.subject_id}`;
      classSubjectResultsCount[key] = (classSubjectResultsCount[key] || 0) + 1;
    });

    // Build watchlist & class list
    let totalSheets = 0;
    let completedSheets = 0;
    let publishedClassesCount = 0;
    const classList: ClassReadinessItem[] = [];
    const watchlist: TeacherReadinessWatchItem[] = [];

    classes.forEach((c: any) => {
      const classId = c.id;
      const studentCount = classStudentCount[classId] || 0;
      const isPublished = !!publishedMap[`${classId}_${academicYear}_${term}`]?.isPublished;
      if (isPublished) publishedClassesCount++;

      // Subjects assigned to this class
      const classAssignments = assignments.filter((a: any) => a.class_id === classId);
      const subjectList =
        classAssignments.length > 0
          ? classAssignments.map((a: any) => ({
              id: a.subject_id,
              name: a.subjects?.name || 'Unknown',
              teacherName: a.teacher?.full_name,
            }))
          : allSubjects.map((s: any) => ({ id: s.id, name: s.name, teacherName: undefined }));

      let gradedCountForClass = 0;

      subjectList.forEach((subj: any) => {
        totalSheets++;
        const key = `${classId}_${subj.id}`;
        const studentGradesCount = classSubjectResultsCount[key] || 0;
        const isGraded = studentCount > 0 && studentGradesCount >= studentCount * 0.5; // At least 50% graded

        if (isGraded) {
          completedSheets++;
          gradedCountForClass++;
        }

        watchlist.push({
          classId,
          className: c.name,
          subjectId: subj.id,
          subjectName: subj.name,
          teacherName: subj.teacherName,
          status: isGraded ? 'graded' : 'pending',
          gradedCount: studentGradesCount,
          totalStudents: studentCount,
        });
      });

      const totalSubjCount = subjectList.length;
      const completionPct =
        totalSubjCount > 0 ? Math.round((gradedCountForClass / totalSubjCount) * 100) : 0;

      classList.push({
        classId,
        className: c.name,
        studentCount,
        totalSubjects: totalSubjCount,
        gradedSubjects: gradedCountForClass,
        completionPct,
        isPublished,
        classTeacherName: c.profiles?.full_name,
      });
    });

    const overallCompletionPct =
      totalSheets > 0 ? Math.round((completedSheets / totalSheets) * 100) : 0;
    const termLabel = term === 1 ? '1st Term' : term === 2 ? '2nd Term' : '3rd Term';

    return {
      success: true,
      data: {
        academicYear,
        term,
        termLabel,
        totalClasses: classes.length,
        totalStudents: students.length,
        totalSubjectSheets: totalSheets,
        completedSubjectSheets: completedSheets,
        overallCompletionPct,
        publishedClassesCount,
        classList,
        watchlist: watchlist.filter((w) => w.status === 'pending').slice(0, 10), // Top pending watchlist
      },
    };
  } catch (error: any) {
    console.error('[getTermGradingReadiness Error]:', error);
    return { success: false, error: error.message || 'Failed to calculate term readiness' };
  }
}

export interface BroadsheetStudentRow {
  studentId: string;
  admissionNo: string;
  fullName: string;
  gender?: string;
  subjectScores: Record<
    string,
    { total: number; grade: string; remark: string; scores: Record<string, number> }
  >;
  totalScore: number;
  averageScore: number;
  subjectsOffered: number;
  rank: number;
  positionStr: string;
  status: 'Pass' | 'Fail';
}

export interface BroadsheetSubjectSummary {
  subjectId: string;
  subjectName: string;
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  passCount: number;
  failCount: number;
  passRate: number;
}

export interface ClassBroadsheetData {
  classId: string;
  className: string;
  academicYear: string;
  term: number;
  isPublished: boolean;
  publishedAt?: string;
  subjects: { id: string; name: string; code?: string }[];
  students: BroadsheetStudentRow[];
  subjectSummaries: Record<string, BroadsheetSubjectSummary>;
  classMetrics: {
    totalStudents: number;
    classAverage: number;
    highestStudentAverage: number;
    lowestStudentAverage: number;
    overallPassRate: number;
    topPerformers: { rank: number; name: string; average: number; positionStr: string }[];
  };
}

/**
 * Aggregates full class broadsheet data (students x subjects matrix, totals, ranks, subject stats).
 */
export async function getClassBroadsheetData(
  classId: string,
  academicYear: string,
  term: number,
  schoolId: string,
  subdomain: string
): Promise<{ success: boolean; data?: ClassBroadsheetData; error?: string }> {
  if (!subdomain) return { success: false, error: 'Subdomain is required.' };
  if (!classId) return { success: false, error: 'Class ID is required.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher']);

    // 1. Fetch class info, curriculum subjects, students, results, and publish state
    const [classRes, subjectsRes, studentsRes, resultsRes, configRes] = await Promise.all([
      (tenantSupabase as any)
        .from('classes')
        .select('id, name')
        .eq('id', classId)
        .eq('school_id', schoolId)
        .single(),
      getClassCurriculumSubjects(classId, schoolId, subdomain),
      (tenantSupabase as any)
        .from('students')
        .select(`
          id,
          admission_no,
          gender,
          profiles:user_id ( full_name )
        `)
        .eq('class_id', classId)
        .eq('school_id', schoolId)
        .order('admission_no'),
      (tenantSupabase as any)
        .from('results')
        .select('*')
        .eq('class_id', classId)
        .eq('school_id', schoolId)
        .eq('academic_year', academicYear)
        .eq('term', term),
      (tenantSupabase as any)
        .from('institutional_configs')
        .select('config_value')
        .eq('school_id', schoolId)
        .eq('config_key', 'published_results')
        .maybeSingle(),
    ]);

    if (!classRes.data) throw new Error('Class not found');
    const className = classRes.data.name;
    const subjects = subjectsRes.data || [];
    const students = studentsRes.data || [];
    const results = resultsRes.data || [];
    const publishedMap = configRes.data?.config_value || {};
    const publishInfo = publishedMap[`${classId}_${academicYear}_${term}`];
    const isPublished = !!publishInfo?.isPublished;

    // Index results by student_id and subject_id
    const resultMap = new Map<string, any>();
    results.forEach((r: any) => {
      resultMap.set(`${r.student_id}_${r.subject_id}`, r);
    });

    // 2. Build student score rows
    const studentRows: BroadsheetStudentRow[] = students.map((s: any) => {
      const subjectScores: Record<
        string,
        { total: number; grade: string; remark: string; scores: Record<string, number> }
      > = {};
      let totalScoreSum = 0;
      let subjectsCount = 0;

      subjects.forEach((subj: any) => {
        const key = `${s.id}_${subj.id}`;
        const res = resultMap.get(key);
        if (res && res.total_score !== undefined && res.total_score !== null) {
          const score = Number(res.total_score);
          subjectScores[subj.id] = {
            total: score,
            grade: res.grade || scoreToGrade(score),
            remark: res.remark || gradeRemark(res.grade || scoreToGrade(score)),
            scores: res.scores || {},
          };
          totalScoreSum += score;
          subjectsCount++;
        }
      });

      const averageScore = subjectsCount > 0 ? Math.round((totalScoreSum / subjectsCount) * 10) / 10 : 0;
      const status = averageScore >= 40 ? 'Pass' : 'Fail';

      return {
        studentId: s.id,
        admissionNo: s.admission_no,
        fullName: s.profiles?.full_name || 'Unnamed Student',
        gender: s.gender,
        subjectScores,
        totalScore: totalScoreSum,
        averageScore,
        subjectsOffered: subjectsCount,
        rank: 0,
        positionStr: '',
        status,
      };
    });

    // 3. Compute Standard Competition Ranking (1st, 2nd, 3rd with tie handling)
    studentRows.sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);
    let currentRank = 1;
    for (let i = 0; i < studentRows.length; i++) {
      if (i > 0 && studentRows[i].averageScore < studentRows[i - 1].averageScore) {
        currentRank = i + 1;
      }
      studentRows[i].rank = currentRank;
      studentRows[i].positionStr = formatOrdinal(currentRank);
    }

    // 4. Compute Subject Summaries
    const subjectSummaries: Record<string, BroadsheetSubjectSummary> = {};
    subjects.forEach((subj: any) => {
      let sum = 0;
      let count = 0;
      let highest = 0;
      let lowest = 100;
      let passCount = 0;
      let failCount = 0;

      students.forEach((s: any) => {
        const key = `${s.id}_${subj.id}`;
        const res = resultMap.get(key);
        if (res && res.total_score !== undefined && res.total_score !== null) {
          const score = Number(res.total_score);
          sum += score;
          count++;
          if (score > highest) highest = score;
          if (score < lowest) lowest = score;
          if (score >= 40) passCount++;
          else failCount++;
        }
      });

      subjectSummaries[subj.id] = {
        subjectId: subj.id,
        subjectName: subj.name,
        classAverage: count > 0 ? Math.round(sum / count) : 0,
        highestScore: count > 0 ? highest : 0,
        lowestScore: count > 0 ? lowest : 0,
        passCount,
        failCount,
        passRate: count > 0 ? Math.round((passCount / count) * 100) : 0,
      };
    });

    // 5. Overall Class Metrics
    const totalClassStudents = studentRows.length;
    const classTotalSum = studentRows.reduce((sum, s) => sum + s.averageScore, 0);
    const classAverage =
      totalClassStudents > 0 ? Math.round(classTotalSum / totalClassStudents) : 0;
    const passingStudents = studentRows.filter((s) => s.status === 'Pass').length;
    const overallPassRate =
      totalClassStudents > 0 ? Math.round((passingStudents / totalClassStudents) * 100) : 0;

    const topPerformers = studentRows.slice(0, 3).map((s) => ({
      rank: s.rank,
      name: s.fullName,
      average: s.averageScore,
      positionStr: s.positionStr,
    }));

    return {
      success: true,
      data: {
        classId,
        className,
        academicYear,
        term,
        isPublished,
        publishedAt: publishInfo?.publishedAt,
        subjects,
        students: studentRows,
        subjectSummaries,
        classMetrics: {
          totalStudents: totalClassStudents,
          classAverage,
          highestStudentAverage: studentRows[0]?.averageScore || 0,
          lowestStudentAverage: studentRows[studentRows.length - 1]?.averageScore || 0,
          overallPassRate,
          topPerformers,
        },
      },
    };
  } catch (error: any) {
    console.error('[getClassBroadsheetData Error]:', error);
    return { success: false, error: error.message || 'Failed to aggregate broadsheet data' };
  }
}

/**
 * Publishes or unpublishes class results, updating institutional_configs.
 * When published, parents and students can access report cards.
 */
export async function publishClassResults(
  classId: string,
  className: string,
  academicYear: string,
  term: number,
  subdomain: string,
  isPublished: boolean = true
): Promise<{ success: boolean; error?: string }> {
  if (!subdomain) return { success: false, error: 'Subdomain is required.' };
  if (!classId) return { success: false, error: 'Class ID is required.' };

  try {
    const { tenantSupabase, schoolId, user } = await requireActionAuth(subdomain, ['admin']);

    // 1. Update institutional_configs for published_results
    const configKey = 'published_results';
    const { data: existingConfig } = await (tenantSupabase as any)
      .from('institutional_configs')
      .select('config_value')
      .eq('school_id', schoolId)
      .eq('config_key', configKey)
      .maybeSingle();

    const currentMap = existingConfig?.config_value || {};
    const cycleKey = `${classId}_${academicYear}_${term}`;
    currentMap[cycleKey] = {
      isPublished,
      publishedAt: isPublished ? new Date().toISOString() : null,
      publishedBy: user.id,
      className,
    };

    const { error: configErr } = await (tenantSupabase as any)
      .from('institutional_configs')
      .upsert(
        {
          school_id: schoolId,
          config_key: configKey,
          config_value: currentMap,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'school_id,config_key' }
      );

    if (configErr) throw configErr;

    revalidatePath('/dashboard/admin/academics/results');
    revalidatePath('/dashboard/parent/results');
    revalidatePath('/dashboard/student');
    return { success: true };
  } catch (error: any) {
    console.error('[publishClassResults Error]:', error);
    return { success: false, error: error.message || 'Failed to update result publication status' };
  }
}

/**
 * Fetches online computer-based exams (CBT) for the selected class & subject.
 */
export async function getOnlineExamsForSubject(
  classId: string,
  subjectId: string,
  subdomain: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  if (!subdomain) return { success: false, error: 'Subdomain is required.' };

  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin', 'teacher']);

    // Call backend API /exams
    const url = `${getBackendUrl()}/exams?classId=${classId}`;
    const { data: { session } } = await (tenantSupabase as any).auth.getSession();

    const res = await fetch(url, {
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    });

    const result = await res.json();
    if (!result.success || !result.data) {
      return { success: true, data: [] };
    }

    const filtered = (result.data || []).filter(
      (e: any) => e.subjectId === subjectId || e.classId === classId
    );

    return {
      success: true,
      data: filtered.map((e: any) => ({
        id: e._id,
        title: e.title,
        totalMarks: e.totalMarks,
        durationMins: e.durationMins,
        questionCount: e.questionCount,
        isActive: e.isActive,
        createdAt: e.createdAt,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch online exams' };
  }
}

/**
 * Imports student scores from a completed CBT exam into the target metric column.
 */
export async function syncOnlineExamScores(
  examId: string,
  classId: string,
  subjectId: string,
  targetMetricKey: string,
  metricWeight: number,
  academicYear: string,
  term: number,
  subdomain: string
): Promise<{ success: boolean; syncedCount?: number; error?: string }> {
  if (!subdomain) return { success: false, error: 'Subdomain is required.' };

  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ['admin', 'teacher']);

    // 1. Fetch exam attempts from backend
    const url = `${getBackendUrl()}/attempts/exam/${examId}`;
    const { data: { session } } = await (tenantSupabase as any).auth.getSession();

    const res = await fetch(url, {
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    });

    const attemptRes = await res.json();
    if (!attemptRes.success || !attemptRes.data || attemptRes.data.length === 0) {
      return { success: false, error: 'No completed exam submissions found for this exam.' };
    }

    const attempts = attemptRes.data;

    // 2. Fetch students mapping for this class
    const { data: students, error: studentError } = await (tenantSupabase as any)
      .from('students')
      .select('id, user_id')
      .eq('class_id', classId)
      .eq('school_id', schoolId);

    if (studentError) throw studentError;

    const studentUserMap = new Map<string, string>(); // user_id -> student.id
    students.forEach((s: any) => {
      if (s.user_id) studentUserMap.set(s.user_id, s.id);
    });

    // 3. Fetch existing results
    const { data: existingResults } = await (tenantSupabase as any)
      .from('results')
      .select('*')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('academic_year', academicYear)
      .eq('term', term);

    const resultMap = new Map<string, any>();
    existingResults?.forEach((r: any) => {
      resultMap.set(r.student_id, r);
    });

    // 4. Build upsert rows
    let syncedCount = 0;
    const upsertRows: any[] = [];

    attempts.forEach((att: any) => {
      const studentId = studentUserMap.get(att.studentId);
      if (studentId) {
        const rawScore = Number(att.score || 0);
        const totalMarks = Number(att.totalMarks || 100);
        const scaledScore =
          totalMarks > 0 ? Math.round((rawScore / totalMarks) * metricWeight) : 0;

        const currentRes = resultMap.get(studentId) || { scores: {} };
        const updatedScores = { ...currentRes.scores, [targetMetricKey]: scaledScore };

        // Sum total
        const total = Object.values(updatedScores).reduce(
          (sum: number, v: any) => sum + (Number(v) || 0),
          0
        );

        upsertRows.push({
          ...(currentRes.id ? { id: currentRes.id } : {}),
          student_id: studentId,
          school_id: schoolId,
          class_id: classId,
          subject_id: subjectId,
          academic_year: academicYear,
          term,
          scores: updatedScores,
          total_score: total,
          grade: scoreToGrade(total),
          remark: gradeRemark(scoreToGrade(total)),
        });
        syncedCount++;
      }
    });

    if (upsertRows.length > 0) {
      const { error: upsertError } = await (tenantSupabase as any)
        .from('results')
        .upsert(upsertRows, { onConflict: 'student_id,subject_id,academic_year,term' });

      if (upsertError) throw upsertError;
    }

    revalidatePath('/dashboard/admin/academics/results');
    return { success: true, syncedCount };
  } catch (error: any) {
    console.error('[syncOnlineExamScores Error]:', error);
    return { success: false, error: error.message || 'Failed to sync exam scores' };
  }
}

