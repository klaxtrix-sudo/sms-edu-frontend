'use client';

import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  GraduationCap, 
  Settings2, 
  Save, 
  AlertCircle,
  Loader2
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
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
        }
      } catch (error: any) {
        console.error('[Academic Settings] Data load error:', error.message);
        toast.error('Failed to load academic settings');
        if (tenant?.id) setSchoolId(tenant.id);
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Term & Session Console */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-2xl">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-slate-900">Academic Calendar</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Manage your school's current session and active term cycle.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Current Session</Label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-bold">
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

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Current Term</Label>
              <Select value={currentTerm} onValueChange={setCurrentTerm}>
                <SelectTrigger className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-bold">
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  <SelectItem value="1">1st Term (Advent)</SelectItem>
                  <SelectItem value="2">2nd Term (Lent)</SelectItem>
                  <SelectItem value="3">3rd Term (Trinity)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Term Begins</Label>
              <Input 
                type="date"
                value={termBegins}
                onChange={(e) => setTermBegins(e.target.value)}
                className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-bold focus:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Term Ends</Label>
              <Input 
                type="date"
                value={termEnds}
                onChange={(e) => setTermEnds(e.target.value)}
                className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-bold focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl flex gap-4 items-start">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-1" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900 uppercase tracking-tight">Critical Action Required</p>
              <p className="text-sm text-amber-700 font-medium">
                Changing the active session or term will affect across-the-board GPA calculations and report card generation. Ensure all results for the previous term are finalized.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="h-14 px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Sync Academic Cycle
            </Button>
          </div>
        </div>

        {/* Academic Status Bento */}
        <div className="glass-panel p-8 rounded-[2rem] flex flex-col space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-slate-600">Active Cycle Info</span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Session</span>
              <span className="font-extrabold text-slate-800 text-sm">{academicYear}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Term</span>
              <span className="font-extrabold text-slate-800 text-sm">
                {currentTerm === '1' ? '1st Term' : currentTerm === '2' ? '2nd Term' : '3rd Term'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Phase</span>
              <Badge className="bg-purple-100 text-purple-700 border-none font-bold uppercase">
                {weekPreview}
              </Badge>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Grading System</h4>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">WAEC Standard</span>
                <GraduationCap className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Last updated: March 15, 2026 by SuperAdmin
              </p>
              <Button variant="outline" className="w-full text-xs font-bold border-slate-200 h-9 rounded-xl hover:bg-white hover:text-blue-600">
                <Settings2 className="w-3 h-3 mr-2" />
                Configure Scales
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
