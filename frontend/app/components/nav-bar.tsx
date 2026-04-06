'use client';

import Link from 'next/link';
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
  LogOut
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { clearAccessToken } from '../../lib/auth';
import { LogoMark, LogoText } from './logo';

const links = [
  { href: '/onboarding-view', label: 'Onboarding', icon: ClipboardList },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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

  function handleLogout() {
    clearAccessToken();
    router.push('/');
  }

  return (
    <>
      {/* Desktop left sidebar */}
      <nav className="fixed left-0 top-0 h-full w-64 flex-col bg-white border-r border-slate-200 z-50 hidden md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 hover:bg-slate-50 transition-colors">
          <LogoMark size="sm" />
          <LogoText size="sm" />
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 flex md:hidden">
        <div className="flex justify-around items-center h-16 px-1 w-full">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-medium rounded-lg transition-colors min-w-0',
                  active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
          {/* Logout in mobile nav */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors min-w-0"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    </>
  );
}
