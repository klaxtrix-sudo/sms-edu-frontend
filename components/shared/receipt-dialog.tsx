"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Printer, 
  CheckCircle2, 
  Receipt, 
  Loader2, 
  Building2,
  Calendar,
  CreditCard,
  User,
  GraduationCap
} from "lucide-react";
import { formatNGN } from "@/lib/utils";
import { PaymentReceiptPDF } from "@/components/shared/payment-receipt-template";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

export interface ReceiptData {
  reference: string;
  parentName: string;
  studentName: string;
  admissionNo: string;
  description: string;
  date: string;
  amount: number;
  channel?: string;
  schoolName?: string;
}

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  schoolName?: string;
}

export function ReceiptDialog({
  isOpen,
  onClose,
  receipt,
  schoolName = "Klaxtrix Institution",
}: ReceiptDialogProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const channelLabel = 
    receipt.channel === "bank_transfer" ? "Direct Bank Transfer" :
    receipt.channel === "cash" ? "Cash (Counter)" :
    receipt.channel === "pos" ? "POS Terminal" :
    "Online (Paystack)";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border border-border bg-background shadow-2xl rounded-3xl">
        <DialogHeader className="p-6 pb-4 bg-muted/30 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Receipt className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight">Official Fee Receipt</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Ref: <span className="font-mono font-bold text-foreground">{receipt.reference}</span>
                </DialogDescription>
              </div>
            </div>

            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] px-3 py-1 border-none flex items-center gap-1">
              <CheckCircle2 className="size-3" /> PAID
            </Badge>
          </div>
        </DialogHeader>

        {/* Printable Receipt Card Body */}
        <div id="printable-receipt" className="p-6 md:p-8 space-y-6">
          {/* Institutional Top */}
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <div>
              <p className="text-lg font-black tracking-tight text-foreground">{schoolName}</p>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Institutional Receipt & Ledger Record</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Issued Date</p>
              <p className="text-xs font-bold text-foreground">
                {new Date(receipt.date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Amount Box */}
          <div className="rounded-2xl p-5 bg-primary/5 border border-primary/15 text-center space-y-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-primary/80">Total Amount Cleared</p>
            <p className="text-3xl font-black text-foreground tracking-tight tabular-nums">
              {formatNGN(receipt.amount)}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground">
              Payment Method: <span className="text-foreground">{channelLabel}</span>
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <GraduationCap className="size-3 text-primary" /> Student Beneficiary
              </p>
              <p className="font-bold text-foreground text-sm">{receipt.studentName}</p>
              <p className="text-[10px] text-muted-foreground font-mono font-bold">Adm: {receipt.admissionNo}</p>
            </div>

            <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <User className="size-3 text-primary" /> Payer / Guardian
              </p>
              <p className="font-bold text-foreground text-sm">{receipt.parentName || "Parent / Guardian"}</p>
              <p className="text-[10px] text-muted-foreground">Account Verified</p>
            </div>

            <div className="col-span-2 space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Fee Description</p>
              <p className="font-bold text-foreground">{receipt.description}</p>
            </div>
          </div>

          <p className="text-[10px] text-center text-muted-foreground/70 italic leading-relaxed pt-2">
            This is a computer-generated official receipt issued by {schoolName}. No signature required.
          </p>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="flex-1 h-11 rounded-2xl font-bold gap-2 text-xs border-border"
          >
            <Printer className="size-4" /> Print
          </Button>

          <PDFDownloadLink
            document={
              <PaymentReceiptPDF
                receipt={{
                  reference: receipt.reference,
                  parentName: receipt.parentName,
                  studentName: receipt.studentName,
                  admissionNo: receipt.admissionNo,
                  description: receipt.description,
                  date: receipt.date,
                  amount: receipt.amount,
                }}
                schoolName={schoolName}
              />
            }
            fileName={`receipt-${receipt.reference}.pdf`}
            className="flex-1"
          >
            {({ loading }: any) => (
              <Button
                type="button"
                disabled={loading}
                className="w-full h-11 rounded-2xl font-bold gap-2 text-xs bg-primary text-white shadow-md"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download PDF
              </Button>
            )}
          </PDFDownloadLink>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="sm:w-24 h-11 rounded-2xl font-bold text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
