"use server";

import { createAdminClient } from "@/lib/supabase/admin";
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

export async function toggleTeacherStatus(userId: string, isActive: boolean, subdomain?: string) {
  const masterSupabase = createAdminClient();
  const { error: masterError } = await (masterSupabase as any)
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (masterError) return { error: masterError.message };

  // If subdomain provided, also update tenant project
  if (subdomain) {
    try {
      const tenantSupabase = await createTenantAdminClient(subdomain);
      await (tenantSupabase as any)
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId); // Assumes ID parity
    } catch (e) {
      console.warn(`[Admin Actions] Failed to sync status toggle to tenant ${subdomain}:`, e);
    }
  }

  revalidatePath("/dashboard/admin/users/teachers");
  return { success: true };
}

export async function updateTeacher(userId: string, data: any, subdomain?: string) {
  const masterSupabase = createAdminClient();

  const { error: masterError } = await (masterSupabase as any)
    .from('profiles')
    .update({
      full_name: data.fullName,
      phone: data.phone,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (masterError) return { error: masterError.message };

  if (subdomain) {
    try {
      const tenantSupabase = await createTenantAdminClient(subdomain);
      await (tenantSupabase as any)
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone: data.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (e) {
      console.warn(`[Admin Actions] Failed to sync update to tenant ${subdomain}:`, e);
    }
  }

  revalidatePath("/dashboard/admin/users/teachers");
  return { success: true };
}

export async function getTeachers(schoolId: string) {
  const adminSupabase = createAdminClient();

  try {
    const { data, error } = await (adminSupabase as any)
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch teachers" };
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
        must_change_password: true
      }
    });

    if (authError) return { error: `Tenant Auth Error: ${authError.message}` };

    if (user) {
      // 3. Create/Update profile in TENANT project
      // Note: A DB trigger in the tenant project usually creates the profile on auth.user creation,
      // but we update it with phone and ensure it's synced.
      const { error: tenantProfileError } = await (tenantSupabase as any)
        .from('profiles')
        .update({ phone })
        .eq('id', user.id);

      if (tenantProfileError) console.error("Tenant Profile Sync Error:", tenantProfileError.message);

      // 4. "Double Write" to MASTER project for centralized reporting
      const masterSupabase = createAdminClient();
      const { error: masterProfileError } = await (masterSupabase as any)
        .from('profiles')
        .upsert({
          id: user.id, // Use the SAME ID for cross-reference
          school_id: schoolId,
          email,
          full_name: fullName,
          phone,
          role: 'teacher',
          is_active: true
        });

      if (masterProfileError) console.error("Master Hub Sync Error:", masterProfileError.message);
    }

    revalidatePath("/dashboard/admin/users/teachers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred during teacher provisioning" };
  }
}

export async function createStudent(data: any) {
  const { 
    email, 
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

    // 2. Create Auth User in TENANT project
    const { data: { user }, error: authError } = await tenantSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'student',
        school_id: schoolId
      }
    });

    if (authError) return { error: `Tenant Auth Error: ${authError.message}` };

    if (user) {
      // 3. Create Student Record in TENANT project
      const { error: studentError } = await (tenantSupabase as any)
        .from('students')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          class_id: classId,
          admission_no: admissionNo,
          gender: gender
        });

      if (studentError) return { error: `Tenant Data Error: ${studentError.message}` };

      // 4. "Double Write" profile to MASTER project
      const masterSupabase = createAdminClient();
      await (masterSupabase as any)
        .from('profiles')
        .upsert({
          id: user.id,
          school_id: schoolId,
          email,
          full_name: fullName,
          role: 'student',
          is_active: true
        });
    }

    revalidatePath("/dashboard/admin/users/students");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred during student provisioning" };
  }
}

export async function createClass(data: any) {
  const adminSupabase = createAdminClient();
  const { name, teacherId, schoolId } = data;

  try {
    const { error } = await (adminSupabase as any)
      .from('classes')
      .insert({
        name,
        teacher_id: teacherId || null,
        school_id: schoolId
      });

    if (error) throw error;

    revalidatePath("/dashboard/admin/academics");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create class" };
  }
}

export async function createSubject(data: any) {
  const adminSupabase = createAdminClient();
  const { name, code, schoolId } = data;

  try {
    const { error } = await (adminSupabase as any)
      .from('subjects')
      .insert({
        name,
        code: code.toUpperCase(),
        school_id: schoolId
      });

    if (error) throw error;

    revalidatePath("/dashboard/admin/academics");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create subject" };
  }
}

export async function saveResults(resultsData: any[]) {
  const adminSupabase = createAdminClient();

  try {
    const { error } = await (adminSupabase as any)
      .from('results')
      .upsert(resultsData, { 
        onConflict: 'student_id,subject_id,academic_year,term' 
      });

    if (error) throw error;

    revalidatePath("/dashboard/admin/academics/results");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to save results" };
  }
}


export async function completeOnboarding(userId: string) {
  const adminSupabase = createAdminClient();

  try {
    const { error } = await (adminSupabase as any)
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to complete onboarding" };
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
