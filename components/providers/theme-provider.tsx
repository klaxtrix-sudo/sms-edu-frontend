'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';
import { usePathname } from 'next/navigation';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();
  
  // Public marketing, legal, and authentication pages are strictly locked to clean Light Mode.
  // Dashboard workspaces (/dashboard/*) maintain user-configured dark/light/system themes.
  const isDashboardRoute = pathname?.includes('/dashboard');
  const isForcedLight = !isDashboardRoute;

  return (
    <NextThemesProvider {...props} forcedTheme={isForcedLight ? 'light' : undefined}>
      {children}
    </NextThemesProvider>
  );
}
