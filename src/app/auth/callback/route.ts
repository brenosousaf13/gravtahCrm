import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const requestedNext = requestUrl.searchParams.get('next')
    const next = requestedNext && ['/portal/dashboard', '/reset-password', '/admin/dashboard'].includes(requestedNext)
        ? requestedNext : '/portal/dashboard'
    const invalidLink = () => NextResponse.redirect(new URL('/auth/confirm-email?error=invalid_link', requestUrl.origin))

    if (!code || requestUrl.searchParams.has('error')) return invalidLink()

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set({ name, value, ...options })
                            )
                        } catch {
                            // Ignore in route handler
                        }
                    },
                },
            }
        )

        // Exchange the code for a session
        try {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) return invalidLink()
        } catch {
            return invalidLink()
        }
    }

    // Redirect to the intended page (e.g., /reset-password)
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
}
