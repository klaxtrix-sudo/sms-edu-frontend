'use client';

import { useEffect, useState } from 'react';
import { createRescueAdmin } from '@/app/actions/admin-actions';
import { useRouter } from 'next/navigation';

export default function RescuePage() {
  const [status, setStatus] = useState('Initializing rescue...');
  const router = useRouter();

  useEffect(() => {
    async function runRescue() {
      const result = await createRescueAdmin();
      if (result.success) {
        setStatus('Rescue successful! Admin account created. Redirecting to login...');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setStatus(`Rescue failed: ${result.error}`);
      }
    }
    runRescue();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass-card p-12 text-center max-w-lg">
        <div className="mb-6 inline-flex w-16 h-16 items-center justify-center bg-primary/10 rounded-full animate-pulse">
          🛡️
        </div>
        <h1 className="text-2xl font-bold mb-4">System Rescue Center</h1>
        <p className="text-muted-foreground">{status}</p>
        <div className="mt-8">
          <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
            <div className="bg-primary h-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
