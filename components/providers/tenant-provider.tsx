'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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

  // Initialize tenant-specific supabase client
  const supabase = useMemo(() => {
    if (tenant?.supabaseUrl && tenant?.supabaseAnonKey) {
      console.log(`[Klaxtrix] Initializing isolated client for ${tenant.name}`);
      return createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
    }
    return null;
  }, [tenant]);

  useEffect(() => {
    if (!subdomain) return;

    const fetchTenantConfig = async () => {
      setIsLoading(true);
      try {
        // MOCK: In production, this calls the 'Main Control Database' API
        console.log(`[Klaxtrix] Provisioning context for tenant: ${subdomain}`);
        
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockTenant: TenantConfig = {
          id: 'tenant_123',
          name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1) + ' Academy',
          subdomain: subdomain,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          primaryColor: '#3b82f6',
        };

        setTenant(mockTenant);
      } catch (err) {
        setError('Failed to load school configuration');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantConfig();
  }, [subdomain]);

  return (
    <TenantContext.Provider value={{ tenant, supabase, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export function useTenantSupabase() {
  const { supabase } = useTenant();
  return supabase;
}
