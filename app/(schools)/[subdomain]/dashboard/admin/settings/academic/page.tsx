'use client';

import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Save, 
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Percent,
  Award,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/components/providers/tenant-provider';
import { useParams, useRouter } from 'next/navigation';
import { getBackendUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { getResultMetrics, saveResultMetrics } from '@/app/actions/admin-actions';

export default function AcademicSettings() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const router = useRouter();
  const { tenant, refreshAcademicCycle } = useTenant();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Form states
  const [academicYear, setAcademicYear] = useState<string>('2025/2026');
  const [currentTerm, setCurrentTerm] = useState<string>('1');
  const [termBegins, setTermBegins] = useState<string>('');
  const [termEnds, setTermEnds] = useState<string>('');

  // Metrics states
  const [metrics, setMetrics] = useState<any[]>([]);
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [savingMetrics, setSavingMetrics] = useState(false);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  const loadMetrics = async (sId: string) => {
    try {
      const res = await getResultMetrics(null, null, sId, subdomain);
      if (res.success) {
        setMetrics(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load metrics:", err);
    }
  };

  useEffect(() => {
    if (!tenant?.id) return;

    async function loadSchoolData() {
      try {
        const res = await fetch(`${getBackendUrl()}/tenant/school-data?subdomain=${subdomain}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(err.message || `Backend error: ${res.status}`);
        }

        const json = await res.json();
        const school = json.data;

        if (school) {
          setSchoolId(school.id);
          setAcademicYear(school.academic_year || '2025/2026');
          setCurrentTerm(String(school.current_term || 1));
          setTermBegins(formatDate(school.term_begins));
          setTermEnds(formatDate(school.term_ends));
          
          await loadMetrics(school.id);
        }
      } catch (error: any) {
        console.error('[Academic Settings] Data load error:', error.message);
        toast.error('Failed to load academic settings');
        if (tenant?.id) {
          setSchoolId(tenant.id);
          loadMetrics(tenant.id);
        }
      } finally {
        setLoading(false);
      }
    }

    loadSchoolData();
  }, [tenant?.id, subdomain]);

  const handleSave = async () => {
    if (!schoolId) {
      toast.error('School not ready. Please try again.');
      return;
    }
    
    if (!termBegins || !termEnds) {
      toast.error('Please specify both Term Begins and Term Ends dates.');
      return;
    }

    if (new Date(termBegins) >= new Date(termEnds)) {
      toast.error('Term Begins date must be before the Term Ends date.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${getBackendUrl()}/tenant/school-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          schoolId,
          updates: {
            academic_year: academicYear,
            current_term: Number(currentTerm),
            term_begins: termBegins,
            term_ends: termEnds,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(err.message || 'Failed to update academic settings');
      }

      toast.success('Academic cycle updated successfully');
      
      // Refresh global context so header updates instantly
      await refreshAcademicCycle();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update academic cycle');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMetric = () => {
    setMetrics(prev => [...prev, { name: '', weight: 0, school_id: schoolId }]);
  };

  const handleRemoveMetric = (index: number) => {
    setMetrics(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMetricChange = (index: number, field: string, val: string | number) => {
    setMetrics(prev => prev.map((m, idx) => {
      if (idx === index) {
        return { ...m, [field]: val };
      }
      return m;
    }));
  };

  const totalWeight = metrics.reduce((sum, m) => sum + Number(m.weight || 0), 0);

  const handleSaveMetrics = async () => {
    if (totalWeight !== 100) {
      toast.error(`Total weight must equal exactly 100. Current total: ${totalWeight}`);
      return;
    }
    
    // Validate names are not empty
    const hasEmptyName = metrics.some(m => !m.name.trim());
    if (hasEmptyName) {
      toast.error("Please fill in all assessment metric names.");
      return;
    }

    setSavingMetrics(true);
    try {
      const payload = metrics.map(m => ({
        school_id: schoolId,
        class_id: null,
        subject_id: null,
        name: m.name.trim(),
        weight: Number(m.weight),
        is_custom: false
      }));

      const res = await saveResultMetrics(payload, subdomain);
      if (res.error) throw new Error(res.error);
      
      toast.success("Default assessment metrics saved successfully!");
      setIsEditingMetrics(false);
      loadMetrics(schoolId!);
    } catch (err: any) {
      toast.error(err.message || "Failed to save metrics");
    } finally {
      setSavingMetrics(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Calculate current week preview locally
  let weekPreview: string = 'Break / Holiday';
  if (termBegins && termEnds) {
    const start = new Date(termBegins);
    const end = new Date(termEnds);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    now.setHours(12, 0, 0, 0);
    
    if (now >= start && now <= end) {
      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const week = Math.floor(diffDays / 7) + 1;
      weekPreview = `Week ${week}`;
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Academic Calendar — full width */}
      <div className="glass-panel rounded-[2rem] overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500" />

        <div className="p-8 space-y-8">
          {/* Header row with title + save */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl shadow-sm">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-extrabold text-slate-900">Academic Calendar</h2>
                <p className="text-sm text-slate-500 font-medium tracking-tight">Manage your school&apos;s current session and active term cycle.</p>
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="h-12 px-7 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold gap-2 shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98]"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Sync Academic Cycle
            </Button>
          </div>

          {/* Session & Term — top row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="group relative bg-white border border-slate-100 rounded-2xl p-5 space-y-3 transition-all duration-200 hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Current Session</Label>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-50 px-2 py-0.5 rounded-full">Academic Year</span>
              </div>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="h-14 bg-slate-50/80 border-slate-200/80 rounded-xl font-bold text-base hover:bg-slate-100/60 transition-colors">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                  <SelectItem value="2026/2027">2026/2027</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="group relative bg-white border border-slate-100 rounded-2xl p-5 space-y-3 transition-all duration-200 hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Current Term</Label>
                <span className="text-[10px] font-bold text-violet-400 bg-violet-50 px-2 py-0.5 rounded-full">Active Period</span>
              </div>
              <Select value={currentTerm} onValueChange={setCurrentTerm}>
                <SelectTrigger className="h-14 bg-slate-50/80 border-slate-200/80 rounded-xl font-bold text-base hover:bg-slate-100/60 transition-colors">
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  <SelectItem value="1">1st Term</SelectItem>
                  <SelectItem value="2">2nd Term</SelectItem>
                  <SelectItem value="3">3rd Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Term Dates — styled card */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-400 to-violet-500" />
              <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">Term Duration</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 px-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Starts
                </Label>
                <Input 
                  type="date"
                  value={termBegins}
                  onChange={(e) => setTermBegins(e.target.value)}
                  className="h-14 bg-white border-slate-200 rounded-xl font-bold text-base focus:ring-purple-500 focus:border-purple-300 transition-all hover:border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 px-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Ends
                </Label>
                <Input 
                  type="date"
                  value={termEnds}
                  onChange={(e) => setTermEnds(e.target.value)}
                  className="h-14 bg-white border-slate-200 rounded-xl font-bold text-base focus:ring-purple-500 focus:border-purple-300 transition-all hover:border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Live status strip */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-100">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs font-bold text-purple-700">{academicYear}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-50 border border-violet-100">
              <span className="text-xs font-bold text-violet-700">
                {currentTerm === '1' ? '1st Term' : currentTerm === '2' ? '2nd Term' : '3rd Term'}
              </span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
              weekPreview.startsWith('Week') 
                ? 'bg-emerald-50 border-emerald-100' 
                : 'bg-slate-50 border-slate-100'
            }`}>
              <span className={`text-xs font-bold ${
                weekPreview.startsWith('Week') ? 'text-emerald-700' : 'text-slate-500'
              }`}>
                {weekPreview.startsWith('Week') ? `📍 ${weekPreview}` : `🏖️ ${weekPreview}`}
              </span>
            </div>
            {termBegins && termEnds && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-medium text-slate-500">
                  {Math.ceil((new Date(termEnds).getTime() - new Date(termBegins).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks total
                </span>
              </div>
            )}
          </div>

          {/* Warning banner */}
          <div className="relative bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/60 p-5 rounded-2xl flex gap-4 items-start overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-400 rounded-r" />
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 ml-2 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Important Notice</p>
              <p className="text-sm text-amber-700/80 font-medium leading-relaxed">
                Changing the active session or term will affect GPA calculations and report card generation across all classes. Ensure all results for the previous term are finalized before syncing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Default Grading Metrics Panel */}
      <div className="glass-panel p-8 rounded-[2rem] space-y-8 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-slate-900">Default Result Assessment Metrics</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Configure default school-wide result components (e.g. Tests, Assignments, Exams) that must sum to 100.</p>
            </div>
          </div>
          
          {!isEditingMetrics ? (
            <Button 
              onClick={() => setIsEditingMetrics(true)} 
              className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Configure Default Weights
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditingMetrics(false);
                  loadMetrics(schoolId!);
                }} 
                className="h-12 px-6 rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveMetrics} 
                disabled={savingMetrics || totalWeight !== 100}
                className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {savingMetrics && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Default Weights
              </Button>
            </div>
          )}
        </div>

        {isEditingMetrics ? (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-4 max-w-3xl">
              {metrics.map((m, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-slate-400 font-bold uppercase px-1">Component Name</Label>
                    <Input 
                      placeholder="e.g. First Test" 
                      value={m.name} 
                      onChange={(e) => handleMetricChange(idx, 'name', e.target.value)}
                      className="h-12 bg-white rounded-xl font-bold"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs text-slate-400 font-bold uppercase px-1">Weight (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={m.weight || ''} 
                        onChange={(e) => handleMetricChange(idx, 'weight', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        className="h-12 bg-white rounded-xl font-bold pr-8"
                      />
                      <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveMetric(idx)}
                    className="mt-6 size-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}

              <Button 
                variant="outline" 
                onClick={handleAddMetric} 
                className="h-12 w-full rounded-xl border-dashed border-slate-300 font-bold text-slate-600 bg-white hover:bg-slate-50"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Assessment Component
              </Button>
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-500">Cumulative Weight Sum:</span>
                <Badge className={totalWeight === 100 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                  {totalWeight} / 100
                </Badge>
              </div>
              {totalWeight !== 100 && (
                <p className="text-xs text-rose-500 font-medium animate-pulse">Total weight must sum up to exactly 100%.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {metrics.length > 0 && (
              <>
                {/* Header row */}
                <div className="grid grid-cols-12 items-center px-5 py-2">
                  <span className="col-span-1 text-[10px] font-black uppercase tracking-widest text-slate-300">#</span>
                  <span className="col-span-5 text-[10px] font-black uppercase tracking-widest text-slate-300">Component</span>
                  <span className="col-span-4 text-[10px] font-black uppercase tracking-widest text-slate-300">Distribution</span>
                  <span className="col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-300 text-right">Weight</span>
                </div>

                {/* Metric rows */}
                {metrics.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`group grid grid-cols-12 items-center px-5 py-4 rounded-2xl border transition-all duration-200 hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/30 ${
                      idx % 2 === 0 
                        ? 'bg-white border-slate-100' 
                        : 'bg-slate-50/60 border-slate-100'
                    }`}
                  >
                    {/* Number */}
                    <div className="col-span-1">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-xs font-extrabold text-slate-400 group-hover:text-indigo-600 transition-colors">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="col-span-5 flex items-center gap-3">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      <span className="font-bold text-slate-800 text-sm group-hover:text-indigo-900 transition-colors">{m.name}</span>
                    </div>

                    {/* Visual bar */}
                    <div className="col-span-4 pr-6">
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden group-hover:bg-indigo-100/60 transition-colors">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${m.weight}%`,
                            background: m.weight >= 50 
                              ? 'linear-gradient(90deg, #6366f1, #818cf8)' 
                              : m.weight >= 20 
                                ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)' 
                                : 'linear-gradient(90deg, #c4b5fd, #ddd6fe)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Weight badge */}
                    <div className="col-span-2 flex justify-end">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-100 group-hover:border-indigo-200 transition-colors">
                        <span className="text-sm font-extrabold text-indigo-700">{m.weight}</span>
                        <span className="text-xs font-bold text-indigo-400">%</span>
                      </span>
                    </div>
                  </div>
                ))}

                {/* Total summary */}
                <div className="grid grid-cols-12 items-center px-5 py-4 mt-2 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                  <div className="col-span-1" />
                  <div className="col-span-5">
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-500">Total Weight</span>
                  </div>
                  <div className="col-span-4 pr-6">
                    <div className="w-full h-2.5 bg-indigo-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${Math.min(totalWeight, 100)}%`,
                          background: totalWeight === 100 
                            ? 'linear-gradient(90deg, #10b981, #34d399)' 
                            : 'linear-gradient(90deg, #f43f5e, #fb7185)'
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border font-extrabold text-sm ${
                      totalWeight === 100 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {totalWeight}<span className="text-xs font-bold opacity-60">%</span>
                    </span>
                  </div>
                </div>
              </>
            )}

            {metrics.length === 0 && (
              <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-semibold text-sm">No default metrics configured</p>
                <p className="text-slate-400 text-xs mt-1">Fallback system defaults (Tests, Assignment, Exam) are currently active.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
