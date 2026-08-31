"use server";

import { requireActionAuth } from "@/lib/supabase/action-auth";
import { revalidatePath } from "next/cache";

export async function createStudent(data: any) {
  const { 
    email, // This represents parentEmail from the form
    password, 
    fullName, 
    admissionNo,
    classId,
    gender,
    dateOfBirth,
    stateOfOrigin,
    lga,
    religion,
    residentialAddress,
    bloodGroup,
    genotype,
    medicalConditions,
    previousSchool,
    passportUrl,
    schoolId,
    subdomain
  } = data;

  if (!subdomain) return { error: "Subdomain is required for student provisioning." };

  try {
    // 1. Initialize Tenant Admin Client with Auth Check
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);

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
      // 5. Create Student record in TENANT project (with all fields)
      const { error: studentError } = await (tenantSupabase as any)
        .from('students')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          class_id: classId,
          admission_no: admissionNo,
          gender: gender,
          date_of_birth: dateOfBirth || null,
          parent_id: parentId,
          state_of_origin: stateOfOrigin || null,
          lga: lga || null,
          religion: religion || null,
          residential_address: residentialAddress || null,
          blood_group: bloodGroup || null,
          genotype: genotype || null,
          medical_conditions: medicalConditions || null,
          previous_school: previousSchool || null,
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
          avatar_url: passportUrl || null,
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

export async function updateStudent(data: {
  studentId: string;
  userId?: string;
  fullName: string;
  admissionNo: string;
  classId: string | null;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  genotype?: string;
  medicalConditions?: string;
  stateOfOrigin?: string;
  lga?: string;
  religion?: string;
  residentialAddress?: string;
  previousSchool?: string;
  passportUrl?: string;
  subdomain: string;
}) {
  if (!data.subdomain) return { error: "Subdomain is required to update student." };

  try {
    const { tenantSupabase } = await requireActionAuth(data.subdomain, ['admin']);

    const { error: studentError } = await (tenantSupabase as any)
      .from('students')
      .update({
        admission_no: data.admissionNo,
        class_id: data.classId || null,
        gender: data.gender || null,
        date_of_birth: data.dateOfBirth || null,
        blood_group: data.bloodGroup || null,
        genotype: data.genotype || null,
        medical_conditions: data.medicalConditions || null,
        state_of_origin: data.stateOfOrigin || null,
        lga: data.lga || null,
        religion: data.religion || null,
        residential_address: data.residentialAddress || null,
        previous_school: data.previousSchool || null,
      })
      .eq('id', data.studentId);

    if (studentError) {
      return { error: `Tenant Data Error: ${studentError.message}` };
    }

    if (data.userId) {
      const profileUpdates: any = {
        full_name: data.fullName,
      };
      if (data.passportUrl !== undefined) {
        profileUpdates.avatar_url = data.passportUrl || null;
      }

      const { error: profileError } = await (tenantSupabase as any)
        .from('profiles')
        .update(profileUpdates)
        .eq('id', data.userId);

      if (profileError) {
        console.error('[Admin Actions] Profile update error:', profileError.message);
      }
    }

    revalidatePath("/dashboard/admin/users/students");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update student record." };
  }
}

export async function deleteStudent(data: {
  studentId: string;
  userId?: string;
  subdomain: string;
}) {
  if (!data.subdomain) return { error: "Subdomain is required to delete student." };

  try {
    const { tenantSupabase } = await requireActionAuth(data.subdomain, ['admin']);

    const { error: studentError } = await (tenantSupabase as any)
      .from('students')
      .delete()
      .eq('id', data.studentId);

    if (studentError) {
      return { error: `Failed to delete student: ${studentError.message}` };
    }

    if (data.userId) {
      await (tenantSupabase as any)
        .from('profiles')
        .delete()
        .eq('id', data.userId);
    }

    revalidatePath("/dashboard/admin/users/students");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete student." };
  }
}

/**
 * Uploads a student passport photograph to centralized storage.
 * Returns a public URL that can be stored in profiles.avatar_url.
 */
export async function uploadStudentPassport(
  schoolId: string,
  studentId: string,
  base64DataUri: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api';
    const res = await fetch(`${backendUrl}/tenant/upload-passport`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_AUTH_SECRET || "",
      },
      body: JSON.stringify({ schoolId, studentId, base64DataUri }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Admin Actions] Passport upload failed: ${errorText}`);
      return { success: false, error: "Failed to upload passport photo" };
    }

    const data = await res.json();
    return { success: true, publicUrl: data.publicUrl };
  } catch (error: any) {
    console.error(`[Admin Actions] Passport upload exception:`, error);
    return { success: false, error: error.message };
  }
}

export async function resetStudentPassword(studentUserId: string, newPassword: string, subdomain: string) {
  if (!subdomain) return { error: "Subdomain is required to reset student password." };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await tenantSupabase.auth.admin.updateUserById(studentUserId, {
      password: newPassword
    });

    if (error) return { error: `Tenant Auth Error: ${error.message}` };
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Failed to reset student password." };
  }
}
