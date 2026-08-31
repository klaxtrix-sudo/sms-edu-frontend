"use server";

import { requireActionAuth } from "@/lib/supabase/action-auth";
import { revalidatePath } from "next/cache";

export async function getClasses(schoolId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to fetch classes.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher', 'student', 'parent']);
    const { data, error } = await (tenantSupabase as any)
      .from('classes')
      .select(`
        id,
        name,
        profiles:class_teacher_id (
          full_name
        )
      `)
      .eq('school_id', schoolId)
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
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher', 'student', 'parent']);
    const { data, error } = await (tenantSupabase as any)
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('[Admin Actions] getSubjects Error:', error.message);
    return { error: error.message || 'Failed to fetch subjects.' };
  }
}

export async function createClass(data: any) {
  const { name, teacherId, schoolId, subdomain } = data;
  if (!subdomain) return { error: 'Subdomain is required to create a class.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await (tenantSupabase as any)
      .from('classes')
      .insert({
        name,
        class_teacher_id: teacherId || null,
        school_id: schoolId,
      });

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to create class' };
  }
}

export async function createSubject(data: any) {
  const { name, code, schoolId, subdomain } = data;
  if (!subdomain) return { error: 'Subdomain is required to create a subject.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await (tenantSupabase as any)
      .from('subjects')
      .insert({
        name,
        code: code.toUpperCase(),
        school_id: schoolId,
      });

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to create subject' };
  }
}

export async function updateClass(classId: string, data: any, subdomain: string) {
  const { name, teacherId } = data;
  if (!subdomain) return { error: 'Subdomain is required to update a class.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await (tenantSupabase as any)
      .from('classes')
      .update({
        name,
        class_teacher_id: teacherId || null,
      })
      .eq('id', classId);

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update class' };
  }
}

export async function deleteClass(classId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to delete a class.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await (tenantSupabase as any)
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) throw error;

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete class' };
  }
}

export async function deleteSubject(subjectId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to delete a subject.' };

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await (tenantSupabase as any)
      .from('subjects')
      .delete()
      .eq('id', subjectId);

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
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher']);
    const { data, error } = await (tenantSupabase as any)
      .from('class_subject_teachers')
      .select('subject_id, teacher_id')
      .eq('class_id', classId);

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
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);

    // 1. Delete all existing subject teacher assignments for this class
    const { error: deleteError } = await (tenantSupabase as any)
      .from('class_subject_teachers')
      .delete()
      .eq('class_id', classId);

    if (deleteError) throw deleteError;

    // 2. Filter out unassigned (null/none) teachers and map the others
    const recordsToInsert = assignments
      .filter(a => a.teacherId && a.teacherId !== 'none' && a.teacherId !== '')
      .map(a => ({
        school_id: schoolId,
        class_id: classId,
        subject_id: a.subjectId,
        teacher_id: a.teacherId
      }));

    // 3. Perform bulk insert if there are any records
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await (tenantSupabase as any)
        .from('class_subject_teachers')
        .insert(recordsToInsert);

      if (insertError) throw insertError;
    }

    revalidatePath('/dashboard/admin/academics');
    return { success: true };
  } catch (error: any) {
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
