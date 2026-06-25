'use client';

import React from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Lock, 
  Key, 
  Globe, 
  History, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export default function SecuritySettings() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Policy Console */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-slate-900">Security</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Control who can sign up and how logins work.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100 rounded-3xl">
              <div className="flex gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm self-start">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">Student Self-Registration</p>
                  <p className="text-xs text-slate-500 font-medium">Allow students to create their own accounts via public registration page.</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100 rounded-3xl">
              <div className="flex gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm self-start">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">Enhanced Password Policy</p>
                  <p className="text-xs text-slate-500 font-medium">Require special characters and capital letters for all staff accounts.</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100 rounded-3xl">
              <div className="flex gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm self-start">
                  <Globe className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">Maintenance Mode</p>
                  <p className="text-xs text-slate-500 font-medium">Suspend student/teacher dashboard access for system updates.</p>
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Audit Log / Rapid Meta Bento */}
        <div className="space-y-8 h-full flex flex-col">
          <div className="glass-panel p-8 rounded-[2rem] flex-1 space-y-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-100 rounded-xl">
                  <History className="w-4 h-4 text-blue-600" />
               </div>
               <span className="text-sm font-bold text-slate-900">Recent Activity</span>
            </div>

            <div className="space-y-4">
               {[
                 { action: 'Updated SMS Token', user: 'Admin', time: '12m ago' },
                 { action: 'Session Synced', user: 'System', time: '2h ago' },
                 { action: 'Role Modified', user: 'SuperAdmin', time: '5h ago' }
               ].map((log, i) => (
                 <div key={i} className="flex flex-col gap-1 py-1">
                    <div className="flex justify-between items-center italic">
                       <span className="text-xs font-bold text-slate-600">{log.action}</span>
                       <span className="text-[10px] text-slate-400 font-medium uppercase">{log.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                       <UserCheck className="w-3 h-3 text-emerald-500" />
                       <span className="text-[10px] text-slate-400">By {log.user}</span>
                    </div>
                 </div>
               ))}
            </div>

            <Button variant="ghost" className="w-full text-xs font-bold text-slate-400 group hover:text-blue-600 py-6">
                View Full Log <ArrowRight className="w-3 h-3 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] bg-slate-900 text-white space-y-4 relative overflow-hidden group">
             {/* Decorative Background Icon */}
             <Key className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 opacity-10 rotate-12 transition-transform group-hover:rotate-0" />
             
             <div className="p-3 bg-white/10 rounded-2xl w-fit">
                <Key className="w-6 h-6 text-blue-400" />
             </div>
             <div>
                <h4 className="font-bold">Two-Factor Auth</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                   Add an extra layer of security to the administrative accounts.
                </p>
             </div>
             <Button className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20">
                Enable 2FA Now
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
