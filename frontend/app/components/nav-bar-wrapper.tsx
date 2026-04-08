'use client';

import { usePathname } from 'next/navigation';

import { NavBar } from './nav-bar';

const AUTH_PATHS = ['/', '/login', '/register', '/onboarding', '/funnel'];

export function NavBarWrapper() {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/')));
  if (isAuthPage) return null;
  return <NavBar />;
}
