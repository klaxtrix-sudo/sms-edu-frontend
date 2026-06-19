'use client';

import React, { useEffect, useState } from 'react';
import { 
  Zap, 
  CreditCard, 
  Mail, 
  ShieldCheck, 
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Save,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/components/providers/tenant-provider';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { saveResendConfig, getResendConfig, type ResendConfig, type TenantCredentials } from '@/app/actions/config-actions';

export default function IntegrationSettings() {
  const { tenant } = useTenant();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [isSmsEnabled, setIsSmsEnabled] = useState(true);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(true);
  
  const [resendConfig, setResendConfig] = useState<ResendConfig>({
    apiKey: '',
    fromEmail: '',
    fromName: ''
  });
  const [isResendExpanded, setIsResendExpanded] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      fetchConfig();
    }
  }, [tenant?.id]);

  const fetchConfig = async () => {
    if (!tenant?.id || !tenant.supabaseUrl || !tenant.supabaseAnonKey) return;
    setFetching(true);
    const tenantCreds: TenantCredentials = {
      supabaseUrl: tenant.supabaseUrl,
      supabaseAnonKey: tenant.supabaseAnonKey
    };
    const { config, error } = await getResendConfig(tenant.id, tenantCreds);
    if (error) {
      toast.error(error);
    } else if (config) {
      setResendConfig(config);
      if (config.apiKey) setIsResendExpanded(true);
    }
    setFetching(false);
  };

  const handleSaveResend = async () => {
    if (!tenant?.id) return;
    if (!tenant.supabaseUrl || !tenant.supabaseAnonKey) {
      toast.error("School configuration is unavailable. Please refresh the page.");
      return;
    }

    setLoading(true);
    const tenantCreds: TenantCredentials = {
      supabaseUrl: tenant.supabaseUrl,
      supabaseAnonKey: tenant.supabaseAnonKey
    };
    const result = await saveResendConfig(tenant.id, resendConfig, tenantCreds);

    if (result.success) {
      toast.success("Institutional Email Configured", {
        description: "Branded delivery is now active for your school."
      });
      fetchConfig();
    } else {
      toast.error(result.error || "Failed to save configuration");
    }
    setLoading(false);
  };

  const toggleKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const webhookUrl = tenant?.supabaseUrl 
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api'}/webhooks/paystack`
    : 'http://localhost:5000/api/webhooks/paystack';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Title Section */}
      <div className="space-y-1 px-2">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">
          Platform Integrations
        </h1>
        <p className="text-slate-500 font-medium tracking-tight text-base sm:text-lg">
          Configure institutional identity, academic cycles, and global system integration.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        
        {/* 1. SMS Gateway (Termii) */}
        <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-bl-[8rem] -z-10" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100/50">
                <Zap className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">SMS Gateway</h2>
                  <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-100 font-extrabold text-[10px] px-2 py-0.5">Termii</Badge>
                </div>
                <p className="text-sm text-slate-500 font-medium tracking-tight">
                  Power instant notifications, parent alerts, and otp deliveries via Termii SMS Gateway.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={isSmsEnabled} onCheckedChange={setIsSmsEnabled} />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isSmsEnabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-100">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">API Key</Label>
                    <div className="relative">
                      <Input 
                        type={showKeys['sms'] ? 'text' : 'password'}
                        defaultValue="TL-3892-XXXX-KLAX"
                        disabled
                        className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 text-slate-500"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-slate-100 text-slate-400"
                        onClick={() => toggleKey('sms')}
                      >
                        {showKeys['sms'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Sender ID</Label>
                    <Input 
                      defaultValue="KLAXTRIX"
                      disabled
                      className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-bold uppercase pl-5 text-slate-500"
                    />
                  </div>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold gap-1.5 px-3.5 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    System Connected
                  </Badge>
                  <Button variant="ghost" className="text-xs font-black text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all gap-2 rounded-xl px-4 py-2">
                    View SMS Analytics <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Payment Gateway (Paystack) */}
        <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/20 rounded-bl-[8rem] -z-10" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shadow-emerald-100/50">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Payment Engine</h2>
                  <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-emerald-100 font-extrabold text-[10px] px-2 py-0.5">Paystack</Badge>
                </div>
                <p className="text-sm text-slate-500 font-medium tracking-tight">
                  Collect institution tuition fees, audit financial transactions, and process payouts securely.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={isPaymentEnabled} onCheckedChange={setIsPaymentEnabled} />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isPaymentEnabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-100">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Secret Key (SK)</Label>
                      <div className="relative">
                        <Input 
                          type={showKeys['paystack'] ? 'text' : 'password'}
                          defaultValue="sk_test_4e9ad...01"
                          disabled
                          className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 text-slate-500"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-slate-100 text-slate-400"
                          onClick={() => toggleKey('paystack')}
                        >
                          {showKeys['paystack'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                        Financial transactions are encrypted and audited through Paystack Infrastructure. Standard sandbox key is pre-authorized.
                      </p>
                    </div>
                  </div>

                  {/* Webhook Configuration Guide */}
                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800">Paystack Webhook Endpoint</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Provide this URL in your Paystack Dashboard Developer Settings to receive real-time payment notifications.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-mono text-xs text-slate-600 truncate">
                        {webhookUrl}
                      </code>
                      <Button 
                        type="button" 
                        onClick={handleCopyWebhook} 
                        variant="outline"
                        size="icon"
                        className="size-11 rounded-xl bg-white border-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold gap-1.5 px-3.5 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Environment: TEST
                  </Badge>
                  <Button className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all">
                    Verify Webhooks
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Unified Email (Resend) */}
        <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/20 rounded-bl-[8rem] -z-10" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-100/50">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Email Cloud</h2>
                  <Badge variant="outline" className="bg-blue-50/50 text-blue-600 border-blue-100 font-extrabold text-[10px] px-2 py-0.5">Resend</Badge>
                </div>
                <p className="text-sm text-slate-500 font-medium tracking-tight">
                  Configure custom domain emails to send branded student results, report sheets, and portal invitations.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={isResendExpanded} onCheckedChange={setIsResendExpanded} />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isResendExpanded ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-100">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Resend API Key</Label>
                      <div className="relative">
                        <Input 
                          type={showKeys['resend'] ? 'text' : 'password'}
                          value={resendConfig.apiKey}
                          onChange={(e) => setResendConfig({...resendConfig, apiKey: e.target.value})}
                          placeholder="re_xxxxxxxxxxxxxx"
                          className="h-14 bg-white border-slate-200 rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 focus:ring-blue-500 focus:border-blue-300"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-slate-100 text-slate-400"
                          onClick={() => toggleKey('resend')}
                        >
                          {showKeys['resend'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Sender Email (From)</Label>
                      <Input 
                        value={resendConfig.fromEmail}
                        onChange={(e) => setResendConfig({...resendConfig, fromEmail: e.target.value})}
                        placeholder="portal@yourdomain.com"
                        className="h-14 bg-white border-slate-200 rounded-2xl font-bold pl-5 focus:ring-blue-500 focus:border-blue-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Institutional Sender Name</Label>
                      <Input 
                        value={resendConfig.fromName}
                        onChange={(e) => setResendConfig({...resendConfig, fromName: e.target.value})}
                        placeholder="Solab Academy Portal"
                        className="h-14 bg-white border-slate-200 rounded-2xl font-bold uppercase pl-5 focus:ring-blue-500 focus:border-blue-300"
                      />
                    </div>

                    <div className="pt-6 flex gap-4">
                      <Button 
                        onClick={handleSaveResend}
                        disabled={loading || fetching}
                        className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest gap-2 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Configuration
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 mt-8">
                  <div className="flex-1 space-y-1 text-center md:text-left">
                    <p className="text-sm font-bold text-slate-800 italic">"Reach parents every time, everywhere."</p>
                    <p className="text-xs text-slate-500">Configure your email gateway to send automated results and newsletters.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="h-12 px-8 rounded-xl border-slate-200 font-bold hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-all shrink-0"
                    onClick={() => setIsResendExpanded(true)}
                  >
                    Setup Resend API
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
