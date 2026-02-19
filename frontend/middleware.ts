import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing);

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Handle i18n routing first
    const response = handleI18nRouting(request);

    // 2. Extract path without locale for auth checks
    // pathname format: /en/admin, /kn/customer, or /admin (if default prefix hidden?)
    // We assume prefix is always there or added by middleware redirect, 
    // but middleware runs before redirect completes? 
    // If we are at /admin, handleI18nRouting returns a redirect to /en/admin.
    // We should let that redirect happen unless we want to block it?
    // We let it happen. The auth check will run on the redirected request.

    const [, firstSegment, ...rest] = pathname.split('/');
    let locale = firstSegment;
    let pathWithoutLocale = pathname;

    if (routing.locales.includes(locale as (typeof routing.locales)[number])) {
        pathWithoutLocale = '/' + rest.join('/');
    } else {
        // If no locale in path, next-intl will assume default or redirect.
        // We can treat the current path as pathWithoutLocale
        locale = routing.defaultLocale;
    }

    // Public paths check
    // Note: API routes are excluded in config.matcher
    const isPublicPath =
        pathWithoutLocale === '/' ||
        pathWithoutLocale === '/login' ||
        pathWithoutLocale === '/signup' ||
        pathWithoutLocale === '/forgot-password' ||
        pathWithoutLocale === '/support';

    if (isPublicPath) {
        return response;
    }

    // Auth check
    const accessToken = request.cookies.get('access_token')?.value
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (!accessToken && !refreshToken) {
        // Redirect to login with current locale
        return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    // RBAC checks
    if (pathWithoutLocale.startsWith('/admin')) {
        const userRole = request.cookies.get('user_role')?.value
        if (userRole && userRole !== 'admin' && userRole !== 'ADMIN') {
            return NextResponse.redirect(new URL(`/${locale}/customer/dashboard`, request.url));
        }
    }

    if (pathWithoutLocale.startsWith('/customer')) {
        // Customers allowed
    }

    return response;
}

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(kn|te|ta|hi|en|ml)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
