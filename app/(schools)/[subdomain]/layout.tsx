import React from 'react';
import { TenantProvider } from '@/components/providers/tenant-provider';

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
}
