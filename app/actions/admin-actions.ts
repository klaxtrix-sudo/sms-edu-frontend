"use server";


import { createTenantAdminClient } from "@/lib/supabase/tenant-admin";
import { revalidatePath } from "next/cache";

interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  schoolId: string;
  subdomain: string;
}

export async function toggleTeacherStatus(userId: string, isActive: boolean, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to update teacher status.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
    const { error } = await (tenantSupabase as any)
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/admin/users/teachers');
    return { success: true };
  } catch (e: any) {
    return { error: e.message || 'Failed to update teacher status.' };
  }
}

export async function archiveTeacher(userId: string, subdomain: string) {
  console.log(`[Admin Actions] Archiving teacher ${userId} in subdomain ${subdomain}`);
  if (!subdomain) return { error: 'Subdomain is required to archive teacher.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
    
    // 1. Update Profile Status
    console.log(`[Admin Actions] Updating profile status for ${userId}...`);
    const { error: profileError } = await (tenantSupabase as any)
      .from('profiles')
      .update({ 
        is_archived: true,
        is_active: false 
      })
      .eq('id', userId);

    if (profileError) {
      console.error(`[Admin Actions] Profile update error:`, profileError);
      return { error: `Profile update failed: ${profileError.message}` };
    }

    // 2. Disconnect from Classes
    console.log(`[Admin Actions] Disconnecting ${userId} from classes...`);
    const { error: classError } = await (tenantSupabase as any)
      .from('classes')
      .update({ class_teacher_id: null })
      .eq('class_teacher_id', userId);

    if (classError) {
      console.error(`[Admin Actions] Class disconnection error:`, classError);
      // We don't block the whole process if this fails, but it's important to provide feedback
    }

    console.log(`[Admin Actions] Successfully archived teacher ${userId}`);
    revalidatePath('/dashboard/admin/users/teachers');
    revalidatePath('/dashboard/admin/academics');
    
    return { success: true };
  } catch (e: any) {
    console.error(`[Admin Actions] Catch error archiving teacher:`, e);
    return { error: e.message || 'Failed to archive teacher.' };
  }
}

export async function unarchiveTeacher(userId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to unarchive teacher.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
    
    const { error } = await (tenantSupabase as any)
      .from('profiles')
      .update({ 
        is_archived: false,
        is_active: true // Reactivate by default when unarchiving
      })
      .eq('id', userId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/admin/users/teachers');
    return { success: true };
  } catch (e: any) {
    return { error: e.message || 'Failed to unarchive teacher.' };
  }
}

export async function updateTeacher(userId: string, data: any, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to update teacher.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
    const { error } = await (tenantSupabase as any)
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: data.phone,
      })
      .eq('id', userId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/admin/users/teachers');
    return { success: true };
  } catch (e: any) {
    return { error: e.message || 'Failed to update teacher.' };
  }
}

export async function getTeachers(schoolId: string, subdomain: string, includeArchived: boolean = false) {
  if (!subdomain) return { error: 'Subdomain is required to fetch teachers.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
    let query = (tenantSupabase as any)
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .eq('school_id', schoolId);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query.order('full_name');

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('[Admin Actions] getTeachers Error:', error.message);
    return { error: error.message || 'Failed to fetch teachers.' };
  }
}

export async function getClasses(schoolId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to fetch classes.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
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

export async function createTeacher(data: CreateUserData) {
  const { 
    email, 
    password, 
    fullName, 
    phone,
    schoolId,
    subdomain
  } = data;

  try {
    // 1. Initialize Tenant Admin Client
    const tenantSupabase = await createTenantAdminClient(subdomain);

    // 2. Create Auth User in TENANT project
    const { data: { user }, error: authError } = await tenantSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for immediate login
      user_metadata: {
        full_name: fullName,
        role: 'teacher',
        school_id: schoolId,
        must_change_password: true,
        // Tracks whether the teacher has gone through the onboarding OTP gate.
        // Using a dedicated flag (not email_confirmed_at) because we auto-confirm
        // the auth email at creation for immediate login capability.
        email_onboarding_verified: false,
      }
    });

    if (authError) return { error: `Tenant Auth Error: ${authError.message}` };

    if (user) {
      // 3. Upsert profile in TENANT project — tenant is the single source of truth.
      // The DB trigger creates a basic profile on auth.user creation; we fill in
      // the remaining fields (phone, email, status) here.
      const { error: tenantProfileError } = await (tenantSupabase as any)
        .from('profiles')
        .upsert({
          id: user.id,
          school_id: schoolId,
          full_name: fullName,
          email,
          phone,
          role: 'teacher',
          is_active: true,
        });

      if (tenantProfileError) {
        console.error('[Admin Actions] Tenant Profile Error:', tenantProfileError.message);
      }
    }

    revalidatePath("/dashboard/admin/users/teachers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred during teacher provisioning" };
  }
}

export async function createStudent(data: any) {
  const { 
    email, // This represents parentEmail from the form
    password, 
    fullName, 
    admissionNo,
    classId,
    gender,
    schoolId,
    subdomain
  } = data;

  if (!subdomain) return { error: "Subdomain is required for student provisioning." };

  try {
    // 1. Initialize Tenant Admin Client
    const tenantSupabase = await createTenantAdminClient(subdomain);

    // 2. Lookup Parent Profile if email is provided
    let parentId = null;
    if (email) {
      const { data: parentProfile } = await (tenantSupabase as any)
        .from('profiles')
        .select('id')
        .eq('email', email)
        .eq('role', 'parent')
        .single();
      
      if (parentProfile) {
        parentId = parentProfile.id;
      }
    }

    // 3. Generate deterministic dummy email for student login
    const cleanedAdmissionNo = admissionNo.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const studentDummyEmail = `${cleanedAdmissionNo}@${subdomain.toLowerCase()}.klaxtrix.internal`;

    // 4. Create Auth User in TENANT project
    const { data: { user }, error: authError } = await tenantSupabase.auth.admin.createUser({
      email: studentDummyEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'student',
        school_id: schoolId,
        admission_no: admissionNo,
        parent_email: email || null
      }
    });

    if (authError) return { error: `Tenant Auth Error: ${authError.message}` };

    if (user) {
      // 5. Create Student record in TENANT project (with parent_id link)
      const { error: studentError } = await (tenantSupabase as any)
        .from('students')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          class_id: classId,
          admission_no: admissionNo,
          gender: gender,
          parent_id: parentId
        });

      if (studentError) return { error: `Tenant Data Error: ${studentError.message}` };

      // 6. Upsert profile in TENANT project
      const { error: profileError } = await (tenantSupabase as any)
        .from('profiles')
        .upsert({
          id: user.id,
          school_id: schoolId,
          full_name: fullName,
          email: studentDummyEmail,
          role: 'student',
          is_active: true,
        });

      if (profileError) {
        console.error('[Admin Actions] Tenant Student Profile Error:', profileError.message);
      }
    }

    revalidatePath("/dashboard/admin/users/students");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred during student provisioning" };
  }
}

export async function resetStudentPassword(studentUserId: string, newPassword: string, subdomain: string) {
  if (!subdomain) return { error: "Subdomain is required to reset student password." };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
    const { error } = await tenantSupabase.auth.admin.updateUserById(studentUserId, {
      password: newPassword
    });

    if (error) return { error: `Tenant Auth Error: ${error.message}` };
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Failed to reset student password." };
  }
}

export async function createClass(data: any) {
  const { name, teacherId, schoolId, subdomain } = data;
  if (!subdomain) return { error: 'Subdomain is required to create a class.' };

  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
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

export async function saveResults(resultsData: any[], subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to save results.' };

  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
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

export async function updateClass(classId: string, data: any, subdomain: string) {
  const { name, teacherId } = data;
  if (!subdomain) return { error: 'Subdomain is required to update a class.' };

  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
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


export async function completeOnboarding(userId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };

  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
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

export async function getResultMetrics(
  classId: string | null,
  subjectId: string | null,
  schoolId: string,
  subdomain: string
) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
    
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
    
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
