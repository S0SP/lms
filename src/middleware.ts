import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);
import type { NextRequest } from 'next/server';

// ─── Portal → required role mapping ──────────────────────────────────────────
const PORTAL_ROLES: Record<string, string[]> = {
  '/admin': ['owner', 'admin'],
  '/educator': ['educator', 'owner', 'admin'],
  '/student': ['learner', 'owner', 'admin'],
  '/parent': ['parent', 'owner', 'admin'],
};

// ─── Public routes that bypass auth ──────────────────────────────────────────
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/store',
  '/consultation',
  '/api/auth',
  '/api/webhooks',
  '/api/webhook',
  '/_next',
  '/favicon.ico',
  '/logos',
  '/uploads',
  '/api/v1/uploads/local',
  '/api/v1/store',
];

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userRole = (session?.user as any)?.role || 'learner';

  // If user is ALREADY logged in and lands on /login or /, redirect to their portal home
  if (session?.user && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL(getRoleHomePath(userRole), req.url));
  }

  // Allow public paths for unauthenticated users
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // No session → redirect to login
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  // Check portal-level role requirements
  for (const [prefix, allowedRoles] of Object.entries(PORTAL_ROLES)) {
    if (pathname.startsWith(prefix)) {
      if (!allowedRoles.includes(userRole)) {
        // Wrong portal for this role — redirect to their correct portal
        return NextResponse.redirect(new URL(getRoleHomePath(userRole), req.url));
      }
      break;
    }
  }

  return NextResponse.next();
});

function getRoleHomePath(role: string): string {
  switch (role) {
    case 'owner':
    case 'admin':
      return '/admin/dashboard';
    case 'educator':
      return '/educator/calendar';
    case 'learner':
      return '/student/dashboard';
    case 'parent':
      return '/parent/dashboard';
    default:
      return '/login';
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except Next.js internals and static files.
     * This regex ensures middleware runs on all app routes.
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
