"use client";

import React, { useState, useEffect } from "react";
import { 
  Key, 
  ShieldCheck, 
  Loader2, 
  Copy, 
  Check, 
  AlertTriangle,
  QrCode,
  Lock,
  Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TwoFactorSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (isActive: boolean) => void;
}

export function TwoFactorSetupModal({
  open,
  onOpenChange,
  onStatusChange,
}: TwoFactorSetupModalProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);
  const [qrCodeUri, setQrCodeUri] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const supabase = createTenantClient();

  useEffect(() => {
    if (open) {
      checkExistingMFA();
    } else {
      setVerifyCode("");
      setCopied(false);
    }
  }, [open]);

  async function checkExistingMFA() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const verifiedFactor = data?.totp?.find((f) => f.status === "verified");
      if (verifiedFactor) {
        setActiveFactorId(verifiedFactor.id);
        onStatusChange?.(true);
      } else {
        setActiveFactorId(null);
        onStatusChange?.(false);
        // Start fresh enrollment
        await startEnrollment();
      }
    } catch (err: any) {
      console.error("[MFA Check Error]:", err.message);
      toast.error("Failed to check 2FA status.");
    } finally {
      setLoading(false);
    }
  }

  async function startEnrollment() {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Klaxtrix SMS",
      });

      if (error) throw error;

      if (data) {
        setEnrolledFactorId(data.id);
        setQrCodeUri(data.totp.qr_code);
        setSecretKey(data.totp.secret);
      }
    } catch (err: any) {
      console.error("[MFA Enroll Error]:", err.message);
      toast.error(err.message || "Failed to initiate 2FA enrollment.");
    }
  }

  async function handleVerify() {
    if (!enrolledFactorId || verifyCode.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit code from your authenticator app.");
      return;
    }

    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrolledFactorId,
      });

      if (challengeError) throw challengeError;

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrolledFactorId,
        challengeId: challengeData.id,
        code: verifyCode.trim(),
      });

      if (verifyError) throw verifyError;

      toast.success("Two-Factor Authentication activated successfully!");
      setActiveFactorId(enrolledFactorId);
      onStatusChange?.(true);
      onOpenChange(false);
    } catch (err: any) {
      console.error("[MFA Verification Error]:", err.message);
      toast.error(err.message || "Invalid verification code. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleDisable2FA() {
    if (!activeFactorId) return;

    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: activeFactorId,
      });

      if (error) throw error;

      toast.success("Two-Factor Authentication has been disabled.");
      setActiveFactorId(null);
      onStatusChange?.(false);
      onOpenChange(false);
    } catch (err: any) {
      console.error("[MFA Unenroll Error]:", err.message);
      toast.error(err.message || "Failed to disable 2FA.");
    } finally {
      setUnenrolling(false);
    }
  }

  const handleCopySecret = () => {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[2rem] border border-border/80 shadow-2xl backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Key className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Two-Factor Authentication
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground font-medium">
            Protect your administrator portal with time-based one-time password (TOTP) security.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Checking authentication factors...</p>
          </div>
        ) : activeFactorId ? (
          /* Active 2FA State */
          <div className="space-y-6 py-2">
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
              <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  Two-Factor Authentication is Active
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Your administrator account requires a 6-digit TOTP code from your mobile authenticator app whenever signing in.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border/60 bg-muted/30 space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Enrolled Factor</span>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <QrCode className="size-3.5 text-primary" /> Authenticator App (TOTP)
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-bold">
                  Verified
                </Badge>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="destructive"
                className="w-full h-11 rounded-xl text-xs font-bold gap-2"
                onClick={handleDisable2FA}
                disabled={unenrolling}
              >
                {unenrolling ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Disable 2FA
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Setup / Enrollment State */
          <div className="space-y-5 py-2">
            <div className="space-y-2 text-xs">
              <p className="font-bold text-foreground">Step 1: Scan QR Code</p>
              <p className="text-muted-foreground leading-relaxed">
                Open Google Authenticator, Authy, or 1Password and scan the QR code below:
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-border/80 shadow-sm w-fit mx-auto">
              {qrCodeUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={qrCodeUri} 
                  alt="2FA QR Code" 
                  className="size-44 object-contain rounded-lg"
                />
              ) : (
                <div className="size-44 flex items-center justify-center">
                  <Loader2 className="size-6 text-primary animate-spin" />
                </div>
              )}
            </div>

            {/* Manual Secret Key */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Or enter code manually:
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono select-all text-foreground truncate">
                  {secretKey || "Loading secret..."}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl shrink-0"
                  onClick={handleCopySecret}
                >
                  {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-xs font-bold text-foreground">
                Step 2: Enter 6-digit Authenticator Code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center text-xl tracking-[0.4em] font-mono font-black rounded-xl bg-background/60 border-border/80"
                autoComplete="one-time-code"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                className="w-full h-11 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 gap-2"
                onClick={handleVerify}
                disabled={verifying || verifyCode.trim().length !== 6}
              >
                {verifying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Verify & Enable 2FA
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
