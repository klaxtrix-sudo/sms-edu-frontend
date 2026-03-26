'use client';

import React, { useEffect, useState } from 'react';
import { Building2, MapPin, Quote, Smartphone, Globe, Save, Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SchoolLogoUpload } from '@/components/admin/school-logo-upload';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { syncSchoolSettingsToMaster } from '@/app/actions/tenant-sync-actions';
import { useTenant } from '@/components/providers/tenant-provider';
import { getBackendUrl } from '@/lib/utils';

const schoolSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters'),
  motto: z.string().optional(),
  address: z.string().optional(),
  official_phone: z.string().optional(),
  official_website: z.string().optional(),
  logo_url: z.string().optional(),
});
type SchoolFormValues = z.infer<typeof schoolSchema>;

export default function GeneralSettings() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const router = useRouter();
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: '',
      motto: '',
      address: '',
      official_phone: '',
      official_website: '',
      logo_url: '',
    },
  });

  useEffect(() => {
    // Wait for tenant context to be ready
    if (!tenant?.id) return;

    async function loadSchoolData() {
      try {
        // Use the secure backend proxy which uses the service role key to bypass RLS
        const res = await fetch(`${getBackendUrl()}/tenant/school-data?subdomain=${subdomain}`);
        
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(err.message || `Backend error: ${res.status}`);
        }

        const json = await res.json();
        const school = json.data;

        if (school?.id) {
          setSchoolId(school.id);
        } else if (tenant?.id) {
          setSchoolId(tenant.id);
        }

        form.reset({
          name: school?.name || tenant?.name || '',
          motto: school?.motto || '',
          address: school?.address || '',
          official_phone: school?.official_phone || '',
          official_website: school?.official_website || '',
          logo_url: tenant?.logoUrl || school?.logo_url || '',
        });

      } catch (error: any) {
        console.error('[Settings] Data load error:', error.message);
        toast.error('Failed to load school settings');
        // Fallback to tenant context
        form.reset({
          name: tenant?.name || '',
          motto: '',
          address: '',
          official_phone: '',
          official_website: '',
          logo_url: tenant?.logoUrl || '',
        });
        if (tenant?.id) setSchoolId(tenant.id);
      } finally {
        setLoading(false);
      }
    }

    loadSchoolData();
  }, [tenant?.id, subdomain]);

  const onSubmit = async (values: SchoolFormValues) => {
    if (!schoolId) {
      toast.error('School not ready. Please wait and try again.');
      return;
    }
    setSaving(true);
    try {
      // Use the secure backend proxy to save (service role key bypasses RLS)
      const res = await fetch(`${getBackendUrl()}/tenant/school-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          schoolId,
          updates: {
            name: values.name,
            motto: values.motto,
            address: values.address,
            official_phone: values.official_phone,
            official_website: values.official_website,
            logo_url: values.logo_url,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(err.message || 'Failed to update');
      }

      // Sync name and logo to master registry for global header/avatar
      await syncSchoolSettingsToMaster(subdomain, {
        name: values.name,
        logoUrl: values.logo_url,
      });

      toast.success('Institutional identity updated successfully');
      router.refresh();

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update identity');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        <div className="glass-panel p-8 rounded-[2rem] space-y-8 col-span-1 md:col-span-2 relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-2xl">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-slate-900">Institutional Identity</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Manage your school's official brand and contact details.</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Logo Upload */}
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
              <SchoolLogoUpload
                schoolId={schoolId!}
                value={form.watch('logo_url')}
                onChange={(url) => form.setValue('logo_url', url)}
              />
              <div className="flex flex-col text-center md:text-left space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Institutional Mark</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Upload your official school logo. This will be displayed across all student, teacher, and parent portals.
                </p>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="school-name" className="text-xs font-black uppercase tracking-widest text-slate-400">School Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input id="school-name" {...form.register('name')} className="pl-14 h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 font-medium text-slate-800" />
                </div>
                {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="motto" className="text-xs font-black uppercase tracking-widest text-slate-400">Motto / Slogan</Label>
                <div className="relative">
                  <Quote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="motto" {...form.register('motto')} className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 font-medium text-slate-700" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-xs font-black uppercase tracking-widest text-slate-400">Physical / Institutional Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-6 w-4 h-4 text-slate-400" />
                  <Textarea id="address" {...form.register('address')} className="pl-12 pt-4 min-h-[100px] bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 text-slate-700" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400">Official Phone</Label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="phone" {...form.register('official_phone')} className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 font-bold text-slate-700" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-xs font-black uppercase tracking-widest text-slate-400">Official Website</Label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="website" {...form.register('official_website')} className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 text-slate-700 font-medium" />
                </div>
              </div>
            </div>

            <div className="pt-8 flex justify-end">
              <Button type="submit" disabled={saving} className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Synchronizing...' : 'Update Institutional Identity'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
