"use server";

import { requireActionAuth } from "@/lib/supabase/action-auth";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import crypto from "crypto";

interface CreateUserData {
  email: string;
  password?: string;
  fullName: string;
  phone: string;
  schoolId: string;
  subdomain: string;
}

export async function toggleParentStatus(userId: string, isActive: boolean, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to update parent status.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await (tenantSupabase as any)
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/admin/users/parents');
    return { success: true };
  } catch (e: any) {
    return { error: e.message || 'Failed to update parent status.' };
  }
}

export async function archiveParent(userId: string, subdomain: string) {
  console.log(`[Parent Actions] Archiving parent ${userId} in subdomain ${subdomain}`);
  if (!subdomain) return { error: 'Subdomain is required to archive parent.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    
    // 1. Update Profile Status
    const { error: profileError } = await (tenantSupabase as any)
      .from('profiles')
      .update({ 
        is_archived: true,
        is_active: false 
      })
      .eq('id', userId);

    if (profileError) {
      console.error(`[Parent Actions] Profile update error:`, profileError);
      return { error: `Profile update failed: ${profileError.message}` };
    }

    // 2. Disconnect from Children (null out students.parent_id)
    const { error: studentError } = await (tenantSupabase as any)
      .from('students')
      .update({ parent_id: null })
      .eq('parent_id', userId);

    if (studentError) {
      console.error(`[Parent Actions] Student disconnection error:`, studentError);
    }

    console.log(`[Parent Actions] Successfully archived parent ${userId}`);
    revalidatePath('/dashboard/admin/users/parents');
    revalidatePath('/dashboard/admin/users/students');
    
    return { success: true };
  } catch (e: any) {
    console.error(`[Parent Actions] Catch error archiving parent:`, e);
    return { error: e.message || 'Failed to archive parent.' };
  }
}

export async function unarchiveParent(userId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to unarchive parent.' };
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

    revalidatePath('/dashboard/admin/users/parents');
    return { success: true };
  } catch (e: any) {
    return { error: e.message || 'Failed to unarchive parent.' };
  }
}

export async function deletePendingParent(userId: string, subdomain: string) {
  console.log(`[Parent Actions] Deleting pending parent ${userId} in subdomain ${subdomain}`);
  if (!subdomain) return { error: 'Subdomain is required to delete parent.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    
    // 1. Delete the profile explicitly to clear application data
    const { error: profileError } = await (tenantSupabase as any)
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error(`[Parent Actions] Profile deletion error:`, profileError);
      return { error: `Profile deletion failed: ${profileError.message}` };
    }

    // 2. Delete the auth identity completely
    const { error: authError } = await tenantSupabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error(`[Parent Actions] Auth deletion error:`, authError);
      return { error: `Auth deletion failed: ${authError.message}` };
    }

    console.log(`[Parent Actions] Successfully completely deleted pending parent ${userId}`);
    revalidatePath('/dashboard/admin/users/parents');
    
    return { success: true };
  } catch (e: any) {
    console.error(`[Parent Actions] Catch error deleting parent:`, e);
    return { error: e.message || 'Failed to delete pending parent.' };
  }
}

export async function getParents(schoolId: string, subdomain: string, includeArchived: boolean = false) {
  if (!subdomain) return { error: 'Subdomain is required to fetch parents.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin', 'teacher']);
    let query = (tenantSupabase as any)
      .from('profiles')
      .select(`
        *,
        students!students_parent_id_fkey (
          id,
          admission_no,
          user_id,
          profiles!students_user_id_fkey (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('role', 'parent')
      .eq('school_id', schoolId);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query.order('full_name');

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('[Parent Actions] getParents Error:', error.message);
    return { error: error.message || 'Failed to fetch parents.' };
  }
}

export async function createParent(data: CreateUserData) {
  const { 
    email, 
    password, 
    fullName, 
    phone,
    schoolId,
    subdomain
  } = data;

  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const activateUrl = process.env.NODE_ENV === 'production'
      ? `https://${subdomain}.${rootDomain}/activate`
      : `http://${subdomain}.${rootDomain}/activate`;
    const loginUrl = process.env.NODE_ENV === 'production'
      ? `https://${subdomain}.${rootDomain}/login`
      : `http://${subdomain}.${rootDomain}/login`;

    const initialSecret = password || crypto.randomBytes(24).toString('hex');
    const { data: { user }, error: authError } = await tenantSupabase.auth.admin.createUser({
      email,
      password: initialSecret,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'parent',
        school_id: schoolId,
        must_change_password: true,
        email_onboarding_verified: false,
      }
    });

    if (authError) return { error: `Tenant Auth Error: ${authError.message}` };

    let activationLink = activateUrl;

    if (user) {
      const { error: tenantProfileError } = await (tenantSupabase as any)
        .from('profiles')
        .upsert({
          id: user.id,
          school_id: schoolId,
          full_name: fullName,
          email,
          phone,
          role: 'parent',
          is_active: true,
          invited_at: new Date().toISOString(),
        });

      if (tenantProfileError) {
        console.error('[Parent Actions] Tenant Profile Error:', tenantProfileError.message);
      }

      // Generate a single-use cryptographically signed activation link
      try {
        const { data: linkData, error: linkError } = await tenantSupabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: activateUrl },
        });
        if (!linkError && linkData?.properties?.action_link) {
          activationLink = linkData.properties.action_link;
        }
      } catch (linkErr) {
        console.warn('[createParent] generateLink warning:', linkErr);
      }

      // Fetch Resend config
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
          console.error('[createParent] Failed to parse resend_settings JSON:', e);
        }
      }

      if (!resendApiKey) {
        resendApiKey = process.env.RESEND_API_KEY || null;
        resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@klaxtrix.site';
        resendFromName = 'Klaxtrix Portal';
      }

      let schoolLogoUrl = '';
      let schoolName = 'the school';
      try {
        const { data: schoolData } = await tenantSupabase
          .from('schools')
          .select('logo_url, name')
          .eq('id', schoolId)
          .maybeSingle();
        if (schoolData?.logo_url) schoolLogoUrl = schoolData.logo_url;
        if (schoolData?.name) schoolName = schoolData.name;
      } catch (err) {}

      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const logoImgHtml = schoolLogoUrl && !schoolLogoUrl.startsWith('data:') ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${schoolLogoUrl}" alt="${schoolName} Logo" style="max-height: 80px; max-width: 200px;" /></div>` : '';
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            ${logoImgHtml}
            <h2 style="color: #4f46e5; margin-bottom: 16px; text-align: center; font-weight: 800;">Welcome to ${schoolName}</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${fullName}</strong>,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">An administrator has registered your parent portal account for <strong>${schoolName}</strong> on Klaxtrix.</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">To get started, click the button below to securely activate your account and choose your personal password:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${activationLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Activate Parent Account</a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser: <br />
              <a href="${activationLink}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; word-break: break-all;">${activationLink}</a>
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated institutional invitation. Please do not reply directly to this email.</p>
          </div>
        `;

        try {
          await resend.emails.send({
            from: `${resendFromName} <${resendFromEmail}>`,
            to: email,
            subject: `Activate Your Parent Account — ${schoolName}`,
            html: emailHtml
          });
        } catch (err: any) {
          console.error('[createParent] Failed to dispatch welcome email:', err.message);
        }
      } else {
        console.log('==================================================');
        console.log('[createParent] MOCK INVITATION DISPATCH LOG');
        console.log('To:', email);
        console.log('Subject: Activate Your Parent Account —', schoolName);
        console.log('Activation Link:', activationLink);
        console.log('==================================================');
      }
    }

    revalidatePath("/dashboard/admin/users/parents");
    return { success: true, activationLink };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred during parent provisioning" };
  }
}

export async function resendParentCredentials(userId: string, schoolId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    
    // 1. Get current profile to find email & name
    const { data: profile, error: profileError } = await (tenantSupabase as any)
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();
      
    if (profileError || !profile) {
      return { error: 'Parent profile not found.' };
    }

    // 2. Compute activation URL
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const activateUrl = process.env.NODE_ENV === 'production'
      ? `https://${subdomain}.${rootDomain}/activate`
      : `http://${subdomain}.${rootDomain}/activate`;

    // 3. Reset onboarding flags so they are forced through the gate again
    const { error: updateError } = await tenantSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        must_change_password: true,
        email_onboarding_verified: false,
      }
    });

    if (updateError) {
      return { error: `Failed to reset parent status: ${updateError.message}` };
    }

    // 4. Generate a magic link which logs them in and directs to activate
    const { data: linkData, error: linkError } = await tenantSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: { redirectTo: activateUrl },
    });

    if (linkError) {
      return { error: `Failed to generate setup link: ${linkError.message}` };
    }

    const setupLink = linkData?.properties?.action_link || activateUrl;

    // 5. Look up active Resend config from tenant DB
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
      } catch (e) {}
    }

    if (!resendApiKey) {
      resendApiKey = process.env.RESEND_API_KEY || null;
      resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@klaxtrix.site';
      resendFromName = 'Klaxtrix Portal';
    }

    let schoolLogoUrl = '';
    let schoolName = 'the school';
    try {
      const { data: schoolData } = await tenantSupabase
        .from('schools')
        .select('logo_url, name')
        .eq('id', schoolId)
        .maybeSingle();
      if (schoolData?.logo_url) schoolLogoUrl = schoolData.logo_url;
      if (schoolData?.name) schoolName = schoolData.name;
    } catch (err) {}

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const logoImgHtml = schoolLogoUrl && !schoolLogoUrl.startsWith('data:') ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${schoolLogoUrl}" alt="${schoolName} Logo" style="max-height: 80px; max-width: 200px;" /></div>` : '';
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          ${logoImgHtml}
          <h2 style="color: #4f46e5; margin-bottom: 16px; text-align: center; font-weight: 800;">Finish Setting Up Your Parent Account</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${profile.full_name}</strong>,</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">An administrator at <strong>${schoolName}</strong> has requested we resend your account setup link.</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Please click the button below to log in securely and finish setting your password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${setupLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Secure Login & Setup</a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser: <br />
            <a href="${setupLink}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; word-break: break-all;">${setupLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">This link will expire soon for your security. Please do not reply directly to this email.</p>
        </div>
      `;

      const { error: sendError } = await resend.emails.send({
        from: `${resendFromName} <${resendFromEmail}>`,
        to: profile.email,
        subject: `Action Required: Parent Account Setup — ${schoolName}`,
        html: emailHtml
      });

      if (sendError) {
        return { error: `Failed to send email via Resend: ${sendError.message}` };
      }
    } else {
      console.log('==================================================');
      console.log('[resendParentCredentials] MOCK EMAIL DISPATCH LOG');
      console.log('To:', profile.email);
      console.log('Setup Link:', setupLink);
      console.log('==================================================');
    }

    revalidatePath('/dashboard/admin/users/parents');
    return { success: true, activationLink: setupLink };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred while resending credentials.' };
  }
}

export async function linkStudentToParent(parentUserId: string, studentId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await (tenantSupabase as any)
      .from('students')
      .update({ parent_id: parentUserId })
      .eq('id', studentId);

    if (error) throw error;
    revalidatePath('/dashboard/admin/users/parents');
    revalidatePath('/dashboard/admin/users/students');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to link student to parent.' };
  }
}

export async function unlinkStudent(studentId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  try {
    const { tenantSupabase } = await requireActionAuth(subdomain, ['admin']);
    const { error } = await (tenantSupabase as any)
      .from('students')
      .update({ parent_id: null })
      .eq('id', studentId);

    if (error) throw error;
    revalidatePath('/dashboard/admin/users/parents');
    revalidatePath('/dashboard/admin/users/students');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to unlink student.' };
  }
}
