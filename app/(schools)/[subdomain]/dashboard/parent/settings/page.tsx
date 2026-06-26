"use client";

import { useState, useEffect } from "react";
import { createTenantClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, User, KeyRound, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ParentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const supabase = createTenantClient();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        setUser(session.user);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;
        
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
      } catch (error: any) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone
        })
        .eq("id", user.id);

      if (error) throw error;
      
      // Update auth metadata if full name changed
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
         <Loader2 className="size-16 animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="text-center md:text-left">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Account Settings</h1>
        <p className="text-slate-500 mt-2 font-medium">Manage your personal information and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-primary/5 pb-6 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase text-primary">
              <User className="size-5" /> Profile Information
            </CardTitle>
            <CardDescription className="font-medium text-primary/60">Update your contact details</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-400">Email Address</Label>
                <Input 
                  id="email" 
                  value={user?.email || ""} 
                  disabled 
                  className="bg-slate-50 border-transparent text-slate-500 h-12 rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed.</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
                <Input 
                  id="fullName" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 focus-visible:ring-primary/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 focus-visible:ring-primary/30"
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50 pb-6 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase text-slate-700">
              <KeyRound className="size-5" /> Security
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">Update your password</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-2 hidden">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input 
                  id="currentPassword" 
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-bold uppercase tracking-widest text-slate-400">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 focus-visible:ring-primary/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-widest text-slate-400">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 focus-visible:ring-primary/30"
                  required
                />
              </div>

              <Button type="submit" disabled={saving || !newPassword || !confirmPassword} className="w-full h-12 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all">
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <KeyRound className="size-4 mr-2" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
