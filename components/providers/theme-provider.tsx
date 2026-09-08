'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';
import { usePathname } from 'next/navigation';

// Whitelist of public marketing pages on the root platform domain.
// Only these public landing routes are locked to clean light mode.
const PUBLIC_MARKETING_PATHS = new Set([
  '/',
  '/register',
  '/resources',
  '/privacy',
  '/terms',
]);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();

  // Guard against subdomain tenant portals (e.g., glorydays.localhost:3000).
  // Tenant dashboards, portals, and settings must always honor user theme preferences.
  const isTenantSubdomain = typeof window !== 'undefined' && (() => {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const rootDomainHost = rootDomain.split(':')[0];
    const host = window.location.hostname;
    return host !== rootDomainHost && host !== `www.${rootDomainHost}`;
  })();

  // ONLY lock to light mode if explicitly on a verified public marketing route on the root domain.
  // During Server Actions, SSR revalidations, or on any dashboard/tenant route,
  // pathname is either null or a non-marketing path, ensuring forcedTheme is safely undefined.
  const isPublicMarketingRoute = Boolean(
    !isTenantSubdomain && pathname && PUBLIC_MARKETING_PATHS.has(pathname)
  );

  return (
    <NextThemesProvider
      {...props}
      forcedTheme={isPublicMarketingRoute ? 'light' : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
