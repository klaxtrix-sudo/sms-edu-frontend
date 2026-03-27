'use client';

import React, { useEffect } from 'react';
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
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/components/providers/tenant-provider';
import { toast } from 'sonner';
import { saveResendConfig, getResendConfig, type ResendConfig, type TenantCredentials } from '@/app/actions/config-actions';

export default function IntegrationSettings() {
  const { tenant } = useTenant();
  const [showKeys, setShowKeys] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [resendConfig, setResendConfig] = React.useState<ResendConfig>({
    apiKey: '',
    fromEmail: '',
    fromName: ''
  });
  const [isResendExpanded, setIsResendExpanded] = React.useState(false);

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

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SMS Gateway (Termii) */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-2xl">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-extrabold text-slate-900">SMS Gateway</h2>
                <p className="text-sm text-slate-500 font-medium tracking-tight">Powered by **Termii** for instant notifications.</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">API Key</Label>
              <div className="relative">
                <Input 
                  type={showKeys['sms'] ? 'text' : 'password'}
                  defaultValue="TL-3892-XXXX-KLAX"
                  className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-mono text-sm tracking-widest"
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
                className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-bold uppercase"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </Badge>
            <Button variant="ghost" className="text-xs font-bold text-blue-600 hover:bg-blue-50 gap-2">
              View Analytics <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Payment Gateway (Paystack) */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 border-emerald-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-extrabold text-slate-900">Payment Engine</h2>
                <p className="text-sm text-slate-500 font-medium tracking-tight">Official **Paystack** integration for school fees.</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Secret Key (SK)</Label>
              <div className="relative">
                <Input 
                  type={showKeys['paystack'] ? 'text' : 'password'}
                  defaultValue="sk_test_4e9ad...01"
                  className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-mono text-sm tracking-widest"
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

            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
               <ShieldCheck className="w-5 h-5 text-emerald-600" />
               <p className="text-xs text-emerald-700 font-medium">
                  Financial transactions are encrypted and audited through Paystack Infrastructure.
               </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
             <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Environment: TEST
            </Badge>
            <Button className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-bold shadow-lg shadow-emerald-500/20">
              Verify Webhooks
            </Button>
          </div>
        </div>

        {/* Unified Email (Resend) */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-8 col-span-1 lg:col-span-2">
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-extrabold text-slate-900">Email Cloud</h2>
                <p className="text-sm text-slate-500 font-medium tracking-tight">Integrated via **Resend** for premium delivery.</p>
              </div>
            </div>
            <Switch checked={isResendExpanded} onCheckedChange={setIsResendExpanded} />
          </div>

          {isResendExpanded ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 animate-in slide-in-from-top-4 duration-500">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Resend API Key</Label>
                    <div className="relative">
                      <Input 
                        type={showKeys['resend'] ? 'text' : 'password'}
                        value={resendConfig.apiKey}
                        onChange={(e) => setResendConfig({...resendConfig, apiKey: e.target.value})}
                        placeholder="re_xxxxxxxxxxxxxx"
                        className="h-14 bg-white border-slate-200 rounded-2xl font-mono text-sm tracking-widest"
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
                      placeholder="onboarding@yourdomain.com"
                      className="h-14 bg-white border-slate-200 rounded-2xl font-bold"
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
                      className="h-14 bg-white border-slate-200 rounded-2xl font-bold uppercase"
                    />
                  </div>

                  <div className="pt-6 flex gap-4">
                    <Button 
                      onClick={handleSaveResend}
                      disabled={loading || fetching}
                      className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest gap-2 shadow-xl shadow-blue-500/20"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save Configuration
                    </Button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
               <div className="flex-1 space-y-1 text-center md:text-left">
                  <p className="text-sm font-bold text-slate-900 italic">"Reach parents every time, everywhere."</p>
                  <p className="text-xs text-slate-500">Configure your email gateway to send automated results and newsletters.</p>
               </div>
               <Button 
                variant="outline" 
                className="h-12 px-8 rounded-xl border-slate-200 font-bold hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-all"
                onClick={() => setIsResendExpanded(true)}
               >
                  Setup Resend API
               </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
