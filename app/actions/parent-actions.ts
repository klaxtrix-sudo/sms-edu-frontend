"use server";

import { createTenantAdminClient } from "@/lib/supabase/tenant-admin";
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

export async function toggleParentStatus(userId: string, isActive: boolean, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required to update parent status.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
    
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
    
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
    
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
    const tenantSupabase = await createTenantAdminClient(subdomain);

    const { data: { user }, error: authError } = await tenantSupabase.auth.admin.createUser({
      email,
      password,
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
        });

      if (tenantProfileError) {
        console.error('[Parent Actions] Tenant Profile Error:', tenantProfileError.message);
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

      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
      const loginUrl = process.env.NODE_ENV === 'production'
        ? `https://${subdomain}.${rootDomain}/login`
        : `http://${subdomain}.${rootDomain}/login`;

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
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            ${logoImgHtml}
            <h2 style="color: #4f46e5; margin-bottom: 24px; text-align: center;">Welcome to Klaxtrix!</h2>
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>An administrator has registered your parent account at ${schoolName} portal.</p>
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
          await resend.emails.send({
            from: `${resendFromName} <${resendFromEmail}>`,
            to: email,
            subject: 'Set Up Your Parent Account \u2014 Klaxtrix Portal',
            html: emailHtml
          });
        } catch (err: any) {
          console.error('[createParent] Failed to dispatch welcome email:', err.message);
        }
      }
    }

    revalidatePath("/dashboard/admin/users/parents");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred during parent provisioning" };
  }
}

export async function resendParentCredentials(userId: string, schoolId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
    
    // 1. Get current profile to find email & name
    const { data: profile, error: profileError } = await (tenantSupabase as any)
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();
      
    if (profileError || !profile) {
      return { error: 'Parent profile not found.' };
    }

    // 2. Reset onboarding flags so they are forced through the gate again
    const { error: updateError } = await tenantSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        must_change_password: true,
        email_onboarding_verified: false,
      }
    });

    if (updateError) {
      return { error: `Failed to reset parent status: ${updateError.message}` };
    }

    // 3. Generate a magic link which logs them in and lets them hit the gate
    const { data: linkData, error: linkError } = await tenantSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    });

    if (linkError) {
      return { error: `Failed to generate setup link: ${linkError.message}` };
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
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          ${logoImgHtml}
          <h2 style="color: #4f46e5; margin-bottom: 24px; text-align: center;">Finish Setting Up Your Parent Account</h2>
          <p>Hello <strong>${profile.full_name}</strong>,</p>
          <p>An administrator at ${schoolName} has requested we resend your setup link.</p>
          <p>Please click the button below to log in securely and finish setting your password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${linkData.properties.action_link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">Secure Login & Setup</a>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            If the button doesn't work, copy and paste this link into your browser: <br />
            <a href="${linkData.properties.action_link}" target="_blank" rel="noopener noreferrer" style="word-break: break-all;">${linkData.properties.action_link}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">This link will expire soon for your security. Please do not reply directly to this email.</p>
        </div>
      `;

      const { error: sendError } = await resend.emails.send({
        from: `${resendFromName} <${resendFromEmail}>`,
        to: profile.email,
        subject: 'Action Required: Parent Account Setup \u2014 Klaxtrix Portal',
        html: emailHtml
      });

      if (sendError) {
        return { error: `Failed to send email via Resend: ${sendError.message}` };
      }
    } else {
      console.log('[resendParentCredentials] MOCK EMAIL DISPATCH LOG (No Resend Key Found)');
      console.log('Action Link:', linkData.properties.action_link);
    }

    revalidatePath('/dashboard/admin/users/parents');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred while resending credentials.' };
  }
}

export async function linkStudentToParent(parentUserId: string, studentId: string, subdomain: string) {
  if (!subdomain) return { error: 'Subdomain is required.' };
  try {
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
    const tenantSupabase = await createTenantAdminClient(subdomain);
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
