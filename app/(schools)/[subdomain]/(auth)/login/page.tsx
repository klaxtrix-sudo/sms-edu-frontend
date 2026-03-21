import { resolveTenantKeys } from '@/lib/supabase/tenant-server';
import { LoginForm } from './login-form';
import * as motion from 'framer-motion/m'; // Note: Server-safe motion if used carefully or just use static div

interface PageProps {
  params: {
    subdomain: string;
  };
}

export default async function LoginPage({ params }: PageProps) {
  const { subdomain } = params;
  const tenant = await resolveTenantKeys(subdomain);

  const schoolName = tenant?.name || 'Klaxtrix';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo & Header (SSR-ready) */}
        <div className="text-center mb-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-glow uppercase">
              {schoolName} <span className="text-primary tracking-widest text-lg md:text-xl align-middle">PORTAL</span>
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              {tenant ? `Managed institutional access for ${schoolName}` : 'Access the future of institutional management.'}
            </p>
          </div>
        </div>

        {/* Client-side LoginForm */}
        <LoginForm />

        <p className="text-center text-xs text-muted-foreground mt-6">
          Access is managed by your school administrator.
        </p>
      </div>
    </div>
  );
}

