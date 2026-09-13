'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Key, 
  History, 
  ArrowRight,
  UserCheck,
  Lock,
  Clock,
  EyeOff,
  GraduationCap,
  FileCheck2,
  Loader2,
  CheckCircle2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTenant } from '@/components/providers/tenant-provider';
import { getSchoolData, updateSecuritySettings, type SecuritySettingsPayload } from '@/app/actions/tenant-actions';
import { getAuditLogs } from '@/app/actions/subadmin-actions';
import { TwoFactorSetupModal } from '@/components/admin/two-factor-setup-modal';
import { createTenantClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const DEFAULT_SETTINGS: SecuritySettingsPayload = {
  require_password_change: true,
  enhanced_password_policy: true,
  session_timeout_minutes: 60,
  parent_contact_privacy: true,
  student_portal_access: true,
  lock_past_term_results: false,
};

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'recently';
  }
}

export default function SecuritySettings() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SecuritySettingsPayload>(DEFAULT_SETTINGS);
  
  // Real Audit Log stream
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 2FA state
  const [mfaActive, setMfaActive] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  const supabase = createTenantClient();

  const loadData = useCallback(async () => {
    if (!subdomain) return;
    setLoading(true);
    try {
      // 1. Fetch school record
      const school = await getSchoolData(subdomain);
      const effectiveSchoolId = school?.id || tenant?.id;
      if (effectiveSchoolId) {
        setSchoolId(effectiveSchoolId);
      }

      if (school?.security_settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...school.security_settings,
        });
      }

      // 2. Fetch real recent audit logs
      if (effectiveSchoolId) {
        setLoadingLogs(true);
        const auditRes = await getAuditLogs(effectiveSchoolId, subdomain, { limit: 3 });
        if (auditRes.success && auditRes.data) {
          setRecentLogs(auditRes.data);
        }
        setLoadingLogs(false);
      }

      // 3. Check MFA status for current admin
      const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
      const verified = mfaFactors?.totp?.some((f) => f.status === 'verified');
      setMfaActive(!!verified);

    } catch (err: any) {
      console.error('[SecuritySettings Load Error]:', err);
      toast.error('Failed to load security policies.');
    } finally {
      setLoading(false);
    }
  }, [subdomain, tenant?.id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generic policy update handler with optimistic update
  const handleToggle = async (key: keyof SecuritySettingsPayload, value: any) => {
    if (!schoolId) {
      toast.error('School context is not ready.');
      return;
    }

    const previousSettings = { ...settings };
    const nextSettings = { ...settings, [key]: value };

    // Optimistic UI update
    setSettings(nextSettings);
    setSavingKey(key);

    try {
      const res = await updateSecuritySettings(subdomain, schoolId, nextSettings);
      if (!res.success) {
        throw new Error(res.error || 'Failed to save security setting.');
      }
      toast.success('Security policy updated.');

      // Refresh recent activity to show the newly generated audit log
      const auditRes = await getAuditLogs(schoolId, subdomain, { limit: 3 });
      if (auditRes.success && auditRes.data) {
        setRecentLogs(auditRes.data);
      }
    } catch (err: any) {
      // Rollback on error
      setSettings(previousSettings);
      toast.error(err.message || 'Failed to update policy.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Primary Policy Console (Spans 2 columns) */}
        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] space-y-8 col-span-1 lg:col-span-2 border border-border/60 bg-card/60 text-card-foreground shadow-sm">
          
          {/* Section Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  Security & Access Policies
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                  Institutional authentication standards, credential rules, and student data privacy.
                </p>
              </div>
            </div>

            {loading && (
              <Loader2 className="size-5 text-primary animate-spin shrink-0" />
            )}
          </div>

          {/* Group 1: Staff & Authentication Governance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Staff & Account Governance
              </h3>
            </div>

            {/* Policy: Mandatory First-Login Password Change */}
            <div className="flex items-center justify-between p-5 bg-muted/30 hover:bg-muted/50 transition-colors border border-border/70 rounded-2xl gap-4">
              <div className="flex gap-3.5">
                <div className="p-2 bg-card rounded-xl border border-border/80 shadow-sm self-start shrink-0">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">Require Password Reset on First Login</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Force newly invited teachers and administrators to choose a new private password upon their initial sign-in.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savingKey === 'require_password_change' && <Loader2 className="size-4 text-primary animate-spin" />}
                <Switch 
                  checked={!!settings.require_password_change} 
                  onCheckedChange={(val) => handleToggle('require_password_change', val)}
                  disabled={loading || savingKey !== null}
                />
              </div>
            </div>

            {/* Policy: Enhanced Staff Password Policy */}
            <div className="flex items-center justify-between p-5 bg-muted/30 hover:bg-muted/50 transition-colors border border-border/70 rounded-2xl gap-4">
              <div className="flex gap-3.5">
                <div className="p-2 bg-card rounded-xl border border-border/80 shadow-sm self-start shrink-0">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">Enhanced Staff Password Complexity</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Enforce minimum 8 characters including mixed uppercase, lowercase, numbers, and special symbols for all staff.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savingKey === 'enhanced_password_policy' && <Loader2 className="size-4 text-primary animate-spin" />}
                <Switch 
                  checked={!!settings.enhanced_password_policy} 
                  onCheckedChange={(val) => handleToggle('enhanced_password_policy', val)}
                  disabled={loading || savingKey !== null}
                />
              </div>
            </div>

            {/* Policy: Session Inactivity Timeout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-muted/30 hover:bg-muted/50 transition-colors border border-border/70 rounded-2xl gap-4">
              <div className="flex gap-3.5">
                <div className="p-2 bg-card rounded-xl border border-border/80 shadow-sm self-start shrink-0">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">Session Inactivity Timeout</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Automatically terminate inactive administrative portal sessions to protect unattended staff workstations.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {savingKey === 'session_timeout_minutes' && <Loader2 className="size-4 text-primary animate-spin" />}
                <Select
                  value={String(settings.session_timeout_minutes || 60)}
                  onValueChange={(val) => handleToggle('session_timeout_minutes', parseInt(val))}
                  disabled={loading || savingKey !== null}
                >
                  <SelectTrigger className="w-[140px] h-9 bg-card border-border font-bold text-xs rounded-xl">
                    <SelectValue placeholder="Timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="60">1 Hour</SelectItem>
                    <SelectItem value="240">4 Hours</SelectItem>
                    <SelectItem value="1440">24 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Group 2: Student & Data Privacy Governance */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <EyeOff className="size-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Privacy & Records Protection
              </h3>
            </div>

            {/* Policy: Parent Directory Contact Privacy */}
            <div className="flex items-center justify-between p-5 bg-muted/30 hover:bg-muted/50 transition-colors border border-border/70 rounded-2xl gap-4">
              <div className="flex gap-3.5">
                <div className="p-2 bg-card rounded-xl border border-border/80 shadow-sm self-start shrink-0">
                  <EyeOff className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">Parent Contact Privacy</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Mask personal guardian phone numbers and residential addresses from other parents across classroom rosters.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savingKey === 'parent_contact_privacy' && <Loader2 className="size-4 text-primary animate-spin" />}
                <Switch 
                  checked={!!settings.parent_contact_privacy} 
                  onCheckedChange={(val) => handleToggle('parent_contact_privacy', val)}
                  disabled={loading || savingKey !== null}
                />
              </div>
            </div>

            {/* Policy: Student Direct Portal Sign-In */}
            <div className="flex items-center justify-between p-5 bg-muted/30 hover:bg-muted/50 transition-colors border border-border/70 rounded-2xl gap-4">
              <div className="flex gap-3.5">
                <div className="p-2 bg-card rounded-xl border border-border/80 shadow-sm self-start shrink-0">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">Student Direct Portal Sign-In</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Allow students to sign into their CBT and result portal directly using their Admission Number and password.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savingKey === 'student_portal_access' && <Loader2 className="size-4 text-primary animate-spin" />}
                <Switch 
                  checked={!!settings.student_portal_access} 
                  onCheckedChange={(val) => handleToggle('student_portal_access', val)}
                  disabled={loading || savingKey !== null}
                />
              </div>
            </div>

            {/* Policy: Term Result Tamper Locking */}
            <div className="flex items-center justify-between p-5 bg-muted/30 hover:bg-muted/50 transition-colors border border-border/70 rounded-2xl gap-4">
              <div className="flex gap-3.5">
                <div className="p-2 bg-card rounded-xl border border-border/80 shadow-sm self-start shrink-0">
                  <FileCheck2 className="w-4 h-4 text-purple-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">Academic Score Lock (Tamper Protection)</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Lock score modifications across all classes once term examinations and assessment sheets are finalized.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savingKey === 'lock_past_term_results' && <Loader2 className="size-4 text-primary animate-spin" />}
                <Switch 
                  checked={!!settings.lock_past_term_results} 
                  onCheckedChange={(val) => handleToggle('lock_past_term_results', val)}
                  disabled={loading || savingKey !== null}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Audit Stream & 2FA Console */}
        <div className="space-y-6 h-full flex flex-col">
          
          {/* Live Security Audit Log Widget */}
          <div className="glass-panel p-6 sm:p-7 rounded-[2rem] flex-1 space-y-5 border border-border/60 bg-card/60 text-card-foreground shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Recent Security Activity</h4>
                  <p className="text-[10px] text-muted-foreground">Live event stream from institutional audit log</p>
                </div>
              </div>
              {loadingLogs && <Loader2 className="size-3.5 text-muted-foreground animate-spin" />}
            </div>

            <div className="space-y-3 pt-1">
              {loadingLogs ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="size-5 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">Loading audit records...</span>
                </div>
              ) : recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/20 border border-border/50">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-foreground leading-tight">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {formatTimeAgo(log.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        By {log.actor_name || 'System'}
                      </span>
                      {log.module && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 ml-auto border-border text-muted-foreground uppercase">
                          {log.module}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
                  <CheckCircle2 className="size-6 text-muted-foreground/50 mx-auto" />
                  <p>No security activity logged yet.</p>
                </div>
              )}
            </div>

            <Link href="/dashboard/admin/settings/audit-logs" className="w-full block pt-1">
              <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground group hover:text-primary py-4 rounded-xl">
                View Full Audit Trail <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Interactive Two-Factor Auth Card */}
          <div className="glass-panel p-6 sm:p-7 rounded-[2rem] bg-card text-card-foreground border border-border/80 space-y-4 relative overflow-hidden group shadow-md">
            {/* Subtle background watermark */}
            <Key className="absolute -right-4 -bottom-4 w-28 h-28 text-muted/10 opacity-20 rotate-12 transition-transform group-hover:rotate-0 pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-primary/10 rounded-xl w-fit text-primary">
                <Key className="w-5 h-5" />
              </div>
              <Badge 
                variant="outline" 
                className={mfaActive 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-bold gap-1"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold"
                }
              >
                {mfaActive ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    Protected
                  </>
                ) : (
                  "Optional"
                )}
              </Badge>
            </div>

            <div>
              <h4 className="font-bold text-base text-foreground">Two-Factor Auth (2FA)</h4>
              <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
                {mfaActive 
                  ? "Your account is secured with a TOTP authenticator app. An OTP is required on every login."
                  : "Enforce time-based one-time passwords from Google Authenticator, Authy, or 1Password."
                }
              </p>
            </div>

            <Button 
              onClick={() => setIs2FAModalOpen(true)}
              variant={mfaActive ? "outline" : "default"}
              className={`w-full h-10 rounded-xl text-xs font-bold transition-all shadow-md ${
                mfaActive 
                  ? "border-border hover:bg-muted"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
              }`}
            >
              {mfaActive ? "Manage 2FA Settings" : "Enable 2FA Now"}
            </Button>
          </div>
        </div>
      </div>

      {/* 2FA Enrollment & Management Modal */}
      <TwoFactorSetupModal
        open={is2FAModalOpen}
        onOpenChange={setIs2FAModalOpen}
        onStatusChange={setMfaActive}
      />
    </div>
  );
}
