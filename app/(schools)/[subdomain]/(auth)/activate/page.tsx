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
  const schoolLogo = tenant?.logoUrl;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 sm:py-12">
      {!tenant ? (
        <NodeOfflineView subdomain={subdomain} />
      ) : (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            {schoolLogo ? (
              <div className="flex justify-center mb-4 sm:mb-5">
                <div className="relative inline-flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-card/80 border border-border/80 shadow-2xl backdrop-blur-md overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl group-hover:bg-primary/20 transition-all duration-500 pointer-events-none" />
                  <img
                    src={schoolLogo}
                    alt={`${schoolName} Logo`}
                    className="relative max-h-20 max-w-[160px] sm:max-h-24 sm:max-w-[200px] md:max-h-28 md:max-w-[240px] w-auto h-auto object-contain rounded-xl drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                    loading="eager"
                  />
                </div>
              </div>
            ) : null}

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-glow uppercase break-words">
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
