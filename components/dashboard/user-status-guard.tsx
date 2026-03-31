'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTenantClient } from '@/lib/supabase/client';

interface UserStatusGuardProps {
  userId: string;
}

export function UserStatusGuard({ userId }: UserStatusGuardProps) {
  const router = useRouter();
  const supabase = createTenantClient();

  useEffect(() => {
    if (!userId) return;

    // 1. Subscribe to real-time changes on the current user's profile
    const channel = supabase
      .channel(`personal-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const newStatus = payload.new as { is_active: boolean };
          
          // 2. If the user has been deactivated, immediately "kick them out"
          if (newStatus && newStatus.is_active === false) {
            console.log('[Security Guard] Account suspension detected in real-time. Redirecting…');
            
            // To ensure the redirection is "hard" and wipes any cached state,
            // we use window.location.href or router.replace.
            window.location.href = '/dashboard/suspended';
          }
        }
      )
      .subscribe();

    // 3. Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, router]);

  return null; // This component is a silent observer
}
