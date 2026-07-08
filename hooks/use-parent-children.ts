"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/components/providers/tenant-provider";

/**
 * Shape of a linked child returned by the parent-children query.
 * The Supabase select joins `classes` and `profiles!students_user_id_fkey`,
 * so each row carries nested `classes` and `profiles` objects.
 */
export interface ParentChild {
  id: string;
  admission_no: string;
  user_id: string;
  class_id: string | null;
  school_id: string;
  blood_group: string | null;
  genotype: string | null;
  medical_conditions: string | null;
  state_of_origin: string | null;
  lga: string | null;
  religion: string | null;
  residential_address: string | null;
  previous_school: string | null;
  classes: { name: string } | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    gender: string | null;
    date_of_birth: string | null;
    address: string | null;
  } | null;
}

interface UseParentChildrenResult {
  /** All children linked to the signed-in parent. */
  children: ParentChild[];
  /** A single child when `childId` is passed; null while loading/not found. */
  child: ParentChild | null;
  /** True while the tenant is resolving or the query is in flight. */
  loading: boolean;
  /** Non-null when the fetch failed (distinct from "no children"). */
  error: string | null;
  /** Re-run the query. */
  refetch: () => Promise<void>;
}

/**
 * Shared data hook for the parent dashboard.
 *
 * Uses the tenant-aware Supabase client from `useTenant()` so it never queries
 * the master DB by accident (fixes the `createTenantClient()` window-globals
 * race that the raw `useEffect` pages used to have).
 *
 * @param childId Optional child id. When provided, `child` is populated with
 *                that single child (ownership still enforced via `parent_id`).
 */
export function useParentChildren(childId?: string): UseParentChildrenResult {
  const { supabase, isLoading: isTenantLoading } = useTenant();
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const SELECT = `
    id,
    admission_no,
    user_id,
    class_id,
    school_id,
    blood_group,
    genotype,
    medical_conditions,
    state_of_origin,
    lga,
    religion,
    residential_address,
    previous_school,
    classes (name),
    profiles!students_user_id_fkey (full_name, avatar_url, email, phone, gender, date_of_birth, address)
  `;

  const fetchChildren = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not signed in.");
        return;
      }

      const { data, error: queryError } = await supabase
        .from("students")
        .select(SELECT)
        .eq("parent_id", session.user.id);

      if (queryError) throw queryError;
      setChildren((data as unknown as ParentChild[]) ?? []);
    } catch (err: any) {
      setError(err?.message || "Failed to load your children.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isTenantLoading || !supabase) return;
    fetchChildren();
  }, [isTenantLoading, supabase, fetchChildren]);

  const child = childId
    ? children.find((c) => c.id === childId) ?? null
    : null;

  return {
    children,
    child,
    loading: isTenantLoading || loading,
    error,
    refetch: fetchChildren,
  };
}
