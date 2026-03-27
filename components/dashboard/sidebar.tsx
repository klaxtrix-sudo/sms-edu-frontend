"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  UserCog,
  GraduationCap,
  CreditCard,
  Settings,
  LogOut,
  CheckSquare,
  ClipboardList,
  ChevronRight,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  TrendingUp,
  Megaphone,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { NotificationDrawer } from "./notification-drawer";
import { Button } from "@/components/ui/button";

const iconMap = {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  UserCog,
  GraduationCap,
  CreditCard,
  Settings,
  CheckSquare,
  ClipboardList,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Megaphone,
};

export interface SidebarItem {
  label: string;
  href: string;
  icon: keyof typeof iconMap;
}

export interface SidebarProps {
  items: readonly SidebarItem[];
  role: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ items, role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen",
      isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
    )}>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shrink-0">
              <School className="size-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-glow whitespace-nowrap">
              Klaxtrix
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDrawer />
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden h-8 w-8 text-muted-foreground" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
          {role} Portal
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-all group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("size-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="font-medium">{item.label}</span>
              </div>
              {isActive && <ChevronRight className="size-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <LogOut className="size-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
