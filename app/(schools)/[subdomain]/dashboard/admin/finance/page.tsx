"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  Download,
  Layers,
  GraduationCap,
  Calendar,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Receipt,
  FileSpreadsheet,
  Banknote,
  Sparkles,
  Shield,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { createTenantClient } from "@/lib/supabase/client";
import { useTenant } from "@/components/providers/tenant-provider";
import { getFinanceOverview } from "@/app/actions/finance-actions";
import { formatNGN, cn, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";
import { AddFeeStructureModal } from "@/components/admin/add-fee-structure-modal";
import { EditFeeStructureModal } from "@/components/admin/edit-fee-structure-modal";
import { DeleteFeeStructureModal } from "@/components/admin/delete-fee-structure-modal";
import { RecordManualPaymentModal } from "@/components/admin/record-manual-payment-modal";
import { ReceiptDialog, type ReceiptData } from "@/components/shared/receipt-dialog";

export default function FinanceDashboard() {
  const params = useParams();
  const subdomain = params?.subdomain as string;
  const { tenant, academicCycle } = useTenant();
  const supabase = createTenantClient();

  const [activeTab, setActiveTab] = useState<"payments" | "structures" | "debtors">("payments");
  const [loading, setLoading] = useState(true);
  const [canManageFinance, setCanManageFinance] = useState(true);

  // Data states
  const [payments, setPayments] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schoolBank, setSchoolBank] = useState<any>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    pendingTransfersCount: 0,
    uniquePayeesCount: 0,
    totalTransactionsCount: 0,
    successfulCount: 0,
  });

  // Action states
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [deletingFee, setDeletingFee] = useState<any>(null);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<ReceiptData | null>(null);

  // Filter states for Payments Ledger
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "online" | "bank_transfer" | "cash" | "pos">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "pending" | "failed">("all");
  const [periodFilter, setPeriodFilter] = useState<"current" | "all">("current");

  // Filter states for Fee Structures
  const [structureSessionFilter, setStructureSessionFilter] = useState<string>("all");
  const [structureTermFilter, setStructureTermFilter] = useState<string>("all");
  const [structureClassFilter, setStructureClassFilter] = useState<string>("all");

  // Tab 3: Debtors & Student Balances
  const [selectedClassForDebtors, setSelectedClassForDebtors] = useState<string>("");
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const res = await getFinanceOverview(subdomain);
      if (res.error) throw new Error(res.error);

      setPayments(res.payments || []);
      setFeeStructures(res.feeStructures || []);
      setClasses(res.classes || []);
      setSchoolBank(res.schoolBank || null);
      if (res.stats) {
        setStats(res.stats);
      }

      // If no class selected for debtors yet, default to first class
      if (!selectedClassForDebtors && res.classes && res.classes.length > 0) {
        setSelectedClassForDebtors(res.classes[0].id);
      }
    } catch (error: any) {
      console.error("[Finance] Failed to load data:", error);
      toast.error(error.message || "Failed to load finance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subdomain) {
      fetchFinanceData();
    }
  }, [subdomain]);

  useEffect(() => {
    async function checkPermission() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_super_admin, role, permissions")
          .eq("id", user.id)
          .single();

        if (profile) {
          const isSuper = profile.is_super_admin === true || profile.role === "super_admin";
          const hasManage = isSuper || hasPermission(profile.permissions, "finance:manage");
          setCanManageFinance(hasManage);
        }
      } catch (err) {
        console.error("[Finance] Failed to check permissions:", err);
      }
    }
    checkPermission();
  }, [supabase]);

  // Fetch students for Debtors tab when class changes
  useEffect(() => {
    if (!selectedClassForDebtors || !tenant?.id) return;

    setLoadingStudents(true);
    supabase
      .from("students")
      .select(`
        id,
        admission_no,
        class_id,
        profiles!students_user_id_fkey(full_name)
      `)
      .eq("class_id", selectedClassForDebtors)
      .eq("school_id", tenant.id)
      .order("admission_no")
      .then(({ data, error }) => {
        if (!error && data) {
          setClassStudents(data);
        }
        setLoadingStudents(false);
      });
  }, [selectedClassForDebtors, tenant?.id, supabase]);

  const handleVerifyTransfer = async (paymentId: string, action: "approve" | "reject") => {
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
      toast.success(action === "approve" ? "Bank transfer approved successfully!" : "Transfer rejected.");
      fetchFinanceData();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify transfer");
    } finally {
      setVerifyingId(null);
    }
  };

  // Safe search & filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Period filter (Current Term vs All)
      if (periodFilter === "current" && academicCycle) {
        const isCurrentYear = !p.fee_structures?.academic_year || p.fee_structures?.academic_year === academicCycle.academicYear;
        const isCurrentTerm = !p.fee_structures?.term || p.fee_structures?.term === academicCycle.currentTerm;
        if (!isCurrentYear || !isCurrentTerm) return false;
      }

      // Status filter
      if (statusFilter !== "all" && p.status !== statusFilter) return false;

      // Channel filter
      if (channelFilter !== "all") {
        if (channelFilter === "online" && p.channel === "bank_transfer") return false;
        if (channelFilter !== "online" && p.channel !== channelFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const studentName = p.students?.profiles?.full_name?.toLowerCase() || "";
        const admissionNo = p.students?.admission_no?.toLowerCase() || "";
        const feeName = p.fee_structures?.name?.toLowerCase() || "";
        const reference = p.reference?.toLowerCase() || "";
        const senderName = p.metadata?.senderName?.toLowerCase() || "";
        const bankRef = p.metadata?.bankReference?.toLowerCase() || "";

        return (
          studentName.includes(term) ||
          admissionNo.includes(term) ||
          feeName.includes(term) ||
          reference.includes(term) ||
          senderName.includes(term) ||
          bankRef.includes(term)
        );
      }

      return true;
    });
  }, [payments, periodFilter, academicCycle, statusFilter, channelFilter, searchTerm]);

  // Filtered Fee Structures
  const filteredFeeStructures = useMemo(() => {
    return feeStructures.filter((fs) => {
      if (structureSessionFilter !== "all" && fs.academic_year !== structureSessionFilter) return false;
      if (structureTermFilter !== "all" && String(fs.term) !== structureTermFilter) return false;
      if (structureClassFilter !== "all" && fs.class_id !== structureClassFilter) return false;
      return true;
    });
  }, [feeStructures, structureSessionFilter, structureTermFilter, structureClassFilter]);

  // Debtors calculation for selected class
  const debtorsData = useMemo(() => {
    if (!selectedClassForDebtors) return [];

    // Applicable fee structures for this class in current cycle
    const applicableFees = feeStructures.filter((fs) => {
      const classMatch = fs.class_id === selectedClassForDebtors;
      const yearMatch = !academicCycle || fs.academic_year === academicCycle.academicYear;
      const termMatch = !academicCycle || fs.term === academicCycle.currentTerm;
      return classMatch && yearMatch && termMatch;
    });

    const totalExpectedPerStudent = applicableFees.reduce((sum, fs) => sum + Number(fs.amount || 0), 0);

    return classStudents.map((s) => {
      // Find all successful payments for this student for applicable fees
      const studentPayments = payments.filter(
        (p) => p.student_id === s.id && p.status === "success" && applicableFees.some((f) => f.id === p.fee_structure_id)
      );
      const pendingTransfers = payments.filter(
        (p) => p.student_id === s.id && p.status === "pending" && applicableFees.some((f) => f.id === p.fee_structure_id)
      );

      const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = Math.max(0, totalExpectedPerStudent - totalPaid);

      let status: "paid" | "partial" | "pending_verification" | "unpaid" = "unpaid";
      if (totalExpectedPerStudent > 0 && totalPaid >= totalExpectedPerStudent) {
        status = "paid";
      } else if (totalPaid > 0) {
        status = "partial";
      } else if (pendingTransfers.length > 0) {
        status = "pending_verification";
      }

      return {
        student: s,
        expected: totalExpectedPerStudent,
        paid: totalPaid,
        balance,
        status,
        applicableFees,
      };
    });
  }, [selectedClassForDebtors, feeStructures, classStudents, payments, academicCycle]);

  // Dynamic session list for fee structures filter
  const availableSessions = useMemo(() => {
    const sessions = new Set(feeStructures.map((f) => f.academic_year));
    if (academicCycle?.academicYear) sessions.add(academicCycle.academicYear);
    return Array.from(sessions).sort();
  }, [feeStructures, academicCycle]);

  // Export CSV
  const exportPaymentsCSV = () => {
    if (!filteredPayments.length) {
      toast.error("No payments to export.");
      return;
    }
    const headers = [
      "Student Name",
      "Admission No",
      "Fee Title",
      "Reference",
      "Amount (NGN)",
      "Channel",
      "Status",
      "Sender Name",
      "Bank Ref",
      "Date",
    ];
    const rows = filteredPayments.map((p) => [
      `"${(p.students?.profiles?.full_name || "Unknown").replace(/"/g, '""')}"`,
      `"${(p.students?.admission_no || "").replace(/"/g, '""')}"`,
      `"${(p.fee_structures?.name || "General Fee").replace(/"/g, '""')}"`,
      `"${p.reference}"`,
      Number(p.amount || 0),
      `"${p.channel || "online"}"`,
      `"${p.status}"`,
      `"${(p.metadata?.senderName || "").replace(/"/g, '""')}"`,
      `"${(p.metadata?.bankReference || "").replace(/"/g, '""')}"`,
      `"${new Date(p.created_at).toISOString()}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payments ledger exported to CSV.");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Executive Header */}
      <header className="relative overflow-hidden glass-panel rounded-[2.5rem] p-8 md:p-10 group bg-white/5 border-white/10 text-foreground">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                Institutional Finance
              </Badge>
              {academicCycle && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2.5 py-1 text-xs font-semibold">
                  {academicCycle.academicYear} • Term {academicCycle.currentTerm}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-glow">
              Fee & <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">Revenue Engine</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl font-medium">
              Manage class fee structures, audit incoming receipts, and track school collections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                    ? `${schoolBank.bank_name || "Bank"} • ****${schoolBank.account_number.slice(-4)}`
                    : "⚠️ Not Configured"}
                </p>
              </div>
            </Link>

            {canManageFinance ? (
              <>
                <RecordManualPaymentModal feeStructures={feeStructures} onSuccess={fetchFinanceData} />
                <AddFeeStructureModal classes={classes} onSuccess={fetchFinanceData} />
              </>
            ) : (
              <Badge variant="outline" className="h-10 px-3.5 rounded-2xl border-amber-500/30 text-amber-500 bg-amber-500/10 font-bold text-xs gap-1.5 shadow-xs">
                <Shield className="size-3.5" /> Auditor Mode (Read-Only)
              </Badge>
            )}
          </div>
        </div>
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 size-64 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-colors" />
      </header>

      {/* Auditor Notice Banner */}
      {!canManageFinance && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 backdrop-blur-md shadow-xs"
        >
          <Shield className="size-5 shrink-0 text-amber-500" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold uppercase tracking-wider">Auditor Access (Read-Only Scope):</span> You have compliance and reporting oversight on institutional financial records. Configuring fee structures, editing fee items, approving manual transfers, and recording payments are restricted to authorized financial managers.
          </div>
        </motion.div>
      )}

      {/* Bento Metric Grid with Period Scope Toggle */}
      <div className="space-y-4">
        {/* Scope Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
              <Calendar className="size-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                Financial Overview Scope
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                {periodFilter === "current"
                  ? `Active Cycle (${academicCycle?.academicYear || "Current"} • Term ${academicCycle?.currentTerm || "1"})`
                  : "Cumulative All-Time Institutional Records"}
              </p>
            </div>
          </div>

          <div className="flex items-center bg-card/90 dark:bg-muted/40 border border-border/80 rounded-2xl p-1 text-xs self-start sm:self-auto shadow-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => setPeriodFilter("current")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2",
                periodFilter === "current"
                  ? "bg-primary text-white shadow-sm shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("size-1.5 rounded-full transition-all", periodFilter === "current" ? "bg-white" : "bg-muted-foreground/40")} />
              Active Cycle ({academicCycle?.academicYear || "Current"})
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2",
                periodFilter === "all"
                  ? "bg-primary text-white shadow-sm shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("size-1.5 rounded-full transition-all", periodFilter === "all" ? "bg-white" : "bg-muted-foreground/40")} />
              All Time
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {/* Revenue Card (Hero Card) */}
          <div className="relative rounded-[2rem] p-6 sm:p-7 overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-primary/15 hover:-translate-y-1 bg-gradient-to-br from-blue-600 via-primary to-indigo-700 text-white border border-blue-400/25 flex flex-col justify-between min-h-[185px] shadow-lg shadow-primary/10">
            {/* Background ambient lighting & watermark */}
            <div className="absolute -right-6 -bottom-6 opacity-15 group-hover:opacity-25 group-hover:scale-110 transition-all duration-500 pointer-events-none">
              <TrendingUp className="size-36 stroke-[1.5]" />
            </div>
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100/90">
                {periodFilter === "current" ? "Active Cycle Revenue" : "All-Time Revenue"}
              </span>
              <div className="size-11 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                <Wallet className="size-5 text-white" />
              </div>
            </div>

            <div className="relative z-10 mt-5 space-y-2.5">
              <div className="text-2xl sm:text-3xl lg:text-[2rem] font-black tracking-tight leading-none text-white drop-shadow-xs truncate">
                {formatNGN(stats.totalRevenue)}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white shadow-xs">
                <ArrowUpRight className="size-3.5 text-blue-200" />
                <span>From {stats.successfulCount} verified payment{stats.successfulCount === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          {/* Pending Collections Card */}
          <MetricCard 
            title="Pending Collections" 
            value={formatNGN(stats.pendingAmount)} 
            badgeText={
              stats.pendingTransfersCount > 0 
                ? `${stats.pendingTransfersCount} awaiting bursar review` 
                : "All bank transfers verified"
            }
            badgeVariant={stats.pendingTransfersCount > 0 ? "warning" : "neutral"}
            icon={Clock}
            color="amber"
          />
          
          {/* Verified Payees Card */}
          <MetricCard 
            title="Verified Payees" 
            value={stats.uniquePayeesCount.toString()} 
            badgeText="Unique student payers"
            badgeVariant="neutral"
            icon={Users}
            color="sky"
          />

          {/* Active Fee Items Card */}
          <MetricCard 
            title="Active Fee Items" 
            value={feeStructures.length.toString()} 
            badgeText={`${feeStructures.length} configured fee schedule${feeStructures.length === 1 ? "" : "s"}`}
            badgeVariant="neutral"
            icon={Layers}
            color="emerald"
          />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
          <TabsList className="inline-flex h-auto p-1.5 bg-muted/60 dark:bg-card/80 border border-border/80 rounded-2xl gap-1.5 shadow-sm backdrop-blur-md">
            <TabsTrigger
              value="payments"
              className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground"
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === "payments" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-primary/10 text-primary"
              )}>
                <Receipt className="size-3.5 sm:size-4" />
              </div>
              <span>Payments Ledger</span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-0.5 px-2 py-0.5 text-[11px] font-mono font-bold rounded-full transition-colors border",
                  activeTab === "payments"
                    ? "bg-primary/15 text-primary border-primary/25"
                    : "bg-muted text-muted-foreground border-border/40"
                )}
              >
                {loading ? <Loader2 className="size-3 animate-spin" /> : filteredPayments.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="structures"
              className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground"
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === "structures" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}>
                <Layers className="size-3.5 sm:size-4" />
              </div>
              <span>Fee Structures</span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-0.5 px-2 py-0.5 text-[11px] font-mono font-bold rounded-full transition-colors border",
                  activeTab === "structures"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                    : "bg-muted text-muted-foreground border-border/40"
                )}
              >
                {loading ? <Loader2 className="size-3 animate-spin" /> : feeStructures.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="debtors"
              className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground"
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === "debtors" 
                  ? "bg-amber-600 text-white shadow-sm" 
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}>
                <GraduationCap className="size-3.5 sm:size-4" />
              </div>
              <span>Student Balances & Debtors</span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-0.5 px-2 py-0.5 text-[11px] font-mono font-bold rounded-full transition-colors border",
                  activeTab === "debtors"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                    : "bg-muted text-muted-foreground border-border/40"
                )}
              >
                {loadingStudents ? <Loader2 className="size-3 animate-spin" /> : debtorsData.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            {activeTab === "payments" && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportPaymentsCSV}
                className="rounded-xl h-10 border-border/80 hover:bg-accent gap-2 font-bold text-xs shadow-sm"
              >
                <Download className="size-4 text-primary" />
                Export CSV Ledger
              </Button>
            )}

            {activeTab === "structures" && canManageFinance && (
              <AddFeeStructureModal classes={classes} onSuccess={fetchFinanceData} />
            )}
          </div>
        </div>

        {/* TAB 1: PAYMENTS LEDGER */}
        <TabsContent value="payments" className="space-y-6 mt-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 md:p-8 rounded-[2rem] border-white/5 bg-white/5 space-y-6">
            
            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <Activity className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black">Transaction Ledger</h2>
                  <p className="text-xs text-muted-foreground font-medium">Real-time payment records and proof-of-transfer submissions.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search student, ref, payer..." 
                    className="pl-9 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:bg-white/10 text-xs h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl border-white/10 hover:bg-white/10 h-10 gap-2 text-xs font-bold">
                      <Filter className="size-3.5" />
                      Filter
                      {(statusFilter !== "all" || channelFilter !== "all") && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Status
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setStatusFilter("all")} className="font-medium text-xs">
                      All Statuses {statusFilter === "all" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("success")} className="font-medium text-xs text-emerald-400">
                      Successful Only {statusFilter === "success" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("pending")} className="font-medium text-xs text-orange-400">
                      Pending Review {statusFilter === "pending" && "✓"}
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Channel / Method
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setChannelFilter("all")} className="font-medium text-xs">
                      All Channels {channelFilter === "all" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setChannelFilter("bank_transfer")} className="font-medium text-xs">
                      Bank Transfer Only {channelFilter === "bank_transfer" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setChannelFilter("online")} className="font-medium text-xs">
                      Paystack Online {channelFilter === "online" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setChannelFilter("cash")} className="font-medium text-xs">
                      Bursary Cash {channelFilter === "cash" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setChannelFilter("pos")} className="font-medium text-xs">
                      POS Terminal {channelFilter === "pos" && "✓"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {(statusFilter !== "all" || channelFilter !== "all" || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setChannelFilter("all");
                      setSearchTerm("");
                    }}
                    className="h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse text-xs font-medium">Loading ledger...</p>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-white/10 overflow-hidden bg-white/5">
                <Table>
                  <TableHeader className="bg-white/10">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="font-bold py-4 text-foreground text-xs pl-6">Student</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs">Fee Item</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs">Reference & Method</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs">Amount</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs">Status</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs pr-6">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow className="border-white/5">
                        <TableCell colSpan={6} className="text-center py-16 text-muted-foreground italic text-xs font-medium">
                          No payments match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((p) => (
                        <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                          <TableCell className="pl-6 py-4">
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                              {p.students?.profiles?.full_name || "Unknown Student"}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider">
                              {p.students?.admission_no || "NO-ADM"}
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="font-semibold text-xs text-foreground/90">{p.fee_structures?.name || "School Fee"}</div>
                            {p.fee_structures?.academic_year && (
                              <div className="text-[10px] text-muted-foreground">
                                {p.fee_structures.academic_year} • Term {p.fee_structures.term}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="font-mono text-[11px] font-semibold text-foreground/80 tracking-tight">{p.reference}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 border-white/20 text-muted-foreground capitalize">
                                {p.channel === "bank_transfer" ? "Bank Transfer" : p.channel === "cash" ? "Cash (Counter)" : p.channel === "pos" ? "POS" : "Online"}
                              </Badge>
                              {p.metadata?.bankReference && (
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                                  {p.metadata.bankReference}
                                </span>
                              )}
                            </div>
                            {p.metadata?.senderName && (
                              <div className="text-[10px] text-muted-foreground italic mt-0.5">
                                Payer: {p.metadata.senderName}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-4 font-black text-base tabular-nums">
                            {formatNGN(p.amount)}
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="space-y-1.5">
                              <Badge 
                                variant={p.status === "success" ? "default" : p.status === "pending" ? "outline" : "destructive"}
                                className={cn(
                                  "capitalize rounded-xl px-3 py-0.5 font-bold tracking-tight text-[10px] shadow-sm",
                                  p.status === "success" && "bg-emerald-500 hover:bg-emerald-600 text-white border-none",
                                  p.status === "pending" && "border-orange-500/30 text-orange-500 bg-orange-500/10 animate-pulse"
                                )}
                              >
                                {p.status}
                              </Badge>

                              {p.status === "pending" && p.channel === "bank_transfer" && canManageFinance && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <Button
                                    size="sm"
                                    disabled={verifyingId === p.id}
                                    onClick={() => handleVerifyTransfer(p.id, "approve")}
                                    className="h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg gap-1 shadow-sm"
                                  >
                                    {verifyingId === p.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={verifyingId === p.id}
                                    onClick={() => handleVerifyTransfer(p.id, "reject")}
                                    className="h-6 px-1.5 text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold rounded-lg"
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-4 text-xs text-muted-foreground font-semibold pr-6">
                            <div className="flex items-center justify-between gap-2">
                              <span>
                                {new Date(p.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              {p.status === "success" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setSelectedReceiptForModal({
                                    reference: p.reference,
                                    parentName: p.metadata?.senderName || "Payer / Guardian",
                                    studentName: p.students?.profiles?.full_name || "Student",
                                    admissionNo: p.students?.admission_no || "—",
                                    description: p.fee_structures?.name || "School Fee",
                                    date: p.paid_at || p.created_at,
                                    amount: Number(p.amount),
                                    channel: p.channel,
                                    schoolName: tenant?.name,
                                  })}
                                  className="size-7 rounded-lg text-primary hover:bg-primary/10"
                                  title="View Official Receipt"
                                >
                                  <Receipt className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* TAB 2: FEE STRUCTURES CATALOG */}
        <TabsContent value="structures" className="space-y-6 mt-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 md:p-8 rounded-[2rem] border-white/5 bg-white/5 space-y-6">
            
            {/* Filters Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <Layers className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black">Fee Structures Catalog</h2>
                  <p className="text-xs text-muted-foreground font-medium">Defined fee items, amounts, and collection progress per class.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Session Filter */}
                <Select value={structureSessionFilter} onValueChange={setStructureSessionFilter}>
                  <SelectTrigger className="w-36 h-10 rounded-xl bg-white/5 border-white/10 text-xs font-semibold">
                    <SelectValue placeholder="All Sessions" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">All Sessions</SelectItem>
                    {availableSessions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Term Filter */}
                <Select value={structureTermFilter} onValueChange={setStructureTermFilter}>
                  <SelectTrigger className="w-32 h-10 rounded-xl bg-white/5 border-white/10 text-xs font-semibold">
                    <SelectValue placeholder="All Terms" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">All Terms</SelectItem>
                    <SelectItem value="1">1st Term</SelectItem>
                    <SelectItem value="2">2nd Term</SelectItem>
                    <SelectItem value="3">3rd Term</SelectItem>
                  </SelectContent>
                </Select>

                {/* Class Filter */}
                <Select value={structureClassFilter} onValueChange={setStructureClassFilter}>
                  <SelectTrigger className="w-36 h-10 rounded-xl bg-white/5 border-white/10 text-xs font-semibold">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fee Structures Grid */}
            {filteredFeeStructures.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 p-8 space-y-4">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Layers className="size-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="font-black text-base text-foreground">No Fee Structures Found</h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    No fee structures match the selected filters.
                  </p>
                </div>
                {canManageFinance && <AddFeeStructureModal classes={classes} onSuccess={fetchFinanceData} />}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFeeStructures.map((fs) => {
                  const coveragePercent = fs.enrolledCount > 0 
                    ? Math.min(100, Math.round((fs.uniqueStudentsPaid / fs.enrolledCount) * 100))
                    : 0;

                  return (
                    <div 
                      key={fs.id}
                      className="glass-panel border border-white/10 rounded-[1.8rem] p-6 space-y-5 group hover:border-primary/40 hover:bg-white/[0.07] transition-all relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                              {fs.classes?.name || "General"}
                            </Badge>
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] text-muted-foreground font-semibold">
                              {fs.academic_year} • T{fs.term}
                            </Badge>
                          </div>
                          <h3 className="font-black text-lg text-foreground tracking-tight group-hover:text-primary transition-colors pt-1">
                            {fs.name}
                          </h3>
                        </div>

                        {/* Action buttons */}
                        {canManageFinance && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingFee(fs)}
                              className="size-8 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingFee(fs)}
                              className="size-8 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="pt-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Fee Amount</span>
                        <div className="text-2xl font-black text-foreground tabular-nums">
                          {formatNGN(fs.amount)}
                        </div>
                      </div>

                      {/* Collection Progress */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="text-muted-foreground">Collection Coverage</span>
                          <span className="text-foreground font-bold">{coveragePercent}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500" 
                            style={{ width: `${coveragePercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium pt-0.5">
                          <span>{fs.uniqueStudentsPaid} / {fs.enrolledCount} students paid</span>
                          <span>{formatNGN(fs.totalCollected || 0)} collected</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* TAB 3: STUDENT BALANCES & DEBTORS */}
        <TabsContent value="debtors" className="space-y-6 mt-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 md:p-8 rounded-[2rem] border-white/5 bg-white/5 space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black">Student Fee Balances</h2>
                  <p className="text-xs text-muted-foreground font-medium">Track who has paid, partial balances, and record offline cash/POS receipts.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground">Select Class:</span>
                <Select value={selectedClassForDebtors} onValueChange={setSelectedClassForDebtors}>
                  <SelectTrigger className="w-44 h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse text-xs font-medium">Loading student balances...</p>
              </div>
            ) : debtorsData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground italic text-xs">
                No enrolled students found in this class.
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-white/10 overflow-hidden bg-white/5">
                <Table>
                  <TableHeader className="bg-white/10">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="font-bold py-4 text-foreground text-xs pl-6">Student</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs">Total Assigned Fees</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs">Total Paid</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs">Outstanding Balance</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs">Payment Status</TableHead>
                      <TableHead className="font-bold py-4 text-foreground text-xs text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtorsData.map((row) => (
                      <TableRow key={row.student.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="pl-6 py-4">
                          <div className="font-bold text-foreground text-sm">
                            {row.student.profiles?.full_name || "Unknown"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono font-bold uppercase">
                            {row.student.admission_no}
                          </div>
                        </TableCell>

                        <TableCell className="py-4 font-bold text-xs">
                          {formatNGN(row.expected)}
                        </TableCell>

                        <TableCell className="py-4 font-bold text-xs text-emerald-400">
                          {formatNGN(row.paid)}
                        </TableCell>

                        <TableCell className="py-4 font-black text-xs">
                          {row.balance > 0 ? (
                            <span className="text-rose-400">{formatNGN(row.balance)}</span>
                          ) : (
                            <span className="text-muted-foreground">₦0.00</span>
                          )}
                        </TableCell>

                        <TableCell className="py-4">
                          <Badge
                            className={cn(
                              "capitalize rounded-xl px-3 py-0.5 font-bold text-[10px]",
                              row.status === "paid" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                              row.status === "partial" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                              row.status === "pending_verification" && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                              row.status === "unpaid" && "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            )}
                          >
                            {row.status === "pending_verification" ? "Pending Review" : row.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-4 text-right pr-6">
                          {canManageFinance ? (
                            <RecordManualPaymentModal 
                              feeStructures={row.applicableFees.length > 0 ? row.applicableFees : feeStructures} 
                              onSuccess={fetchFinanceData} 
                            />
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-medium italic">Read-only</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Edit Fee Structure Modal */}
      <EditFeeStructureModal
        isOpen={!!editingFee}
        onClose={() => setEditingFee(null)}
        onSuccess={fetchFinanceData}
        feeStructure={editingFee}
        classes={classes}
      />

      {/* Delete Fee Structure Modal (With Pre-flight Payment Protection) */}
      <DeleteFeeStructureModal
        isOpen={!!deletingFee}
        onClose={() => setDeletingFee(null)}
        onSuccess={fetchFinanceData}
        feeStructure={deletingFee}
      />

      {/* Official Receipt Dialog Preview & Print */}
      <ReceiptDialog
        isOpen={!!selectedReceiptForModal}
        onClose={() => setSelectedReceiptForModal(null)}
        receipt={selectedReceiptForModal}
        schoolName={tenant?.name}
      />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  badgeText: string;
  badgeVariant?: "warning" | "neutral" | "success";
  icon: any;
  color: "amber" | "sky" | "emerald" | "purple" | "primary";
}

function MetricCard({ title, value, badgeText, badgeVariant = "neutral", icon: Icon, color }: MetricCardProps) {
  const colorStyles = {
    amber: {
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      accentGlow: "from-amber-500/5 to-transparent",
      dotColor: "bg-amber-500",
    },
    sky: {
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      accentGlow: "from-sky-500/5 to-transparent",
      dotColor: "bg-sky-500",
    },
    emerald: {
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      accentGlow: "from-emerald-500/5 to-transparent",
      dotColor: "bg-emerald-500",
    },
    purple: {
      iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      accentGlow: "from-purple-500/5 to-transparent",
      dotColor: "bg-purple-500",
    },
    primary: {
      iconBg: "bg-primary/10 text-primary border-primary/20",
      accentGlow: "from-primary/5 to-transparent",
      dotColor: "bg-primary",
    }
  }[color];

  return (
    <div className="relative rounded-[2rem] p-6 sm:p-7 bg-card border border-border/80 shadow-xs hover:shadow-lg hover:shadow-black/5 hover:border-border transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[185px] group overflow-hidden">
      {/* Subtle corner highlight */}
      <div className={cn("absolute -top-12 -right-12 size-28 bg-gradient-to-br rounded-full blur-xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500", colorStyles.accentGlow)} />

      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className={cn("size-11 rounded-2xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-xs", colorStyles.iconBg)}>
          <Icon className="size-5" />
        </div>
      </div>

      <div className="relative z-10 mt-5 space-y-2.5">
        <div className="text-2xl sm:text-3xl lg:text-[2rem] font-black tracking-tight leading-none text-foreground tabular-nums truncate">
          {value}
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          {badgeVariant === "warning" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              {badgeText}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className={cn("size-1.5 rounded-full opacity-60", colorStyles.dotColor)} />
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
