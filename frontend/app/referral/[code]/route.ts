import { NextRequest, NextResponse } from 'next/server';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code.toUpperCase();

  // Best-effort click tracking — don't block the redirect
  try {
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '0.0.0.0';
    await fetch(`${apiBaseUrl}/api/v1/referrals/click/${code}`, {
      method: 'POST',
      headers: { 'x-forwarded-for': clientIp },
    });
  } catch {
    // non-fatal
  }

  const registerUrl = new URL('/register', request.nextUrl.origin);
  registerUrl.searchParams.set('ref', code);
  return NextResponse.redirect(registerUrl);
}
