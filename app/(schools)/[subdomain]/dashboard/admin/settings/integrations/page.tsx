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
import { 
  saveResendConfig, 
  getResendConfig, 
  saveTermiiConfig, 
  getTermiiConfig, 
  savePaystackConfig, 
  getPaystackConfig,
  toggleIntegrationActive,
  type ResendConfig, 
  type TermiiConfig,
  type PaystackConfig,
  type TenantCredentials 
} from '@/app/actions/config-actions';

export default function IntegrationSettings() {
  const { tenant } = useTenant();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [fetching, setFetching] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Loading states for actions
  const [loadingSms, setLoadingSms] = useState(false);
  const [loadingPaystack, setLoadingPaystack] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Integration Active/Enabled states
  const [isSmsEnabled, setIsSmsEnabled] = useState(false);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(false);
  const [isResendExpanded, setIsResendExpanded] = useState(false);
  
  // Configuration structures
  const [resendConfig, setResendConfig] = useState<ResendConfig>({
    apiKey: '',
    fromEmail: '',
    fromName: ''
  });

  const [termiiConfig, setTermiiConfig] = useState<TermiiConfig>({
    apiKey: '',
    senderId: ''
  });

  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig>({
    secretKey: ''
  });

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

    try {
      const [resendRes, termiiRes, paystackRes] = await Promise.all([
        getResendConfig(tenant.id, tenantCreds),
        getTermiiConfig(tenant.id, tenantCreds),
        getPaystackConfig(tenant.id, tenantCreds)
      ]);

      if (resendRes.config) {
        setResendConfig(resendRes.config);
        setIsResendExpanded(resendRes.isActive ?? false);
      }
      if (termiiRes.config) {
        setTermiiConfig(termiiRes.config);
        setIsSmsEnabled(termiiRes.isActive ?? false);
      }
      if (paystackRes.config) {
        setPaystackConfig(paystackRes.config);
        setIsPaymentEnabled(paystackRes.isActive ?? false);
      }
    } catch (err: any) {
      console.error("Error loading integrations:", err);
      toast.error("Failed to load integration configurations");
    } finally {
      setFetching(false);
    }
  };

  const handleSaveResend = async () => {
    if (!tenant?.id || !tenant.supabaseUrl || !tenant.supabaseAnonKey) return;
    if (!resendConfig.apiKey) {
      toast.error("API Key is required");
      return;
    }

    setLoadingEmail(true);
    const tenantCreds: TenantCredentials = {
      supabaseUrl: tenant.supabaseUrl,
      supabaseAnonKey: tenant.supabaseAnonKey
    };
    const result = await saveResendConfig(tenant.id, resendConfig, tenantCreds);

    if (result.success) {
      toast.success("Institutional Email Configured", {
        description: "Branded delivery has been verified and is now active."
      });
      setIsResendExpanded(true);
      fetchConfig();
    } else {
      toast.error(result.error || "Failed to save configuration");
    }
    setLoadingEmail(false);
  };

  const handleSaveTermii = async () => {
    if (!tenant?.id || !tenant.supabaseUrl || !tenant.supabaseAnonKey) return;
    if (!termiiConfig.apiKey) {
      toast.error("API Key is required");
      return;
    }

    setLoadingSms(true);
    const tenantCreds: TenantCredentials = {
      supabaseUrl: tenant.supabaseUrl,
      supabaseAnonKey: tenant.supabaseAnonKey
    };
    const result = await saveTermiiConfig(tenant.id, termiiConfig, tenantCreds);

    if (result.success) {
      toast.success("Termii SMS Gateway Configured", {
        description: "Credentials verified and active."
      });
      setIsSmsEnabled(true);
      fetchConfig();
    } else {
      toast.error(result.error || "Failed to save configuration");
    }
    setLoadingSms(false);
  };

  const handleSavePaystack = async () => {
    if (!tenant?.id || !tenant.supabaseUrl || !tenant.supabaseAnonKey) return;
    if (!paystackConfig.secretKey) {
      toast.error("Secret Key is required");
      return;
    }

    setLoadingPaystack(true);
    const tenantCreds: TenantCredentials = {
      supabaseUrl: tenant.supabaseUrl,
      supabaseAnonKey: tenant.supabaseAnonKey
    };
    const result = await savePaystackConfig(tenant.id, paystackConfig, tenantCreds);

    if (result.success) {
      toast.success("Paystack Payment Engine Configured", {
        description: "Secret key verified and active."
      });
      setIsPaymentEnabled(true);
      fetchConfig();
    } else {
      toast.error(result.error || "Failed to save configuration");
    }
    setLoadingPaystack(false);
  };

  const handleToggleSwitch = async (key: string, checked: boolean) => {
    if (!tenant?.id || !tenant.supabaseUrl || !tenant.supabaseAnonKey) return;
    const tenantCreds: TenantCredentials = {
      supabaseUrl: tenant.supabaseUrl,
      supabaseAnonKey: tenant.supabaseAnonKey
    };

    if (key === 'termii') {
      if (checked && (!termiiConfig.apiKey || termiiConfig.apiKey.trim() === '')) {
        toast.error("Invalid Configuration", {
          description: "Configure and verify a valid Termii API key before enabling."
        });
        return;
      }
      setIsSmsEnabled(checked);
      await toggleIntegrationActive(tenant.id, 'termii_settings', checked, tenantCreds);
    } else if (key === 'paystack') {
      if (checked && (!paystackConfig.secretKey || paystackConfig.secretKey.trim() === '')) {
        toast.error("Invalid Configuration", {
          description: "Configure and verify a valid Paystack secret key before enabling."
        });
        return;
      }
      setIsPaymentEnabled(checked);
      await toggleIntegrationActive(tenant.id, 'paystack_settings', checked, tenantCreds);
    } else if (key === 'resend') {
      if (checked && (!resendConfig.apiKey || resendConfig.apiKey.trim() === '')) {
        toast.error("Invalid Configuration", {
          description: "Configure and verify a valid Resend API key before enabling."
        });
        return;
      }
      setIsResendExpanded(checked);
      await toggleIntegrationActive(tenant.id, 'resend_settings', checked, tenantCreds);
    }
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

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-400 font-medium text-sm animate-pulse">Fetching integrations status...</p>
      </div>
    );
  }

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
              <Switch checked={isSmsEnabled} onCheckedChange={(c) => handleToggleSwitch('termii', c)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-100">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">API Key</Label>
              <div className="relative">
                <Input 
                  type={showKeys['sms'] ? 'text' : 'password'}
                  value={termiiConfig.apiKey}
                  onChange={(e) => setTermiiConfig({...termiiConfig, apiKey: e.target.value})}
                  placeholder="TL-xxxxxxxxxxxxxxxx"
                  className="h-14 bg-white border-slate-200 rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 focus:ring-indigo-500 focus:border-indigo-300"
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
                value={termiiConfig.senderId}
                onChange={(e) => setTermiiConfig({...termiiConfig, senderId: e.target.value})}
                placeholder="KLAXTRIX"
                className="h-14 bg-white border-slate-200 rounded-2xl font-bold uppercase pl-5 focus:ring-indigo-500 focus:border-indigo-300 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Badge className={`border font-extrabold gap-1.5 px-3.5 py-1.5 rounded-xl ${
              isSmsEnabled 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isSmsEnabled ? "text-emerald-500" : "text-slate-300"}`} />
              {isSmsEnabled ? "Connected & Active" : "Config Inactive"}
            </Badge>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                onClick={handleSaveTermii}
                disabled={loadingSms}
                className="w-full sm:w-auto h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
              >
                {loadingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Verify Config
              </Button>
              {isSmsEnabled && (
                <Button variant="ghost" className="text-xs font-black text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all gap-2 rounded-xl px-4 py-2">
                  View SMS Analytics <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
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
              <Switch checked={isPaymentEnabled} onCheckedChange={(c) => handleToggleSwitch('paystack', c)} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-100">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Secret Key (SK)</Label>
                <div className="relative">
                  <Input 
                    type={showKeys['paystack'] ? 'text' : 'password'}
                    value={paystackConfig.secretKey}
                    onChange={(e) => setPaystackConfig({...paystackConfig, secretKey: e.target.value})}
                    placeholder="sk_live_xxxxxxxxxxxxxxxx"
                    className="h-14 bg-white border-slate-200 rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 focus:ring-emerald-500 focus:border-emerald-300"
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
                  Financial transactions are encrypted and audited through Paystack Infrastructure.
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
            <Badge className={`border font-extrabold gap-1.5 px-3.5 py-1.5 rounded-xl ${
              isPaymentEnabled 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isPaymentEnabled ? "text-emerald-500" : "text-slate-300"}`} />
              {isPaymentEnabled ? "Active (Live/Test)" : "Config Inactive"}
            </Badge>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                onClick={handleSavePaystack}
                disabled={loadingPaystack}
                className="w-full sm:w-auto h-12 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                {loadingPaystack ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Verify Config
              </Button>
              {isPaymentEnabled && (
                <Button className="h-12 bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
                  Verify Webhooks
                </Button>
              )}
            </div>
          </div>
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
              <Switch checked={isResendExpanded} onCheckedChange={(c) => handleToggleSwitch('resend', c)} />
            </div>
          </div>

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
                  className="h-14 bg-white border-slate-200 rounded-2xl font-bold pl-5 focus:ring-blue-500 focus:border-blue-300 placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Institutional Sender Name</Label>
                <Input 
                  value={resendConfig.fromName}
                  onChange={(e) => setResendConfig({...resendConfig, fromName: e.target.value})}
                  placeholder="Klaxtrix Academy"
                  className="h-14 bg-white border-slate-200 rounded-2xl font-bold uppercase pl-5 focus:ring-blue-500 focus:border-blue-300 placeholder:font-normal placeholder:normal-case placeholder:text-slate-400"
                />
              </div>

              <div className="pt-6 flex gap-4">
                <Button 
                  onClick={handleSaveResend}
                  disabled={loadingEmail}
                  className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest gap-2 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  {loadingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save & Verify Config
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
