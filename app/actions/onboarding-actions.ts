'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const createClient = createServerClient;

export async function resendOnboardingOTP(email: string) {
  const supabase = createClient();
  
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      }
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to send verification code" };
  }
}

export async function verifyOnboardingOTP(email: string, token: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup' // or 'magiclink' depending on how Supabase is configured
    });

    if (error) throw error;
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Invalid or expired verification code" };
  }
}

export async function finalizeTeacherAccount(password: string) {
  const supabase = createClient();

  try {
    // 1. Update Password
    const { error: passwordError } = await supabase.auth.updateUser({
      password
    });

    if (passwordError) throw passwordError;

    // 2. Clear must_change_password flag
    const { error: metaError } = await supabase.auth.updateUser({
      data: { must_change_password: false }
    });

    if (metaError) throw metaError;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to finalize account setup" };
  }
}
