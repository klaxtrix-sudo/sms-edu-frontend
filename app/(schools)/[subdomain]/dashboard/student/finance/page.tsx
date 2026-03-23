"use client";

import { useEffect, useState } from "react";
import { 
  CreditCard, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  ShieldCheck
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
import { Badge } from "@/components/ui/badge";
import { createTenantClient } from "@/lib/supabase/client";
import { formatNGN, cn, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";

declare const PaystackPop: any;

export default function StudentFinancePage() {
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const supabase = createTenantClient();

  const fetchData = async () => {
    setLoading(true);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Student Class and school info
      const { data: student } = await supabase
        .from("students")
        .select("id, class_id, school_id")
        .eq("user_id", user.id)
        .single();

      if (!student) throw new Error("Student record not found");

      // 2. Fetch active fee structures for this class
      const { data: structures } = await supabase
        .from("fee_structures")
        .select("*")
        .eq("class_id", student.class_id)
        .eq("school_id", student.school_id);

      setFeeStructures(structures || []);

      // 3. Fetch payment history from backend
      const { data: { session } } = await supabase.auth.getSession();
      const historyRes = await fetch(`${getBackendUrl()}/payments/history`, {
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      });
      const historyResult = await historyRes.json();
      if (historyResult.success) setHistory(historyResult.data);

    } catch (error: any) {
      toast.error(error.message || "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Load Paystack script
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePay = async (structure: any) => {
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
          amount: structure.amount
        })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      // 2. Open Paystack Inline
      const handler = PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxx', // Should be in env
        email: session?.user.email,
        amount: structure.amount * 100,
        ref: result.data.reference,
        onClose: () => {
          toast.info("Payment window closed");
          setPayingId(null);
        },
        callback: (response: any) => {
          toast.success("Payment initiated! Verification in progress...");
          fetchData(); // Refresh history
          setPayingId(null);
        }
      });
      handler.openIframe();

    } catch (error: any) {
      toast.error(error.message || "Checkout failed");
      setPayingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-primary">Fees & Payments</h1>
        <p className="text-muted-foreground mt-2 text-lg font-medium italic">Manage your school obligations and view billing history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="size-6 text-primary" />
              <h2 className="text-2xl font-bold">Active Fees</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? (
                Array(2).fill(0).map((_, i) => (
                  <Card key={i} className="animate-pulse h-48" />
                ))
              ) : feeStructures.length === 0 ? (
                <div className="col-span-2 py-12 text-center bg-accent/20 rounded-2xl border-2 border-dashed border-border border-spacing-4">
                  <div className="size-16 bg-accent/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="size-8 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-lg font-bold">You're all clear!</h3>
                  <p className="text-muted-foreground mt-1 px-10">No pending fee structures found for your class this term.</p>
                </div>
              ) : (
                feeStructures.map((fs) => {
                  const isPaid = history.some(p => p.fee_structure_id === fs.id && p.status === 'success');
                  return (
                    <Card key={fs.id} className={cn(
                      "group border-none shadow-xl transition-all hover:translate-y-[-4px]",
                      isPaid ? "bg-green-500/5 ring-1 ring-green-500/20" : "bg-card/50 backdrop-blur-md"
                    )}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="font-bold py-0.5 tracking-tighter uppercase text-[10px]">
                            Term {fs.term} • {fs.academic_year}
                          </Badge>
                          {isPaid && (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold tracking-tight rounded-full px-2 py-0 border-none animate-in zoom-in">
                              SUCCESSFUL
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors">{fs.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-black mb-6">{formatNGN(fs.amount)}</div>
                        <Button 
                          className={cn("w-full h-12 font-bold", isPaid ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : "shadow-lg shadow-primary/25")}
                          disabled={isPaid || payingId === fs.id}
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
                          {isPaid ? "Payment Receipted" : "Pay School Fees"}
                          {!isPaid && !payingId && <ArrowRight className="size-4 ml-auto opacity-50 group-hover:translate-x-1 transition-transform" />}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <History className="size-6 text-primary" />
              <h2 className="text-2xl font-bold">Transaction History</h2>
            </div>
            <Card className="border-none shadow-2xl overflow-hidden bg-card/50 backdrop-blur-xl">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold py-4">Reference</TableHead>
                    <TableHead className="font-bold py-4">Fee</TableHead>
                    <TableHead className="font-bold py-4">Amount</TableHead>
                    <TableHead className="font-bold py-4 text-center">Status</TableHead>
                    <TableHead className="font-bold py-4 text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse text-muted-foreground font-medium italic">Synchronizing ledger...</TableCell></TableRow>
                  ) : history.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic opacity-50 font-medium">No prior transactions found.</TableCell></TableRow>
                  ) : (
                    history.map((h) => (
                      <TableRow key={h.id} className="hover:bg-accent/30 transition-colors group">
                        <TableCell className="font-mono text-[10px] opacity-60 uppercase tracking-tighter group-hover:opacity-100 transition-opacity">{h.reference}</TableCell>
                        <TableCell className="font-bold text-foreground/80">{h.fee_structures?.name || 'General Fee'}</TableCell>
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
                        <TableCell className="text-right text-xs text-muted-foreground font-medium">
                          {new Date(h.created_at).toLocaleDateString()}
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
          <Card className="border-none shadow-xl bg-primary/5 text-primary border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="size-5" />
                <CardTitle className="text-lg font-bold">Billing Support</CardTitle>
              </div>
              <CardDescription className="text-primary/70 font-medium italic">For payment inquiries, please reach out to the bursary office.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-background/50 rounded-xl space-y-2 border border-primary/10">
                <p className="text-xs uppercase tracking-widest font-black text-muted-foreground opacity-50">Email</p>
                <p className="font-bold text-sm">bursary@smsedu.ng</p>
              </div>
              <div className="p-4 bg-background/50 rounded-xl space-y-2 border border-primary/10">
                <p className="text-xs uppercase tracking-widest font-black text-muted-foreground opacity-50">Phone</p>
                <p className="font-bold text-sm">+234 812 345 6789</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="p-1 px-4 bg-accent/20 rounded-full flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-muted-foreground border border-border/50">
            <span className="size-1.5 bg-green-500 rounded-full animate-pulse" />
            Live Billing Server Status: Optimal
          </div>
        </div>
      </div>
    </div>
  );
}

