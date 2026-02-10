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
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const url = request.nextUrl.clone()

            if (profile?.role === 'admin') {
                url.pathname = '/admin/dashboard'
            } else {
                url.pathname = '/portal/dashboard'
            }

            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
