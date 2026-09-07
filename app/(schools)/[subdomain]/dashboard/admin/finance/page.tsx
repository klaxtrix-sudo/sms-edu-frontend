"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  CreditCard, 
  Plus, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Loader2, 
  Wallet, 
  Activity,
  Landmark,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
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
import { createTenantClient } from "@/lib/supabase/client";
import { formatNGN, cn, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";
import { AddFeeStructureModal } from "@/components/admin/add-fee-structure-modal";

export default function FinanceDashboard() {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    pendingAmount: 0,
    successCount: 0,
    totalCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolBank, setSchoolBank] = useState<{
    bank_name: string | null;
    account_name: string | null;
    account_number: string | null;
  } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const supabase = createTenantClient();

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("fee_payments")
        .select(`
          *,
          students(admission_no, profiles!students_user_id_fkey(full_name)),
          fee_structures(name)
        `)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // 2. Fetch School Bank Details
      const { data: schoolData } = await supabase
        .from("schools")
        .select("bank_name, account_name, account_number")
        .maybeSingle();

      if (schoolData) {
        setSchoolBank(schoolData);
      }

      // 3. Calculate Stats
      const calculatedStats = (paymentsData || []).reduce((acc: any, curr: any) => {
        if (curr.status === 'success') {
          acc.totalRevenue += Number(curr.amount);
          acc.successCount += 1;
        } else if (curr.status === 'pending') {
          acc.pendingAmount += Number(curr.amount);
        }
        acc.totalCount += 1;
        return acc;
      }, { totalRevenue: 0, pendingAmount: 0, successCount: 0, totalCount: 0 });

      setStats(calculatedStats);
    } catch (error) {
      toast.error("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTransfer = async (paymentId: string, action: 'approve' | 'reject') => {
    setVerifyingId(paymentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${getBackendUrl()}/payments/verify-transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ paymentId, action }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Verification failed");
      toast.success(action === 'approve' ? "Transfer approved successfully!" : "Transfer rejected.");
      fetchFinanceData();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify transfer");
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const filteredPayments = payments.filter(p => 
    p.students?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.metadata?.senderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.metadata?.bankReference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Executive Header */}
      <header className="relative overflow-hidden glass-panel rounded-[2.5rem] p-10 group bg-white/5 border-white/10 text-foreground">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-2">
              Finance
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-glow">
              Fee <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">Management</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl font-medium">
              Track school fees, revenue, and pending payments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="settings/general"
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 transition-all group backdrop-blur-md"
            >
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
                <Landmark className="size-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Settlement Account</p>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {schoolBank?.account_number
                    ? `${schoolBank.bank_name || 'Bank'} • ****${schoolBank.account_number.slice(-4)}`
                    : '⚠️ Not Configured (Set Up)'}
                </p>
              </div>
            </Link>

            <AddFeeStructureModal onSuccess={fetchFinanceData} />
          </div>
        </div>
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 size-64 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-colors" />
      </header>

      {/* Bento Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Primary Revenue Card */}
        <div className="glass-panel rounded-[1.8rem] p-6 group hover:translate-y-[-4px] transition-all duration-300 border border-white/5 bg-gradient-to-br from-primary to-blue-700 text-white overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
             <TrendingUp className="size-32" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="size-12 rounded-2xl bg-white/20 p-3 shadow-lg backdrop-blur-md">
              <Wallet className="size-full text-white" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Total Revenue</span>
              <div className="text-3xl font-black">{formatNGN(stats.totalRevenue)}</div>
              <p className="text-[10px] font-bold text-white/60 flex items-center gap-1 uppercase tracking-tighter pt-1">
                <ArrowUpRight size={12} /> From {stats.successCount} successful txns
              </p>
            </div>
          </div>
        </div>

        <MetricCard 
          title="Pending Collections" 
          value={formatNGN(stats.pendingAmount)} 
          subText={`From ${stats.totalCount - stats.successCount} pending payments`}
          icon={Clock}
          color="orange"
        />
        
        <MetricCard 
          title="Success Rate" 
          value={`${stats.totalCount > 0 ? Math.round((stats.successCount / stats.totalCount) * 100) : 0}%`} 
          subText="Share of payments that completed"
          icon={CheckCircle2}
          color="green"
        />

        <MetricCard 
          title="Active Payees" 
          value={stats.successCount.toString()} 
          subText="Students who have paid"
          icon={Users}
          color="blue"
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-[2rem] border-white/5 bg-white/5 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Activity className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Payment History</h2>
              <p className="text-sm text-muted-foreground font-medium italic opacity-70">Every payment your school has received.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search student or ref..." 
                className="pl-9 w-64 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:bg-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="shrink-0 rounded-xl border-white/10 hover:bg-white/10 transition-all">
              <Filter className="size-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="size-12 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">Loading transactions...</p>
          </div>
        ) : (
            <div className="rounded-[1.5rem] border border-white/10 overflow-hidden bg-white/5">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold py-5 text-foreground h-auto pl-6">Student</TableHead>
                    <TableHead className="font-bold py-5 text-foreground h-auto">Fee Structure</TableHead>
                    <TableHead className="font-bold py-5 text-foreground h-auto">Reference</TableHead>
                    <TableHead className="font-bold py-5 text-foreground h-auto">Amount</TableHead>
                    <TableHead className="font-bold py-5 text-foreground h-auto">Status</TableHead>
                    <TableHead className="font-bold py-5 text-foreground h-auto pr-6">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic font-medium">
                        No payments match your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((p) => (
                      <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="pl-6">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {p.students?.profiles?.full_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{p.students?.admission_no}</div>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">{p.fee_structures?.name}</TableCell>
                        <TableCell>
                          <div className="font-mono text-[10px] opacity-70 uppercase tracking-tighter">{p.reference}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 border-white/20 text-muted-foreground">
                              {p.channel === 'bank_transfer' ? 'Bank Transfer' : 'Online'}
                            </Badge>
                            {p.metadata?.bankReference && (
                              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                                {p.metadata.bankReference}
                              </span>
                            )}
                          </div>
                          {p.metadata?.senderName && (
                            <div className="text-[10px] text-muted-foreground italic mt-0.5">
                              From: {p.metadata.senderName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-black text-lg">{formatNGN(p.amount)}</TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Badge 
                              variant={p.status === 'success' ? 'default' : p.status === 'pending' ? 'outline' : 'destructive'}
                              className={cn(
                                "capitalize rounded-xl px-4 py-1 font-black tracking-tight text-[10px] shadow-sm",
                                p.status === 'success' && "bg-emerald-500 hover:bg-emerald-600 text-white border-none",
                                p.status === 'pending' && "border-orange-500/30 text-orange-500 bg-orange-500/10 animate-pulse"
                              )}
                            >
                              {p.status}
                            </Badge>

                            {p.status === 'pending' && p.channel === 'bank_transfer' && (
                              <div className="flex items-center gap-1 mt-1">
                                <Button
                                  size="sm"
                                  disabled={verifyingId === p.id}
                                  onClick={() => handleVerifyTransfer(p.id, 'approve')}
                                  className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg gap-1"
                                >
                                  {verifyingId === p.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={verifyingId === p.id}
                                  onClick={() => handleVerifyTransfer(p.id, 'reject')}
                                  className="h-6 px-1.5 text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold rounded-lg"
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-bold pr-6">
                          {new Date(p.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
      </motion.div>
    </div>
  );
}

function MetricCard({ title, value, subText, icon: Icon, color }: any) {
  const colorMap: any = {
    green: "text-green-600 bg-green-500/10",
    orange: "text-orange-600 bg-orange-500/10",
    blue: "text-blue-600 bg-blue-500/10",
    primary: "text-primary bg-primary/10"
  };

  return (
    <div className="glass-panel border border-white/5 bg-white/5 rounded-[1.8rem] p-6 group hover:translate-y-[-4px] transition-all duration-300 relative overflow-hidden">
      <div className="flex flex-row items-center justify-between pb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <div className={cn("p-2 rounded-xl backdrop-blur-md shadow-sm", colorMap[color] || colorMap.primary)}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-black tabular-nums tracking-tighter">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter opacity-70 leading-relaxed italic">
          {subText}
        </p>
      </div>
      {/* Subtle background glow */}
      <div className="absolute -bottom-10 -right-10 size-24 bg-white/5 blur-2xl rounded-full" />
    </div>
  );
}
