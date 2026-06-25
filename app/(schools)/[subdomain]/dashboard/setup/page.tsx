'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Zap, Globe, Server, CheckCircle2, 
  ArrowRight, ArrowLeft, Loader2, Camera, Building2, 
  BookOpen, Landmark, Save, AlertCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { completeSchoolSetup } from "@/app/actions/tenant-actions";
import { uploadSchoolLogo } from "@/app/actions/tenant-sync-actions";
import { useTenant } from '@/components/providers/tenant-provider';
import { NIGERIA_STATES, STATE_LGA_MAP } from '@/lib/constants/nigeria-locations';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'identity', title: 'Identity', icon: Building2 },
  { id: 'academic', title: 'Academic', icon: BookOpen },
  { id: 'finance',  title: 'Financial', icon: Landmark },
  { id: 'finalize', title: 'Finalize', icon: Zap },
];

export default function SetupWizardPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = params?.subdomain as string;
  const { tenant, supabase } = useTenant();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    motto: '',
    state: '',
    lga: '',
    officialPhone: '',
    officialEmail: '',
    schoolType: 'all-in-one',
    academicYear: '2025/2026',
    currentTerm: '1',
    bankName: '',
    accountName: '',
    accountNumber: '',
  });

  const update = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Check File Size (Hard limit 500KB)
      if (file.size > 500 * 1024) {
        toast.error("Logo file too large. Max allowed: 500 KB.");
        return;
      }

      // 2. Check Dimensions
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        if (width < 200 || height < 200) {
          toast.error(`Resolution too low (${width}x${height}px). Minimum 200x200px required.`);
          return;
        }
        if (width > 1200 || height > 1200) {
          toast.error(`Resolution too high (${width}x${height}px). Maximum 1200x1200px allowed.`);
          return;
        }

        // Accept the file
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
      };
      
      img.onerror = () => {
        toast.error("Invalid image file. Please upload a PNG, SVG, or WebP.");
      };

      img.src = URL.createObjectURL(file);
    }
  };

  const lgas = formData.state ? STATE_LGA_MAP[formData.state] || [] : [];

  const handleNext = () => {
    // Phase-based validation
    if (currentStep === 0) {
      if (!formData.state || !formData.lga || !formData.officialEmail) {
        toast.error("Please fill in State, LGA, and Email.");
        return;
      }
    }
    
    if (currentStep === 1) {
      if (!formData.schoolType || !formData.academicYear || !formData.currentTerm) {
        toast.error("Please pick a school type, year, and term.");
        return;
      }
    }

    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleCompleteSetup = async () => {
    if (!supabase || !tenant) {
      toast.error('Something went wrong. Please try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      // 1. If logo was selected, upload it to Storage first to get a public URL
      let logoUrl = logoPreview;
      if (logoPreview && logoPreview.startsWith('data:image/')) {
        toast.loading('Uploading logo...', { id: 'setup' });
        const uploadResult = await uploadSchoolLogo(tenant.id, logoPreview);
        if (uploadResult.success && uploadResult.publicUrl) {
          logoUrl = uploadResult.publicUrl;
        } else {
          console.error('[Setup] Logo upload failed, proceeding without logo:', uploadResult.error);
          logoUrl = null;
        }
      }

      // 2. Perform a secure synchronized setup via the backend server action
      // This bypasses RLS recursion issues by using Service Role Keys server-side.
      toast.loading('Saving your school details...', { id: 'setup' });
      const result = await completeSchoolSetup(subdomain, tenant.id, {
        ...formData,
        logoUrl
      });

      if (!result.success) {
        throw new Error(result.error || 'We couldn\'t finish setup. Please try again.');
      }

      toast.success('Setup complete! Your school is ready.', { id: 'setup' });
      
      // Use a hard navigation so the middleware re-fetches is_setup_completed: true
      // from the backend cleanly, rather than re-running against a stale client-side cache.
      setTimeout(() => {
        window.location.href = '/dashboard/admin';
      }, 1000);

    } catch (error: any) {
      console.error('Setup Finalization Error:', error);
      toast.error(error.message || 'Setup finalization failed', { id: 'setup' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYearValue = new Date().getFullYear();
  const DYNAMIC_ACADEMIC_YEARS = Array.from({ length: 6 }, (_, i) => {
    const start = currentYearValue - 1 + i;
    return `${start}/${start + 1}`;
  });

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Identity</h2>
              <p className="text-slate-500 font-medium">Add your school's logo and contact details.</p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">School Motto</Label>
                  <Input 
                    placeholder="e.g. Knowledge is Power" 
                    value={formData.motto}
                    onChange={e => update('motto', e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">State</Label>
                    <Select value={formData.state} onValueChange={v => { update('state', v); update('lga', ''); }}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-700">
                        {NIGERIA_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">LGA</Label>
                    <Select value={formData.lga} onValueChange={v => update('lga', v)} disabled={!formData.state}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900">
                        <SelectValue placeholder="Select LGA" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-700">
                        {lgas.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Official Email</Label>
                  <Input 
                    type="email"
                    placeholder="info@school.com" 
                    value={formData.officialEmail}
                    onChange={e => update('officialEmail', e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">School Logo</Label>
                  <input 
                    type="file" 
                    ref={logoInputRef}
                    onChange={handleLogoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="grid grid-cols-1">
                     <div 
                       onClick={() => logoInputRef.current?.click()}
                       className="h-36 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/50 flex flex-col items-center justify-center gap-2 cursor-pointer group transition-all bg-slate-50/50 overflow-hidden relative"
                     >
                        {logoPreview ? (
                          <div className="relative h-full w-full">
                            <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain p-4" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <p className="text-white text-[10px] font-black uppercase">Click to Replace</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Camera className="size-6 text-slate-400 group-hover:text-primary transition-colors mb-1" />
                            <div className="text-center space-y-1">
                              <span className="text-[10px] font-black uppercase text-slate-900 block">Upload School Logo</span>
                              <div className="flex flex-col gap-0.5 opacity-60">
                                <p className="text-[8px] font-bold uppercase text-slate-500">• Max 500 KB • Min 200px</p>
                                <p className="text-[8px] font-bold uppercase text-slate-500">• PNG, SVG or WebP</p>
                              </div>
                            </div>
                          </>
                        )}
                     </div>
                  </div>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest text-center mt-2">Recommended: PNG w/ transparency</p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Academic</h2>
              <p className="text-slate-500 font-medium">Tell us about your school's academic year.</p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                 <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">School Type</Label>
                  <Select value={formData.schoolType} onValueChange={v => update('schoolType', v)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-700">
                      <SelectItem value="nursery">Early Childhood (Nursery/Pre-school)</SelectItem>
                      <SelectItem value="primary">Lower Basic (Primary)</SelectItem>
                      <SelectItem value="secondary">Middle/Upper Basic (Secondary)</SelectItem>
                      <SelectItem value="all-in-one">All-in-one</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Academic Year</Label>
                  <Select value={formData.academicYear} onValueChange={v => update('academicYear', v)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-700">
                      {DYNAMIC_ACADEMIC_YEARS.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Active Term</Label>
                  <Select value={formData.currentTerm} onValueChange={v => update('currentTerm', v)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-700">
                      <SelectItem value="1">First Term</SelectItem>
                      <SelectItem value="2">Second Term</SelectItem>
                      <SelectItem value="3">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Financial</h2>
              <p className="text-slate-500 font-medium">Add your school's bank details (optional).</p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Official Bank Name (Optional)</Label>
                  <Input 
                    placeholder="e.g. Zenith Bank" 
                    value={formData.bankName}
                    onChange={e => update('bankName', e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Account Name (Optional)</Label>
                  <Input 
                    placeholder="e.g. Klaxtrix Academy" 
                    value={formData.accountName}
                    onChange={e => update('accountName', e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Account Number (Optional)</Label>
                  <Input 
                    placeholder="10 Digits" 
                    maxLength={10}
                    value={formData.accountNumber}
                    onChange={e => update('accountNumber', e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 space-y-8 text-center"
          >
            <div className="size-24 rounded-full bg-emerald-50 flex items-center justify-center relative">
              <CheckCircle2 className="size-12 text-emerald-500" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full border-4 border-emerald-500/20"
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Ready to Finish</h2>
              <p className="text-slate-500 font-medium max-w-md mx-auto">
                Everything looks good. Click below to finish and open your dashboard.
              </p>
            </div>
            
            <Badge variant="outline" className="py-2 px-6 border-slate-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-600 gap-2">
              <Sparkles className="size-3 text-amber-500" /> All set
            </Badge>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col p-8 pt-20">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Modern Stepper */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {STEPS.map((step, idx) => {
             const Icon = step.icon;
             const active = currentStep === idx;
             const completed = currentStep > idx;
             return (
               <div key={step.id} className="relative">
                 <div className={cn(
                   "h-1 transition-all duration-500 rounded-full",
                   active ? "bg-primary w-full" : completed ? "bg-primary/40 w-full" : "bg-slate-200 w-full"
                 )} />
                 <div className="mt-4 flex items-center gap-3">
                    <div className={cn(
                      "size-8 rounded-lg flex items-center justify-center transition-all",
                      active ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : completed ? "bg-primary/10 text-primary" : "bg-white text-slate-400 border border-slate-100"
                    )}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", active ? "text-primary" : "text-slate-400")}>Step 0{idx + 1}</p>
                      <p className={cn("text-[11px] font-bold uppercase", active ? "text-slate-950" : "text-slate-400")}>{step.title}</p>
                    </div>
                 </div>
               </div>
             );
          })}
        </div>

        {/* Main Content Card */}
        <Card className="p-10 border-0 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] relative overflow-hidden flex flex-col min-h-[500px]">
           <AnimatePresence mode="wait">
             <motion.div key={currentStep}>
                {renderStep()}

                {/* Footer Navigation */}
                <div className="mt-auto pt-10 flex items-center justify-between border-t border-slate-100">
                   {currentStep > 0 ? (
                     <Button 
                       onClick={handlePrev} 
                       disabled={isSubmitting}
                       className="px-10 h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg gap-3 active:scale-95 group"
                     >
                       <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Back
                     </Button>
                   ) : (
                     <div /> // Spacer for layout consistency
                   )}

                   {currentStep === STEPS.length - 1 ? (
                     <Button 
                       onClick={handleCompleteSetup}
                       disabled={isSubmitting}
                       className="px-10 h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/20 gap-3 active:scale-95 group"
                     >
                       {isSubmitting ? (
                         <Loader2 className="size-4 animate-spin" />
                       ) : (
                         <>Finish Setup <Save className="size-4 group-hover:translate-x-1 transition-transform" /></>
                       )}
                     </Button>
                   ) : (
                     <Button 
                       onClick={handleNext}
                       className="px-10 h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg gap-3 active:scale-95 group"
                     >
                       Continue to {STEPS[currentStep + 1].title} <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                     </Button>
                   )}
                </div>
             </motion.div>
           </AnimatePresence>
        </Card>

        {/* Support Section */}
        <p className="text-center mt-10 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60">
           Need help? Contact support@klaxtrix.com
        </p>
      </div>
    </div>
  );
}
