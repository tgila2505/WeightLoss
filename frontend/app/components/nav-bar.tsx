import Link from 'next/link';

export function NavBar({ current }: Readonly<{ current: string }>) {
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/plan', label: 'Plan' },
    { href: '/tracking', label: 'Tracking' },
    { href: '/interaction', label: 'Interaction' },
    { href: '/reminders', label: 'Reminders' },
    { href: '/settings', label: 'Settings' }
  ];

  return (
    <nav style={navStyle}>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          style={label === current ? activeLinkStyle : linkStyle}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

const navStyle = {
  display: 'flex',
  gap: '16px',
  alignItems: 'center',
  flexWrap: 'wrap' as const
} as const;

const linkStyle = {
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 500
} as const;

const activeLinkStyle = {
  ...linkStyle,
  color: '#111827',
  fontWeight: 700
} as const;
