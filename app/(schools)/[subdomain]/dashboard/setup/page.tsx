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
import { useTenant } from '@/components/providers/tenant-provider';
import { NIGERIA_STATES, STATE_LGA_MAP } from '@/lib/constants/nigeria-locations';
import { useRouter } from 'next/navigation';

const STEPS = [
  { id: 'identity', title: 'Identity', icon: Building2 },
  { id: 'academic', title: 'Academic', icon: BookOpen },
  { id: 'finance',  title: 'Financial', icon: Landmark },
  { id: 'finalize', title: 'Finalize', icon: Zap },
];

export default function SetupWizardPage() {
  const router = useRouter();
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
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size exceeds 2MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const lgas = formData.state ? STATE_LGA_MAP[formData.state] || [] : [];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleCompleteSetup = async () => {
    if (!supabase || !tenant) {
      toast.error('System synchronization error. Please try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading('Synchronizing institutional protocols...', { id: 'setup' });

      // 1. Update the local school record in the school's own DB
      const { error: schoolError } = await supabase
        .from('schools')
        .update({
          motto: formData.motto,
          state: formData.state,
          lga: formData.lga,
          official_phone: formData.officialPhone,
          official_email: formData.officialEmail,
          school_type: formData.schoolType,
          academic_year: formData.academicYear,
          current_term: parseInt(formData.currentTerm),
          bank_name: formData.bankName,
          account_name: formData.accountName,
          account_number: formData.accountNumber,
          is_setup_completed: true,
        })
        .eq('id', tenant.id);

      if (schoolError) throw new Error(`School Update Failed: ${schoolError.message}`);

      // 2. Sync with central DB via backend endpoint
      const response = await fetch('/api/tenant/setup-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schoolId: tenant.id,
          isSetupCompleted: true
        }),
      });

      if (!response.ok) throw new Error('Central database synchronization failed');

      toast.success('Institutional protocols synchronized successfully!', { id: 'setup' });
      
      // Refresh to update tenant state and redirect to dashboard
      router.refresh();
      setTimeout(() => {
        router.push(`/dashboard/admin`);
      }, 1000);

    } catch (error: any) {
      console.error('Setup Finalization Error:', error);
      toast.error(error.message || 'Setup finalization failed', { id: 'setup' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Identity</h2>
              <p className="text-slate-500 font-medium">Define your school's brand and physical presence.</p>
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
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Visual Assets (School Logo)</Label>
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
                       className="h-32 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/50 flex flex-col items-center justify-center gap-2 cursor-pointer group transition-all bg-slate-50/50 overflow-hidden relative"
                     >
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain p-4" />
                        ) : (
                          <>
                            <Camera className="size-6 text-slate-400 group-hover:text-primary transition-colors" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Upload Logo</span>
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
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Academic</h2>
              <p className="text-slate-500 font-medium">Configure your institution's operational scope.</p>
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
                      <SelectItem value="all-in-one">Comprehensive (All-in-one)</SelectItem>
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
                      <SelectItem value="2024/2025">2024/2025</SelectItem>
                      <SelectItem value="2025/2026">2025/2026</SelectItem>
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
                      <SelectItem value="1">First Term (Alpha)</SelectItem>
                      <SelectItem value="2">Second Term (Beta)</SelectItem>
                      <SelectItem value="3">Third Term (Gamma)</SelectItem>
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
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Financial</h2>
              <p className="text-slate-500 font-medium">Standardize your institutional billing protocols.</p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Official Bank Name</Label>
                  <Input 
                    placeholder="e.g. Zenith Bank" 
                    value={formData.bankName}
                    onChange={e => update('bankName', e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Account Name</Label>
                  <Input 
                    placeholder="Institutional Account Title" 
                    value={formData.accountName}
                    onChange={e => update('accountName', e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-950">Account Number</Label>
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
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Institutional Sync Ready</h2>
              <p className="text-slate-500 font-medium max-w-md mx-auto">
                Your school's protocols have been mapped. Finalize the synchronization to activate your executive command center.
              </p>
            </div>
            
            <Badge variant="outline" className="py-2 px-6 border-slate-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-600 gap-2">
              <Sparkles className="size-3 text-amber-500" /> All protocols verified
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
                         <>Synchronize & Launch <Save className="size-4 group-hover:translate-x-1 transition-transform" /></>
                       )}
                     </Button>
                   ) : (
                     <Button 
                       onClick={handleNext}
                       className="px-10 h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg gap-3 active:scale-95 group"
                     >
                       Proceed to {STEPS[currentStep + 1].title} <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                     </Button>
                   )}
                </div>
             </motion.div>
           </AnimatePresence>
        </Card>

        {/* Support Section */}
        <p className="text-center mt-10 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60">
           Need assistance? Contact Klaxtrix Protocol Support • protocol@klaxtrix.com
        </p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
