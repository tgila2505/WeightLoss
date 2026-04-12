'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  UserCircle2,
  FileText,
  CalendarDays,
  TrendingUp,
  FlaskConical,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  Activity,
  ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { isLoggedIn, logout } from '../../lib/auth';
import { LogoMark, LogoText } from './logo';
import { NotificationBell } from '@/components/notifications/notification-bell';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!isLoggedIn()) return;
    fetch(`${API_BASE}/api/v1/auth/me`, {
      credentials: 'include' as RequestCredentials,
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { is_admin?: boolean } | null) => {
        if (data?.is_admin) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);
  return isAdmin;
}

const links = [
  { href: '/onboarding-view', label: 'Onboarding', icon: ClipboardList },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/progress', label: 'Progress', icon: Activity },
  { href: '/mindmap', label: 'Profile Questions', icon: UserCircle2 },
  { href: '/user-profile', label: 'User Profile', icon: FileText },
  { href: '/plan', label: 'Plan', icon: CalendarDays },
  { href: '/tracking', label: 'Tracking', icon: TrendingUp },
  { href: '/lab-test', label: 'Lab Tests', icon: FlaskConical },
  { href: '/interaction', label: 'Chat', icon: MessageCircle },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = useIsAdmin();

  async function handleLogout() {
    await logout();
    router.push('/funnel');
  }

  return (
    <>
      {/* Desktop left sidebar */}
      <nav className="fixed left-0 top-0 h-full w-64 flex-col bg-white border-r border-slate-200 z-50 hidden md:flex">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <LogoMark size="sm" />
            <LogoText size="sm" />
          </Link>
          <NotificationBell />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
        {/* Admin link (admin users only) */}
        {isAdmin ? (
          <div className="px-3 pt-2 pb-1 border-t border-slate-100">
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-violet-600 hover:bg-violet-50 hover:text-violet-700'
              )}
            >
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              Admin console
            </Link>
          </div>
        ) : null}
        {/* Logout at bottom of sidebar */}
        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Log out
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav — horizontally scrollable so all items have adequate tap targets */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex border-t border-slate-200 bg-white/95 md:hidden">
        <div className="flex h-20 w-full items-center gap-1 overflow-x-auto px-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-w-[76px] flex-shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-[64px] truncate leading-none">{label}</span>
              </Link>
            );
          })}
          {/* Admin link in mobile nav (admin users only) */}
          {isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors flex-shrink-0',
                pathname === '/admin' ? 'text-violet-600' : 'text-slate-400 hover:text-violet-600'
              )}
            >
              <ShieldCheck className="h-5 w-5" />
              <span>Admin</span>
            </Link>
          ) : null}
          {/* Logout in mobile nav */}
          <button
            onClick={handleLogout}
            className="flex min-w-[76px] flex-shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
            <span className="leading-none">Log out</span>
          </button>
        </div>
      </nav>
    </>
  );
}
