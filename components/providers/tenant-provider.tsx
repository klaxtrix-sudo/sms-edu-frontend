'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getBackendUrl } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  logoUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  primaryColor?: string;
  isSetupCompleted: boolean;
}

interface TenantContextType {
  tenant: TenantConfig | null;
  supabase: SupabaseClient<Database, any, any> | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const subdomain = params?.subdomain as string;
  
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize tenant-specific supabase client
  // Memoize it only based on the URL and key values, not the tenant object itself
  const supabase = useMemo(() => {
    if (tenant?.supabaseUrl && tenant?.supabaseAnonKey) {
      console.log(`[Klaxtrix] Initializing isolated client for ${tenant.name}`);
      return createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
    }
    return null;
  }, [tenant?.supabaseUrl, tenant?.supabaseAnonKey, tenant?.name]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!subdomain || !mounted) return;

    const fetchTenantConfig = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${getBackendUrl()}/tenant/resolve?subdomain=${subdomain}`);
        
        if (!res.ok) {
          setError(`School "${subdomain}" not found or not yet provisioned.`);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        
        // Only update if something actually changed to avoid infinite cycles
        const newTenant: TenantConfig = {
          id: data.data.id ?? subdomain,
          name: data.data.name ?? subdomain,
          subdomain,
          supabaseUrl: data.data.supabaseUrl,
          supabaseAnonKey: data.data.supabaseAnonKey,
          isSetupCompleted: data.data.isSetupCompleted ?? false,
          logoUrl: data.data.logoUrl,
          primaryColor: data.data.primaryColor ?? '#3b82f6',
        };

        setTenant(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newTenant)) return prev;
          return newTenant;
        });

        // Set a lightweight cookie so server actions can determine the tenant.
        // This is NOT sensitive — subdomain is already public in the URL.
        document.cookie = `x-tenant-subdomain=${subdomain}; path=/; SameSite=Lax`;
      } catch (err) {
        setError('Failed to load school configuration');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantConfig();
  }, [subdomain, mounted]);

  if (!mounted) return null;

  return (
    <TenantContext.Provider value={{ tenant, supabase, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

// Build Trigger: Ensuring latest fail-safe context is deployed to unblock Master Console prerendering.
export function useTenant() {
  const context = useContext(TenantContext);
  // Return a safe null-state if used outside a provider (e.g. Master Console)
  return context || { tenant: null, supabase: null, isLoading: false, error: null };
}

export function useTenantSupabase() {
  const { supabase } = useTenant();
  return supabase;
}
