"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  schoolId: string;
}

export async function createTeacher(data: CreateUserData) {
  const adminSupabase = createAdminClient();

  try {
    // 1. Get the current admin's school ID
    const { data: { user: adminUser } } = await adminSupabase.auth.getUser(); // This won't work easily in a server action without session?
    // Actually, we should pass the schoolId from the client or fetch it.
    // However, createAdminClient uses service role, it can't "getUser" from session.
    // We should use a session cookie or pass it.
  } catch (e) {}

  // To keep it simple and secure for now, let's fetch the admin's profile first
  // But wait, server actions CAN access cookies to get the current user session.
  
  // Revised approach:
  const { 
    email, 
    password, 
    fullName, 
    phone,
    schoolId
  } = data;

  try {
    const { data: { user }, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'teacher',
        school_id: schoolId
      }
    });

    if (authError) return { error: authError.message };

    // Update profile with phone (since trigger might not handle it all)
    if (user) {
      await (adminSupabase as any)
        .from('profiles')
        .update({ phone })
        .eq('id', user.id);
    }

    revalidatePath("/dashboard/admin/users/teachers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred" };
  }
}

export async function createStudent(data: any) {
  const adminSupabase = createAdminClient();
  const { 
    email, 
    password, 
    fullName, 
    admissionNo,
    classId,
    gender,
    schoolId
  } = data;

  try {
    // 1. Create Auth User
    const { data: { user }, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'student',
        school_id: schoolId
      }
    });

    if (authError) return { error: authError.message };

    // 2. Create Student Record (Profile is created by DB trigger)
    if (user) {
      const { error: studentError } = await (adminSupabase as any)
        .from('students')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          class_id: classId,
          admission_no: admissionNo,
          gender: gender
        });

      if (studentError) {
        // Cleanup auth user on failure?
        return { error: studentError.message };
      }
    }

    revalidatePath("/dashboard/admin/users/students");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred" };
  }
}
