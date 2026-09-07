"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Landmark,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Phone,
  Mail,
} from "lucide-react";
import { formatNGN, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";

declare const PaystackPop: any;

interface FeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: any;
  child: any;
  schoolBank: {
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
    officialPhone?: string | null;
    officialEmail?: string | null;
  } | null;
  paystackPublicKey: string | null;
  parentEmail?: string;
  onPaymentSuccess: () => void;
  supabase: any;
}

export function FeePaymentModal({
  isOpen,
  onClose,
  structure,
  child,
  schoolBank,
  paystackPublicKey,
  parentEmail,
  onPaymentSuccess,
  supabase,
}: FeePaymentModalProps) {
  const hasPaystack = !!paystackPublicKey;
  const hasBankDetails = !!(schoolBank?.accountNumber && schoolBank?.bankName);

  // Tab selection: 'online' | 'transfer'
  const [selectedMethod, setSelectedMethod] = useState<"online" | "transfer">(
    hasPaystack ? "online" : "transfer"
  );

  // Transfer form state
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [bankReference, setBankReference] = useState("");
  const [senderName, setSenderName] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  // Loading & copy states
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedNarration, setCopiedNarration] = useState(false);

  if (!structure) return null;

  const narrationText = child?.admission_no
    ? `${child.admission_no} - ${structure.name}`
    : `Tuition - ${structure.name}`;

  const handleCopy = (text: string, type: "account" | "narration") => {
    navigator.clipboard.writeText(text);
    if (type === "account") {
      setCopiedAccount(true);
      toast.success("Account number copied to clipboard");
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedNarration(true);
      toast.success("Narration text copied to clipboard");
      setTimeout(() => setCopiedNarration(false), 2000);
    }
  };

  // 1. Paystack Checkout Handler
  const handlePaystackCheckout = async () => {
    if (!child?.id || !supabase) return;
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in again to complete checkout.");
        return;
      }

      const res = await fetch(`${getBackendUrl()}/payments/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          feeStructureId: structure.id,
          amount: structure.amount,
          studentId: child.id,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Failed to initialize payment");

      if (typeof PaystackPop === "undefined") {
        throw new Error("Payment gateway is loading. Please try again in a few moments.");
      }

      const handler = PaystackPop.setup({
        key: paystackPublicKey,
        email: session.user.email || parentEmail,
        amount: structure.amount * 100, // Paystack expects kobo
        ref: result.data.reference,
        onClose: () => {
          toast.info("Payment window closed");
          setIsProcessing(false);
        },
        callback: () => {
          toast.success("Payment received! Updating your records...");
          setIsProcessing(false);
          onPaymentSuccess();
          onClose();
        },
      });

      handler.openIframe();
    } catch (error: any) {
      toast.error(error.message || "Checkout failed");
      setIsProcessing(false);
    }
  };

  // 2. Direct Bank Transfer Submission Handler
  const handleSubmitBankTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankReference.trim()) {
      toast.error("Please enter the transaction reference / session ID");
      return;
    }
    if (!senderName.trim()) {
      toast.error("Please enter the sender's account name");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in again to submit transfer.");
        return;
      }

      const res = await fetch(`${getBackendUrl()}/payments/submit-bank-transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          feeStructureId: structure.id,
          studentId: child.id,
          bankReference: bankReference.trim(),
          senderName: senderName.trim(),
          notes: transferNotes.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Failed to submit transfer record");

      toast.success("Transfer submitted for confirmation!", {
        description: "The school bursar has been notified to verify your payment.",
      });

      setShowTransferForm(false);
      setBankReference("");
      setSenderName("");
      setTransferNotes("");
      onPaymentSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit bank transfer");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-3xl border-border bg-card">
        {/* Header Summary */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border-b border-border/50">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider py-0.5">
                Term {structure.term} • {structure.academic_year}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                For {child?.profiles?.full_name || "Student"}
              </span>
            </div>
            <DialogTitle className="text-2xl font-black text-foreground">
              {structure.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Admission No: <span className="font-mono font-bold text-foreground">{child?.admission_no || "—"}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex items-baseline justify-between bg-background/60 p-4 rounded-2xl border border-border/40 backdrop-blur-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Amount Due
            </span>
            <span className="text-3xl font-black text-primary">
              {formatNGN(structure.amount)}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[68vh] overflow-y-auto">
          {/* Method Selection (if both available) */}
          {hasPaystack && hasBankDetails && (
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted/60 rounded-2xl border border-border/50">
              <button
                type="button"
                onClick={() => setSelectedMethod("online")}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all ${
                  selectedMethod === "online"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard className="size-4 text-primary" />
                <span>Pay Online</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.2 rounded-full font-black uppercase">Instant</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("transfer")}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all ${
                  selectedMethod === "transfer"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Landmark className="size-4 text-emerald-600" />
                <span>Bank Transfer</span>
              </button>
            </div>
          )}

          {/* Scenario 1: Online Paystack Selected */}
          {selectedMethod === "online" && hasPaystack && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Instant Automated Verification</h4>
                    <p className="text-xs text-muted-foreground">
                      Debit Cards, Bank Transfer, USSD & Apple Pay supported via Paystack.
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed pl-13">
                  Once payment completes, your transaction is instantly confirmed and an official printable PDF receipt is generated immediately.
                </div>
              </div>

              <Button
                onClick={handlePaystackCheckout}
                disabled={isProcessing}
                className="w-full h-14 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <CreditCard className="size-5" />
                )}
                <span>Pay {formatNGN(structure.amount)} Online</span>
                {!isProcessing && <ArrowRight className="size-4 ml-auto" />}
              </Button>
            </div>
          )}

          {/* Scenario 2: Direct Bank Transfer Selected */}
          {selectedMethod === "transfer" && hasBankDetails && (
            <div className="space-y-6">
              {/* Verified Account Card */}
              <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                    <Landmark className="size-3.5" /> Official School Account
                  </span>
                  <Badge className="bg-emerald-500 text-white font-bold text-[9px] px-2 py-0 border-none">
                    Verified
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">Bank Name</div>
                  <div className="text-lg font-black text-foreground">{schoolBank?.bankName}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">Account Number</div>
                  <div className="flex items-center justify-between bg-background/80 p-3 rounded-xl border border-border/40">
                    <span className="font-mono text-xl sm:text-2xl font-black text-foreground tracking-wider">
                      {schoolBank?.accountNumber}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(schoolBank?.accountNumber || "", "account")}
                      className="gap-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg px-3"
                    >
                      {copiedAccount ? <Check className="size-4" /> : <Copy className="size-4" />}
                      <span>{copiedAccount ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">Account Name</div>
                  <div className="text-sm font-bold text-foreground">{schoolBank?.accountName}</div>
                </div>

                {/* Narration Guidance */}
                <div className="bg-background/80 p-3.5 rounded-xl border border-border/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Required Transfer Narration / Remark
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(narrationText, "narration")}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      {copiedNarration ? <Check className="size-3" /> : <Copy className="size-3" />}
                      <span>{copiedNarration ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="font-mono font-bold text-xs text-foreground bg-muted/60 p-2 rounded-lg break-all">
                    {narrationText}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    ⚠️ Include this in your bank app narration so the bursar can identify your payment.
                  </p>
                </div>
              </div>

              {/* Action: Toggle Proof Submission */}
              {!showTransferForm ? (
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => setShowTransferForm(true)}
                    variant="outline"
                    className="w-full h-12 rounded-xl font-bold text-xs gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50"
                  >
                    <Check className="size-4" />
                    <span>I Have Completed This Transfer</span>
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    After transferring, click above to submit your bank reference for bursar confirmation.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitBankTransfer} className="space-y-4 pt-2 animate-in fade-in">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Bank Reference / Transaction ID *
                    </Label>
                    <Input
                      placeholder="e.g. TRF-29402104 or Zenith Session ID"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      className="h-11 rounded-xl font-mono text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Sender Account Name *
                    </Label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="h-11 rounded-xl text-sm font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Notes / Remarks (Optional)
                    </Label>
                    <Input
                      placeholder="e.g. Paid via Zenith mobile app"
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      className="h-11 rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowTransferForm(false)}
                      className="flex-1 h-12 rounded-xl font-semibold text-xs"
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 h-12 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      <span>Submit for Verification</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Scenario 3: Neither Online Nor Bank Details Active */}
          {!hasPaystack && !hasBankDetails && (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4 text-center">
              <div className="size-12 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">Payment Details Pending</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Official electronic payment channels have not yet been published online by the school administration.
                  Please contact the Bursary / Accounts office directly for offline deposit slips or teller instructions.
                </p>
              </div>

              {(schoolBank?.officialPhone || schoolBank?.officialEmail) && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {schoolBank.officialPhone && (
                    <a
                      href={`tel:${schoolBank.officialPhone}`}
                      className="flex items-center gap-2 text-xs font-bold text-primary hover:underline bg-background/80 px-4 py-2.5 rounded-xl border border-border/40"
                    >
                      <Phone className="size-3.5" />
                      <span>{schoolBank.officialPhone}</span>
                    </a>
                  )}
                  {schoolBank.officialEmail && (
                    <a
                      href={`mailto:${schoolBank.officialEmail}`}
                      className="flex items-center gap-2 text-xs font-bold text-primary hover:underline bg-background/80 px-4 py-2.5 rounded-xl border border-border/40"
                    >
                      <Mail className="size-3.5" />
                      <span>{schoolBank.officialEmail}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
