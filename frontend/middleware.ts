import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Get tokens from cookies
    const accessToken = request.cookies.get('access_token')?.value
    const refreshToken = request.cookies.get('refresh_token')?.value

    // Public paths
    const isPublicPath = pathname === '/' || pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api')

    if (isPublicPath) {
        return NextResponse.next()
    }

    // Auth check
    if (!accessToken && !refreshToken) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // RBAC checks
    if (pathname.startsWith('/admin')) {
        // We can't easily check role from httpOnly JWT on client middleware without decoding
        // For now, we trust the redirect logic, but for maximum security we'd decode the JWT JTI/claims here
        // or rely on a 'role' cookie set by the backend
        const userRole = request.cookies.get('user_role')?.value
        if (userRole && userRole !== 'ADMIN') {
            return NextResponse.redirect(new URL('/user/dashboard', request.url))
        }
    }

    if (pathname.startsWith('/user')) {
        const userRole = request.cookies.get('user_role')?.value
        if (userRole && userRole === 'ADMIN') {
            // Admins are allowed in user areas generally or redirected to admin
            // return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
