"use client";

import React, { useState, useEffect } from "react";
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
  CheckCircle2,
  Download,
  Clock,
} from "lucide-react";
import { formatNGN, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PaymentReceiptPDF } from "@/components/shared/payment-receipt-template";

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
  schoolName?: string;
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
  schoolName = "Klaxtrix Institution",
}: FeePaymentModalProps) {
  const hasPaystack = !!paystackPublicKey;
  const hasBankDetails = !!(schoolBank?.accountNumber && schoolBank?.bankName);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Modal Step: 'checkout' | 'paystack_success' | 'transfer_submitted'
  const [modalStep, setModalStep] = useState<"checkout" | "paystack_success" | "transfer_submitted">("checkout");

  // Tab selection: 'online' | 'transfer'
  const [selectedMethod, setSelectedMethod] = useState<"online" | "transfer">(
    hasPaystack ? "online" : "transfer"
  );

  // Transfer form state
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [bankReference, setBankReference] = useState("");
  const [senderName, setSenderName] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [submittedTransferRef, setSubmittedTransferRef] = useState("");

  // Completed Receipt state (for immediate download on Paystack checkout success)
  const [completedReceipt, setCompletedReceipt] = useState<{
    reference: string;
    parentName: string;
    studentName: string;
    admissionNo: string;
    description: string;
    date: string;
    amount: number;
  } | null>(null);

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

  const resetModalState = () => {
    setModalStep("checkout");
    setShowTransferForm(false);
    setBankReference("");
    setSenderName("");
    setTransferNotes("");
    setCompletedReceipt(null);
    setSubmittedTransferRef("");
    setIsProcessing(false);
  };

  const handleModalClose = () => {
    resetModalState();
    onClose();
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

      const pRef = result.data.reference;
      const pParentName = session.user.user_metadata?.full_name || parentEmail || "Parent / Guardian";
      const pStudentName = child?.profiles?.full_name || "Student";
      const pAdmissionNo = child?.admission_no || "—";
      const pDesc = structure.name;
      const pAmount = Number(structure.amount);

      const handler = PaystackPop.setup({
        key: paystackPublicKey,
        email: session.user.email || parentEmail,
        amount: structure.amount * 100, // Paystack expects kobo
        ref: pRef,
        onClose: () => {
          toast.info("Payment window closed");
          setIsProcessing(false);
        },
        callback: () => {
          setIsProcessing(false);
          // Transition immediately to the Receipt view with download option!
          setCompletedReceipt({
            reference: pRef,
            parentName: pParentName,
            studentName: pStudentName,
            admissionNo: pAdmissionNo,
            description: pDesc,
            date: new Date().toISOString(),
            amount: pAmount,
          });
          setModalStep("paystack_success");
          onPaymentSuccess();
          toast.success("Payment confirmed! Your official receipt is ready.");
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

      setSubmittedTransferRef(result.data?.reference || "BT-TRANSFER");
      setModalStep("transfer_submitted");
      onPaymentSuccess();
      toast.success("Bank transfer submitted for bursary verification!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit bank transfer");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-3xl border-border bg-card shadow-2xl">
        
        {/* VIEW 1: PAYSTACK SUCCESS & IMMEDIATE RECEIPT DOWNLOAD */}
        {modalStep === "paystack_success" && completedReceipt && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-400">
            <div className="text-center space-y-3 pt-2">
              <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="size-9 text-emerald-500 animate-in zoom-in-75 duration-300" />
              </div>
              <div>
                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-3 py-0.5 border-none mb-1">
                  PAYMENT VERIFIED & CLEARED
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Payment Successful!
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Your payment has been recorded in the institutional ledger. Your official receipt is ready.
                </DialogDescription>
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl p-5 bg-muted/40 border border-border/50 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Beneficiary</p>
                  <p className="text-sm font-bold text-foreground">{completedReceipt.studentName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono font-semibold">Adm: {completedReceipt.admissionNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Amount Cleared</p>
                  <p className="text-xl font-black text-emerald-500 tabular-nums">{formatNGN(completedReceipt.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Fee Description</span>
                  <p className="font-semibold text-foreground text-xs truncate">{completedReceipt.description}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Payment Reference</span>
                  <p className="font-mono text-xs font-bold text-foreground truncate">{completedReceipt.reference}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {isMounted ? (
                <PDFDownloadLink
                  document={
                    <PaymentReceiptPDF
                      receipt={completedReceipt}
                      schoolName={schoolName}
                    />
                  }
                  fileName={`receipt-${completedReceipt.reference}.pdf`}
                  className="w-full"
                >
                  {({ loading }: any) => (
                    <Button
                      type="button"
                      disabled={loading}
                      className="w-full h-12 rounded-2xl font-black text-sm gap-2 bg-primary text-white shadow-lg shadow-primary/20"
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Download Official Receipt (PDF)
                    </Button>
                  )}
                </PDFDownloadLink>
              ) : (
                <Button
                  type="button"
                  disabled
                  className="w-full h-12 rounded-2xl font-black text-sm gap-2 bg-primary text-white shadow-lg shadow-primary/20"
                >
                  <Loader2 className="size-4 animate-spin" />
                  Preparing PDF...
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                className="w-full h-12 rounded-2xl font-bold text-xs border-border"
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* VIEW 2: BANK TRANSFER SUBMITTED (PENDING BURSAR VERIFICATION) */}
        {modalStep === "transfer_submitted" && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-400">
            <div className="text-center space-y-3 pt-2">
              <div className="size-16 rounded-full bg-orange-500/15 text-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
                <Clock className="size-9 text-orange-500 animate-pulse" />
              </div>
              <div>
                <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/10 font-bold text-[10px] px-3 py-0.5 mb-1">
                  PENDING BURSARY VERIFICATION
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Transfer Submitted!
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Your transfer proof has been routed to the school bursar for verification.
                </DialogDescription>
              </div>
            </div>

            <div className="rounded-2xl p-5 bg-muted/40 border border-border/50 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground font-bold">Submission Reference:</span>
                <span className="font-mono font-black text-foreground">{submittedTransferRef}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground font-bold">Amount to Reconcile:</span>
                <span className="font-black text-foreground">{formatNGN(structure.amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-bold">Student:</span>
                <span className="font-bold text-foreground">{child?.profiles?.full_name}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" /> What happens next?
              </p>
              <p>
                The school bursar has been notified. As soon as the funds are verified in the school bank account, you will receive an in-app alert, and your official receipt will automatically be available for download in your payment history.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleModalClose}
              className="w-full h-12 rounded-2xl font-black text-sm bg-primary text-white shadow-md"
            >
              Done & View Payment History
            </Button>
          </div>
        )}

        {/* VIEW 3: MAIN CHECKOUT FLOW */}
        {modalStep === "checkout" && (
          <>
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

              {/* Amount Cleared Badge */}
              <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-background/80 p-4 backdrop-blur-md border border-border/50">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Payable
                </span>
                <span className="text-3xl font-black text-foreground">
                  {formatNGN(structure.amount)}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Payment Channel Selector */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-muted/50 rounded-2xl border border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod("online");
                    setShowTransferForm(false);
                  }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all ${
                    selectedMethod === "online"
                      ? "bg-background text-foreground shadow-sm shadow-black/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CreditCard className="size-4 text-primary" />
                  Instant Online
                  {hasPaystack && (
                    <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      Instant Receipt
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("transfer")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all ${
                    selectedMethod === "transfer"
                      ? "bg-background text-foreground shadow-sm shadow-black/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Landmark className="size-4 text-emerald-500" />
                  Bank Transfer
                  {hasBankDetails && (
                    <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                      Manual
                    </span>
                  )}
                </button>
              </div>

              {/* METHOD 1: PAYSTACK ONLINE CHECKOUT */}
              {selectedMethod === "online" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {hasPaystack ? (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <ShieldCheck className="size-4 text-emerald-500" />
                          Secure 256-bit Encrypted Checkout
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Pay instantly using your Debit/Credit card, Bank USSD code, or mobile bank transfer. Receipts are generated and downloadable immediately upon completion.
                        </p>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground pt-1">
                          <Badge variant="outline" className="text-[10px] font-mono">Mastercard</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">Visa</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">Verve</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">USSD</Badge>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handlePaystackCheckout}
                        disabled={isProcessing}
                        className="w-full h-14 rounded-2xl font-black text-sm gap-2 shadow-lg shadow-primary/25 bg-primary text-white hover:bg-primary/90 transition-all"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="size-5 animate-spin" />
                            Initializing Secure Gateway...
                          </>
                        ) : (
                          <>
                            Pay {formatNGN(structure.amount)} Online
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-muted/40 border border-dashed border-border text-center space-y-3">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <AlertCircle className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">Online Gateway Currently Unavailable</p>
                        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                          Online checkout is currently being set up. Please use the Direct Bank Transfer option.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedMethod("transfer")}
                        className="text-xs font-bold rounded-xl"
                      >
                        Switch to Bank Transfer
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 2: DIRECT BANK TRANSFER */}
              {selectedMethod === "transfer" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {hasBankDetails ? (
                    <>
                      {/* Bank Details Display Card */}
                      <div className="rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-emerald-500/[0.02] to-transparent p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border/50">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bank Name</span>
                            <p className="text-base font-black text-foreground">{schoolBank.bankName}</p>
                          </div>
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px]">
                            Official Account
                          </Badge>
                        </div>

                        {/* Account Number with 1-click Copy */}
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border shadow-sm">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account Number</span>
                            <p className="font-mono text-xl font-black text-foreground tracking-wider">
                              {schoolBank.accountNumber}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(schoolBank.accountNumber!, "account")}
                            className="h-9 px-3 rounded-lg font-bold text-xs gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                          >
                            {copiedAccount ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                            {copiedAccount ? "Copied!" : "Copy"}
                          </Button>
                        </div>

                        {/* Account Name */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Beneficiary Name</span>
                          <p className="text-xs font-bold text-foreground">{schoolBank.accountName}</p>
                        </div>

                        {/* Recommended Narration */}
                        <div className="p-3 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Recommended Narration / Reference</span>
                            <p className="font-mono text-xs font-semibold text-foreground truncate">{narrationText}</p>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCopy(narrationText, "narration")}
                            className="size-8 shrink-0 rounded-lg hover:bg-muted"
                          >
                            {copiedNarration ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                          </Button>
                        </div>
                      </div>

                      {/* Toggle Transfer Submission Form */}
                      {!showTransferForm ? (
                        <Button
                          type="button"
                          onClick={() => setShowTransferForm(true)}
                          className="w-full h-12 rounded-2xl font-black text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                        >
                          I Have Paid — Submit Transfer Proof for Verification
                          <ArrowRight className="size-4" />
                        </Button>
                      ) : (
                        <form onSubmit={handleSubmitBankTransfer} className="space-y-4 pt-2 border-t border-border/50 animate-in fade-in duration-300">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                              Transfer Verification Form
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              Provide your transfer transaction reference so the school bursar can verify funds.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-foreground">
                                Transaction Reference / Session ID <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                placeholder="e.g. 0000132408271100349817"
                                value={bankReference}
                                onChange={(e) => setBankReference(e.target.value)}
                                className="h-11 rounded-xl font-mono text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-foreground">
                                Sender Account Name <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                placeholder="e.g. Adeyemi Olumide John"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                className="h-11 rounded-xl text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-foreground">Remarks / Note (Optional)</Label>
                              <Input
                                placeholder="e.g. Paid via GTBank Mobile App"
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                className="h-11 rounded-xl text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowTransferForm(false)}
                              className="flex-1 h-11 rounded-xl font-bold text-xs"
                            >
                              Back
                            </Button>
                            <Button
                              type="submit"
                              disabled={isProcessing}
                              className="flex-[2] h-11 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md"
                            >
                              {isProcessing && <Loader2 className="size-3.5 animate-spin" />}
                              Submit for Verification
                            </Button>
                          </div>
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center space-y-3">
                      <div className="size-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        <AlertCircle className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">Bank Details Pending</p>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                          The school has not yet configured their settlement bank account. Please reach out to the bursary office directly.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
