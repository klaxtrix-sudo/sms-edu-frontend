'use client';

import React from 'react';
import { TenantProvider } from '@/components/providers/tenant-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TenantProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </ThemeProvider>
    </TenantProvider>
  );
}
