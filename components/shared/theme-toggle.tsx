"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "ghost" | "outline";
  showLabel?: boolean;
}

export function ThemeToggle({ className, variant = "ghost", showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={showLabel ? "default" : "icon"}
        className={cn("relative size-9 rounded-xl border border-transparent", className)}
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="size-4 opacity-30" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={showLabel ? "default" : "icon"}
          className={cn(
            "relative size-9 rounded-xl border border-border/50 hover:bg-accent/60 transition-colors focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-sky-400" />
          {showLabel && (
            <span className="ml-2 text-xs font-semibold capitalize">
              {theme === "system" ? "System" : theme}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px] rounded-2xl p-1.5 shadow-xl border-border/70 backdrop-blur-xl">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer",
            theme === "light" && "bg-primary/10 text-primary font-bold"
          )}
        >
          <div className="flex items-center gap-2">
            <Sun className="size-4 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === "light" && <Check className="size-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer",
            theme === "dark" && "bg-primary/10 text-primary font-bold"
          )}
        >
          <div className="flex items-center gap-2">
            <Moon className="size-4 text-sky-400" />
            <span>Dark</span>
          </div>
          {theme === "dark" && <Check className="size-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer",
            theme === "system" && "bg-primary/10 text-primary font-bold"
          )}
        >
          <div className="flex items-center gap-2">
            <Monitor className="size-4 text-muted-foreground" />
            <span>System</span>
          </div>
          {theme === "system" && <Check className="size-3.5" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
