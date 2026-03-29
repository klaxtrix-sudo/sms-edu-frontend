import { resolveTenantKeys } from '@/lib/supabase/tenant-resolver';
import { LoginForm } from './login-form';
import { NodeOfflineView } from './node-offline-view';

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
      {!tenant ? (
        <NodeOfflineView subdomain={subdomain} />
      ) : (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Logo & Header (SSR-ready) */}
          <div className="text-center mb-8">
            <div className="text-center space-y-3">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-glow uppercase">
                {schoolName} <span className="text-primary tracking-widest text-lg md:text-xl align-middle">PORTAL</span>
              </h1>
            </div>
          </div>

          {/* Client-side LoginForm */}
          <LoginForm />

        </div>
      )}
    </div>
  );
}

