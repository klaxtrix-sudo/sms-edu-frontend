"use client";

import React, { useState } from "react";
import { Sidebar, type SidebarItem } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

interface DashboardShellProps {
  items: readonly SidebarItem[];
  role: string;
  children: React.ReactNode;
}

export function DashboardShell({ items, role, children }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Mobile Sidebar Overlay/Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        items={items}
        role={role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background custom-scrollbar flex flex-col min-h-0">
          <div className="flex-1 p-4 md:p-8 lg:p-12">
            {children}
          </div>
          <footer className="py-4 text-center select-none">
            <p className="text-[11px] text-foreground/70 leading-relaxed">
              © {new Date().getFullYear()} Klaxtrix SMS &mdash; School Management System. All rights reserved.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
