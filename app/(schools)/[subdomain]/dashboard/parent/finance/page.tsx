"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  History,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Users,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/components/providers/tenant-provider";
import { formatNGN, cn, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useParentChildren } from "@/hooks/use-parent-children";
import { EmptyState, ErrorState } from "@/components/dashboard/query-states";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PaymentReceiptPDF } from "@/components/shared/payment-receipt-template";

declare const PaystackPop: any;

export default function ParentFinancePage() {
  const { children, loading, error, refetch } = useParentChildren();
  const { supabase, academicCycle, tenant } = useTenant();
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paystackPublicKey, setPaystackPublicKey] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");

  // Auto-select the first child once the list loads.
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  // Load Paystack inline script + fetch tenant public key once.
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);

    // Fetch the tenant Paystack public key from the backend.
    const fetchPaystackConfig = async () => {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        setParentName(session.user.user_metadata?.full_name || "Parent");
        const res = await fetch(`${getBackendUrl()}/payments/config`, {
          headers: { "Authorization": `Bearer ${session.access_token}` },
        });
        const result = await res.json();
        if (result.success && result.data?.publicKey) {
          setPaystackPublicKey(result.data.publicKey);
        }
      } catch (e) {
        console.error("Failed to fetch Paystack config:", e);
      }
    };
    fetchPaystackConfig();
  }, [supabase]);

  // Fetch fees + history when the selected child changes.
  const fetchChildFinanceData = async (childId: string) => {
    if (!childId || !supabase) return;
    setLoadingData(true);
    try {
      const child = children.find(c => c.id === childId);
      if (!child) throw new Error("Selected child not found");

      // A. Fetch fee structures for this child's class — filtered by current term/year
      const feeQuery = supabase
        .from("fee_structures")
        .select("*")
        .eq("class_id", child.class_id)
        .eq("school_id", child.school_id);

      if (academicCycle?.academicYear) {
        feeQuery.eq("academic_year", academicCycle.academicYear);
      }
      if (academicCycle?.currentTerm) {
        feeQuery.eq("term", academicCycle.currentTerm);
      }

      const { data: structures, error: structError } = await feeQuery;

      if (structError) throw structError;
      setFeeStructures(structures || []);

      // B. Fetch payment history from backend
      const { data: { session } } = await supabase.auth.getSession();
      const historyRes = await fetch(`${getBackendUrl()}/payments/history?studentId=${childId}`, {
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      });
      const historyResult = await historyRes.json();
      if (historyResult.success) {
        setHistory(historyResult.data);
      } else {
        throw new Error(historyResult.message || "Failed to load payment history");
      }

    } catch (error: any) {
      toast.error(error.message || "Failed to load finance data");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedChildId && supabase) {
      fetchChildFinanceData(selectedChildId);
    }
  }, [selectedChildId, children, supabase]);

  const handlePay = async (structure: any) => {
    if (!selectedChildId || !supabase) return;
    setPayingId(structure.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // 1. Initialize on backend
      const res = await fetch(`${getBackendUrl()}/payments/initialize`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ 
          feeStructureId: structure.id,
          amount: structure.amount,
          studentId: selectedChildId
        })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      // 2. Open Paystack Inline
      if (!paystackPublicKey) {
        throw new Error("Payments are not configured for this school. Please contact the school administrator.");
      }
      const handler = PaystackPop.setup({
        key: paystackPublicKey,
        email: session?.user.email,
        amount: structure.amount * 100, // Paystack expects kobo
        ref: result.data.reference,
        onClose: () => {
          toast.info("Payment window closed");
          setPayingId(null);
        },
        callback: (response: any) => {
          toast.success("Payment received! We're confirming it...");
          fetchChildFinanceData(selectedChildId); // Refresh history
          setPayingId(null);
        }
      });
      handler.openIframe();

    } catch (error: any) {
      toast.error(error.message || "Checkout failed");
      setPayingId(null);
    }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="size-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading Household Records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 p-8 rounded-3xl backdrop-blur-xl border border-border/50 shadow-2xl">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-primary">Institution Fees</h1>
            <p className="text-muted-foreground text-lg font-medium">Settle and monitor school fee obligations for your household.</p>
          </div>
        </div>
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 p-8 rounded-3xl backdrop-blur-xl border border-border/50 shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-primary">Institution Fees</h1>
          <p className="text-muted-foreground text-lg font-medium">Settle and monitor school fee obligations for your household.</p>
        </div>
        
        {children.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Users className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Child</label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-[240px] bg-background/50 border-none ring-1 ring-border shadow-inner font-bold rounded-xl h-11">
                  <SelectValue placeholder="Select Child" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-semibold">
                      {c.profiles?.full_name} ({c.classes?.name || "Unassigned"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Linked Students Found"
          message="Please contact the school administrator to link your children to your account."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="size-6 text-primary" />
                <h2 className="text-2xl font-bold">Active Fees for {selectedChild?.profiles?.full_name}</h2>
              </div>
              
              {loadingData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array(2).fill(0).map((_, i) => (
                    <Card key={i} className="animate-pulse h-48 rounded-2xl" />
                  ))}
                </div>
              ) : feeStructures.length === 0 ? (
                <div className="py-12 text-center bg-accent/20 rounded-2xl border-2 border-dashed border-border border-spacing-4">
                  <div className="size-16 bg-accent/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="size-8 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-lg font-bold">All settled!</h3>
                  <p className="text-muted-foreground mt-1 px-10">No pending fee structures found for {selectedChild?.profiles?.full_name} ({selectedChild?.classes?.name}) this term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feeStructures.map((fs) => {
                    const successfulPayments = history.filter((p: any) => p.fee_structure_id === fs.id && p.status === 'success');
                    const isPaid = successfulPayments.length > 0;
                    const paidAmount = successfulPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                    const outstanding = Number(fs.amount) - paidAmount;
                    const isPartial = isPaid && outstanding > 0;
                    return (
                      <Card key={fs.id} className={cn(
                        "group border-none shadow-xl transition-all hover:translate-y-[-4px] rounded-2xl overflow-hidden",
                        isPaid ? "bg-green-500/5 ring-1 ring-green-500/20" : "bg-card/50 backdrop-blur-md"
                      )}>
                        <CardHeader className="pb-2 p-6">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="font-bold py-0.5 tracking-tighter uppercase text-[10px]">
                              Term {fs.term} • {fs.academic_year}
                            </Badge>
                            {isPaid && !isPartial && (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold tracking-tight rounded-full px-2 py-0 border-none animate-in zoom-in">
                                PAID SUCCESSFUL
                              </Badge>
                            )}
                            {isPartial && (
                              <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 font-bold tracking-tight rounded-full px-2 py-0">
                                PARTIAL
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors">{fs.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                          <div className="text-3xl font-black mb-2">{formatNGN(fs.amount)}</div>
                          {isPartial && (
                            <p className="text-sm font-bold text-orange-600 mb-4">
                              {formatNGN(outstanding)} outstanding
                            </p>
                          )}
                          <div className={isPaid && !isPartial ? "mb-6" : "mb-6"} />
                          <Button 
                            className={cn("w-full h-12 font-bold rounded-xl", isPaid ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : "shadow-lg shadow-primary/25")}
                            disabled={(isPaid && !isPartial) || payingId === fs.id}
                            onClick={() => handlePay(fs)}
                            variant={isPaid ? "ghost" : "default"}
                          >
                            {payingId === fs.id ? (
                              <Loader2 className="size-5 animate-spin mr-2" />
                            ) : isPaid ? (
                              <CheckCircle2 className="size-5 mr-2" />
                            ) : (
                              <ShieldCheck className="size-5 mr-2" />
                            )}
                            {isPaid && !isPartial ? "Payment Receipted" : isPartial ? "Pay Balance" : "Pay School Fees"}
                            {!isPaid && !payingId && <ArrowRight className="size-4 ml-auto opacity-50 group-hover:translate-x-1 transition-transform" />}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <History className="size-6 text-primary" />
                <h2 className="text-2xl font-bold">Transaction History</h2>
              </div>
              <Card className="border-none shadow-2xl overflow-hidden bg-card/50 backdrop-blur-xl rounded-2xl">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold py-4 pl-6">Reference</TableHead>
                      <TableHead className="font-bold py-4">Fee</TableHead>
                      <TableHead className="font-bold py-4">Amount</TableHead>
                      <TableHead className="font-bold py-4 text-center">Status</TableHead>
                      <TableHead className="font-bold py-4 text-right pr-6">Date</TableHead>
                      <TableHead className="font-bold py-4 text-center">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-20 animate-pulse text-muted-foreground font-medium">
                          Loading payments...
                        </TableCell>
                      </TableRow>
                    ) : history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground opacity-50 font-medium">
                          No prior transactions found for this student.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((h: any) => (
                        <TableRow key={h.id} className="hover:bg-accent/30 transition-colors group">
                          <TableCell className="font-mono text-[10px] opacity-60 uppercase tracking-tighter group-hover:opacity-100 transition-opacity pl-6">
                            {h.reference}
                          </TableCell>
                          <TableCell className="font-bold text-foreground/80">
                            {h.fee_structures?.name || 'General Fee'}
                          </TableCell>
                          <TableCell className="font-black">{formatNGN(h.amount)}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={cn(
                                "capitalize font-black tracking-tight text-[10px] rounded-full px-3",
                                h.status === 'success' ? "bg-green-500 hover:bg-green-600 border-none text-white" :
                                h.status === 'pending' ? "bg-orange-500/10 text-orange-600 border-orange-200" :
                                "bg-destructive/10 text-destructive border-destructive/20"
                              )}
                              variant={h.status === 'success' ? 'default' : 'outline'}
                            >
                              {h.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground font-medium pr-6">
                            {new Date(h.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {h.status === 'success' ? (
                              <PDFDownloadLink
                                document={
                                  <PaymentReceiptPDF
                                    receipt={{
                                      reference: h.reference,
                                      parentName,
                                      studentName: selectedChild?.profiles?.full_name || "—",
                                      admissionNo: selectedChild?.admission_no || "—",
                                      description: h.fee_structures?.name || "School Fees",
                                      date: h.paid_at || h.created_at,
                                      amount: Number(h.amount),
                                    }}
                                    schoolName={tenant?.name || "Klaxtrix Institution"}
                                  />
                                }
                                fileName={`receipt-${h.reference}.pdf`}
                              >
                                {({ loading: pdfLoading }) => (
                                  <Button variant="ghost" size="icon" className="size-8 rounded-lg" disabled={pdfLoading}>
                                    {pdfLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                                  </Button>
                                )}
                              </PDFDownloadLink>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </section>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-primary/5 text-primary border-primary/20 rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="size-5" />
                  <CardTitle className="text-lg font-bold">Billing Support</CardTitle>
                </div>
                <CardDescription className="text-primary/70 font-medium">For payment inquiries, please reach out to the bursary office.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background/50 rounded-xl space-y-2 border border-primary/10">
                  <p className="text-xs uppercase tracking-widest font-black text-muted-foreground opacity-50">School</p>
                  <p className="font-bold text-sm">{tenant?.name || "Your school"}</p>
                </div>
                <p className="text-xs text-primary/60 font-medium">
                  For payment inquiries, please contact the school's bursary office directly.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
