'use client';

import React, { useEffect, useState } from 'react';
import { useTenant } from '@/components/providers/tenant-provider';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap, CalendarDays, BookOpen, CreditCard } from 'lucide-react';

export default function StudentDashboard() {
  const { tenant } = useTenant();
  const [userName, setUserName] = useState<string>('Student');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!tenant?.supabaseUrl || !tenant?.supabaseAnonKey) return;
      const supabase = createClient(tenant.supabaseUrl, tenant.supabaseAnonKey);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name ?? 'Student');
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground mt-1">Hello, {userName}! Welcome to your portal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          icon={<CalendarDays className="size-6 text-blue-500" />}
          title="My Timetable"
          description="View your class schedule"
          color="blue"
        />
        <DashboardCard
          icon={<BookOpen className="size-6 text-emerald-500" />}
          title="Assignments"
          description="Track your assignments"
          color="emerald"
        />
        <DashboardCard
          icon={<GraduationCap className="size-6 text-purple-500" />}
          title="Exams"
          description="Upcoming examinations"
          color="purple"
        />
        <DashboardCard
          icon={<CreditCard className="size-6 text-orange-500" />}
          title="Payments"
          description="View fee status"
          color="orange"
        />
      </div>
    </div>
  );
}

function DashboardCard({ 
  icon, title, description, color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: string;
}) {
  return (
    <div className="group relative rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className={`size-12 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
