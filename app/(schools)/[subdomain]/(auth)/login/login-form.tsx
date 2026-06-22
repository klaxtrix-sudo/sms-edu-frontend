'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useTenant } from '@/components/providers/tenant-provider';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Email or Admission Number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { subdomain } = useParams() as { subdomain: string };
  const { supabase, isLoading: isTenantLoading, error: tenantError } = useTenant();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Combine local and tenant errors
  const activeError = error || tenantError;

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    if (!supabase) {
      setError(tenantError || 'System initializing. Please wait a moment...');
      return;
    }

    setLoading(true);
    setError(null);

    let email = values.identifier.trim();
    const password = values.password.trim();

    // STUDENT LOGIN DETECTION: If identifier is an admission number (does not contain @)
    if (!email.includes('@')) {
      const cleanedAdmissionNo = email.toLowerCase().replace(/[^a-z0-9]/g, '-');
      email = `${cleanedAdmissionNo}@${subdomain.toLowerCase()}.klaxtrix.internal`;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect to the correct role dashboard
    const role = authData.user?.user_metadata?.role ?? 'student';
    const roleRoutes: Record<string, string> = {
      admin: '/dashboard/admin',
      teacher: '/dashboard/teacher',
      student: '/dashboard/student',
      parent: '/dashboard/parent',
    };

    // Use hard redirect to guarantee cookies are committed before dashboard initialization
    window.location.href = roleRoutes[role] ?? '/dashboard/student';
  };

  return (
    <div className="glass-card p-8 min-h-[300px] flex flex-col justify-center">
      {isTenantLoading ? (
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Resolving Institution...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Admission Number</Label>
            <Input
              id="identifier"
              {...register('identifier')}
              type="text"
              autoComplete="username"
              disabled={!!tenantError}
              placeholder="you@school.edu.ng or STD/2026/001"
            />
            {errors.identifier && <p className="text-destructive text-xs mt-1">{errors.identifier.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative group">
              <Input
                id="password"
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={!!tenantError}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!!tenantError}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
          </div>

          {activeError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-destructive text-sm font-medium"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="shrink-0 text-lg">!</span>
                <span>{activeError}</span>
              </div>
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={loading || !!tenantError}
            className="w-full h-12"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
