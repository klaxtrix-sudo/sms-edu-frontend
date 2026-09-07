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
  const [savedResendConfig, setSavedResendConfig] = useState<ResendConfig | null>(null);

  const [termiiConfig, setTermiiConfig] = useState<TermiiConfig>({
    apiKey: '',
    senderId: ''
  });
  const [savedTermiiConfig, setSavedTermiiConfig] = useState<TermiiConfig | null>(null);

  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig>({
    secretKey: '',
    publicKey: ''
  });
  const [savedPaystackConfig, setSavedPaystackConfig] = useState<PaystackConfig | null>(null);
  
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
        setSavedResendConfig(resendRes.config);
        setIsResendExpanded(resendRes.isActive ?? false);
      }
      if (termiiRes.config) {
        setTermiiConfig(termiiRes.config);
        setSavedTermiiConfig(termiiRes.config);
        setIsSmsEnabled(termiiRes.isActive ?? false);
      }
      if (paystackRes.config) {
        setPaystackConfig(paystackRes.config);
        setSavedPaystackConfig(paystackRes.config);
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
      toast.success("Email set up", {
        description: "Your branded email is now active."
      });
      setIsResendExpanded(true);
      setSavedResendConfig(resendConfig);
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
      toast.success("SMS set up", {
        description: "Your SMS credentials are verified and active."
      });
      setIsSmsEnabled(true);
      setSavedTermiiConfig(termiiConfig);
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
      toast.success("Paystack set up", {
        description: "Your secret key is verified and active."
      });
      setIsPaymentEnabled(true);
      setSavedPaystackConfig(paystackConfig);
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
      const hasUnsavedChanges = !savedTermiiConfig || 
        termiiConfig.apiKey !== savedTermiiConfig.apiKey || 
        termiiConfig.senderId !== savedTermiiConfig.senderId;

      if (checked && hasUnsavedChanges) {
        toast.error("Unsaved Configuration", {
          description: "Please save and verify your Termii configuration before activating."
        });
        return;
      }
      setIsSmsEnabled(checked);
      await toggleIntegrationActive(tenant.id, 'termii_settings', checked, tenantCreds);
    } else if (key === 'paystack') {
      const hasUnsavedChanges = !savedPaystackConfig || 
        paystackConfig.secretKey !== savedPaystackConfig.secretKey ||
        paystackConfig.publicKey !== savedPaystackConfig.publicKey;

      if (checked && hasUnsavedChanges) {
        toast.error("Unsaved Configuration", {
          description: "Please save and verify your Paystack configuration before activating."
        });
        return;
      }
      setIsPaymentEnabled(checked);
      await toggleIntegrationActive(tenant.id, 'paystack_settings', checked, tenantCreds);
    } else if (key === 'resend') {
      const hasUnsavedChanges = !savedResendConfig || 
        resendConfig.apiKey !== savedResendConfig.apiKey || 
        resendConfig.fromEmail !== savedResendConfig.fromEmail || 
        resendConfig.fromName !== savedResendConfig.fromName;

      if (checked && hasUnsavedChanges) {
        toast.error("Unsaved Configuration", {
          description: "Please save and verify your Resend configuration before activating."
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
        <p className="text-slate-400 font-medium text-sm animate-pulse">Loading integrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter text-foreground">
          Platform Integrations
        </h1>
        <p className="text-muted-foreground font-medium tracking-tight text-base sm:text-lg">
          Connect your school with communications, payment gateways, and notification networks.
        </p>
      </div>

      <div className="space-y-8">
        {/* 1. SMS Gateway (Termii) */}
        <div className="relative overflow-hidden bg-card border border-border/80 text-card-foreground rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-[8rem] -z-10" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-sm">
                <Zap className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-foreground tracking-tight">SMS Gateway</h2>
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-extrabold text-[10px] px-2 py-0.5">Termii</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium tracking-tight">
                  Send parent alerts and OTPs via Termii SMS.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={isSmsEnabled} onCheckedChange={(c) => handleToggleSwitch('termii', c)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 mt-8 border-t border-border">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">API Key</Label>
              <div className="relative">
                <Input 
                  type={showKeys['sms'] ? 'text' : 'password'}
                  value={termiiConfig.apiKey}
                  onChange={(e) => setTermiiConfig({...termiiConfig, apiKey: e.target.value})}
                  placeholder="TL-xxxxxxxxxxxxxxxx"
                  className="h-14 bg-background border-border text-foreground rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 focus:ring-indigo-500 focus:border-indigo-300"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-muted text-muted-foreground"
                  onClick={() => toggleKey('sms')}
                >
                  {showKeys['sms'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sender ID</Label>
              <Input 
                value={termiiConfig.senderId}
                onChange={(e) => setTermiiConfig({...termiiConfig, senderId: e.target.value})}
                placeholder="KLAXTRIX"
                className="h-14 bg-background border-border text-foreground rounded-2xl font-bold uppercase pl-5 focus:ring-indigo-500 focus:border-indigo-300 placeholder:font-normal placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Badge className={`border font-extrabold gap-1.5 px-3.5 py-1.5 rounded-xl ${
              isSmsEnabled 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                : "bg-muted text-muted-foreground border-border"
            }`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isSmsEnabled ? "text-emerald-500" : "text-muted-foreground/40"}`} />
              {isSmsEnabled ? "Connected & Active" : "Not Set Up"}
            </Badge>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                onClick={handleSaveTermii}
                disabled={loadingSms}
                className="w-full sm:w-auto h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
              >
                {loadingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Verify
              </Button>
              {isSmsEnabled && (
                <Button variant="ghost" className="text-xs font-black text-indigo-600 hover:bg-indigo-500/10 hover:text-indigo-500 transition-all gap-2 rounded-xl px-4 py-2">
                  View SMS Analytics <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Payment Gateway (Paystack) */}
        <div className="relative overflow-hidden bg-card border border-border/80 text-card-foreground rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[8rem] -z-10" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-sm">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Payments (Paystack)</h2>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-extrabold text-[10px] px-2 py-0.5">Paystack</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium tracking-tight">
                  Collect school fees and track payments securely.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={isPaymentEnabled} onCheckedChange={(c) => handleToggleSwitch('paystack', c)} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 mt-8 border-t border-border">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Secret Key (SK)</Label>
                <div className="relative">
                  <Input 
                    type={showKeys['paystack'] ? 'text' : 'password'}
                    value={paystackConfig.secretKey}
                    onChange={(e) => setPaystackConfig({...paystackConfig, secretKey: e.target.value})}
                    placeholder="sk_live_xxxxxxxxxxxxxxxx"
                    className="h-14 bg-background border-border text-foreground rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 focus:ring-emerald-500 focus:border-emerald-300"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-muted text-muted-foreground"
                    onClick={() => toggleKey('paystack')}
                  >
                    {showKeys['paystack'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Public Key (PK)</Label>
                <Input 
                  type="text"
                  value={paystackConfig.publicKey}
                  onChange={(e) => setPaystackConfig({...paystackConfig, publicKey: e.target.value})}
                  placeholder="pk_live_xxxxxxxxxxxxxxxx"
                  className="h-14 bg-background border-border text-foreground rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 focus:ring-emerald-500 focus:border-emerald-300"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Used by parents/students to open the Paystack checkout popup.</p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
                  Payments are encrypted and handled securely by Paystack.
                </p>
              </div>
            </div>

            {/* Webhook Configuration Guide */}
            <div className="space-y-4 bg-muted/40 p-6 rounded-2xl border border-border/80">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-foreground">Paystack Webhook Endpoint</h4>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Provide this URL in your Paystack Dashboard Developer Settings to receive real-time payment notifications.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background border border-border px-4 py-2.5 rounded-xl font-mono text-xs text-foreground truncate">
                  {webhookUrl}
                </code>
                <Button 
                  type="button" 
                  onClick={handleCopyWebhook} 
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-xl bg-card border-border hover:border-emerald-500 hover:text-emerald-600 transition-all shrink-0 text-foreground"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Badge className={`border font-extrabold gap-1.5 px-3.5 py-1.5 rounded-xl ${
              isPaymentEnabled 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                : "bg-muted text-muted-foreground border-border"
            }`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isPaymentEnabled ? "text-emerald-500" : "text-muted-foreground/40"}`} />
              {isPaymentEnabled ? "Active (Live/Test)" : "Not Set Up"}
            </Badge>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                onClick={handleSavePaystack}
                disabled={loadingPaystack}
                className="w-full sm:w-auto h-12 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                {loadingPaystack ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Verify
              </Button>
              {isPaymentEnabled && (
                <Button className="h-12 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
                  Verify Webhooks
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Unified Email (Resend) */}
        <div className="relative overflow-hidden bg-card border border-border/80 text-card-foreground rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-[8rem] -z-10" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-sm">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Email (Resend)</h2>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-extrabold text-[10px] px-2 py-0.5">Resend</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium tracking-tight">
                  Send branded emails for results, report cards, and portal invitations from your own domain.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={isResendExpanded} onCheckedChange={(c) => handleToggleSwitch('resend', c)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 mt-8 border-t border-border">
            {/* Resend API Key */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resend API Key</Label>
              <div className="relative">
                <Input 
                  type={showKeys['resend'] ? 'text' : 'password'}
                  value={resendConfig.apiKey}
                  onChange={(e) => setResendConfig({...resendConfig, apiKey: e.target.value})}
                  placeholder="re_xxxxxxxxxxxxxx"
                  className="h-14 bg-background border-border text-foreground rounded-2xl font-mono text-sm tracking-widest pl-5 pr-12 focus:ring-blue-500 focus:border-blue-300 placeholder:font-normal placeholder:text-muted-foreground"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-muted text-muted-foreground"
                  onClick={() => toggleKey('resend')}
                >
                  {showKeys['resend'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Institutional Sender Name */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sender Name</Label>
              <Input 
                value={resendConfig.fromName}
                onChange={(e) => setResendConfig({...resendConfig, fromName: e.target.value})}
                placeholder="Klaxtrix Academy"
                className="h-14 bg-background border-border text-foreground rounded-2xl font-bold uppercase pl-5 focus:ring-blue-500 focus:border-blue-300 placeholder:font-normal placeholder:normal-case placeholder:text-muted-foreground"
              />
            </div>

            {/* Sender Email (From) - Full Width */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sender Email (From)</Label>
              <Input 
                value={resendConfig.fromEmail}
                onChange={(e) => setResendConfig({...resendConfig, fromEmail: e.target.value})}
                placeholder="portal@yourdomain.com"
                className="h-14 bg-background border-border text-foreground rounded-2xl font-bold pl-5 focus:ring-blue-500 focus:border-blue-300 placeholder:font-normal placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Badge className={`border font-extrabold gap-1.5 px-3.5 py-1.5 rounded-xl ${
              isResendExpanded 
                ? "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20" 
                : "bg-muted text-muted-foreground border-border"
            }`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isResendExpanded ? "text-blue-500" : "text-muted-foreground/40"}`} />
              {isResendExpanded ? "Email Gateway Active" : "Not Set Up"}
            </Badge>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                onClick={handleSaveResend}
                disabled={loadingEmail}
                className="w-full sm:w-auto h-12 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
              >
                {loadingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Verify
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
