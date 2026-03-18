"use client";

import { useEffect, useState } from "react";
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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createClient } from "@/lib/supabase/client";
import { formatNGN, cn } from "@/lib/utils";
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
  const supabase = createClient();

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
          students(admission_no, profiles(full_name)),
          fee_structures(name)
        `)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // 2. Calculate Stats
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
      toast.error("Failed to load financial records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const filteredPayments = payments.filter(p => 
    p.students?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary">Fee Management</h1>
          <p className="text-muted-foreground mt-1 text-lg">Track revenue and manage school fee structures.</p>
        </div>
        <AddFeeStructureModal onSuccess={fetchFinanceData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={80} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80 uppercase tracking-wider text-primary-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary-foreground">{formatNGN(stats.totalRevenue)}</div>
            <p className="text-xs mt-2 opacity-70 flex items-center gap-1 font-medium">
              <ArrowUpRight size={14} /> From {stats.successCount} successful txns
            </p>
          </CardContent>
        </Card>

        <MetricCard 
          title="Pending Collections" 
          value={formatNGN(stats.pendingAmount)} 
          subText={`Potential revenue from ${stats.totalCount - stats.successCount} pending txns`}
          icon={Clock}
          color="orange"
        />
        
        <MetricCard 
          title="Success Rate" 
          value={`${stats.totalCount > 0 ? Math.round((stats.successCount / stats.totalCount) * 100) : 0}%`} 
          subText="Transaction completion percentage"
          icon={CheckCircle2}
          color="green"
        />

        <MetricCard 
          title="Total Students Paid" 
          value={stats.successCount.toString()} 
          subText="Unique fee payment records"
          icon={Users}
          color="blue"
        />
      </div>

      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Transaction History</CardTitle>
              <CardDescription>A real-time log of all student fee payments.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search student or ref..." 
                  className="pl-9 w-64 bg-background/50 border-none ring-1 ring-border focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="shrink-0 group">
                <Filter className="size-4 group-hover:text-primary transition-colors" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="size-12 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse font-medium">Loading ledger...</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold py-4">Student</TableHead>
                    <TableHead className="font-bold py-4">Fee Structure</TableHead>
                    <TableHead className="font-bold py-4">Reference</TableHead>
                    <TableHead className="font-bold py-4">Amount</TableHead>
                    <TableHead className="font-bold py-4">Status</TableHead>
                    <TableHead className="font-bold py-4">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                        No transactions found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((p) => (
                      <TableRow key={p.id} className="hover:bg-accent/30 transition-colors group">
                        <TableCell>
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {p.students?.profiles?.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">{p.students?.admission_no}</div>
                        </TableCell>
                        <TableCell className="font-medium">{p.fee_structures?.name}</TableCell>
                        <TableCell className="font-mono text-xs opacity-60 uppercase tracking-tighter">{p.reference}</TableCell>
                        <TableCell className="font-black">{formatNGN(p.amount)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={p.status === 'success' ? 'default' : p.status === 'pending' ? 'outline' : 'destructive'}
                            className={cn(
                              "capitalize rounded-full px-3 py-1 font-bold tracking-tight text-[10px]",
                              p.status === 'success' && "bg-green-500 hover:bg-green-600 text-white border-none",
                              p.status === 'pending' && "border-orange-500 text-orange-600 animate-pulse bg-orange-50"
                            )}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
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
        </CardContent>
      </Card>
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
    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md hover:translate-y-[-4px] transition-transform duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", colorMap[color] || colorMap.primary)}>
          <Icon size={20} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-2 font-medium italic opacity-70 leading-relaxed">
          {subText}
        </p>
      </CardContent>
    </Card>
  );
}
