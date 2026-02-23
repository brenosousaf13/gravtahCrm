import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/portal/dashboard'

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
                        } catch (error) {
                            // Ignore in route handler
                        }
                    },
                },
            }
        )

        // Exchange the code for a session
        await supabase.auth.exchangeCodeForSession(code)
    }

    // Redirect to the intended page (e.g., /reset-password)
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
}
