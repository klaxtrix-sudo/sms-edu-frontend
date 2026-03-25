'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, ArrowRight, Loader2, Lock, Zap, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axios from 'axios';
import { getBackendUrl } from '@/lib/utils';
import { setConsoleToken, getConsoleToken, verifyConsoleSession } from '@/lib/console-auth';

export default function ConsoleLoginPage() {
  const [credentials, setCredentials] = useState({ accessId: '', masterKey: '' });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = getConsoleToken();
        if (token) {
          const authData = await verifyConsoleSession();
          if (authData.success) {
            router.push('/console/dashboard');
            return;
          }
        }
      } catch (error) {
        console.log('No active session identified.');
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    
    try {
      const backendUrl = getBackendUrl();
      const response = await axios.post(`${backendUrl}/console/login`, {
        username: credentials.accessId,
        password: credentials.masterKey
      });

      if (response.data.success) {
        setConsoleToken(response.data.data.token, response.data.data);
        toast.success('Access Granted', {
          description: 'Establishing orbital link to Mission Control.',
        });
        router.push('/console/dashboard');
      } else {
        throw new Error(response.data.message || 'Access Denied');
      }
    } catch (error: any) {
      setIsAuthenticating(false);
      const message = error.response?.data?.message || error.message || 'Connection Failure';
      toast.error('Access Denied', {
        description: message,
      });
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Authorizing Session...</span>
         </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 blur-[150px] -z-10 rounded-full animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 blur-[120px] -z-10 rounded-full" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="w-24 h-24 rounded-[2rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_-10px_rgba(6,182,212,0.5)]"
           >
              <Shield className="w-12 h-12" />
           </motion.div>
           <div className="space-y-1">
              <h1 className="text-3xl font-heading font-black tracking-tighter text-white uppercase tracking-[0.05em]">KLAXTRIX</h1>
              <p className="text-[10px] font-bold text-cyan-500 tracking-[0.4em] uppercase">Admin Login</p>
           </div>
        </div>

        <Card className="p-8 bg-[#0c0c0c]/50 border-slate-800/50 glass-card">
           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                 <Label htmlFor="accessId" className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Username</Label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                       <Lock className="w-4 h-4" />
                    </div>
                    <Input 
                      id="accessId" 
                      placeholder="Enter Username" 
                      className="h-14 bg-slate-900/50 border-slate-800 rounded-2xl pl-12 text-slate-200 focus:border-cyan-500/50 focus:ring-cyan-500/10 transition-all font-semibold"
                      value={credentials.accessId}
                      onChange={e => setCredentials({...credentials, accessId: e.target.value})}
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="masterKey" className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Password</Label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                       <Key className="w-4 h-4" />
                    </div>
                    <Input 
                      id="masterKey" 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••" 
                      className="h-14 bg-slate-900/50 border-slate-800 rounded-2xl pl-12 pr-12 text-slate-200 focus:border-cyan-500/50 focus:ring-cyan-500/10 transition-all"
                      value={credentials.masterKey}
                      onChange={e => setCredentials({...credentials, masterKey: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                 </div>
              </div>

              <Button 
                type="submit"
                disabled={isAuthenticating}
                className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_25px_-5px_rgba(6,182,212,0.6)] group transition-all"
              >
                 {isAuthenticating ? (
                   <Loader2 className="w-5 h-5 animate-spin" />
                 ) : (
                   <span className="flex items-center gap-2 group-hover:gap-4 transition-all">
                      Login <ArrowRight className="w-5 h-5" />
                   </span>
                 )}
              </Button>
           </form>
        </Card>

        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex gap-4 items-center">
           <Zap className="w-5 h-5 text-red-400 shrink-0" />
           <p className="text-[11px] font-bold text-red-200 uppercase tracking-wider leading-relaxed">
              Unauthorized access is logged and strictly prohibited.
           </p>
        </div>
      </div>
    </main>
  );
}
