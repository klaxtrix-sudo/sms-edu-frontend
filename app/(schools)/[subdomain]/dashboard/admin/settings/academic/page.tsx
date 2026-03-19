'use client';

import React from 'react';
import { 
  Calendar, 
  Clock, 
  GraduationCap, 
  Settings2, 
  Save, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent,SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function AcademicSettings() {
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
              <Select defaultValue="2024/2025">
                <SelectTrigger className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-bold">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Current Term</Label>
              <Select defaultValue="2">
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
            <Button className="h-14 px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.02]">
              <Save className="w-5 h-5" />
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
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enrollment Status</span>
              <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold">OPEN</Badge>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Result Entry</span>
              <Badge className="bg-amber-100 text-amber-700 border-none font-bold">LIMITED</Badge>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exam Phase</span>
              <Badge className="bg-indigo-100 text-indigo-700 border-none font-bold">PRE-MOCK</Badge>
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
