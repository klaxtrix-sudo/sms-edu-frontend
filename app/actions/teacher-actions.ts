"use server";

import { requireActionAuth } from "@/lib/supabase/action-auth";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

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
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
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
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    
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
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    
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
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
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
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher']);
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

export async function deletePendingTeacher(userId: string, subdomain: string) {
  console.log(`[Admin Actions] Deleting pending teacher ${userId} in subdomain ${subdomain}`);
  if (!subdomain) return { error: 'Subdomain is required to delete teacher.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    
    // 1. Delete the profile explicitly to clear application data
    const { error: profileError } = await (tenantSupabase as any)
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error(`[Admin Actions] Profile deletion error:`, profileError);
      return { error: `Profile deletion failed: ${profileError.message}` };
    }

    // 2. Delete the auth identity completely
    const { error: authError } = await tenantSupabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error(`[Admin Actions] Auth deletion error:`, authError);
      return { error: `Auth deletion failed: ${authError.message}` };
    }

    console.log(`[Admin Actions] Successfully completely deleted pending teacher ${userId}`);
    revalidatePath('/dashboard/admin/users/teachers');
    
    return { success: true };
  } catch (e: any) {
    console.error(`[Admin Actions] Catch error deleting teacher:`, e);
    return { error: e.message || 'Failed to delete pending teacher.' };
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
    // 1. Initialize Tenant Admin Client with auth check
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);

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
        email_onboarding_verified: false,
      }
    });

    if (authError) return { error: `Tenant Auth Error: ${authError.message}` };

    if (user) {
      // 3. Upsert profile in TENANT project
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

      // 4. Look up active Resend config from tenant DB
      let resendApiKey: string | null = null;
      let resendFromEmail: string | null = null;
      let resendFromName = 'Klaxtrix Portal';

      const { data: configData } = await tenantSupabase
        .from('institutional_configs')
        .select('config_value, is_active')
        .eq('school_id', schoolId)
        .eq('config_key', 'resend_settings')
        .maybeSingle();

      if (configData && configData.is_active && configData.config_value) {
        try {
          const parsed = JSON.parse(configData.config_value);
          resendApiKey = parsed.apiKey ?? null;
          resendFromEmail = parsed.fromEmail ?? null;
          resendFromName = parsed.fromName ?? resendFromName;
        } catch (e) {
          console.error('[createTeacher] Failed to parse resend_settings JSON:', e);
        }
      }

      // Fallback to process.env config if tenant config is missing or inactive
      if (!resendApiKey) {
        resendApiKey = process.env.RESEND_API_KEY || null;
        resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@klaxtrix.site';
        resendFromName = 'Klaxtrix Portal';
      }

      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
      const loginUrl = process.env.NODE_ENV === 'production'
        ? `https://${subdomain}.${rootDomain}/login`
        : `http://${subdomain}.${rootDomain}/login`;

      // 5. Fetch school logo and name for the email template
      let schoolLogoUrl = '';
      let schoolName = 'the school';
      try {
        const { data: schoolData } = await tenantSupabase
          .from('schools')
          .select('logo_url, name')
          .eq('id', schoolId)
          .maybeSingle();
        if (schoolData?.logo_url) {
          schoolLogoUrl = schoolData.logo_url;
        }
        if (schoolData?.name) {
          schoolName = schoolData.name;
        }
      } catch (err) {
        console.error('[createTeacher] Failed to fetch school details:', err);
      }

      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const logoImgHtml = schoolLogoUrl && !schoolLogoUrl.startsWith('data:') ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${schoolLogoUrl}" alt="${schoolName} Logo" style="max-height: 80px; max-width: 200px;" /></div>` : '';
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            ${logoImgHtml}
            <h2 style="color: #4f46e5; margin-bottom: 24px; text-align: center;">Welcome to Klaxtrix!</h2>
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>An administrator has registered your teacher account at ${schoolName} portal.</p>
            <p>Please use the following credentials to log in to your dashboard:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
            </div>
            <p>We recommend that you change this temporary password after your first login.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">Log In to Portal</a>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
              If the button doesn't work, copy and paste this link into your browser: <br />
              <a href="${loginUrl}" target="_blank" rel="noopener noreferrer">${loginUrl}</a>
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated notification. Please do not reply directly to this email.</p>
          </div>
        `;

        try {
          const { error: sendError } = await resend.emails.send({
            from: `${resendFromName} <${resendFromEmail}>`,
            to: email,
            subject: 'Set Up Your Teacher Account \u2014 Klaxtrix Portal',
            html: emailHtml
          });

          if (sendError) {
            console.error('[createTeacher] Resend error sending setup link:', sendError);
          } else {
            console.log('[createTeacher] Setup link email sent successfully to:', email);
          }
        } catch (err: any) {
          console.error('[createTeacher] Failed to dispatch welcome email:', err.message);
        }
      } else {
        console.log('==================================================');
        console.log('[createTeacher] MOCK EMAIL DISPATCH LOG (No Resend Key Found)');
        console.log('To:', email);
        console.log('Subject: Set Up Your Teacher Account — Klaxtrix Portal');
        console.log('Password:', password);
        console.log('Login URL:', loginUrl);
        console.log('==================================================');
      }
    }

    revalidatePath("/dashboard/admin/users/teachers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred during teacher provisioning" };
  }
}

export async function resendTeacherCredentials(
  teacherId: string,
  schoolId: string,
  subdomain: string
) {
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);

    // 1. Get teacher's profile (name & email)
    const { data: profile, error: profileError } = await tenantSupabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', teacherId)
      .single();

    if (profileError || !profile || !profile.email) {
      return { error: 'Teacher profile not found or email is missing.' };
    }

    // 2. Compute login URL (needed for magic link redirect)
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const loginUrl = process.env.NODE_ENV === 'production'
      ? `https://${subdomain}.${rootDomain}/login`
      : `http://${subdomain}.${rootDomain}/login`;

    // 3. Generate a one-time magic link for secure account re-setup
    const { data: linkData, error: linkError } = await tenantSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: { redirectTo: loginUrl },
    });

    if (linkError) {
      return { error: `Failed to generate setup link: ${linkError.message}` };
    }

    const setupLink = linkData?.properties?.action_link || loginUrl;

    // 4. Reset onboarding flags so the teacher goes through OTP + password change
    await tenantSupabase.auth.admin.updateUserById(
      teacherId,
      {
        user_metadata: {
          must_change_password: true,
          email_onboarding_verified: false
        }
      }
    );

    // 5. Look up Resend configuration
    let resendApiKey: string | null = null;
    let resendFromEmail: string | null = null;
    let resendFromName = 'Klaxtrix Portal';

    const { data: configData } = await tenantSupabase
      .from('institutional_configs')
      .select('config_value, is_active')
      .eq('school_id', schoolId)
      .eq('config_key', 'resend_settings')
      .maybeSingle();

    if (configData && configData.is_active && configData.config_value) {
      try {
        const parsed = JSON.parse(configData.config_value);
        resendApiKey = parsed.apiKey ?? null;
        resendFromEmail = parsed.fromEmail ?? null;
        resendFromName = parsed.fromName ?? resendFromName;
      } catch (e) {
        console.error('[resendTeacherCredentials] Failed to parse resend_settings JSON:', e);
      }
    }

    if (!resendApiKey) {
      resendApiKey = process.env.RESEND_API_KEY || null;
      resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@klaxtrix.site';
      resendFromName = 'Klaxtrix Portal';
    }

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #4f46e5; margin-bottom: 24px;">Account Re-Setup — Klaxtrix Portal</h2>
          <p>Hello <strong>${profile.full_name}</strong>,</p>
          <p>An administrator has reset your teacher account credentials for the school portal.</p>
          <p>Click the button below to securely set up your account and choose a new password:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${setupLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">Set Up My Account</a>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            If the button doesn't work, copy and paste this link into your browser: <br />
            <a href="${setupLink}" target="_blank" rel="noopener noreferrer">${setupLink}</a>
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            This link is one-time use and will expire shortly. Upon setup, you will be prompted to verify your email via OTP and choose your own password.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
      `;

      const { error: sendError } = await resend.emails.send({
        from: `${resendFromName} <${resendFromEmail}>`,
        to: profile.email,
        subject: 'Set Up Your Teacher Account — Klaxtrix Portal',
        html: emailHtml
      });

      if (sendError) {
        throw new Error(sendError.message);
      }
    } else {
      console.log('==================================================');
      console.log('[resendTeacherCredentials] MOCK EMAIL DISPATCH LOG');
      console.log('To:', profile.email);
      console.log('Subject: Set Up Your Teacher Account — Klaxtrix Portal');
      console.log('Setup Link:', setupLink);
      console.log('==================================================');
    }

    return { success: true };
  } catch (err: any) {
    console.error('[resendTeacherCredentials] Error:', err);
    return { error: err.message || 'Failed to resend credentials.' };
  }
}
