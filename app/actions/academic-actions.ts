"use server";

import { requireActionAuth } from "@/lib/supabase/action-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
    const { error } = await (tenantSupabase as any)
      .from('results')
      .upsert(resultsData, {
        onConflict: 'student_id,subject_id,academic_year,term',
      });

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics/results');
    return { success: true };
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
