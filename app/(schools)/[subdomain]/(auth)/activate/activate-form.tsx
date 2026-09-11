'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/components/providers/tenant-provider';
import { Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { finalizeActivation } from '@/app/actions/onboarding-actions';

interface ActivateFormProps {
  subdomain: string;
}

export function ActivateForm({ subdomain }: ActivateFormProps) {
  const router = useRouter();
  const { supabase, isLoading: isTenantLoading, error: tenantError } = useTenant();

  const [session, setSession] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isVerifyingProfile, setIsVerifyingProfile] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Detect & set session from URL hash tokens or active browser session
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let mounted = true;

    async function checkSession() {
      if (!client) return;
      try {
        // Parse hash if present (#access_token=...&refresh_token=...)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error } = await client.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && data?.session && mounted) {
              setSession(data.session);
              setIsCheckingAuth(false);
              return;
            }
          }
        }

        const { data: { session: existingSession } } = await client.auth.getSession();
        if (mounted) {
          setSession(existingSession);
          setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error('[ActivateForm] Auth check error:', err);
        if (mounted) setIsCheckingAuth(false);
      }
    }

    checkSession();

    const { data: authListener } = client.auth.onAuthStateChange((_event, newSession) => {
      if (mounted && newSession) {
        setSession(newSession);
        setIsCheckingAuth(false);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  // 2. Validate invitation link lifecycle & expiration timestamp
  useEffect(() => {
    async function checkProfileExpiry() {
      if (!supabase || !session?.user?.id) return;
      setIsVerifyingProfile(true);
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, invitation_expires_at, onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle();

        if (prof && !prof.onboarding_completed && prof.invitation_expires_at) {
          if (new Date() > new Date(prof.invitation_expires_at)) {
            setIsExpired(true);
          }
        }
      } catch (err) {
        console.error('[ActivateForm] Expiry check error:', err);
      } finally {
        setIsVerifyingProfile(false);
      }
    }

    if (session?.user) {
      checkProfileExpiry();
    }
  }, [supabase, session]);

  // Password rules validation
  const checks = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    return Object.values(checks).filter(Boolean).length;
  }, [checks]);

  const strengthLabel = useMemo(() => {
    if (strengthScore <= 1) return { label: 'Very Weak', color: 'bg-destructive text-destructive' };
    if (strengthScore === 2) return { label: 'Weak', color: 'bg-orange-500 text-orange-500' };
    if (strengthScore === 3) return { label: 'Moderate', color: 'bg-yellow-500 text-yellow-500' };
    if (strengthScore === 4) return { label: 'Strong', color: 'bg-emerald-500 text-emerald-500' };
    return { label: 'Very Strong', color: 'bg-emerald-600 text-emerald-600' };
  }, [strengthScore]);

  const isPasswordValid = checks.length && checks.upper && checks.lower && (checks.number || checks.special);
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (!isPasswordValid) {
      setErrorMessage('Please satisfy the password security requirements before proceeding.');
      return;
    }

    if (!doPasswordsMatch) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Update password on current Supabase auth session
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        throw new Error(authError.message);
      }

      // 2. Finalize server-side profile & onboarding flags
      const userId = session?.user?.id;
      const res = await finalizeActivation(password, subdomain, userId);
      if (res?.error) {
        throw new Error(res.error);
      }

      setIsSuccess(true);

      // Determine redirect path by role
      const role = session?.user?.user_metadata?.role || 'teacher';
      const roleRoutes: Record<string, string> = {
        admin: '/dashboard/admin',
        teacher: '/dashboard/teacher',
        parent: '/dashboard/parent',
        student: '/dashboard/student',
      };

      setTimeout(() => {
        window.location.href = roleRoutes[role] ?? '/dashboard/teacher';
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to activate account. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isTenantLoading || isCheckingAuth || isVerifyingProfile) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Verifying secure activation link...</p>
      </div>
    );
  }

  // If link has expired past the 72-hour window
  if (isExpired) {
    return (
      <div className="glass-card p-8 space-y-6 text-center animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Invitation Link Expired</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For institutional security, staff activation links are valid for 72 hours. This invitation link has exceeded its validity window.
          </p>
          <p className="text-xs text-muted-foreground pt-1 font-medium">
            Please contact your school’s Super Administrator to generate and dispatch a renewed activation link.
          </p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => router.push('/login')}
            className="w-full h-11 flex items-center justify-center gap-2"
          >
            Go to Login
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // If no session found and not logged in
  if (!session?.user) {
    return (
      <div className="glass-card p-8 space-y-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Activation Link Expired or Invalid</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This account activation link has either expired, already been used, or is invalid. Please request a fresh invitation link from your school administrator.
          </p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => router.push('/login')}
            className="w-full h-11 flex items-center justify-center gap-2"
          >
            Go to Login
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  const fullName = session.user.user_metadata?.full_name || 'Member';
  const email = session.user.email;
  const roleName = session.user.user_metadata?.role || 'staff';

  return (
    <div className="glass-card p-8 flex flex-col justify-center">
      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 py-4"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Account Activated!</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been securely configured. Redirecting to your dashboard...
            </p>
          </div>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User info banner */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Welcome, {fullName}
            </p>
            <p className="text-sm font-medium text-foreground mt-0.5">{email}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">Role: {roleName}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Create your permanent password to complete your account setup and access your portal.
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative group">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Create a strong password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Meter Bar */}
            {password.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Strength:</span>
                  <span className={`font-medium ${strengthLabel.color.split(' ')[1]}`}>
                    {strengthLabel.label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-full flex-1 transition-all duration-300 ${
                        strengthScore >= level ? strengthLabel.color.split(' ')[0] : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative group">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Confirm your password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !doPasswordsMatch && (
              <p className="text-destructive text-xs">Passwords do not match</p>
            )}
            {confirmPassword.length > 0 && doPasswordsMatch && (
              <p className="text-emerald-500 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
              </p>
            )}
          </div>

          {/* Security requirements checklist */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground/80 mb-1">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 ${checks.length ? 'text-emerald-500 font-medium' : ''}`}>
                {checks.length ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 inline-block" />}
                <span>8+ Characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.upper ? 'text-emerald-500 font-medium' : ''}`}>
                {checks.upper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 inline-block" />}
                <span>Uppercase Letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.lower ? 'text-emerald-500 font-medium' : ''}`}>
                {checks.lower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 inline-block" />}
                <span>Lowercase Letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.number || checks.special ? 'text-emerald-500 font-medium' : ''}`}>
                {(checks.number || checks.special) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 inline-block" />}
                <span>Number / Symbol</span>
              </div>
            </div>
          </div>

          {/* Error display */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-destructive text-sm font-medium flex items-center gap-2"
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            disabled={isSubmitting || !isPasswordValid || !doPasswordsMatch}
            className="w-full h-11 font-semibold"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Activating Account...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Activate Account & Enter
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
