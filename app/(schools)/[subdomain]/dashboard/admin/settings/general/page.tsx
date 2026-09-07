'use client';

import React, { useEffect, useState } from 'react';
import { Building2, MapPin, Quote, Smartphone, Globe, Save, Fingerprint, Loader2, Landmark, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SchoolLogoUpload } from '@/components/admin/school-logo-upload';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { syncSchoolSettingsToMaster, uploadSchoolLogo } from '@/app/actions/tenant-sync-actions';
import { getSchoolData, updateSchoolData } from '@/app/actions/tenant-actions';
import { useTenant } from '@/components/providers/tenant-provider';

const NIGERIAN_BANKS = [
  'Access Bank',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Jaiz Bank',
  'Keystone Bank',
  'Kuda Bank',
  'Moniepoint MFB',
  'OPay',
  'PalmPay',
  'Polaris Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'Titan Trust Bank',
  'Union Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
  'Other Bank',
];

const schoolSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters'),
  motto: z.string().optional(),
  address: z.string().optional(),
  official_phone: z.string().optional(),
  official_website: z.string().optional(),
  logo_url: z.string().optional(),
  bank_name: z.string().optional(),
  account_name: z.string().optional(),
  account_number: z.string().max(10, 'Account number cannot exceed 10 digits').optional(),
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
  const [isCustomBank, setIsCustomBank] = useState(false);

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: '',
      motto: '',
      address: '',
      official_phone: '',
      official_website: '',
      logo_url: '',
      bank_name: '',
      account_name: '',
      account_number: '',
    },
  });

  useEffect(() => {
    // Wait for tenant context to be ready
    if (!tenant?.id) return;

    async function loadSchoolData() {
      try {
        // Use the secure server action which adds the internal secret header server-side
        const school = await getSchoolData(subdomain);

        if (school?.id) {
          setSchoolId(school.id);
        } else if (tenant?.id) {
          setSchoolId(tenant.id);
        }

        const savedBank = school?.bank_name || '';
        const isStandard = NIGERIAN_BANKS.slice(0, -1).includes(savedBank);
        if (savedBank && !isStandard) {
          setIsCustomBank(true);
        }

        form.reset({
          name: school?.name || tenant?.name || '',
          motto: school?.motto || '',
          address: school?.address || '',
          official_phone: school?.official_phone || '',
          official_website: school?.official_website || '',
          logo_url: tenant?.logoUrl || school?.logo_url || '',
          bank_name: savedBank,
          account_name: school?.account_name || '',
          account_number: school?.account_number || '',
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
          bank_name: '',
          account_name: '',
          account_number: '',
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
      // If the logo is still a base64 data URI, upload it to storage first
      let finalLogoUrl = values.logo_url;
      if (finalLogoUrl && finalLogoUrl.startsWith('data:image/') && schoolId) {
        const uploadResult = await uploadSchoolLogo(schoolId, finalLogoUrl);
        if (uploadResult.success && uploadResult.publicUrl) {
          finalLogoUrl = uploadResult.publicUrl;
          form.setValue('logo_url', finalLogoUrl);
        }
      }

      // Use the secure server action to save (internal secret added server-side)
      const result = await updateSchoolData(subdomain, schoolId, {
        name: values.name,
        motto: values.motto,
        address: values.address,
        official_phone: values.official_phone,
        official_website: values.official_website,
        logo_url: finalLogoUrl,
        bank_name: values.bank_name || null,
        account_name: values.account_name || null,
        account_number: values.account_number || null,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update settings');
      }

      // Sync name and logo to master registry for global header/avatar
      await syncSchoolSettingsToMaster(subdomain, {
        name: values.name,
        logoUrl: finalLogoUrl,
      });

      toast.success('School profile and bank settings saved.');
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
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-foreground">School Profile</h2>
              <p className="text-sm text-muted-foreground font-medium tracking-tight">Manage your school's official brand and contact details.</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Logo Upload */}
            <div className="bg-card p-6 rounded-3xl border border-border flex flex-col md:flex-row items-center gap-8 shadow-sm">
              <SchoolLogoUpload
                schoolId={schoolId!}
                value={form.watch('logo_url')}
                onChange={(url) => form.setValue('logo_url', url)}
              />
              <div className="flex flex-col text-center md:text-left space-y-2">
                <h3 className="text-lg font-bold text-foreground">School Logo</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Upload your official school logo. This will be displayed across all student, teacher, and parent portals.
                </p>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="school-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">School Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="school-name" {...form.register('name')} className="pl-14 h-14 bg-background border-border rounded-2xl focus:ring-primary font-medium text-foreground" />
                </div>
                {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="motto" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Motto / Slogan</Label>
                <div className="relative">
                  <Quote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="motto" {...form.register('motto')} className="pl-12 h-14 bg-background border-border rounded-2xl focus:ring-primary font-medium text-foreground" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-6 w-4 h-4 text-muted-foreground" />
                  <Textarea id="address" {...form.register('address')} className="pl-12 pt-4 min-h-[100px] bg-background border-border rounded-2xl focus:ring-primary text-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Official Phone</Label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" {...form.register('official_phone')} className="pl-12 h-14 bg-background border-border rounded-2xl focus:ring-primary font-bold text-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Official Website</Label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="website" {...form.register('official_website')} className="pl-12 h-14 bg-background border-border rounded-2xl focus:ring-primary text-foreground font-medium" />
                </div>
              </div>
            </div>

            {/* Official Bank & Settlement Account Section */}
            <div className="pt-10 border-t border-border space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-extrabold text-foreground">Official Bank & Settlement Account</h3>
                  <p className="text-xs text-muted-foreground font-medium">Bank details presented to parents for direct tuition deposits and fee settlement.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-card/50 p-6 rounded-3xl border border-border">
                {/* Bank Name Selector */}
                <div className="space-y-2">
                  <Label htmlFor="bank-select" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Official Bank</Label>
                  <Select
                    value={
                      isCustomBank
                        ? 'Other Bank'
                        : form.watch('bank_name') && NIGERIAN_BANKS.includes(form.watch('bank_name') || '')
                        ? form.watch('bank_name')
                        : form.watch('bank_name')
                        ? 'Other Bank'
                        : ''
                    }
                    onValueChange={(val) => {
                      if (val === 'Other Bank') {
                        setIsCustomBank(true);
                      } else {
                        setIsCustomBank(false);
                        form.setValue('bank_name', val);
                      }
                    }}
                  >
                    <SelectTrigger id="bank-select" className="h-14 bg-background border-border rounded-2xl font-medium text-foreground">
                      <SelectValue placeholder="Select official bank" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-60 bg-popover border-border text-popover-foreground">
                      {NIGERIAN_BANKS.map((b) => (
                        <SelectItem key={b} value={b} className="font-medium">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Bank Name Input (if Other chosen) */}
                {isCustomBank && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-bank-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Specify Bank Name</Label>
                    <Input
                      id="custom-bank-name"
                      placeholder="e.g. Standard Chartered Bank"
                      value={form.watch('bank_name') || ''}
                      onChange={(e) => form.setValue('bank_name', e.target.value)}
                      className="h-14 bg-background border-border rounded-2xl font-medium text-foreground"
                    />
                  </div>
                )}

                {/* Account Number */}
                <div className="space-y-2">
                  <Label htmlFor="account-number" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Account Number (10 Digits NUBAN)</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="account-number"
                      maxLength={10}
                      placeholder="0123456789"
                      {...form.register('account_number')}
                      className="pl-12 h-14 bg-background border-border rounded-2xl font-mono text-base tracking-wider font-bold text-foreground"
                    />
                  </div>
                  {form.formState.errors.account_number && (
                    <p className="text-xs text-red-500">{form.formState.errors.account_number.message}</p>
                  )}
                </div>

                {/* Account Name */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="account-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Account Beneficiary Name</Label>
                  <Input
                    id="account-name"
                    placeholder="e.g. Glorydays Academy Operations"
                    {...form.register('account_name')}
                    className="h-14 bg-background border-border rounded-2xl font-bold text-foreground"
                  />
                </div>

                {/* Verification callout */}
                <div className="md:col-span-2 flex items-start gap-3 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
                    This account is verified and displayed to parents in their portal for direct tuition transfers, bank app transfers, and over-the-counter teller deposits.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8 flex justify-end">
              <Button type="submit" disabled={saving} className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
