import { resolveTenantKeys } from '@/lib/supabase/tenant-resolver';
import { ActivateForm } from './activate-form';
import { NodeOfflineView } from '../login/node-offline-view';

interface PageProps {
  params: {
    subdomain: string;
  };
}

export default async function ActivatePage({ params }: PageProps) {
  const { subdomain } = params;
  const tenant = await resolveTenantKeys(subdomain);

  const schoolName = tenant?.name || 'Klaxtrix';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      {!tenant ? (
        <NodeOfflineView subdomain={subdomain} />
      ) : (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-glow uppercase">
              {schoolName}
            </h1>
            <p className="text-sm font-semibold tracking-widest text-primary uppercase mt-1">
              Account Activation
            </p>
          </div>

          {/* Client-side ActivateForm */}
          <ActivateForm subdomain={subdomain} />
        </div>
      )}
    </div>
  );
}
