'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  resendOnboardingOTP, 
  verifyOnboardingOTP, 
  finalizeTeacherAccount 
} from '@/app/actions/onboarding-actions';
import { signOutAction } from '@/app/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  AlertCircle, 
  ArrowRight,
  ShieldAlert,
  Fingerprint,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

interface OnboardingGateProps {
  user: any;
  children: React.ReactNode;
}

export default function OnboardingGate({ user: initialUser, children }: OnboardingGateProps) {
  const params = useParams();
  const subdomain = params?.subdomain as string;

  const needsEmailVerify = !initialUser?.user_metadata?.email_onboarding_verified;
  const needsPasswordChange = !!initialUser?.user_metadata?.must_change_password;
  const needsOnboarding = needsEmailVerify || needsPasswordChange;

  // Stage order: verify → password → ready
  const [stage, setStage] = useState<'verify' | 'password' | 'ready'>(() => {
    if (!needsOnboarding) return 'ready';
    if (needsEmailVerify) return 'verify';
    return 'password';
  });

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Sync stage if props change (e.g., after revalidatePath)
  useEffect(() => {
    if (!needsOnboarding) {
      setStage('ready');
    } else if (needsEmailVerify) {
      setStage('verify');
    } else if (needsPasswordChange) {
      setStage('password');
    }
  }, [needsOnboarding, needsEmailVerify, needsPasswordChange]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOutAction(subdomain);
    window.location.href = '/login';
  };

  const handleSendOTP = async () => {
    if (isSending || countdown > 0) return;
    // Disable immediately — before the async round-trip — to prevent double sends
    setIsSending(true);
    try {
      const result = await resendOnboardingOTP(initialUser.email);
      if (result.success) {
        toast.success('Identity validation code dispatched to your email.');
        setCountdown(60);
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    setIsSubmitting(true);
    const result = await verifyOnboardingOTP(initialUser.email, otp);
    if (result.success) {
      toast.success("Email verified successfully.");
      // Advance to password if needed, otherwise done
      if (needsPasswordChange) {
        setStage('password');
      } else {
        setStage('ready');
      }
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return toast.error("Password confirmation mismatch.");
    }
    if (passwords.new.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }
    setIsSubmitting(true);
    const result = await finalizeTeacherAccount(passwords.new);
    if (result.success) {
      toast.success("Security protocols initialized. Welcome aboard.");
      setStage('ready');
      window.location.reload();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  };

  if (stage === 'ready') return <>{children}</>;

  const isVerifyDone = stage === 'password';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden"
      >
        {/* Progress Header */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight leading-tight">Institutional Gate</h2>
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Security Clearance Required</p>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              title="Sign out and come back later"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 disabled:opacity-50"
            >
              <LogOut className="size-3.5" />
              {isSigningOut ? 'Signing out…' : 'Exit & Sign Out'}
            </button>
          </div>
          
          {/* Phase Indicators */}
          <div className="mt-8 flex items-center gap-3 relative z-10">
            {/* Step 1: Email Verify */}
            <div className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              isVerifyDone ? "bg-green-500" : "bg-primary"
            )} />
            {/* Step 2: Password Change */}
            {needsPasswordChange && (
              <div className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                stage === 'verify' ? "bg-slate-700" : "bg-primary"
              )} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 relative z-10">
            <span className={cn("text-[10px] font-bold tracking-wide flex-1", isVerifyDone ? "text-green-400" : "text-primary")}>
              1. Verify Email
            </span>
            {needsPasswordChange && (
              <span className={cn("text-[10px] font-bold tracking-wide flex-1", stage === 'password' ? "text-primary" : "text-slate-600")}>
                2. Set Password
              </span>
            )}
          </div>

          <div className="absolute -right-10 -bottom-10 size-40 bg-primary/20 rounded-full blur-[80px]" />
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* ── STAGE 1: Email Verification ── */}
            {stage === 'verify' && (
              <motion.div 
                key="verify"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Identity Validation</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    We need to confirm your email address before you can access the faculty portal.
                    Click the arrow to receive a 6-digit code.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Institutional Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input 
                        disabled 
                        value={initialUser.email} 
                        className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl text-slate-900 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">6-Digit Access PIN</Label>
                      <Input 
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl text-center text-xl tracking-[0.5em] font-black text-slate-900"
                      />
                    </div>
                    <Button 
                      onClick={handleSendOTP}
                      disabled={isSending || countdown > 0}
                      variant="outline"
                      className="aspect-square h-14 rounded-2xl border-primary/20 text-primary font-bold hover:bg-primary/5 shrink-0 disabled:opacity-50"
                    >
                      {isSending
                        ? <span className="animate-spin text-lg">⟳</span>
                        : countdown > 0
                        ? countdown
                        : <ArrowRight className="size-5" />}
                    </Button>
                  </div>
                  
                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    Click the arrow to send the verification code to your email.
                  </p>
                </div>

                <Button 
                  onClick={handleVerifyOTP}
                  disabled={otp.length !== 6 || isSubmitting}
                  className="w-full h-14 rounded-2xl gradient-brand font-bold text-white shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                >
                  {isSubmitting ? "Validating…" : "Confirm Email"}
                </Button>
              </motion.div>
            )}

            {/* ── STAGE 2: Password Change ── */}
            {stage === 'password' && (
              <motion.div 
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Security Handover</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    Email confirmed ✓ Your institution requires you to set a personal password before proceeding.
                  </p>
                </div>

                <form onSubmit={handleFinalize} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Personal Password</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input 
                        type="password"
                        required
                        placeholder="Min. 8 characters"
                        value={passwords.new}
                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                        className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl text-slate-900 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Confirm Password</Label>
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input 
                        type="password"
                        required
                        placeholder="Repeat password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                        className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl text-slate-900 font-bold"
                      />
                    </div>
                  </div>

                  {passwords.confirm && passwords.new !== passwords.confirm && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-medium">
                      <AlertCircle className="size-4 shrink-0" />
                      Passwords do not match
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
                    <ShieldAlert className="size-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic">
                      Password must be minimum 8 characters and include capital letters & numbers for institutional compliance.
                    </p>
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting || passwords.new.length < 8 || passwords.new !== passwords.confirm}
                    className="w-full h-14 rounded-2xl bg-slate-900 font-bold text-white shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all"
                  >
                    {isSubmitting ? "Updating…" : "Initialize Profile"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
