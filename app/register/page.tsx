'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingHeader } from '@/components/landing/landing-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Globe, Server, Shield, User, Zap, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STEPS = [
  { id: 'identity', title: 'School Identity', icon: Zap },
  { id: 'subdomain', title: 'Subdomain', icon: Globe },
  { id: 'cloud', title: 'Partner-Cloud', icon: Server },
  { id: 'admin', title: 'Admin Account', icon: User },
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    schoolName: '',
    address: '',
    subdomain: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [isVerifying, setIsVerifying] = useState(false);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const verifySubdomain = async () => {
     setIsVerifying(true);
     // MOCK: Subdomain availability check
     await new Promise(resolve => setTimeout(resolve, 1000));
     setIsVerifying(false);
     handleNext();
  };

  const handleSubmit = async () => {
     toast.success('Provisioning your Klaxtrix environment...', {
        description: 'Building your Partner-Cloud instance.',
     });
     // MOCK: Final Registration
  };

  return (
    <main className="min-h-screen pt-24 pb-12 bg-background selection:bg-primary/20">
      <LandingHeader />
      
      <div className="container px-4 mx-auto max-w-4xl">
        {/* Progress Stepper */}
        <div className="flex justify-between mb-12 relative">
           <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 -z-10" />
           <div 
             className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-500" 
             style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
           />
           
           {STEPS.map((step, i) => (
             <div key={step.id} className="flex flex-col items-center group">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  i <= currentStep ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-background border-muted text-muted-foreground"
                )}>
                   <step.icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-xs font-bold mt-2 hidden md:block",
                  i <= currentStep ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
             </div>
           ))}
        </div>

        {/* Form Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 md:p-12 glass-card overflow-hidden">
               {currentStep === 0 && (
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <h2 className="text-3xl font-heading font-bold tracking-tight">Tell us about your school</h2>
                       <p className="text-muted-foreground">The future of your institution starts with these simple details.</p>
                    </div>
                    <div className="grid gap-6">
                       <div className="space-y-2">
                          <Label htmlFor="schoolName">Official School Name</Label>
                          <Input 
                            id="schoolName" 
                            placeholder="e.g. Monidams Academy" 
                            className="h-12 rounded-xl"
                            value={formData.schoolName}
                            onChange={e => setFormData({...formData, schoolName: e.target.value})}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label htmlFor="address">Institutional Address</Label>
                          <Input 
                            id="address" 
                            placeholder="Plot 45, Victoria Island..." 
                            className="h-12 rounded-xl"
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>
               )}

               {currentStep === 1 && (
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <h2 className="text-3xl font-heading font-bold tracking-tight">Choose your domain</h2>
                       <p className="text-muted-foreground">This is how your students and parents will access Klaxtrix.</p>
                    </div>
                    <div className="flex items-center gap-2 h-16 px-4 rounded-2xl bg-muted/30 border border-border group focus-within:border-primary/50 transition-colors">
                       <Input 
                         id="subdomain" 
                         placeholder="monidams" 
                         className="border-none bg-transparent h-full text-xl font-bold p-0 focus-visible:ring-0"
                         value={formData.subdomain}
                         onChange={e => setFormData({...formData, subdomain: e.target.value.toLowerCase()})}
                       />
                       <span className="text-xl font-bold text-muted-foreground">.klaxtrix.com.ng</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                       <Globe className="w-3 h-3" />
                       Brand your digital infrastructure. No setup fees.
                    </p>
                 </div>
               )}

               {currentStep === 2 && (
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">Partner-Cloud Isolation</Badge>
                       <h2 className="text-3xl font-heading font-bold tracking-tight">Connect your Supabase</h2>
                       <p className="text-muted-foreground">Maintain 100% data sovereignty by connecting your own cloud instance.</p>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label htmlFor="supabaseUrl">Supabase Project URL</Label>
                          <Input 
                            id="supabaseUrl" 
                            placeholder="https://xyz.supabase.co" 
                            className="h-12 rounded-xl font-mono text-sm"
                            value={formData.supabaseUrl}
                            onChange={e => setFormData({...formData, supabaseUrl: e.target.value})}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label htmlFor="supabaseKey">Supabase Anon Key</Label>
                          <Input 
                            id="supabaseKey" 
                            type="password"
                            placeholder="eyJhbG..." 
                            className="h-12 rounded-xl font-mono text-sm"
                            value={formData.supabaseAnonKey}
                            onChange={e => setFormData({...formData, supabaseAnonKey: e.target.value})}
                          />
                       </div>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-600 flex gap-3">
                       <Shield className="w-4 h-4 shrink-0" />
                       <span>Your keys are used exclusively for cross-account resource monitoring. Klaxtrix does not store your root credentials.</span>
                    </div>
                 </div>
               )}

               {currentStep === 3 && (
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <h2 className="text-3xl font-heading font-bold tracking-tight">Establish Mission Control</h2>
                       <p className="text-muted-foreground">Create the primary administrator account for your school.</p>
                    </div>
                    <div className="grid gap-6">
                       <div className="space-y-2">
                          <Label htmlFor="adminEmail">Corporate Email</Label>
                          <Input 
                            id="adminEmail" 
                            type="email"
                            placeholder="admin@school.edu.ng" 
                            className="h-12 rounded-xl"
                            value={formData.adminEmail}
                            onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label htmlFor="adminPassword">Master Password</Label>
                          <Input 
                            id="adminPassword" 
                            type="password"
                            placeholder="••••••••" 
                            className="h-12 rounded-xl"
                            value={formData.adminPassword}
                            onChange={e => setFormData({...formData, adminPassword: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>
               )}

               {/* Navigation Actions */}
               <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/50">
                  <Button 
                    variant="ghost" 
                    onClick={handlePrev} 
                    disabled={currentStep === 0}
                    className="rounded-xl px-6"
                  >
                     <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  
                  {currentStep === STEPS.length - 1 ? (
                    <Button 
                      className="rounded-xl px-8 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform h-12 text-base font-bold"
                      onClick={handleSubmit}
                    >
                       Launch Institution <Zap className="ml-2 w-4 h-4 fill-white" />
                    </Button>
                  ) : (
                    <Button 
                      className="rounded-xl px-8 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform h-12 text-base font-bold"
                      onClick={currentStep === 1 ? verifySubdomain : handleNext}
                      disabled={isVerifying}
                    >
                       {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ArrowRight className="ml-2 w-4 h-4" /></>}
                    </Button>
                  )}
               </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-sm text-muted-foreground mt-8">
           Already representing a school? <Link href="/login" className="text-primary hover:underline font-semibold">Login to Mission Control</Link>
        </p>
      </div>
    </main>
  );
}
