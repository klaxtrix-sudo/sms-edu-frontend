'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useTenant } from '@/components/providers/tenant-provider';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
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

    const email = values.email.trim();
    const password = values.password.trim();

    // TEMPORARY: Admin Login Bypass for "Executive Edition" PoC Review
    if (email === 'admin@klaxtrix.com' && password === 'admin123') {
      console.log('PoC Bypass active for admin user');
      router.push('/dashboard/admin');
      return;
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
    router.push(roleRoutes[role] ?? '/dashboard/student');
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
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              disabled={!!tenantError}
              placeholder="you@school.edu.ng"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-50"
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <div className="relative group">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={!!tenantError}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!!tenantError}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                tabIndex={-1}
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
                <span className="shrink-0 text-lg">⚠️</span>
                <span>{activeError}</span>
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || !!tenantError}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
