import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes
    // Protected routes
    if (!user) {
        const path = request.nextUrl.pathname
        // Allow access to login, register, auth endpoints, and static assets/images
        if (
            !path.startsWith('/login') &&
            !path.startsWith('/register') &&
            !path.startsWith('/auth') &&
            !path.startsWith('/_next') &&
            !path.includes('.') // trivial check for likely static files (favicon.ico, etc)
        ) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    // Redirect to dashboard if logged in and trying to access login/register
    if (user) {
        if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')) {
            // Simple heuristic: admin -> admin dashboard, others -> portal dashboard. 
            // Since we don't know the role here easily without DB call (which is expensive in middleware), 
            // we can default to portal or just let them proceed (usually page will redirect).
            // For now, I'll avoid auto-redirecting FROM login to avoid loops or wrong assumptions, 
            // unless I strictly separate /admin and /portal login flows.
            // Let's safe-guard: if they are on login and valid user, maybe send to tickets or dashboard?
            // Leaving it alone is safer unless user asked for it.
            const url = request.nextUrl.clone()
            url.pathname = '/portal/dashboard' // Default to portal
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
