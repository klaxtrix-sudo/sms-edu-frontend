export interface AuditLogEntry {
  schoolId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  module: string;
  targetId?: string | null;
  targetName?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
}

/**
 * Non-blocking institutional audit logging utility.
 * Records administrative and sensitive state changes into public.audit_logs.
 */
export async function recordAuditLog(
  tenantSupabase: any,
  entry: AuditLogEntry
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await tenantSupabase.from("audit_logs").insert({
      school_id: entry.schoolId,
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      actor_role: entry.actorRole,
      action: entry.action,
      module: entry.module,
      target_id: entry.targetId ?? null,
      target_name: entry.targetName ?? null,
      details: entry.details ?? {},
      ip_address: entry.ipAddress ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[AuditService] Failed to record audit log:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[AuditService] Unexpected error recording audit log:", err.message);
    return { success: false, error: err.message };
  }
}
