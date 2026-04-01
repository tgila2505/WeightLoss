'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  TrendingUp,
  MessageCircle,
  Bell,
  Settings
} from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/plan', label: 'Plan', icon: CalendarDays },
  { href: '/tracking', label: 'Tracking', icon: TrendingUp },
  { href: '/interaction', label: 'Chat', icon: MessageCircle },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar — always rendered, visibility via inline style */}
      <nav style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100%',
        width: '256px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 24px',
          borderBottom: '1px solid #1e293b',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>W</span>
          </div>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>WeightLoss</span>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '2px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  backgroundColor: active ? '#2563eb' : 'transparent',
                  color: active ? '#ffffff' : '#94a3b8',
                }}
              >
                <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'white',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '64px',
        padding: '0 4px',
      }}
        className="md:hidden"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '4px',
                fontSize: '10px',
                fontWeight: 500,
                textDecoration: 'none',
                color: active ? '#2563eb' : '#94a3b8',
              }}
            >
              <Icon style={{ width: '20px', height: '20px' }} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
