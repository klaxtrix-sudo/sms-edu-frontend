'use server';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { type ResendConfig } from './config-actions';

const createClient = createServerClient;

export async function resendOnboardingOTP(email: string) {
  const supabase = createClient();
  const adminSupabase = createAdminClient();
  
  try {
    // 1. Get user's school_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, full_name')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.school_id) throw new Error("Could not identify institution.");

    // 2. Check for Resend configuration
    const { data: configData } = await supabase
      .from('institutional_configs')
      .select('config_value')
      .eq('school_id', profile.school_id)
      .eq('config_key', 'resend_settings')
      .single();

    if (configData) {
      const config = JSON.parse(configData.config_value) as ResendConfig;
      
      if (config.apiKey && config.fromEmail) {
        // Branded Delivery via Resend
        const resend = new Resend(config.apiKey);
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save PIN to verification_codes
        const { error: pinError } = await adminSupabase
          .from('verification_codes')
          .upsert({
            email,
            code: pin,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins
          }, { onConflict: 'email' });

        if (pinError) throw pinError;

        // Send Email
        const { error: sendError } = await resend.emails.send({
          from: `${config.fromName || 'Klaxtrix Portal'} <${config.fromEmail}>`,
          to: email,
          subject: `${pin} is your institutional verification code`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 40px; border-radius: 10px;">
              <h2 style="color: #333; text-align: center;">Verification Required</h2>
              <p>Hello ${profile.full_name},</p>
              <p>To finalize your access to the school dashboard, please enter the 6-digit verification code below:</p>
              <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${pin}</span>
              </div>
              <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="text-align: center; font-size: 12px; color: #94a3b8;">
                This secure email was dispatched on behalf of your institution.
              </p>
            </div>
          `
        });

        if (sendError) throw sendError;
        return { success: true, method: 'institutional' };
      }
    }

    // Fallback: Supabase Native OTP
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    });

    if (error) throw error;
    return { success: true, method: 'supabase' };
  } catch (error: any) {
    console.error("Resend OTP Error:", error);
    return { error: error.message || "Failed to send verification code" };
  }
}

export async function verifyOnboardingOTP(email: string, token: string) {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  try {
    // 1. Check Institutional Verification Codes first
    const { data: institutionalCode } = await adminSupabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (institutionalCode) {
      // Manual verification success!
      // We must manually confirm the user in Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found.");

      const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (confirmError) throw confirmError;

      // Clear the code
      await adminSupabase.from('verification_codes').delete().eq('id', institutionalCode.id);
      
      revalidatePath('/', 'layout');
      return { success: true };
    }

    // 2. Fallback to Supabase Native OTP
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup'
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
