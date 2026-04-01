# Frontend UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all inline CSS across the WeightLoss frontend with Tailwind CSS + shadcn/ui, delivering a clean clinical SaaS aesthetic across all 8 screens with zero regression in backend contracts.

**Architecture:** Install Tailwind + shadcn/ui, wire up shared primitives (NavBar, PageShell, cn utility), then rebuild each page/component file from the JSX layer only. All data fetching, state management, and API call logic is preserved verbatim — only the JSX return values and inline style objects change.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3, shadcn/ui (slate base), lucide-react

---

## File Map

**New files created:**
- `frontend/tailwind.config.ts`
- `frontend/postcss.config.js`
- `frontend/app/globals.css`
- `frontend/app/components/nav-bar-wrapper.tsx`
- `frontend/app/components/page-shell.tsx`
- `frontend/lib/utils.ts` ← auto-created by shadcn init
- `frontend/components/ui/*.tsx` ← auto-created by shadcn add

**Modified files:**
- `frontend/tsconfig.json` — add baseUrl + path aliases
- `frontend/app/layout.tsx` — import globals.css, Tailwind body classes, add NavBarWrapper
- `frontend/app/components/nav-bar.tsx`
- `frontend/app/login/page.tsx`
- `frontend/app/register/page.tsx`
- `frontend/app/onboarding/page.tsx`
- `frontend/app/onboarding/components/onboarding-form.tsx`
- `frontend/app/components/dashboard.tsx`
- `frontend/app/dashboard/page.tsx` — ErrorState only
- `frontend/app/components/plan.tsx`
- `frontend/app/components/checklist.tsx`
- `frontend/app/components/tracking.tsx`
- `frontend/app/tracking/page.tsx` — ErrorState only
- `frontend/app/components/interaction.tsx`
- `frontend/app/components/input-box.tsx`
- `frontend/app/components/reminders.tsx`
- `frontend/app/settings/page.tsx`

**Never touch:**
- `frontend/lib/api-client.ts`
- `frontend/lib/auth.ts`
- `frontend/lib/ai-keys.ts`
- `frontend/app/interaction/page.tsx`
- `frontend/app/plan/page.tsx`
- `frontend/app/reminders/page.tsx`

---

## Task 1: Install Tailwind CSS

**Files:**
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`

- [ ] **Step 1: Install packages**

```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer tailwindcss-animate
```

Expected output: packages added to devDependencies, no errors.

- [ ] **Step 2: Create `frontend/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

- [ ] **Step 3: Create `frontend/postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Create `frontend/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/tailwind.config.ts frontend/postcss.config.js frontend/app/globals.css frontend/package.json frontend/package-lock.json
git commit -m "feat: install tailwind css and postcss"
```

---

## Task 2: Install shadcn/ui Components

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/lib/utils.ts`
- Create: `frontend/components/ui/*.tsx` (auto-generated)

- [ ] **Step 1: Update `frontend/tsconfig.json` to add path alias**

Replace the entire file with:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "es2017"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "next-env.d.ts",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Create `frontend/components.json` (shadcn config)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 3: Install shadcn peer dependencies**

```bash
cd frontend
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-select @radix-ui/react-progress @radix-ui/react-separator @radix-ui/react-switch @radix-ui/react-checkbox @radix-ui/react-accordion @radix-ui/react-avatar
```

Expected: packages installed, no peer dep errors.

- [ ] **Step 4: Run shadcn init**

```bash
cd frontend
npx shadcn@latest init --yes
```

If prompted, accept defaults. When asked about the config file, it will detect `components.json` already exists and use it.

- [ ] **Step 5: Add all required shadcn components**

```bash
cd frontend
npx shadcn@latest add button card input label select textarea badge progress separator avatar switch checkbox accordion --yes
```

Expected: files created under `frontend/components/ui/`.

- [ ] **Step 6: Verify `frontend/lib/utils.ts` was created**

Run: `cat frontend/lib/utils.ts`

Expected output:
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

If the file is missing (shadcn may not auto-create it), create it manually with the content above.

- [ ] **Step 7: Commit**

```bash
git add frontend/tsconfig.json frontend/components.json frontend/lib/utils.ts frontend/components/ frontend/package.json frontend/package-lock.json
git commit -m "feat: install and configure shadcn/ui"
```

---

## Task 3: Update Root Layout

**Files:**
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Replace `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { NavBarWrapper } from './components/nav-bar-wrapper';

export const metadata: Metadata = {
  title: 'WeightLoss',
  description: 'WeightLoss — your personalised health companion'
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <NavBarWrapper />
        {children}
      </body>
    </html>
  );
}
```

Note: `NavBarWrapper` will be created in Task 4. The build will fail until Task 4 is complete — that is expected. Complete Tasks 3 and 4 before running a build check.

- [ ] **Step 2: Commit (after Task 4 is done)**

Defer this commit to the end of Task 4.

---

## Task 4: Rebuild NavBar + NavBarWrapper

**Files:**
- Modify: `frontend/app/components/nav-bar.tsx`
- Create: `frontend/app/components/nav-bar-wrapper.tsx`

- [ ] **Step 1: Replace `frontend/app/components/nav-bar.tsx`**

```tsx
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

import { cn } from '@/lib/utils';

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
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 lg:hidden">
        <div className="flex justify-around items-center h-16 px-1">
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
        </div>
      </nav>

      {/* Desktop left sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col bg-white border-r border-slate-200 z-50">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm">WeightLoss</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
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
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Create `frontend/app/components/nav-bar-wrapper.tsx`**

```tsx
'use client';

import { usePathname } from 'next/navigation';

import { NavBar } from './nav-bar';

const AUTH_PATHS = ['/login', '/register', '/onboarding'];

export function NavBarWrapper() {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPage) return null;
  return <NavBar />;
}
```

- [ ] **Step 3: Verify the build compiles**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: build succeeds. If it fails with "Cannot find module" for shadcn components, re-run Step 5 of Task 2.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/layout.tsx frontend/app/components/nav-bar.tsx frontend/app/components/nav-bar-wrapper.tsx
git commit -m "feat: rebuild navbar with mobile bottom/desktop sidebar, wire into layout"
```

---

## Task 5: Create PageShell Component

**Files:**
- Create: `frontend/app/components/page-shell.tsx`

- [ ] **Step 1: Create `frontend/app/components/page-shell.tsx`**

```tsx
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PageShell({
  children,
  className,
  fullWidth = false
}: Readonly<{
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}>) {
  return (
    <div className={cn('min-h-screen bg-slate-50 pb-20 lg:pb-0 lg:pl-64', className)}>
      <div className={cn('mx-auto px-4 py-8', fullWidth ? 'max-w-full' : 'max-w-5xl')}>
        {children}
      </div>
    </div>
  );
}
```

The `pb-20` clears the mobile bottom nav (64px = 16px × 4). The `lg:pl-64` clears the 256px desktop sidebar.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/page-shell.tsx
git commit -m "feat: add PageShell layout wrapper"
```

---

## Task 6: Rebuild Login Page

**Files:**
- Modify: `frontend/app/login/page.tsx`

- [ ] **Step 1: Replace `frontend/app/login/page.tsx`**

Preserve all logic (useState, handleSubmit, handleKeyDown, login import) — only the JSX changes.

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import { login } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && email && password && !isSubmitting) {
      handleSubmit();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xl font-bold">W</span>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to your WeightLoss account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your password"
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          {error ? (
            <p id="login-error" className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !email || !password}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run `npm run build` in `frontend/` and confirm no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/page.tsx
git commit -m "feat: rebuild login page with shadcn/ui"
```

---

## Task 7: Rebuild Register Page

**Files:**
- Modify: `frontend/app/register/page.tsx`

- [ ] **Step 1: Replace `frontend/app/register/page.tsx`**

Preserve all logic (validation, register+login calls, router.push).

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import { login, register } from '../../lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password);
      await login(email, password);
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const confirmMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xl font-bold">W</span>
          </div>
          <CardTitle className="text-2xl font-bold">Create account</CardTitle>
          <CardDescription>Start your weight loss journey today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              aria-invalid={confirmMismatch}
              aria-describedby={confirmMismatch ? 'confirm-error' : undefined}
              className={confirmMismatch ? 'border-red-500' : ''}
            />
            {confirmMismatch ? (
              <p id="confirm-error" className="text-xs text-red-600">
                Passwords do not match
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !email || !password || !confirmPassword}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/register/page.tsx
git commit -m "feat: rebuild register page with shadcn/ui"
```

---

## Task 8: Rebuild Onboarding

**Files:**
- Modify: `frontend/app/onboarding/page.tsx`
- Modify: `frontend/app/onboarding/components/onboarding-form.tsx`

- [ ] **Step 1: Replace `frontend/app/onboarding/page.tsx`**

```tsx
import { OnboardingForm } from './components/onboarding-form';

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <OnboardingForm />
    </main>
  );
}
```

- [ ] **Step 2: Replace `frontend/app/onboarding/components/onboarding-form.tsx`**

Preserve all state/logic: `stepIndex`, `form`, `groqKey`, `mistralKey`, `showGroqKey`, `showMistralKey`, `error`, `success`, `isSubmitting`, `canContinue`, `updateField`, `handleSubmit`. Only the JSX changes.

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import {
  type OnboardingPayload,
  upsertProfile
} from '../../../lib/api-client';
import { setAiKeys } from '../../../lib/ai-keys';

type FormState = OnboardingPayload;

const initialState: FormState = {
  name: '',
  age: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  goal_target_weight_kg: '',
  goal_timeline_weeks: '',
  health_conditions: '',
  activity_level: '',
  sleep_hours: '',
  diet_pattern: ''
};

const steps = [
  {
    id: 'profile',
    title: 'Your profile',
    description: 'Basic details to create your starting profile.'
  },
  {
    id: 'goals',
    title: 'Goals & conditions',
    description: 'Your target and any important health context.'
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle habits',
    description: 'Daily patterns that shape your plan.'
  },
  {
    id: 'ai_setup',
    title: 'AI setup',
    description: 'Connect AI providers for personalised plans.'
  }
] as const;

export function OnboardingForm() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [groqKey, setGroqKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = steps[stepIndex];

  const canContinue = useMemo(() => {
    if (stepIndex === 0) {
      return (
        form.name.trim() !== '' &&
        form.age !== '' &&
        form.height_cm !== '' &&
        form.weight_kg !== ''
      );
    }
    if (stepIndex === 1) {
      return form.goal_target_weight_kg !== '' && form.goal_timeline_weeks !== '';
    }
    if (stepIndex === 2) {
      return (
        form.activity_level.trim() !== '' &&
        form.sleep_hours !== '' &&
        form.diet_pattern.trim() !== ''
      );
    }
    return true;
  }, [form, stepIndex]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await upsertProfile(form);
      if (groqKey.trim() && mistralKey.trim()) {
        setAiKeys(groqKey.trim(), mistralKey.trim());
      }
      setSuccess('Onboarding saved. Redirecting…');
      setTimeout(() => router.push('/dashboard'), 800);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Failed to save onboarding data.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader className="pb-4">
        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Step {stepIndex + 1} of {steps.length} — {currentStep.title}
          </p>
          <Progress value={((stepIndex + 1) / steps.length) * 100} className="h-1.5" />
        </div>
        <CardTitle className="text-xl">{currentStep.title}</CardTitle>
        <CardDescription>{currentStep.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {stepIndex === 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">
                Full name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Your full name"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">
                  Age <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  value={form.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  placeholder="e.g. 32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => updateField('gender', v)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height_cm">
                  Height (cm) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="height_cm"
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.height_cm}
                  onChange={(e) => updateField('height_cm', e.target.value)}
                  placeholder="e.g. 170"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_kg">
                  Current weight (kg) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="weight_kg"
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(e) => updateField('weight_kg', e.target.value)}
                  placeholder="e.g. 80"
                />
              </div>
            </div>
          </>
        ) : null}

        {stepIndex === 1 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal_target_weight_kg">
                  Target weight (kg) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="goal_target_weight_kg"
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.goal_target_weight_kg}
                  onChange={(e) => updateField('goal_target_weight_kg', e.target.value)}
                  placeholder="e.g. 70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal_timeline_weeks">
                  Timeline (weeks) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="goal_timeline_weeks"
                  type="number"
                  min="1"
                  value={form.goal_timeline_weeks}
                  onChange={(e) => updateField('goal_timeline_weeks', e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="health_conditions">Health conditions</Label>
              <Textarea
                id="health_conditions"
                value={form.health_conditions}
                onChange={(e) => updateField('health_conditions', e.target.value)}
                placeholder="Optional: include any current conditions or concerns (e.g. diabetes, hypertension)."
                className="min-h-[96px] resize-y"
              />
              <p className="text-xs text-slate-500">
                This helps personalise your plan. Leave blank if not applicable.
              </p>
            </div>
          </>
        ) : null}

        {stepIndex === 2 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="activity_level">
                Activity level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.activity_level}
                onValueChange={(v) => updateField('activity_level', v)}
              >
                <SelectTrigger id="activity_level">
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — mostly sedentary</SelectItem>
                  <SelectItem value="moderate">Moderate — light exercise 2–3×/week</SelectItem>
                  <SelectItem value="high">High — intense exercise 4+×/week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sleep_hours">
                  Average sleep (hours) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sleep_hours"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={form.sleep_hours}
                  onChange={(e) => updateField('sleep_hours', e.target.value)}
                  placeholder="e.g. 7"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diet_pattern">
                  Diet pattern <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="diet_pattern"
                  value={form.diet_pattern}
                  onChange={(e) => updateField('diet_pattern', e.target.value)}
                  placeholder="e.g. balanced, vegetarian, desi"
                />
              </div>
            </div>
          </>
        ) : null}

        {stepIndex === 3 ? (
          <>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-blue-900">Why add API keys?</p>
              <p className="text-sm text-blue-700">
                Without keys the app uses built-in rules. With keys, a real LLM generates
                fully personalised plans — like a desi meal plan, a Ramadan schedule, or
                post-workout meals.
              </p>
              <p className="text-xs text-blue-600 font-medium">
                These keys are optional. You can skip this and add them later from Settings.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Groq</p>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-0">
                  Primary
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Go to <strong>console.groq.com</strong> → sign up free → API Keys → Create API Key
              </p>
              <div className="relative">
                <Input
                  type={showGroqKey ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showGroqKey ? 'Hide Groq key' : 'Show Groq key'}
                >
                  {showGroqKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Mistral</p>
                <Badge variant="secondary" className="text-xs">
                  Fallback
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Go to <strong>console.mistral.ai</strong> → sign up free → API Keys → Create new key
              </p>
              <div className="relative">
                <Input
                  type={showMistralKey ? 'text' : 'password'}
                  value={mistralKey}
                  onChange={(e) => setMistralKey(e.target.value)}
                  placeholder="Mistral API key…"
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowMistralKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showMistralKey ? 'Hide Mistral key' : 'Show Mistral key'}
                >
                  {showMistralKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Keys are stored only in your browser and never sent to our servers.
            </p>
          </>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        ) : null}
        {success ? (
          <p className="text-sm text-emerald-600">{success}</p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => setStepIndex((s) => Math.max(s - 1, 0))}
            disabled={stepIndex === 0 || isSubmitting}
          >
            Back
          </Button>

          {stepIndex < steps.length - 1 ? (
            <Button
              onClick={() => setStepIndex((s) => s + 1)}
              disabled={!canContinue || isSubmitting}
              className="sm:min-w-[140px]"
            >
              Continue
            </Button>
          ) : (
            <div className="flex gap-2">
              {!groqKey.trim() || !mistralKey.trim() ? (
                <Button
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Skip and finish'
                  )}
                </Button>
              ) : null}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="sm:min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : groqKey.trim() && mistralKey.trim() ? (
                  'Save and finish'
                ) : (
                  'Finish'
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/onboarding/page.tsx frontend/app/onboarding/components/onboarding-form.tsx
git commit -m "feat: rebuild onboarding form with shadcn/ui + progress steps"
```

---

## Task 9: Rebuild Dashboard

**Files:**
- Modify: `frontend/app/components/dashboard.tsx`
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Replace `frontend/app/components/dashboard.tsx`**

Preserve: `DashboardView` props interface (`profile`, `metrics`, `labs`, `plan`), `latestMetric`, `alerts` derivation, `EmptyState` props. All logic untouched. Remove the old `DashboardHeader` nav links (NavBar is now in layout).

```tsx
'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { PageShell } from './page-shell';
import type {
  HealthMetricResponse,
  LabRecordResponse,
  PlanSnapshot,
  ProfileResponse
} from '../../lib/api-client';

export function DashboardView({
  profile,
  metrics,
  labs,
  plan
}: Readonly<{
  profile: ProfileResponse | null;
  metrics: HealthMetricResponse[];
  labs: LabRecordResponse[];
  plan: PlanSnapshot | null;
}>) {
  const latestMetric = metrics[0] ?? null;
  const alerts = [
    ...labs
      .filter((lab) => lab.evaluation.is_abnormal)
      .slice(0, 3)
      .map((lab) => `${lab.test_name}: ${lab.evaluation.status}`),
    ...(plan?.recommendations.slice(0, 2) ?? [])
  ];

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Dashboard
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          {profile?.name ? `${profile.name}'s overview` : 'Today overview'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your latest plan, key metrics, and alerts in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Metrics card */}
          <Card>
            <CardHeader className="pb-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Metrics
              </p>
              <CardTitle className="text-base mt-0.5">Key numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {latestMetric ? (
                <>
                  <MetricRow
                    label="Weight"
                    value={`${latestMetric.weight_kg} kg`}
                    accent
                  />
                  <MetricRow
                    label="BMI"
                    value={`${latestMetric.bmi ?? latestMetric.processed.derived_bmi ?? '—'}`}
                  />
                  <MetricRow
                    label="Steps"
                    value={`${latestMetric.steps ?? '—'}`}
                  />
                  <MetricRow
                    label="Sleep"
                    value={`${latestMetric.sleep_hours ?? '—'} h`}
                    last
                  />
                </>
              ) : (
                <p className="text-sm text-slate-500">No health metrics available yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts card */}
          <Card>
            <CardHeader className="pb-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Alerts
              </p>
              <CardTitle className="text-base mt-0.5">Flags & reminders</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <ul className="space-y-2">
                  {alerts.map((alert) => (
                    <li key={alert} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      {alert}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No current alerts.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Plan */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Today
                </p>
                <CardTitle className="text-base mt-0.5">Current plan</CardTitle>
              </div>
              <Link
                href="/plan"
                className="text-xs text-blue-600 hover:underline font-medium flex-shrink-0 mt-0.5"
              >
                Full breakdown →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {plan ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PlanBlock
                  title="Meals"
                  items={plan.meals.map((meal) => `${meal.meal}: ${meal.name}`)}
                />
                <PlanBlock
                  title="Activity"
                  items={plan.activity.map((item) => `${item.title}: ${item.frequency}`)}
                />
                <PlanBlock
                  title="Key actions"
                  items={plan.behavioral_actions.slice(0, 3)}
                />
              </div>
            ) : (
              <EmptyState
                text="No plan generated in this session yet."
                actionHref="/interaction"
                actionLabel="Generate a plan"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function MetricRow({
  label,
  value,
  accent = false,
  last = false
}: Readonly<{
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}>) {
  return (
    <>
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-slate-500">{label}</span>
        <span
          className={
            accent
              ? 'text-sm font-bold text-teal-600'
              : 'text-sm font-semibold text-slate-900'
          }
        >
          {value}
        </span>
      </div>
      {!last ? <Separator /> : null}
    </>
  );
}

function PlanBlock({
  title,
  items
}: Readonly<{
  title: string;
  items: string[];
}>) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-slate-700 leading-snug">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({
  text,
  actionHref,
  actionLabel
}: Readonly<{
  text: string;
  actionHref: string;
  actionLabel: string;
}>) {
  return (
    <div className="text-center py-6 space-y-3">
      <p className="text-sm text-slate-500">{text}</p>
      <Link
        href={actionHref}
        className="inline-flex items-center text-sm text-blue-600 hover:underline font-medium"
      >
        {actionLabel} →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Replace ErrorState in `frontend/app/dashboard/page.tsx`**

Only change the `ErrorState` inline component at the bottom of the file. All other code (useEffect, useState, imports from api-client) is untouched.

Find and replace only the `ErrorState` function and its `return` inside `DashboardPage`:

```tsx
// Replace the ErrorState function (keep everything else in dashboard/page.tsx identical):
function ErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Dashboard unavailable</h1>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </main>
  );
}
```

Also add this import at the top of `dashboard/page.tsx` (do NOT add it to `components/dashboard.tsx`):

```tsx
// No new imports needed in dashboard/page.tsx — DashboardView is already imported
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/dashboard.tsx frontend/app/dashboard/page.tsx
git commit -m "feat: rebuild dashboard with shadcn/ui two-column layout"
```

---

## Task 10: Rebuild Plan + Checklist

**Files:**
- Modify: `frontend/app/components/plan.tsx`
- Modify: `frontend/app/components/checklist.tsx`

- [ ] **Step 1: Replace `frontend/app/components/plan.tsx`**

Preserve: `PlanView` props interface (`plan: PlanSnapshot | null`). Remove old NavBar import and usage. All data rendering logic stays identical.

```tsx
'use client';

import type { PlanSnapshot } from '../../lib/api-client';
import { Checklist } from './checklist';
import { PageShell } from './page-shell';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PlanView({
  plan
}: Readonly<{
  plan: PlanSnapshot | null;
}>) {
  if (!plan) {
    return (
      <PageShell>
        <Card className="max-w-lg mx-auto text-center py-10">
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold text-slate-900">No plan yet</p>
            <p className="text-sm text-slate-500">
              Generate a plan from the Chat page to see your meals and activities here.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Plan</p>
        <h1 className="text-2xl font-bold text-slate-900">Daily breakdown</h1>
        <p className="text-sm text-slate-500 mt-1">
          Meals, activity, and actions from the latest generated plan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Meals</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {plan.meals.map((meal) => (
                <AccordionItem
                  key={`${meal.meal}-${meal.name}`}
                  value={`${meal.meal}-${meal.name}`}
                >
                  <AccordionTrigger className="text-sm font-medium capitalize">
                    {meal.meal}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-slate-700">{meal.name}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {plan.activity.map((item) => (
                <AccordionItem
                  key={`${item.title}-${item.frequency}`}
                  value={`${item.title}-${item.frequency}`}
                >
                  <AccordionTrigger className="text-sm font-medium">
                    {item.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-slate-700">{item.frequency}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Checklist — spans full width */}
        <div className="lg:col-span-2">
          <Checklist
            title="Action checklist"
            items={[
              ...plan.behavioral_actions.map((item) => ({
                name: item,
                itemType: 'behavioral_action'
              })),
              ...plan.recommendations.map((item) => ({
                name: item,
                itemType: 'recommendation'
              }))
            ]}
          />
        </div>
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 2: Replace `frontend/app/components/checklist.tsx`**

Preserve: all useEffect hooks, `handleToggle`, `buildCompletionState`, `buildItemKey`, `createAdherenceRecord`, `fetchAdherenceRecords` logic. Props interface stays the same: `{ items: Array<{ name: string; itemType: string }>, title: string }`. Only the JSX changes.

```tsx
'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

import {
  createAdherenceRecord,
  fetchAdherenceRecords,
  type AdherenceRecordResponse
} from '../../lib/api-client';

export function Checklist({
  items,
  title
}: Readonly<{
  items: Array<{
    name: string;
    itemType: string;
  }>;
  title: string;
}>) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const nextState: Record<string, boolean> = {};
    items.forEach((item) => {
      const key = buildItemKey(item.name, item.itemType);
      nextState[key] = completed[key] ?? false;
    });
    setCompleted(nextState);
  }, [items.map((item) => `${item.itemType}:${item.name}`).join('|')]);

  useEffect(() => {
    let isMounted = true;

    async function loadTodayStatus() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const records = await fetchAdherenceRecords({ startDate: today, endDate: today });
        if (!isMounted) return;
        const nextState = buildCompletionState(items, records);
        setCompleted((current) => ({ ...current, ...nextState }));
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load checklist progress.'
        );
      }
    }

    if (items.length > 0) loadTodayStatus();
    return () => { isMounted = false; };
  }, [items]);

  async function handleToggle(itemName: string, itemType: string) {
    const itemKey = buildItemKey(itemName, itemType);
    const nextValue = !(completed[itemKey] ?? false);
    setCompleted((current) => ({ ...current, [itemKey]: nextValue }));
    setError('');

    try {
      await createAdherenceRecord({
        item_type: itemType,
        item_name: itemName,
        completed: nextValue,
        adherence_date: new Date().toISOString().slice(0, 10),
        score: nextValue ? 100 : 0
      });
    } catch (saveError) {
      setCompleted((current) => ({ ...current, [itemKey]: !nextValue }));
      setError(saveError instanceof Error ? saveError.message : 'Unable to save checklist progress.');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No checklist items yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const key = buildItemKey(item.name, item.itemType);
              const isDone = completed[key] ?? false;
              return (
                <div
                  key={`${item.itemType}:${item.name}`}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isDone ? 'bg-emerald-50' : 'bg-slate-50'
                  }`}
                >
                  <Checkbox
                    id={key}
                    checked={isDone}
                    onCheckedChange={() => handleToggle(item.name, item.itemType)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <label
                    htmlFor={key}
                    className={`text-sm cursor-pointer leading-snug transition-colors ${
                      isDone ? 'line-through text-slate-400' : 'text-slate-700'
                    }`}
                  >
                    {item.name}
                  </label>
                </div>
              );
            })}
          </div>
        )}
        {error ? (
          <p className="text-xs text-red-600 mt-3">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildCompletionState(
  items: Array<{ name: string; itemType: string }>,
  records: AdherenceRecordResponse[]
): Record<string, boolean> {
  const allowedKeys = new Set(items.map((item) => buildItemKey(item.name, item.itemType)));
  const state: Record<string, boolean> = {};
  records.forEach((record) => {
    const key = buildItemKey(record.item_name, record.item_type);
    if (!allowedKeys.has(key) || state[key] !== undefined) return;
    state[key] = record.completed;
  });
  return state;
}

function buildItemKey(name: string, itemType: string): string {
  return `${itemType}:${name}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/plan.tsx frontend/app/components/checklist.tsx
git commit -m "feat: rebuild plan view and checklist with shadcn/ui"
```

---

## Task 11: Rebuild Tracking

**Files:**
- Modify: `frontend/app/components/tracking.tsx`
- Modify: `frontend/app/tracking/page.tsx`

- [ ] **Step 1: Replace `frontend/app/components/tracking.tsx`**

Preserve: `TrackingView` props interface (`metrics`, `labs`, `adherenceRecords`), `formatDateTime`, `formatDate` functions, all data rendering logic. Remove NavBar import and usage.

```tsx
'use client';

import type {
  AdherenceRecordResponse,
  HealthMetricResponse,
  LabRecordResponse
} from '../../lib/api-client';
import { PageShell } from './page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TrackingView({
  metrics,
  labs,
  adherenceRecords
}: Readonly<{
  metrics: HealthMetricResponse[];
  labs: LabRecordResponse[];
  adherenceRecords: AdherenceRecordResponse[];
}>) {
  const latestMetric = metrics[0] ?? null;

  return (
    <PageShell>
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Tracking</p>
        <h1 className="text-2xl font-bold text-slate-900">Progress & history</h1>
        <p className="text-sm text-slate-500 mt-1">
          Weight trends, biomarker history, and adherence signals.
        </p>
      </div>

      {/* Metric summary cards */}
      {latestMetric ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Current weight"
            value={`${latestMetric.weight_kg} kg`}
            accent
          />
          <StatCard
            label="BMI"
            value={`${latestMetric.bmi ?? latestMetric.processed.derived_bmi ?? '—'}`}
          />
          <StatCard
            label="Steps"
            value={`${latestMetric.steps ?? '—'}`}
          />
          <StatCard
            label="Sleep"
            value={`${latestMetric.sleep_hours ?? '—'} h`}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weight trend</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.length > 0 ? (
              <div className="space-y-2">
                {metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm text-slate-500">
                      {formatDateTime(metric.recorded_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {metric.weight_kg} kg
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-xs"
                      >
                        {metric.processed.weight_trend}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No weight entries yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Habit tracking */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Habit tracking</CardTitle>
          </CardHeader>
          <CardContent>
            {adherenceRecords.length > 0 ? (
              <div className="space-y-2">
                {adherenceRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {record.item_name}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">
                        {formatDate(record.adherence_date)}
                      </span>
                      <Badge
                        variant={record.completed ? 'default' : 'secondary'}
                        className={
                          record.completed
                            ? 'bg-emerald-100 text-emerald-700 border-0 text-xs'
                            : 'text-xs'
                        }
                      >
                        {record.completed ? 'Done' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No adherence signals available yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Biomarker history — full width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Biomarker history</CardTitle>
          </CardHeader>
          <CardContent>
            {labs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left font-medium text-slate-500 pb-2 pr-4">Date</th>
                      <th className="text-left font-medium text-slate-500 pb-2 pr-4">Test</th>
                      <th className="text-left font-medium text-slate-500 pb-2 pr-4">Value</th>
                      <th className="text-left font-medium text-slate-500 pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labs.map((lab) => (
                      <tr key={lab.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-4 text-slate-500">{lab.recorded_date}</td>
                        <td className="py-2.5 pr-4 text-slate-900">{lab.test_name}</td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {lab.value} {lab.unit ?? ''}
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant="secondary"
                            className={
                              lab.evaluation.is_abnormal
                                ? 'bg-red-100 text-red-700 border-0 text-xs'
                                : 'bg-emerald-100 text-emerald-700 border-0 text-xs'
                            }
                          >
                            {lab.evaluation.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No lab history yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  accent = false
}: Readonly<{
  label: string;
  value: string;
  accent?: boolean;
}>) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${accent ? 'text-teal-600' : 'text-slate-900'}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}
```

- [ ] **Step 2: Update ErrorState in `frontend/app/tracking/page.tsx`**

Only replace the inline error JSX inside `TrackingPage`. Leave all data fetching logic untouched.

```tsx
// Replace only the error return branch (the if (error) block) in tracking/page.tsx:
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Tracking unavailable</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </main>
    );
  }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/tracking.tsx frontend/app/tracking/page.tsx
git commit -m "feat: rebuild tracking view with shadcn/ui stat cards and tables"
```

---

## Task 12: Rebuild Interaction + InputBox

**Files:**
- Modify: `frontend/app/components/interaction.tsx`
- Modify: `frontend/app/components/input-box.tsx`

- [ ] **Step 1: Replace `frontend/app/components/input-box.tsx`**

Preserve: props interface (`onSubmit`, `isSubmitting`), `handleSubmit` logic, textarea value state.

```tsx
'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function InputBox({
  onSubmit,
  isSubmitting
}: Readonly<{
  onSubmit: (prompt: string) => Promise<void>;
  isSubmitting: boolean;
}>) {
  const [value, setValue] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim() === '') return;
    await onSubmit(value.trim());
    setValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSubmitting) {
        onSubmit(value.trim()).then(() => setValue(''));
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask for a refreshed plan, a meal tweak, or a quick summary… (Enter to send)"
        className="flex-1 min-h-[52px] max-h-[160px] resize-none"
        rows={1}
      />
      <Button
        type="submit"
        size="icon"
        disabled={isSubmitting || value.trim() === ''}
        className="flex-shrink-0 h-10 w-10"
        aria-label="Send message"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Replace `frontend/app/components/interaction.tsx`**

Preserve: all state, all useEffect hooks, `handleSubmit`, `applyResponse`, `deduplicateSignals`, `inferIntent`, all imports from `api-client` and `ai-keys`. Remove NavBar import. Restructure JSX to chat-bubble layout.

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { InputBox } from './input-box';

import {
  appendInteractionHistory,
  fetchAdherenceSummary,
  fetchTodayPlan,
  fetchHealthMetrics,
  fetchLabs,
  fetchProfile,
  getInteractionHistory,
  getLatestPlan,
  persistLatestPlan,
  saveLatestPlan,
  submitOrchestratorRequest,
  type AdaptiveAdjustment,
  type InteractionHistoryItem,
  type OrchestratorIntent,
  type OrchestratorResponse,
  type PlanSnapshot
} from '../../lib/api-client';
import { hasAiKeys } from '../../lib/ai-keys';

export function InteractionView() {
  const [history, setHistory] = useState<InteractionHistoryItem[]>([]);
  const [latestPlan, setLatestPlan] = useState<PlanSnapshot | null>(null);
  const [consistencyLevel, setConsistencyLevel] = useState<string | null>(null);
  const [adaptiveAdjustment, setAdaptiveAdjustment] = useState<AdaptiveAdjustment | null>(null);
  const [planRefreshNeeded, setPlanRefreshNeeded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [aiKeysConfigured, setAiKeysConfigured] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAiKeysConfigured(hasAiKeys());
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialState() {
      setHistory(getInteractionHistory());
      const [planResult, summaryResult] = await Promise.allSettled([
        fetchTodayPlan(),
        fetchAdherenceSummary()
      ]);
      if (!isMounted) return;

      if (planResult.status === 'fulfilled') {
        setLatestPlan(planResult.value ?? getLatestPlan());
      } else {
        setLatestPlan(getLatestPlan());
      }

      if (summaryResult.status === 'fulfilled' && summaryResult.value) {
        const summary = summaryResult.value;
        setConsistencyLevel(summary.consistency_level);
        setAdaptiveAdjustment(summary.adjustments);
        setPlanRefreshNeeded(summary.plan_refresh_needed);
      }
    }

    loadInitialState();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  async function handleSubmit(prompt: string) {
    setIsSubmitting(true);
    setError('');
    setPlanRefreshNeeded(false);

    try {
      const [profile, metrics, labs] = await Promise.all([
        fetchProfile(),
        fetchHealthMetrics(),
        fetchLabs()
      ]);

      const intent = inferIntent(prompt);
      const uniqueSignals = deduplicateSignals(latestPlan?.adherence_signals ?? []);

      const response = await submitOrchestratorRequest({
        prompt,
        intent,
        profile,
        metrics,
        labs,
        adherenceSignals: uniqueSignals,
        consistencyLevel,
        adaptiveAdjustment
      });

      await applyResponse(prompt, response);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to reach the assistant.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function applyResponse(prompt: string, response: OrchestratorResponse) {
    const finalPlan = response.metadata.final_plan ?? null;
    if (finalPlan) {
      saveLatestPlan(finalPlan);
      setLatestPlan(finalPlan);
      persistLatestPlan(finalPlan).catch(() => {});
    }

    const item = {
      prompt,
      reply: response.content,
      created_at: new Date().toISOString()
    };
    appendInteractionHistory(item);
    setHistory(getInteractionHistory());
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 lg:pb-0 lg:pl-64">
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-64px)] lg:h-screen px-4">
        {/* Header */}
        <div className="py-6 flex-shrink-0">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Chat</p>
          <h1 className="text-2xl font-bold text-slate-900">Ask your AI coach</h1>
        </div>

        {/* Banners */}
        {planRefreshNeeded ? (
          <div className="mb-3 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex-shrink-0">
            <strong>Your adherence patterns have changed.</strong> Consistency level:{' '}
            <em>{consistencyLevel}</em>. Submit a new request for an updated plan.
          </div>
        ) : null}

        {!aiKeysConfigured ? (
          <div className="mb-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex-shrink-0">
            <strong>AI not configured.</strong> Using built-in rules.{' '}
            <Link href="/settings" className="underline font-medium">
              Add API keys in Settings
            </Link>{' '}
            for personalised responses.
          </div>
        ) : null}

        {consistencyLevel ? (
          <div className="mb-3 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              Adherence: {consistencyLevel}
            </Badge>
          </div>
        ) : null}

        {/* Message history */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-slate-400 text-center max-w-xs">
                Start by asking for a meal plan, a progress summary, or any health question.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div key={`${item.created_at}-${item.prompt}`} className="space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5">
                    <p className="text-sm">{item.prompt}</p>
                  </div>
                </div>
                {/* AI reply */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-slate-100 text-slate-900 rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.reply}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          {isSubmitting ? (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        {error ? (
          <p className="text-sm text-red-600 mb-2 flex-shrink-0" role="alert">{error}</p>
        ) : null}
        <div className="border-t border-slate-200 pt-4 pb-4 flex-shrink-0">
          <InputBox onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
      </div>
    </main>
  );
}

function deduplicateSignals(
  signals: Array<{ name: string; completed: boolean; score?: number | null }>
): Array<{ name: string; completed: boolean; score?: number | null }> {
  return Array.from(new Map(signals.map((s) => [s.name, s])).values());
}

function inferIntent(prompt: string): OrchestratorIntent {
  const normalized = prompt.toLowerCase();
  if (normalized.includes('meal') || normalized.includes('plan')) return 'meal_plan';
  if (normalized.includes('trend') || normalized.includes('track')) return 'tracking';
  if (normalized.includes('today') || normalized.includes('overview')) return 'dashboard';
  return 'question';
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/interaction.tsx frontend/app/components/input-box.tsx
git commit -m "feat: rebuild interaction as chat-bubble UI with input-box"
```

---

## Task 13: Rebuild Reminders

**Files:**
- Modify: `frontend/app/components/reminders.tsx`

- [ ] **Step 1: Replace `frontend/app/components/reminders.tsx`**

Preserve: all state, `handleCreate`, `fetchReminders`, `createReminder`, `formatTime`, `REMINDER_TYPES`, `CADENCES` constants. Remove NavBar import and usage.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2, Clock, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageShell } from './page-shell';

import {
  createReminder,
  fetchReminders,
  type ReminderResponse
} from '../../lib/api-client';

const REMINDER_TYPES = ['medication', 'meal', 'exercise', 'water', 'sleep', 'other'];
const CADENCES = ['daily', 'weekdays', 'weekends', 'weekly'];

export function RemindersView() {
  const [reminders, setReminders] = useState<ReminderResponse[]>([]);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState(REMINDER_TYPES[0]);
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [cadence, setCadence] = useState(CADENCES[0]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await fetchReminders();
        if (isMounted) setReminders(data);
      } catch (err) {
        if (isMounted) setLoadError(err instanceof Error ? err.message : 'Unable to load reminders.');
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    setIsSaving(true);
    try {
      const created = await createReminder({
        title: title.trim(),
        reminder_type: reminderType,
        scheduled_time: `${scheduledTime}:00`,
        cadence,
        is_active: true
      });
      setReminders((prev) => [...prev, created]);
      setTitle('');
      setScheduledTime('08:00');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to create reminder.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageShell>
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Reminders</p>
        <h1 className="text-2xl font-bold text-slate-900">Scheduled reminders</h1>
        <p className="text-sm text-slate-500 mt-1">
          Set daily reminders for medications, meals, exercise, and other habits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Add reminder form */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Add a reminder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reminder-title">Title</Label>
                <Input
                  id="reminder-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Take metformin"
                  required
                  maxLength={255}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-type">Type</Label>
                <Select value={reminderType} onValueChange={setReminderType}>
                  <SelectTrigger id="reminder-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-time">Time (UTC)</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-cadence">Cadence</Label>
                <Select value={cadence} onValueChange={setCadence}>
                  <SelectTrigger id="reminder-cadence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CADENCES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {saveError ? (
                <p className="text-xs text-red-600" role="alert">{saveError}</p>
              ) : null}

              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Add reminder'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Reminder list */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Your reminders</CardTitle>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <p className="text-sm text-red-600">{loadError}</p>
            ) : reminders.length === 0 ? (
              <p className="text-sm text-slate-500">No reminders yet. Add one on the left.</p>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors ${
                      reminder.is_active
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {reminder.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatTime(reminder.scheduled_time)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Tag className="h-3 w-3" />
                          {reminder.reminder_type}
                        </span>
                        <span className="text-xs text-slate-400">{reminder.cadence}</span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        reminder.is_active
                          ? 'bg-emerald-100 text-emerald-700 border-0 text-xs flex-shrink-0'
                          : 'text-xs flex-shrink-0'
                      }
                    >
                      {reminder.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function formatTime(value: string): string {
  const [h, m] = value.split(':');
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/components/reminders.tsx
git commit -m "feat: rebuild reminders view with shadcn/ui"
```

---

## Task 14: Rebuild Settings

**Files:**
- Modify: `frontend/app/settings/page.tsx`

- [ ] **Step 1: Replace `frontend/app/settings/page.tsx`**

Preserve: all state, `handleSave`, `handleClear`, `getGroqKey`, `getMistralKey`, `setAiKeys`, `clearAiKeys` logic. Remove NavBar import and usage.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageShell } from '../components/page-shell';

import { getGroqKey, getMistralKey, setAiKeys, clearAiKeys } from '../../lib/ai-keys';

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGroqKey(getGroqKey() ?? '');
    setMistralKey(getMistralKey() ?? '');
  }, []);

  function handleSave() {
    if (groqKey.trim() && mistralKey.trim()) {
      setAiKeys(groqKey.trim(), mistralKey.trim());
    } else {
      clearAiKeys();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClear() {
    clearAiKeys();
    setGroqKey('');
    setMistralKey('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const bothSet = Boolean(groqKey.trim() && mistralKey.trim());

  return (
    <PageShell>
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Settings</p>
        <h1 className="text-2xl font-bold text-slate-900">AI provider setup</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure Groq (primary) and Mistral (fallback) for personalised AI responses.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Status card */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">AI status</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {bothSet
                    ? 'Personalised responses enabled via Groq + Mistral.'
                    : 'Using built-in rules. Add both keys to enable AI responses.'}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={
                  bothSet
                    ? 'bg-emerald-100 text-emerald-700 border-0'
                    : 'bg-amber-100 text-amber-700 border-0'
                }
              >
                {bothSet ? 'AI active' : 'Built-in rules'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* API keys card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">API keys</CardTitle>
            <CardDescription>
              Keys are stored only in your browser and never sent to our servers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Groq */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Groq</p>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-0">
                  Primary
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Get a free key at{' '}
                <strong className="text-slate-700">console.groq.com</strong> → API Keys → Create API
                Key
              </p>
              <div className="relative">
                <Input
                  id="groq-key"
                  type={showGroqKey ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showGroqKey ? 'Hide Groq key' : 'Show Groq key'}
                >
                  {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Separator />

            {/* Mistral */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Mistral</p>
                <Badge variant="secondary" className="text-xs">
                  Fallback
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Get a free key at{' '}
                <strong className="text-slate-700">console.mistral.ai</strong> → API Keys → Create
                new key
              </p>
              <div className="relative">
                <Input
                  id="mistral-key"
                  type={showMistralKey ? 'text' : 'password'}
                  value={mistralKey}
                  onChange={(e) => setMistralKey(e.target.value)}
                  placeholder="Mistral API key…"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMistralKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showMistralKey ? 'Hide Mistral key' : 'Show Mistral key'}
                >
                  {showMistralKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} className="min-w-[100px]">
                {saved ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Saved
                  </>
                ) : (
                  'Save keys'
                )}
              </Button>
              {bothSet ? (
                <Button variant="outline" onClick={handleClear}>
                  Remove keys
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/settings/page.tsx
git commit -m "feat: rebuild settings page with shadcn/ui"
```

---

## Task 15: Final Build Check + Fix

**Files:** Any files flagged by TypeScript errors

- [ ] **Step 1: Run full build**

```bash
cd frontend && npm run build 2>&1
```

Expected: `✓ Compiled successfully`. If it fails, proceed to Step 2.

- [ ] **Step 2: Fix common TypeScript errors**

Common issues to watch for:

**"Cannot find module '@/components/ui/...'"**: Run `npx shadcn@latest add <component-name> --yes` in `frontend/` for any missing component.

**"Property 'X' does not exist on type"**: The `PageShell` component has an optional `fullWidth` and `className` prop. If any page passes unexpected props, remove them.

**"'NavBar' cannot be used as a JSX component"**: If the old NavBar usage (with `current` prop) remains in a component file, find and remove it. Search with:
```bash
grep -r "current=" frontend/app/components/ frontend/app/settings/
```

**shadcn component type errors**: These are rare but if a shadcn component prop is wrong, check the generated file in `frontend/components/ui/`.

- [ ] **Step 3: Run lint**

```bash
cd frontend && npm run lint 2>&1
```

Fix any `no-unused-vars` errors (usually old inline style constants that were deleted but imports remain).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve build and lint errors after UI overhaul"
```

- [ ] **Step 5: Verify dev server starts**

```bash
cd frontend && npm run dev &
sleep 5
curl -s http://localhost:3000/login | grep -o '<title>[^<]*</title>'
```

Expected output: `<title>WeightLoss</title>`

Kill the dev server: `pkill -f "next dev"` (or use the foreground process).
