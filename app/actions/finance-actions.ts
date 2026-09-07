"use server";

import { requireActionAuth } from "@/lib/supabase/action-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateFeeStructureSchema = z.object({
  name: z.string().trim().min(2, "Fee name must be at least 2 characters").max(100, "Fee name too long"),
  classId: z.string().trim().min(1, "Class is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  academicYear: z.string().trim().min(4, "Academic year is required"),
  term: z.coerce.number().int().min(1).max(3, "Term must be between 1 and 3"),
});

const UpdateFeeStructureSchema = z.object({
  name: z.string().trim().min(2, "Fee name must be at least 2 characters").max(100, "Fee name too long"),
  classId: z.string().trim().min(1, "Class is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  academicYear: z.string().trim().min(4, "Academic year is required"),
  term: z.coerce.number().int().min(1).max(3, "Term must be between 1 and 3"),
});

const RecordManualPaymentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  feeStructureId: z.string().uuid("Invalid fee structure ID"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  channel: z.enum(["cash", "pos", "bank_deposit"], {
    errorMap: () => ({ message: "Please select Cash, POS, or Bank Deposit" }),
  }),
  senderName: z.string().trim().optional(),
  bankReference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

/**
 * Fetches comprehensive finance overview:
 * - Fee structures (with class name, enrolled student count, paid count, total collected)
 * - All payments with student and fee structure metadata
 * - School bank and settlement account
 * - High-level financial statistics
 */
export async function getFinanceOverview(
  subdomain: string,
  academicYear?: string,
  term?: number
) {
  if (!subdomain) return { error: "Subdomain is required" };
  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ["admin"]);

    // 1. Fetch Fee Structures
    let feeQuery = (tenantSupabase as any)
      .from("fee_structures")
      .select(`
        id,
        name,
        amount,
        academic_year,
        term,
        class_id,
        created_at,
        classes:class_id (
          id,
          name
        )
      `)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (academicYear) {
      feeQuery = feeQuery.eq("academic_year", academicYear);
    }
    if (term) {
      feeQuery = feeQuery.eq("term", term);
    }

    const { data: structures, error: structuresErr } = await feeQuery;
    if (structuresErr) throw structuresErr;

    // 2. Fetch Payments Ledger
    const { data: payments, error: paymentsErr } = await (tenantSupabase as any)
      .from("fee_payments")
      .select(`
        id,
        amount,
        reference,
        status,
        channel,
        paid_at,
        created_at,
        metadata,
        student_id,
        fee_structure_id,
        students:student_id (
          id,
          admission_no,
          class_id,
          profiles:students_user_id_fkey (
            full_name
          )
        ),
        fee_structures:fee_structure_id (
          id,
          name,
          academic_year,
          term
        )
      `)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (paymentsErr) throw paymentsErr;

    // 3. Fetch Classes for enrolled student counts and dropdowns
    const { data: classesList, error: classesErr } = await (tenantSupabase as any)
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("name");

    if (classesErr) throw classesErr;

    // 4. Fetch School Bank Details
    const { data: schoolBank } = await (tenantSupabase as any)
      .from("schools")
      .select("id, bank_name, account_name, account_number, academic_year, current_term")
      .eq("id", schoolId)
      .maybeSingle();

    // 5. Calculate student enrollments per class for progress tracking
    const { data: studentEnrollments } = await (tenantSupabase as any)
      .from("students")
      .select("id, class_id")
      .eq("school_id", schoolId);

    const classStudentCountMap = (studentEnrollments || []).reduce((acc: Record<string, number>, s: any) => {
      if (s.class_id) {
        acc[s.class_id] = (acc[s.class_id] || 0) + 1;
      }
      return acc;
    }, {});

    // 6. Enrich Fee Structures with collection stats
    const enrichedStructures = (structures || []).map((fs: any) => {
      const matchingPayments = (payments || []).filter(
        (p: any) => p.fee_structure_id === fs.id && p.status === "success"
      );
      const totalCollected = matchingPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const uniqueStudentsPaid = new Set(matchingPayments.map((p: any) => p.student_id)).size;
      const enrolledCount = classStudentCountMap[fs.class_id] || 0;

      return {
        ...fs,
        totalCollected,
        uniqueStudentsPaid,
        enrolledCount,
        expectedRevenue: enrolledCount * Number(fs.amount || 0),
      };
    });

    // 7. Calculate Comprehensive Executive Stats
    const successfulPayments = (payments || []).filter((p: any) => p.status === "success");
    const pendingPayments = (payments || []).filter((p: any) => p.status === "pending");
    const pendingTransfers = pendingPayments.filter((p: any) => p.channel === "bank_transfer");

    const totalRevenue = successfulPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const uniquePayeesCount = new Set(successfulPayments.map((p: any) => p.student_id)).size;

    return {
      feeStructures: enrichedStructures,
      payments: payments || [],
      classes: classesList || [],
      schoolBank: schoolBank || null,
      stats: {
        totalRevenue,
        pendingAmount: pendingPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
        pendingTransfersCount: pendingTransfers.length,
        uniquePayeesCount,
        totalTransactionsCount: (payments || []).length,
        successfulCount: successfulPayments.length,
      },
    };
  } catch (error: any) {
    console.error("[finance-actions] getFinanceOverview error:", error);
    return { error: error.message || "Failed to load finance overview" };
  }
}

/**
 * Creates a fee structure. Supports batch creation across "ALL" classes.
 */
export async function createFeeStructure(subdomain: string, rawPayload: any) {
  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ["admin"]);
    const validated = CreateFeeStructureSchema.parse(rawPayload);

    if (validated.classId === "ALL") {
      // Fetch all classes for the school
      const { data: classes, error: classesErr } = await (tenantSupabase as any)
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId);

      if (classesErr || !classes || classes.length === 0) {
        return { error: "No classes found to apply school-wide fee structure" };
      }

      const rows = classes.map((c: any) => ({
        school_id: schoolId,
        class_id: c.id,
        name: validated.name,
        amount: validated.amount,
        academic_year: validated.academicYear,
        term: validated.term,
      }));

      const { error: insertErr } = await (tenantSupabase as any)
        .from("fee_structures")
        .insert(rows);

      if (insertErr) throw insertErr;

      revalidatePath(`/dashboard/admin/finance`);
      return { success: true, count: rows.length };
    }

    // Single class insertion
    const { error: insertErr } = await (tenantSupabase as any)
      .from("fee_structures")
      .insert({
        school_id: schoolId,
        class_id: validated.classId,
        name: validated.name,
        amount: validated.amount,
        academic_year: validated.academicYear,
        term: validated.term,
      });

    if (insertErr) throw insertErr;

    revalidatePath(`/dashboard/admin/finance`);
    return { success: true, count: 1 };
  } catch (error: any) {
    console.error("[finance-actions] createFeeStructure error:", error);
    return { error: error.message || "Failed to create fee structure" };
  }
}

/**
 * Updates an existing fee structure.
 */
export async function updateFeeStructure(subdomain: string, id: string, rawPayload: any) {
  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ["admin"]);
    if (!id) return { error: "Fee structure ID is required" };

    const validated = UpdateFeeStructureSchema.parse(rawPayload);

    const { error: updateErr } = await (tenantSupabase as any)
      .from("fee_structures")
      .update({
        name: validated.name,
        class_id: validated.classId,
        amount: validated.amount,
        academic_year: validated.academicYear,
        term: validated.term,
      })
      .eq("id", id)
      .eq("school_id", schoolId);

    if (updateErr) throw updateErr;

    revalidatePath(`/dashboard/admin/finance`);
    return { success: true };
  } catch (error: any) {
    console.error("[finance-actions] updateFeeStructure error:", error);
    return { error: error.message || "Failed to update fee structure" };
  }
}

/**
 * Pre-flight safe deletion: blocks deletion if payments exist to preserve financial audit trail.
 */
export async function deleteFeeStructure(subdomain: string, id: string) {
  try {
    const { tenantSupabase, schoolId } = await requireActionAuth(subdomain, ["admin"]);
    if (!id) return { error: "Fee structure ID is required" };

    // 1. Pre-flight Dependency Guard: check for existing fee payments
    const { count, error: countErr } = await (tenantSupabase as any)
      .from("fee_payments")
      .select("id", { count: "exact", head: true })
      .eq("fee_structure_id", id)
      .eq("school_id", schoolId);

    if (countErr) throw countErr;

    if (count && count > 0) {
      return {
        error: `Cannot delete fee structure: ${count} recorded payment(s) are linked to this fee item. Deleting it would permanently corrupt the school's historical ledger and receipts.`,
      };
    }

    // 2. Safe to delete
    const { error: deleteErr } = await (tenantSupabase as any)
      .from("fee_structures")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (deleteErr) throw deleteErr;

    revalidatePath(`/dashboard/admin/finance`);
    return { success: true };
  } catch (error: any) {
    console.error("[finance-actions] deleteFeeStructure error:", error);
    return { error: error.message || "Failed to delete fee structure" };
  }
}

/**
 * Records an on-site manual bursary payment (Cash, POS, or Direct Bank Deposit).
 */
export async function recordManualPayment(subdomain: string, rawPayload: any) {
  try {
    const { tenantSupabase, schoolId, user } = await requireActionAuth(subdomain, ["admin"]);
    const validated = RecordManualPaymentSchema.parse(rawPayload);

    // Verify student exists in this school
    const { data: student, error: studentErr } = await (tenantSupabase as any)
      .from("students")
      .select("id, class_id")
      .eq("id", validated.studentId)
      .eq("school_id", schoolId)
      .single();

    if (studentErr || !student) {
      return { error: "Student not found in this school" };
    }

    // Verify fee structure exists
    const { data: feeStructure, error: feeErr } = await (tenantSupabase as any)
      .from("fee_structures")
      .select("id, name, amount")
      .eq("id", validated.feeStructureId)
      .eq("school_id", schoolId)
      .single();

    if (feeErr || !feeStructure) {
      return { error: "Fee structure not found" };
    }

    // Generate unique manual payment reference
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `MN-${timestamp}-${randomHex}`;

    const { error: insertErr } = await (tenantSupabase as any)
      .from("fee_payments")
      .insert({
        school_id: schoolId,
        student_id: validated.studentId,
        fee_structure_id: validated.feeStructureId,
        amount: validated.amount,
        reference,
        status: "success",
        channel: validated.channel,
        paid_at: new Date().toISOString(),
        metadata: {
          recordedBy: user.email || "Administrator",
          recordedAt: new Date().toISOString(),
          paymentMode: validated.channel.toUpperCase(),
          senderName: validated.senderName || "Bursary On-Site Payer",
          bankReference: validated.bankReference || null,
          notes: validated.notes || null,
        },
      });

    if (insertErr) throw insertErr;

    revalidatePath(`/dashboard/admin/finance`);
    return { success: true, reference };
  } catch (error: any) {
    console.error("[finance-actions] recordManualPayment error:", error);
    return { error: error.message || "Failed to record manual payment" };
  }
}
