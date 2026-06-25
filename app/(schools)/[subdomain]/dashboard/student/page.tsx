'use client';

import React, { useEffect, useState } from 'react';
import { useTenant } from '@/components/providers/tenant-provider';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap, CalendarDays, BookOpen, Bell, Calendar, Megaphone, Smartphone } from 'lucide-react';
import { cn, getBackendUrl } from '@/lib/utils';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function StudentDashboard() {
  const { tenant } = useTenant();
  const [userName, setUserName] = useState<string>('Student');
  const [loading, setLoading] = useState(true);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [selectedBulletin, setSelectedBulletin] = useState<any | null>(null);

  useEffect(() => {
    async function loadUser() {
      if (!tenant?.supabaseUrl || !tenant?.supabaseAnonKey) return;
      const supabase = createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserName(session.user?.user_metadata?.full_name ?? 'Student');
        
        try {
          const res = await fetch(`${getBackendUrl()}/broadcasts`, {
            headers: { "Authorization": `Bearer ${session.access_token}` }
          });
          const result = await res.json();
          if (result.success && result.data) {
            setBulletins(result.data);
          }
        } catch (e) {
          console.error("Failed to fetch bulletins:", e);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [tenant]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-heading font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground mt-1">Hello, {userName}! Welcome to your portal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          icon={<CalendarDays className="size-6 text-blue-500" />}
          title="My Timetable"
          description="View your class schedule"
          color="blue"
          href="/dashboard/student/timetable"
        />
        <DashboardCard
          icon={<BookOpen className="size-6 text-emerald-500" />}
          title="Assignments"
          description="Track your assignments"
          color="emerald"
          href="/dashboard/student/assignments"
        />
        <DashboardCard
          icon={<GraduationCap className="size-6 text-purple-500" />}
          title="Exams"
          description="Upcoming examinations"
          color="purple"
          href="/dashboard/student/exams"
        />
      </div>

      {/* Notice Board */}
      <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
        <div className="p-6 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">
              Notice Board
            </h3>
            <span className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Bulletins
            </span>
          </div>
          <Bell className="size-5 text-primary/60" />
        </div>
        
        <CardContent className="p-6">
          <div className={cn(
            bulletins.length > 0 ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"
          )}>
            {bulletins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-semibold w-full col-span-3">
                No announcements yet.
              </div>
            ) : (
              bulletins.slice(0, 6).map((bulletin) => {
                const dateObj = new Date(bulletin.createdAt);
                const month = dateObj.toLocaleString('en-US', { month: 'short' });
                const day = dateObj.getDate();
                const formattedDate = `${month} ${day}`;
                return (
                  <div key={bulletin._id} onClick={() => setSelectedBulletin(bulletin)} className="cursor-pointer">
                    <BulletinItem 
                      title={bulletin.title}
                      message={bulletin.message}
                      date={formattedDate}
                      type={bulletin.channel}
                    />
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedBulletin} onOpenChange={(open) => !open && setSelectedBulletin(null)}>
        <DialogContent className="max-w-md rounded-2xl border bg-card p-6 shadow-lg">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                {selectedBulletin?.channel === 'sms' ? <Smartphone className="size-3" /> : selectedBulletin?.channel === 'system' ? <Bell className="size-3" /> : <Megaphone className="size-3" />}
                {selectedBulletin?.channel}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 pr-6">
                <Calendar className="size-3" />
                {selectedBulletin && new Date(selectedBulletin.createdAt).toLocaleDateString()}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold leading-snug">
              {selectedBulletin?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedBulletin?.message}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardCard({ 
  icon, title, description, color, href 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: string;
  href?: string;
}) {
  const content = (
    <>
      <div className={`size-12 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </>
  );

  if (href) {
    return (
      <Link 
        href={href} 
        className="group relative rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer block"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="group relative rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      {content}
    </div>
  );
}

function BulletinItem({ title, message, date, type }: { title: string; message: string; date: string; type: string }) {
  return (
    <div className="flex flex-col justify-between p-5 rounded-xl border border-border/60 bg-slate-50/20 hover:bg-slate-50/50 transition-all duration-200 group relative h-full">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
            {type}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {date}
          </span>
        </div>
        <div>
          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1 leading-snug">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
