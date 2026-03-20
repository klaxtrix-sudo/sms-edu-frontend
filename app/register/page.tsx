'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingHeader } from '@/components/landing/landing-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Globe, Server, Shield, User, Zap,
  ArrowRight, ArrowLeft, Loader2, Database, ExternalLink, Copy
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';

const STEPS = [
  { id: 'verify',    title: 'Verify Access',   icon: Shield  },
  { id: 'identity',  title: 'School Identity',  icon: Zap     },
  { id: 'subdomain', title: 'Subdomain',        icon: Globe   },
  { id: 'cloud',     title: 'Partner-Cloud',    icon: Server  },
  { id: 'admin',     title: 'Admin Account',    icon: User    },
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep]   = useState(0);
  const [isVerifying, setIsVerifying]   = useState(false);
  const [isLaunching, setIsLaunching]   = useState(false);
  const [launchResult, setLaunchResult] = useState<{ subdomain: string; loginUrl: string } | null>(null);

  const [formData, setFormData] = useState({
    accessCode:            '',
    schoolName:            '',
    address:               '',
    subdomain:             '',
    supabaseUrl:           '',
    supabaseAnonKey:       '',
    supabaseServiceRoleKey:'',
    dbConnectionString:    '',
    mongodbUri:            '',
    adminEmail:            '',
    adminPassword:         '',
  });

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  // ── Step 0: Verify access code ──────────────────────────────────────────
  const verifyAccessCode = async () => {
    if (!formData.accessCode.trim()) { toast.error('Please enter an access code.'); return; }
    try {
      setIsVerifying(true);
      const res = await axios.post(`${BACKEND_URL}/access/auth/verify`, {
        code: formData.accessCode.toUpperCase(),
      });
      if (res.data.success) {
        toast.success('Access Granted', { description: 'Your institutional identity is verified.' });
        handleNext();
      } else {
        toast.error('Invalid Access Code', { description: res.data.message });
      }
    } catch {
      toast.error('Verification Error', { description: 'Unable to reach the Klaxtrix node network.' });
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Step 2: Quick subdomain availability check (simulated) ──────────────
  const verifySubdomain = async () => {
    if (!formData.subdomain.trim()) { toast.error('Please choose a subdomain.'); return; }
    if (!/^[a-z0-9-]{2,30}$/.test(formData.subdomain)) {
      toast.error('Invalid subdomain', { description: 'Use only lowercase letters, numbers and hyphens (2-30 chars).' });
      return;
    }
    setIsVerifying(true);
    await new Promise(r => setTimeout(r, 800));
    setIsVerifying(false);
    handleNext();
  };

  // ── Final step: Launch institution ──────────────────────────────────────
  const handleLaunch = async () => {
    const required: (keyof typeof formData)[] = [
      'schoolName','address','subdomain','supabaseUrl',
      'supabaseAnonKey','supabaseServiceRoleKey','dbConnectionString','mongodbUri','adminEmail','adminPassword'
    ];
    for (const field of required) {
      if (!formData[field].trim()) {
        toast.error(`Missing field: ${field.replace(/([A-Z])/g, ' $1').trim()}`);
        return;
      }
    }

    try {
      setIsLaunching(true);
      toast.loading('Provisioning your Klaxtrix environment…', { id: 'launch' });

      const res = await axios.post(`${BACKEND_URL}/register`, formData);

      if (res.data.success) {
        toast.success('Institution Launched!', { id: 'launch', description: 'Your node is live on the Klaxtrix network.' });
        setLaunchResult(res.data.data);
      } else {
        toast.error('Launch Failed', { id: 'launch', description: res.data.message });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      toast.error('Launch Failed', { id: 'launch', description: msg });
    } finally {
      setIsLaunching(false);
    }
  };

  // ── Success Screen ───────────────────────────────────────────────────────
  if (launchResult) {
    return (
      <main className="min-h-screen pt-24 pb-12 bg-background selection:bg-primary/20">
        <LandingHeader />
        <div className="container px-4 mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-10 text-center space-y-8 glass-card">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <div>
                  <Badge variant="outline" className="text-green-500 border-green-500/20 mb-3">Node Active</Badge>
                  <h2 className="text-3xl font-heading font-bold">Institution Launched 🚀</h2>
                  <p className="text-muted-foreground mt-2">
                    Your Klaxtrix environment for <strong>{formData.schoolName}</strong> is live.
                  </p>
                </div>
              </div>

              {/* Login URL */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center gap-3 text-left">
                <Globe className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-0.5">Your Mission Control URL</p>
                  <p className="font-mono text-sm font-bold text-primary truncate">{launchResult.loginUrl}</p>
                </div>
                <Button
                  size="icon" variant="ghost"
                  onClick={() => { navigator.clipboard.writeText(launchResult.loginUrl); toast.success('Copied!'); }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {/* Auto-provisioned confirmation */}
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-sm text-green-600 text-left flex gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>Database schema automatically provisioned — your school management system is fully ready. No manual steps required.</span>
              </div>

              <Button
                asChild
                className="w-full h-12 bg-primary font-bold text-base rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              >
                <a href={launchResult.loginUrl} target="_blank" rel="noopener noreferrer">
                  Go to Mission Control <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
            </Card>
          </motion.div>
        </div>
      </main>
    );
  }

  // ── Step Actions ─────────────────────────────────────────────────────────
  const stepAction = () => {
    if (currentStep === 0) return verifyAccessCode;
    if (currentStep === 2) return verifySubdomain;
    return handleNext;
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
                'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                i <= currentStep
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-background border-muted text-muted-foreground'
              )}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                'text-xs font-bold mt-2 hidden md:block',
                i <= currentStep ? 'text-foreground' : 'text-muted-foreground'
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
              {/* ── Step 0: Verify ── */}
              {currentStep === 0 && (
                <div className="space-y-8 py-4">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <Shield className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-heading font-bold tracking-tight">Institutional Verification</h2>
                      <p className="text-muted-foreground text-lg max-w-md">
                        Klaxtrix Executive Edition is invitation-only. Enter your access code to begin.
                      </p>
                    </div>
                  </div>
                  <div className="max-w-xs mx-auto space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="accessCode" className="text-center block font-semibold text-muted-foreground">Access Code</Label>
                      <Input
                        id="accessCode"
                        placeholder="e.g. A1B2C3D4"
                        className="h-14 rounded-2xl text-center text-xl font-mono tracking-widest uppercase focus:ring-primary/30"
                        value={formData.accessCode}
                        onChange={e => update('accessCode', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && verifyAccessCode()}
                      />
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 text-center max-w-md mx-auto">
                    <p className="text-sm text-muted-foreground italic">"Securing the future of academics, one institution at a time."</p>
                  </div>
                </div>
              )}

              {/* ── Step 1: Identity ── */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-heading font-bold tracking-tight">Tell us about your school</h2>
                    <p className="text-muted-foreground">The future of your institution starts with these details.</p>
                  </div>
                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">Official School Name</Label>
                      <Input id="schoolName" placeholder="e.g. Monidams Academy" className="h-12 rounded-xl"
                        value={formData.schoolName} onChange={e => update('schoolName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Institutional Address</Label>
                      <Input id="address" placeholder="Plot 45, Victoria Island..." className="h-12 rounded-xl"
                        value={formData.address} onChange={e => update('address', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Subdomain ── */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-heading font-bold tracking-tight">Choose your domain</h2>
                    <p className="text-muted-foreground">This is how your students and staff access Klaxtrix.</p>
                  </div>
                  <div className="flex items-center gap-2 h-16 px-4 rounded-2xl bg-muted/30 border border-border group focus-within:border-primary/50 transition-colors">
                    <Input
                      id="subdomain"
                      placeholder="monidams"
                      className="border-none bg-transparent h-full text-xl font-bold p-0 focus-visible:ring-0"
                      value={formData.subdomain}
                      onChange={e => update('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <span className="text-xl font-bold text-muted-foreground">.klaxtrix.com.ng</span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Lowercase letters, numbers, and hyphens only. No setup fees.
                  </p>
                </div>
              )}

              {/* ── Step 3: Partner-Cloud ── */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">Partner-Cloud Isolation</Badge>
                    <h2 className="text-3xl font-heading font-bold tracking-tight">Connect your cloud</h2>
                    <p className="text-muted-foreground">Your school's data lives exclusively in your own cloud instances.</p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Server className="w-3 h-3" /> Supabase (Auth + Relational Data)
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="supabaseUrl">Supabase Project URL</Label>
                      <Input id="supabaseUrl" placeholder="https://xyz.supabase.co" className="h-11 rounded-xl font-mono text-sm"
                        value={formData.supabaseUrl} onChange={e => update('supabaseUrl', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supabaseAnonKey">Anon Key</Label>
                        <Input id="supabaseAnonKey" type="password" placeholder="eyJhbG..." className="h-11 rounded-xl font-mono text-sm"
                          value={formData.supabaseAnonKey} onChange={e => update('supabaseAnonKey', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supabaseServiceRoleKey">Service Role Key</Label>
                        <Input id="supabaseServiceRoleKey" type="password" placeholder="eyJhbG..." className="h-11 rounded-xl font-mono text-sm"
                          value={formData.supabaseServiceRoleKey} onChange={e => update('supabaseServiceRoleKey', e.target.value)} />
                        <p className="text-[10px] text-muted-foreground">Used for one-time provisioning only. Never stored in plaintext.</p>
                      </div>
                    </div>

                    {/* Database direct connection for schema provisioning */}
                    <div className="space-y-2">
                      <Label htmlFor="dbConnectionString">Database Connection String</Label>
                      <Input
                        id="dbConnectionString"
                        type="password"
                        placeholder="postgresql://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:5432/postgres"
                        className="h-11 rounded-xl font-mono text-sm"
                        value={formData.dbConnectionString}
                        onChange={e => update('dbConnectionString', e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Supabase → Settings → Database → Connection String → <strong>Session mode</strong> tab. Do NOT use "Direct connection" — it may be unreachable.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                        <Database className="w-3 h-3" /> MongoDB Atlas (Exams, Assignments, Submissions)
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="mongodbUri">MongoDB Atlas Connection URI</Label>
                        <Input id="mongodbUri" type="password" placeholder="mongodb+srv://admin:password@cluster.mongodb.net/"
                          className="h-11 rounded-xl font-mono text-sm"
                          value={formData.mongodbUri} onChange={e => update('mongodbUri', e.target.value)} />
                        <p className="text-[10px] text-muted-foreground">
                          Find this in Atlas → Clusters → Connect → Drivers. All credentials are AES-256 encrypted before storage.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-600 flex gap-3">
                    <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>All credentials are encrypted with AES-256-GCM before being stored. Your raw keys are never persisted in plaintext — not even Klaxtrix engineers can read them.</span>
                  </div>
                </div>
              )}

              {/* ── Step 4: Admin Account ── */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-heading font-bold tracking-tight">Establish Mission Control</h2>
                    <p className="text-muted-foreground">Create the primary administrator account for your school.</p>
                  </div>
                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Corporate Email</Label>
                      <Input id="adminEmail" type="email" placeholder="admin@school.edu.ng" className="h-12 rounded-xl"
                        value={formData.adminEmail} onChange={e => update('adminEmail', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminPassword">Master Password</Label>
                      <Input id="adminPassword" type="password" placeholder="Min. 8 characters" className="h-12 rounded-xl"
                        value={formData.adminPassword} onChange={e => update('adminPassword', e.target.value)} />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-sm text-muted-foreground">
                    This account will be the root administrator for <strong>{formData.schoolName || 'your school'}</strong>.
                    Additional staff accounts can be created after launch.
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/50">
                <Button variant="ghost" onClick={handlePrev} disabled={currentStep === 0 || isLaunching} className="rounded-xl px-6">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                {currentStep === STEPS.length - 1 ? (
                  <Button
                    className="rounded-xl px-8 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform h-12 text-base font-bold"
                    onClick={handleLaunch}
                    disabled={isLaunching}
                  >
                    {isLaunching
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Provisioning…</>
                      : <>Launch Institution <Zap className="ml-2 w-4 h-4 fill-white" /></>
                    }
                  </Button>
                ) : (
                  <Button
                    className="rounded-xl px-8 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform h-12 text-base font-bold"
                    onClick={stepAction()}
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
          Already registered? <Link href="/login" className="text-primary hover:underline font-semibold">Login to Mission Control</Link>
        </p>
      </div>
    </main>
  );
}
