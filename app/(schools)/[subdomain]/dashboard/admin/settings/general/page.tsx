'use client';

import React from 'react';
import { 
  Building2, 
  MapPin, 
  Quote, 
  Smartphone, 
  Globe, 
  Save, 
  Fingerprint 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function GeneralSettings() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Branding & Profile Section */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 col-span-1 md:col-span-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-2xl">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-slate-900">Institutional Identity</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Manage your school's official brand and contact details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label htmlFor="school-name" className="text-xs font-black uppercase tracking-widest text-slate-400">School Name</Label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="school-name" 
                  defaultValue="KLAXTRIX ACADEMY" 
                  className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motto" className="text-xs font-black uppercase tracking-widest text-slate-400">Motto / Slogan</Label>
              <div className="relative">
                <Quote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="motto" 
                  defaultValue="Empowering Excellence through Technology" 
                  className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="address" className="text-xs font-black uppercase tracking-widest text-slate-400">Physical Address</Label>
              <div className="relative">
                <MapPin className="absolute left-4 top-6 w-4 h-4 text-slate-400" />
                <Textarea 
                  id="address" 
                  defaultValue="Plot 123, Excellence Drive, Creative Hub, Lagos, Nigeria" 
                  className="pl-12 pt-4 min-h-[100px] bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400">Official Phone</Label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="phone" 
                  defaultValue="+234 812 345 6789" 
                  className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-xs font-black uppercase tracking-widest text-slate-400">Official Website</Label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="website" 
                  defaultValue="https://klaxtrix.com" 
                  className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02]">
              <Save className="w-5 h-5" />
              Update Identity
            </Button>
          </div>
        </div>

        {/* Meta Info Bento Cards */}
        <div className="glass-panel p-8 rounded-[2rem] flex flex-col justify-center items-center text-center space-y-4">
          <div className="p-4 bg-indigo-100 rounded-3xl">
            <Fingerprint className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Institutional ID</h3>
            <code className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-mono font-bold mt-2 inline-block italic">
              KLAX-INST-2025-001
            </code>
          </div>
          <p className="text-xs text-slate-400 font-medium max-w-[200px]">
            Official institution reference for government and regulatory verification.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] flex flex-col justify-center items-center text-center space-y-4">
          <div className="p-4 bg-emerald-100 rounded-3xl">
            <Building2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Affiliation</h3>
            <p className="text-sm text-slate-600 font-bold mt-2">Nigerian Ministry of Education</p>
          </div>
          <p className="text-xs text-slate-400 font-medium max-w-[200px]">
            Certified and integrated with regional educational standards.
          </p>
        </div>
      </div>
    </div>
  );
}
