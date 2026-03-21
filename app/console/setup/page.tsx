'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Zap, Globe, Server, CheckCircle2, 
  ArrowRight, ArrowLeft, Loader2, Camera, Building2, 
  BookOpen, Landmark, Save, AlertCircle
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

      // 2. Notify the central Klaxtrix registry via backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';
      const res = await fetch(`${backendUrl}/tenant/setup-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: tenant.subdomain }),
      });

      if (!res.ok) throw new Error('Central registry synchronization failed.');

      toast.success('Onboarding Successful!', { 
        id: 'setup', 
        description: 'Institutional protocols have been verified. Launching dashboard.' 
      });

      // 3. Force reload or navigate
      setTimeout(() => {
        window.location.href = '/console';
      }, 1500);

    } catch (err: any) {
      console.error(err);
      toast.error('Setup Failed', { id: 'setup', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 flex flex-col p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/[0.03] blur-[150px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/[0.03] blur-[120px] -z-10 rounded-full" />

      {/* Header */}
      <div className="max-w-4xl mx-auto w-full mb-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
             <Shield className="size-6 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Institutional Setup</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Zap className="size-3 text-amber-500 fill-amber-500" /> Executive Provisioning Phase 2
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-cyan-500/20 text-cyan-500 font-bold px-4 py-1.5 rounded-full bg-cyan-500/5">
          Step {currentStep + 1} of {STEPS.length}
        </Badge>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1">
        {/* Progress Tracker */}
        <div className="grid grid-cols-4 gap-4 mb-8">
           {STEPS.map((step, i) => (
             <div key={step.id} className="relative group">
                <div className={`h-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-cyan-500' : 'bg-slate-800'}`} />
                <div className={`mt-3 flex items-center gap-2 ${i <= currentStep ? 'text-white' : 'text-slate-600'}`}>
                   <step.icon className={`size-3 ${i <= currentStep ? 'text-cyan-500' : 'text-slate-600'}`} />
                   <span className="text-[10px] font-black uppercase tracking-widest">{step.title}</span>
                </div>
             </div>
           ))}
        </div>

        {/* Wizard Card */}
        <Card className="glass-card border-slate-800/50 p-10 relative overflow-hidden">
           <AnimatePresence mode="wait">
             <motion.div
               key={currentStep}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.3 }}
               className="min-h-[400px] flex flex-col"
             >
                {/* Step Content */}
                {currentStep === 0 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Institutional Identity</h2>
                      <p className="text-slate-400 font-medium">Define your school's brand and physical presence.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">School Motto</Label>
                          <Input 
                            value={formData.motto}
                            onChange={e => update('motto', e.target.value)}
                            placeholder="e.g. Knowledge is Power" 
                            className="h-12 bg-slate-900/50 border-slate-800 rounded-xl focus:border-cyan-500/50 transition-all font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">State</Label>
                            <Select value={formData.state} onValueChange={v => update('state', v)}>
                              <SelectTrigger className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-bold">
                                <SelectValue placeholder="Select State" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                {NIGERIA_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">LGA</Label>
                            <Select value={formData.lga} onValueChange={v => update('lga', v)} disabled={!formData.state}>
                              <SelectTrigger className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-bold">
                                <SelectValue placeholder="Select LGA" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                {lgas.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Official Email</Label>
                          <Input 
                            value={formData.officialEmail}
                            onChange={e => update('officialEmail', e.target.value)}
                            placeholder="info@school.com" 
                            className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Visual Assets (Logo/Stamp)</Label>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="h-24 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 flex flex-col items-center justify-center gap-2 cursor-pointer group transition-all">
                                <Camera className="size-5 text-slate-600 group-hover:text-cyan-500 transition-colors" />
                                <span className="text-[8px] font-black uppercase text-slate-600">Upload Logo</span>
                             </div>
                             <div className="h-24 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 flex flex-col items-center justify-center gap-2 cursor-pointer group transition-all">
                                <Shield className="size-5 text-slate-600 group-hover:text-cyan-500 transition-colors" />
                                <span className="text-[8px] font-black uppercase text-slate-600">Upload Stamp</span>
                             </div>
                          </div>
                          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest text-center mt-2">Recommended: PNG w/ transparency</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Academic Backbone</h2>
                      <p className="text-slate-400 font-medium">Configure the core educational structure of your node.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Academic Session</Label>
                            <Select value={formData.academicYear} onValueChange={v => update('academicYear', v)}>
                              <SelectTrigger className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-bold">
                                <SelectValue placeholder="Select Session" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                <SelectItem value="2024/2025">2024/2025</SelectItem>
                                <SelectItem value="2025/2026">2025/2026</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Term</Label>
                            <div className="grid grid-cols-3 gap-2">
                               {['1', '2', '3'].map(t => (
                                 <button
                                   key={t}
                                   onClick={() => update('currentTerm', t)}
                                   className={`h-12 rounded-xl font-black transition-all border ${
                                     formData.currentTerm === t 
                                       ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500 shadow-lg shadow-cyan-500/10' 
                                       : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                                   }`}
                                 >
                                   {t}{t === '1' ? 'st' : t === '2' ? 'nd' : 'rd'}
                                 </button>
                               ))}
                            </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">School Level / Category</Label>
                            <Select value={formData.schoolType} onValueChange={v => update('schoolType', v)}>
                              <SelectTrigger className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-bold">
                                <SelectValue placeholder="Select Type" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                <SelectItem value="primary">Primary School</SelectItem>
                                <SelectItem value="secondary">Secondary School</SelectItem>
                                <SelectItem value="all-in-one">Combined (Primary & Secondary)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[9px] text-slate-600 font-bold uppercase mt-2">Determines default class structures and curriculum.</p>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Financial Baseline</h2>
                      <p className="text-slate-400 font-medium">Establish billing protocols for fee collection and payroll.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-4 mb-4">
                       <AlertCircle className="size-5 text-amber-500 shrink-0" />
                       <p className="text-xs font-semibold text-amber-500/80 leading-relaxed">
                         The bank details provided here will be automatically included in fee payment instructions sent to parents and displayed on the student portal.
                       </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bank Name</Label>
                            <Input 
                              value={formData.bankName}
                              onChange={e => update('bankName', e.target.value)}
                              placeholder="e.g. Zenith Bank" 
                              className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Account Number</Label>
                            <Input 
                              value={formData.accountNumber}
                              onChange={e => update('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="10 digit NUBAN" 
                              className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-mono text-lg font-black tracking-widest"
                            />
                          </div>
                       </div>
                       <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Account Name</Label>
                            <Input 
                              value={formData.accountName}
                              onChange={e => update('accountName', e.target.value)}
                              placeholder="Institutional Account Name" 
                              className="h-12 bg-slate-900/50 border-slate-800 rounded-xl font-bold uppercase transition-all"
                            />
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-8 flex flex-col items-center justify-center text-center py-10">
                    <div className="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center relative mb-6">
                       <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
                       <CheckCircle2 className="size-12 text-cyan-500 animate-in zoom-in-50 duration-500" />
                    </div>
                    
                    <div className="space-y-2">
                       <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Ready for Mobilization</h2>
                       <p className="text-slate-400 font-medium max-w-md">
                         All institutional metadata has been prepared. Finalizing will synchronize your node with the global Klaxtrix network orchestration layer.
                       </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 grid grid-cols-2 gap-8 text-left mt-8 w-full max-w-lg">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase">School Identity</p>
                          <p className="text-[10px] font-bold text-white uppercase">{formData.state}, {formData.lga}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase">Academic Pulse</p>
                          <p className="text-[10px] font-bold text-white uppercase">{formData.academicYear} • Term {formData.currentTerm}</p>
                       </div>
                    </div>
                  </div>
                )}

                {/* Footer Navigation */}
                <div className="mt-auto pt-10 flex items-center justify-between border-t border-slate-800/50">
                   <Button 
                     variant="ghost" 
                     onClick={handlePrev} 
                     disabled={currentStep === 0 || isSubmitting}
                     className="px-8 h-12 rounded-xl text-slate-500 hover:text-white font-bold uppercase tracking-widest text-[10px] gap-2"
                   >
                     <ArrowLeft className="size-3" /> Back
                   </Button>

                   {currentStep === STEPS.length - 1 ? (
                     <Button 
                       onClick={handleCompleteSetup}
                       disabled={isSubmitting}
                       className="px-10 h-14 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-cyan-500/20 gap-3 active:scale-95 group"
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
                       className="px-10 h-14 bg-white hover:bg-slate-200 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-lg gap-3 active:scale-95 group"
                     >
                       Proceed to {STEPS[currentStep + 1].title} <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                     </Button>
                   )}
                </div>
             </motion.div>
           </AnimatePresence>
        </Card>

        {/* Support Section */}
        <p className="text-center mt-10 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] opacity-60">
           Need assistance? Contact Klaxtrix Protocol Support • protocol@klaxtrix.com
        </p>
      </div>
    </div>
  );
}
