'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient, configureTenantBrowserClient } from '@/lib/supabase/client';
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

export interface AcademicCycle {
  academicYear: string;
  currentTerm: number;
  termBegins: string | null;
  termEnds: string | null;
  currentWeek: number | null;
}

interface TenantContextType {
  tenant: TenantConfig | null;
  supabase: SupabaseClient<Database, any, any> | null;
  isLoading: boolean;
  error: string | null;
  academicCycle: AcademicCycle | null;
  refreshAcademicCycle: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const subdomain = params?.subdomain as string;
  
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [academicCycle, setAcademicCycle] = useState<AcademicCycle | null>(null);

  // Initialize tenant-specific supabase client
  // Memoize it only based on the URL and key values, not the tenant object itself
  const supabase = useMemo(() => {
    if (tenant?.supabaseUrl && tenant?.supabaseAnonKey) {
      console.log(`[Klaxtrix] Initializing isolated client for ${tenant.name}`);
      return createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
    }
    return null;
  }, [tenant?.supabaseUrl, tenant?.supabaseAnonKey, tenant?.name]);

  const fetchAcademicCycle = async () => {
    if (!supabase || !tenant?.id) return;
    try {
      const { data, error: cycleError } = await supabase
        .from('schools')
        .select('academic_year, current_term, term_begins, term_ends')
        .eq('id', tenant.id)
        .maybeSingle();

      if (cycleError) {
        console.error('[Tenant Provider] Error fetching academic cycle:', cycleError.message);
        return;
      }

      if (data) {
        let currentWeek: number | null = null;
        if (data.term_begins && data.term_ends) {
          const start = new Date(data.term_begins);
          const end = new Date(data.term_ends);
          const now = new Date();
          
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          now.setHours(12, 0, 0, 0); // midday for calculation safety
          
          if (now >= start && now <= end) {
            const diffTime = now.getTime() - start.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            // Week 1 starts on days 0 to 6
            currentWeek = Math.floor(diffDays / 7) + 1;
          }
        }

        setAcademicCycle({
          academicYear: data.academic_year || '2025/2026',
          currentTerm: data.current_term || 1,
          termBegins: data.term_begins,
          termEnds: data.term_ends,
          currentWeek
        });
      }
    } catch (err) {
      console.error('[Tenant Provider] Error calculating academic cycle:', err);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (supabase && tenant?.id) {
      fetchAcademicCycle();
    }
  }, [supabase, tenant?.id]);

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
          if (
            prev && 
            prev.id === newTenant.id && 
            prev.name === newTenant.name && 
            prev.subdomain === newTenant.subdomain &&
            prev.logoUrl === newTenant.logoUrl
          ) {
            return prev;
          }
          return newTenant;
        });

        // Configure raw createClient/createTenantClient calls to use the
        // tenant project and purge any clients created from the platform
        // fallback during the initial resolve race.
        configureTenantBrowserClient(data.data.supabaseUrl, data.data.supabaseAnonKey);

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

  // Gate rendering on tenant resolution: children must never mount a Supabase
  // client before the school node's keys are known. Previously, no-argument
  // createClient()/createTenantClient() calls in first-render effects silently
  // bound to the platform (master) project — producing "not signed in" and
  // "column does not exist" errors on first page load.
  if (!tenant && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Resolving Institution...</p>
        </div>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ tenant, supabase, isLoading, error, academicCycle, refreshAcademicCycle: fetchAcademicCycle }}>
      {children}
    </TenantContext.Provider>
  );
}

// Build Trigger: Ensuring latest fail-safe context is deployed to unblock Master Console prerendering.
export function useTenant() {
  const context = useContext(TenantContext);
  // Return a safe null-state if used outside a provider (e.g. Master Console)
  return context || { 
    tenant: null, 
    supabase: null, 
    isLoading: false, 
    error: null,
    academicCycle: null,
    refreshAcademicCycle: async () => {}
  };
}

export function useTenantSupabase() {
  const { supabase } = useTenant();
  return supabase;
}
