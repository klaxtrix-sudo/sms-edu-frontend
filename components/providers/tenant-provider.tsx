'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

  useEffect(() => {
    if (!subdomain) return;

    const fetchTenantConfig = async () => {
      setIsLoading(true);
      try {
        // MOCK: In production, this calls the 'Main Control Database' API
        // to get the school's specific infrastructure keys.
        console.log(`[Klaxtrix] Provisioning context for tenant: ${subdomain}`);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data for 'monidams' or any other test subdomain
        const mockTenant: TenantConfig = {
          id: 'tenant_123',
          name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1) + ' Academy',
          subdomain: subdomain,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, // Defaulting to master for PoC
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
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
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
