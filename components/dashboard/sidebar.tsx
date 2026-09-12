"use client";

import { useEffect } from "react";
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
  Award,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
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
  Award,
};

import { signOutAction } from "@/app/actions/auth-actions";

export interface SidebarItem {
  label: string;
  href: string;
  icon: keyof typeof iconMap;
  module?: string;
}

export interface SidebarProps {
  items: readonly SidebarItem[];
  role: string;
  customRoleTitle?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

import { ThemeToggle } from "@/components/shared/theme-toggle";

export function Sidebar({ items, role, customRoleTitle, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const subdomain = params?.subdomain as string;

  useEffect(() => {
    onClose?.();
  }, [pathname]);

  const handleLogout = async () => {
    await signOutAction(subdomain);
    // Hard reload — guarantees browser applies cleared-cookie response headers
    // BEFORE the next request hits the server. router.push() would soft-navigate
    // and race against the cookie update, causing a 404 or session persistence.
    window.location.href = '/login';
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border/60 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static h-[100dvh] lg:h-screen",
      isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
    )}>
      <div className="p-5 sm:p-6 border-b border-border/60">
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
              className="lg:hidden h-9 w-9 text-muted-foreground" 
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
          {customRoleTitle || role} Portal
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar touch-scroll">
        {(() => {
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
          const rootDomainHost = rootDomain.split(':')[0];
          const isCustomSubdomain = typeof window !== 'undefined' &&
            window.location.hostname !== rootDomainHost &&
            window.location.hostname !== `www.${rootDomainHost}`;

          return items.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const fullHref = (subdomain && !isCustomSubdomain) ? `/${subdomain}${item.href}` : item.href;
          const isActive = pathname === fullHref || pathname === item.href;

          return (
            <Link
              key={item.href}
              href={fullHref}
              onClick={onClose}
              id={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl transition-all group font-medium text-sm",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("size-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="size-4" />}
            </Link>
          );
          });
        })()}
      </nav>

      <div className="p-4 border-t border-border/60 flex items-center justify-between gap-2">
        <button
          onClick={handleLogout}
          className="flex flex-1 items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-medium text-sm"
        >
          <LogOut className="size-4" />
          <span>Sign Out</span>
        </button>
        <ThemeToggle />
      </div>
    </aside>
  );
}
