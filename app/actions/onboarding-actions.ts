'use server';

import { createServerClient } from '@/lib/supabase/server';
import { createTenantAdminClient } from '@/lib/supabase/tenant-admin';
import { resolveTenantKeys } from '@/lib/supabase/tenant-resolver';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

/**
 * Resolves the tenant subdomain from the cookie set by TenantProvider.
 * Server actions can't read request host headers directly, so we use a
 * lightweight, non-sensitive cookie for this.
 */
function getSubdomainFromCookies(): string | null {
  try {
    const cookieStore = cookies();
    return cookieStore.get('x-tenant-subdomain')?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Creates BOTH an anon-key server client (for session-aware operations like
 * auth.getUser / auth.updateUser) and an admin client (for elevated writes like
 * admin.updateUserById and service-role DB access) — both pointing at the
 * correct tenant project.
 */
async function createTenantClients() {
  const subdomain = getSubdomainFromCookies();
  if (!subdomain) throw new Error('Could not determine school context. Please refresh and try again.');

  const tenantKeys = await resolveTenantKeys(subdomain);
  if (!tenantKeys) throw new Error(`School "${subdomain}" not found.`);

  const anonClient = createServerClient(tenantKeys.supabaseUrl, tenantKeys.supabaseAnonKey);
  const adminClient = await createTenantAdminClient(subdomain);

  return { anonClient, adminClient, subdomain };
}

// ──────────────────────────────────────────────────────────────────────────────
// SEND OTP
// ──────────────────────────────────────────────────────────────────────────────

export async function resendOnboardingOTP(email: string) {
  try {
    const { anonClient, adminClient } = await createTenantClients();

    // 1. Get teacher's profile for name and school_id from the TENANT DB
    const { data: userData } = await anonClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('User session not found.');

    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('school_id, full_name')
      .eq('id', userId)
      .maybeSingle();

    const teacherName = (profile?.full_name as string) || 'Teacher';
    const schoolId = profile?.school_id as string | null;

    // 2. Generate a 6-digit PIN and store it in the TENANT verification_codes table
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const { error: pinError } = await (adminClient as any)
      .from('verification_codes')
      .upsert(
        {
          email,
          code: pin,
          school_id: schoolId,
          is_used: false,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
        { onConflict: 'email' }
      );

    if (pinError) throw pinError;

    // 3. Look up Resend config from TENANT institutional_configs
    let resendApiKey: string | null = null;
    let resendFromEmail: string | null = null;
    let resendFromName = 'Klaxtrix Portal';

    if (schoolId) {
      const { data: config } = await (adminClient as any)
        .from('institutional_configs')
        .select('config_value, resend_api_key, resend_from_email, is_active')
        .eq('school_id', schoolId)
        .eq('config_key', 'resend_settings')
        .maybeSingle();

      if (config) {
        if (!config.is_active) {
          console.warn(`[Onboarding] Institutional config found for ${schoolId} but is NOT active. Falling back...`);
        } else {
          // Support both dedicated columns and JSON config_value blob
          resendApiKey = config.resend_api_key;
          resendFromEmail = config.resend_from_email;

          if (!resendApiKey && config.config_value) {
            try {
              const parsed = JSON.parse(config.config_value);
              resendApiKey = parsed.apiKey ?? null;
              resendFromEmail = parsed.fromEmail ?? null;
              resendFromName = parsed.fromName ?? resendFromName;
            } catch { /* ignore parse errors */ }
          }
        }
      }
    }

    // 4A. Send via school's Resend config
    if (resendApiKey && resendFromEmail) {
      console.log(`[Onboarding] Attempting institutional email to ${email} via Resend...`);
      const resend = new Resend(resendApiKey);
      const { data: sendData, error: sendError } = await resend.emails.send({
        from: `${resendFromName} <${resendFromEmail}>`,
        to: email,
        subject: `${pin} — Your Verification Code`,
        html: buildOtpEmailHtml(teacherName, pin),
      });

      if (sendError) {
        console.error('[Onboarding] Institutional Resend Error:', sendError);
        throw new Error(`Email provider error: ${sendError.message}`);
      }
      
      console.log('[Onboarding] Institutional email sent successfully:', sendData?.id);
      return { success: true, method: 'institutional-resend' };
    }

    // 4B. Fall back to global RESEND_API_KEY env var
    const globalKey = process.env.RESEND_API_KEY;
    const globalFrom = process.env.RESEND_FROM_EMAIL ?? 'noreply@klaxtrix.com';
    if (globalKey) {
      console.log(`[Onboarding] Falling back to global email to ${email}...`);
      const resend = new Resend(globalKey);
      const { data: sendData, error: sendError } = await resend.emails.send({
        from: `Klaxtrix Portal <${globalFrom}>`,
        to: email,
        subject: `${pin} — Your Verification Code`,
        html: buildOtpEmailHtml(teacherName, pin),
      });

      if (sendError) {
        console.error('[Onboarding] Global Resend Error:', sendError);
        throw new Error(`Global email provider error: ${sendError.message}`);
      }

      console.log('[Onboarding] Global email sent successfully:', sendData?.id);
      return { success: true, method: 'global-resend' };
    }

    // 4C. Dev fallback — print code to server console
    console.log(
      `\n[DEV] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `[DEV] TARGET: ${email}\n` +
      `[DEV] OTP CODE: ${pin}\n` +
      `[DEV] REASON: No Resend configuration found in tenant DB or environment.\n` +
      `[DEV] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    );
    return { success: true, method: 'console', devCode: pin };
  } catch (error: any) {
    console.error('[Onboarding] resendOnboardingOTP error:', error);
    return { error: error.message || 'Failed to send verification code' };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// VERIFY OTP
// ──────────────────────────────────────────────────────────────────────────────

export async function verifyOnboardingOTP(email: string, token: string) {
  try {
    const { anonClient, adminClient } = await createTenantClients();

    // 1. Look up the code in TENANT verification_codes
    const { data: record, error: lookupError } = await (adminClient as any)
      .from('verification_codes')
      .select('id, is_used, expires_at')
      .eq('email', email)
      .eq('code', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!record) throw new Error('Invalid or expired verification code.');

    // 2. Get current user from the tenant session
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) throw new Error('User session not found.');

    // 3. Mark code as used (prevents replay)
    await (adminClient as any)
      .from('verification_codes')
      .update({ is_used: true })
      .eq('id', record.id);

    // 4. Mark email_onboarding_verified in tenant user metadata
    await (adminClient as any).auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        email_onboarding_verified: true,
      },
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('[Onboarding] verifyOnboardingOTP error:', error);
    return { error: error.message || 'Invalid or expired verification code' };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// FINALIZE PASSWORD
// ──────────────────────────────────────────────────────────────────────────────

export async function finalizeTeacherAccount(password: string) {
  try {
    const { anonClient, adminClient } = await createTenantClients();

    // Verify session
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) throw new Error('User session not found.');

    // 1. Update password via the anon session client (requires active session)
    const { error: passwordError } = await anonClient.auth.updateUser({ password });
    if (passwordError) throw passwordError;

    // 2. Clear must_change_password flag via admin (more reliable than session updateUser)
    await (adminClient as any).auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        must_change_password: false,
      },
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('[Onboarding] finalizeTeacherAccount error:', error);
    return { error: error.message || 'Failed to finalize account setup' };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function buildOtpEmailHtml(name: string, pin: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 40px; border-radius: 10px;">
      <h2 style="color: #1e293b; text-align: center;">Verification Required</h2>
      <p>Hello ${name},</p>
      <p>To access your faculty portal, please enter this 6-digit verification code:</p>
      <div style="background: #f8fafc; padding: 24px; text-align: center; border-radius: 8px; margin: 30px 0; border: 2px dashed #e2e8f0;">
        <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #2563eb;">${pin}</span>
      </div>
      <p style="color: #64748b; font-size: 14px;">This code expires in <strong>15 minutes</strong>. Do not share it with anyone.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="text-align: center; font-size: 12px; color: #94a3b8;">
        Sent on behalf of your institution by the Klaxtrix Portal.
      </p>
    </div>
  `;
}
