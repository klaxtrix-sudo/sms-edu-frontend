'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export default function ConsoleLoginPage() {
  const [credentials, setCredentials] = useState({ accessId: '', masterKey: '' });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  // Use a ref to prevent the session check from re-running if router changes identity
  const hasChecked = useRef(false);

  useEffect(() => {
    // Guard: only run once on mount
    if (hasChecked.current) return;
    hasChecked.current = true;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className={`${spaceGrotesk.className} dark min-h-screen bg-[#050505] flex items-center justify-center`}>
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Authorizing Session...</span>
         </div>
      </div>
    );
  }

  return (
    <main className={`${spaceGrotesk.className} dark min-h-screen bg-[#050505] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans`}>
      {/* Faint Cyber Dot Grid */}
      <div 
        className="absolute inset-0 opacity-[0.06] pointer-events-none -z-10" 
        style={{
          backgroundImage: 'radial-gradient(rgba(6, 182, 212, 0.4) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 blur-[150px] -z-10 rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] -z-10 rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 blur-[120px] -z-10 rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md flex flex-col items-center justify-center space-y-6 relative z-10 my-auto">
        <div className="flex flex-col items-center text-center space-y-4">
           {/* Logo with breathing cyan pulse glow */}
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ 
               scale: 1, 
               opacity: 1,
               boxShadow: [
                 "0 0 20px -5px rgba(6,182,212,0.3)",
                 "0 0 35px 2px rgba(6,182,212,0.55)",
                 "0 0 20px -5px rgba(6,182,212,0.3)"
               ]
             }}
             transition={{
               scale: { duration: 0.4 },
               opacity: { duration: 0.4 },
               boxShadow: {
                 duration: 4,
                 repeat: Infinity,
                 ease: "easeInOut"
               }
             }}
             className="w-28 h-28 rounded-[2rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400"
           >
              <Shield className="w-14 h-14" />
           </motion.div>
           
           <div className="space-y-2 flex flex-col items-center">
              <h1 className="text-3xl font-extrabold tracking-widest text-white uppercase font-heading">KLAXTRIX</h1>
              <p className="text-[10px] font-bold text-cyan-400 tracking-[0.4em] uppercase">Secure Infrastructure Platform</p>
              
              {/* Security Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                 <span className="text-[9px] font-bold tracking-[0.2em] uppercase">SYSTEM STATUS: OPERATIONAL</span>
              </div>
           </div>
        </div>

        {/* Card Fade-in Animation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full"
        >
          <Card className="w-full p-8 bg-[#0f172a]/70 backdrop-blur-[20px] border border-cyan-500/15 rounded-3xl shadow-[0_0_50px_-12px_rgba(6,182,212,0.15)] relative overflow-hidden">
             <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                   <Label htmlFor="accessId" className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">Username</Label>
                   <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                         <Lock className="w-4 h-4" />
                      </div>
                      <Input 
                        id="accessId" 
                        placeholder="Enter Username" 
                        className="h-14 bg-[#111827] border-[#334155] rounded-2xl pl-12 text-slate-200 placeholder:text-slate-500 focus:border-[#06b6d4] focus:ring-4 focus:ring-[#06b6d4]/15 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none transition-all duration-200 font-medium"
                        value={credentials.accessId}
                        onChange={e => setCredentials({...credentials, accessId: e.target.value})}
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <Label htmlFor="masterKey" className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">Password</Label>
                   <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                         <Key className="w-4 h-4" />
                      </div>
                      <Input 
                        id="masterKey" 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••" 
                        className="h-14 bg-[#111827] border-[#334155] rounded-2xl pl-12 pr-12 text-slate-200 placeholder:text-slate-500 focus:border-[#06b6d4] focus:ring-4 focus:ring-[#06b6d4]/15 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none transition-all duration-200 font-medium"
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

                {/* Unauthorized Warning banner embedded inside card */}
                <div className="flex gap-2.5 items-center justify-center p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400/80">
                   <Shield className="w-4 h-4 text-red-400 shrink-0" />
                   <p className="text-[10px] font-bold text-red-200/90 uppercase tracking-wider leading-relaxed text-center">
                      Login attempts are monitored.
                   </p>
                </div>

                <Button 
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full h-14 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] hover:from-[#0891b2] hover:to-[#06b6d4] text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_0_25px_rgba(6,182,212,0.45)] group"
                >
                   {isAuthenticating ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                     <span className="flex items-center justify-center gap-2 w-full">
                        Login <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                     </span>
                   )}
                </Button>
             </form>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
