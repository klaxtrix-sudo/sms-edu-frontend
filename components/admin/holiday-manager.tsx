"use client";

import { useState } from "react";
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Sparkles, 
  Loader2, 
  Palmtree, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTenant } from "@/components/providers/tenant-provider";
import { 
  getStatutoryHolidayPresets 
} from "@/lib/constants/statutory-holidays";
import { type SchoolHoliday } from "@/lib/utils/attendance-session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function HolidayManager() {
  const { tenant, supabase, holidays, refreshHolidays, academicCycle } = useTenant();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add form states
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [holidayType, setHolidayType] = useState<"public_holiday" | "mid_term_break" | "school_recess" | "special_closure">("public_holiday");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setHolidayType("public_holiday");
    setDescription("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !tenant?.id) return;

    if (!name.trim()) {
      toast.error("Please enter a holiday or break name");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please provide both start and end dates");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date cannot be after end date");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("school_holidays" as any)
        .insert({
          school_id: tenant.id,
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
          holiday_type: holidayType,
          description: description.trim() || null,
        });

      if (error) throw error;

      toast.success(`Added "${name}" to school calendar`);
      setIsAddOpen(false);
      resetForm();
      await refreshHolidays();
    } catch (err: any) {
      console.error("[HolidayManager] Error creating holiday:", err);
      toast.error(err?.message || "Failed to add holiday");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, holidayName: string) => {
    if (!supabase) return;
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("school_holidays" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(`Removed "${holidayName}"`);
      await refreshHolidays();
    } catch (err: any) {
      console.error("[HolidayManager] Error deleting holiday:", err);
      toast.error("Failed to remove holiday");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadStatutoryPresets = async () => {
    if (!supabase || !tenant?.id) return;
    setLoadingPresets(true);
    try {
      const presets = getStatutoryHolidayPresets(academicCycle?.academicYear || "2025/2026");
      
      // Filter out presets whose names and dates already exist in the school's roster
      const existingSignatures = new Set(
        holidays.map(h => `${h.name.toLowerCase()}_${h.start_date.split("T")[0]}`)
      );

      const toInsert = presets
        .filter(p => !existingSignatures.has(`${p.name.toLowerCase()}_${p.startDate}`))
        .map(p => ({
          school_id: tenant.id,
          name: p.name,
          start_date: p.startDate,
          end_date: p.endDate,
          holiday_type: p.holidayType,
          description: p.description,
        }));

      if (toInsert.length === 0) {
        toast.info("All statutory national holidays are already registered for this session.");
        return;
      }

      const { error } = await supabase
        .from("school_holidays" as any)
        .insert(toInsert);

      if (error) throw error;

      toast.success(`Successfully populated ${toInsert.length} national statutory holidays!`);
      await refreshHolidays();
    } catch (err: any) {
      console.error("[HolidayManager] Error loading presets:", err);
      toast.error(err?.message || "Failed to load statutory presets");
    } finally {
      setLoadingPresets(false);
    }
  };

  const getHolidayTypeBadge = (type: SchoolHoliday["holiday_type"]) => {
    switch (type) {
      case "public_holiday":
        return (
          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-bold text-[11px] gap-1 px-2.5 py-0.5">
            <span>Public Holiday</span>
          </Badge>
        );
      case "mid_term_break":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 font-bold text-[11px] gap-1 px-2.5 py-0.5">
            <span>Mid-Term Break</span>
          </Badge>
        );
      case "school_recess":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-bold text-[11px] gap-1 px-2.5 py-0.5">
            <span>School Recess</span>
          </Badge>
        );
      case "special_closure":
        return (
          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 font-bold text-[11px] gap-1 px-2.5 py-0.5">
            <span>Special Closure</span>
          </Badge>
        );
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const getStatusIndicator = (start: string, end: string) => {
    const s = start.split("T")[0];
    const e = end.split("T")[0];
    if (todayStr >= s && todayStr <= e) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
          Active Today
        </span>
      );
    }
    if (todayStr > e) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-muted-foreground bg-muted">
          Passed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20">
        Upcoming
      </span>
    );
  };

  const formatDisplayDates = (start: string, end: string) => {
    const s = new Date(`${start.split("T")[0]}T00:00:00`);
    const e = new Date(`${end.split("T")[0]}T00:00:00`);
    
    const startFormatted = s.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const endFormatted = e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

    if (start.split("T")[0] === end.split("T")[0]) {
      return startFormatted;
    }
    return `${startFormatted} – ${endFormatted}`;
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(`${start.split("T")[0]}T00:00:00`).getTime();
    const e = new Date(`${end.split("T")[0]}T00:00:00`).getTime();
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff === 1 ? "1 day" : `${diff} days`;
  };

  return (
    <div className="glass-panel rounded-[2rem] overflow-hidden border border-border/60 bg-card/50 backdrop-blur-xl shadow-xl">
      {/* Top Gradient accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />

      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl shadow-sm text-purple-600 dark:text-purple-400">
              <Palmtree className="size-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-heading font-extrabold text-foreground">
                  Holidays & Term Recesses
                </h2>
                <Badge variant="outline" className="text-xs font-bold font-mono">
                  {holidays.length} Scheduled
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium tracking-tight">
                Manage statutory public holidays and custom mid-term breaks to pause daily roll call.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 1-Click Statutory Generator */}
            <Button
              type="button"
              variant="outline"
              onClick={handleLoadStatutoryPresets}
              disabled={loadingPresets}
              className="h-11 px-4 rounded-xl border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 font-bold text-xs gap-2 transition-all shadow-sm"
              title="Pre-populate Nigerian national holidays for the current academic session"
            >
              {loadingPresets ? (
                <Loader2 className="size-4 animate-spin text-purple-600" />
              ) : (
                <Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
              )}
              <span>Load Statutory Presets</span>
            </Button>

            {/* Add Holiday Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="h-11 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs gap-2 shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02]"
                >
                  <Plus className="size-4" />
                  <span>Add Holiday / Break</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] rounded-3xl p-6">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <CalendarDays className="size-5 text-purple-600" />
                    <span>Schedule Holiday or Break</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs leading-relaxed">
                    Registered holidays automatically pause daily attendance tracking and notify teachers across the dashboard.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Name / Occasion
                    </Label>
                    <Input
                      placeholder="e.g. 1st Term Mid-Term Break or Eid-el-Kabir"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 rounded-xl bg-background/60 font-medium text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Category
                    </Label>
                    <Select value={holidayType} onValueChange={(val: any) => setHolidayType(val)}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/60 font-bold text-sm">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="public_holiday">Statutory Public Holiday</SelectItem>
                        <SelectItem value="mid_term_break">Mid-Term Break</SelectItem>
                        <SelectItem value="school_recess">School Recess</SelectItem>
                        <SelectItem value="special_closure">Special / Emergency Closure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Starts
                      </Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (!endDate) setEndDate(e.target.value);
                        }}
                        className="h-11 rounded-xl bg-background/60 font-bold text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Ends
                      </Label>
                      <Input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-11 rounded-xl bg-background/60 font-bold text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Optional Notes / Description
                    </Label>
                    <Input
                      placeholder="e.g. School resumes on Monday morning at 8:00 AM"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-11 rounded-xl bg-background/60 text-xs"
                    />
                  </div>

                  <DialogFooter className="pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsAddOpen(false);
                        resetForm();
                      }}
                      className="rounded-xl font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl font-bold bg-primary text-primary-foreground px-6"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save to Calendar"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Holiday Roster List */}
        {holidays.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border/80 bg-muted/20 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
              <CalendarDays className="size-6 opacity-60" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">No Holidays Scheduled Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Populate Nigerian national holidays with one click using statutory presets, or add custom mid-term breaks manually.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadStatutoryPresets}
              disabled={loadingPresets}
              className="mt-2 rounded-xl text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-500/10"
            >
              <Sparkles className="size-3.5 mr-1.5 text-purple-600" />
              Populate National Holidays
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {holidays.map((h) => {
              const isDeleting = deletingId === h.id;
              return (
                <div
                  key={h.id}
                  className="group relative p-4 rounded-2xl border border-border/60 bg-background/50 hover:bg-background/80 hover:border-purple-300/60 transition-all duration-200 shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          {h.name}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getHolidayTypeBadge(h.holiday_type)}
                          {getStatusIndicator(h.start_date, h.end_date)}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(h.id, h.name)}
                        disabled={isDeleting}
                        className="size-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors shrink-0"
                        title={`Remove ${h.name}`}
                      >
                        {isDeleting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>

                    {h.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {h.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5 opacity-60" />
                      <span>{formatDisplayDates(h.start_date, h.end_date)}</span>
                    </div>
                    <span className="font-bold text-[11px] bg-muted/60 px-2 py-0.5 rounded-md">
                      {calculateDays(h.start_date, h.end_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
