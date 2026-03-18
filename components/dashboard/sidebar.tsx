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
  ChevronRight
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const iconMap = {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  UserCog,
  GraduationCap,
  CreditCard,
  Settings,
};

interface SidebarItem {
  label: string;
  href: string;
  icon: keyof typeof iconMap;
}

interface SidebarProps {
  items: readonly SidebarItem[];
  role: string;
}

export function Sidebar({ items, role }: SidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <aside className="sticky top-0 h-screen w-64 border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            S
          </div>
          SMS-Edu
        </div>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-semibold">
          {role} Portal
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
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
