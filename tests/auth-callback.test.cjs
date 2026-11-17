const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadSource } = require('./helpers/load-source.cjs')

function callback(error) {
    const exchanges = []
    return { exchanges, GET: loadSource('src/app/auth/callback/route.ts', {
        'next/headers': { cookies: async () => ({ getAll: () => [], set() {} }) },
        'next/server': { NextResponse: { redirect: url => ({ redirect: String(url) }) } },
        '@supabase/ssr': { createServerClient: () => ({ auth: { exchangeCodeForSession: async code => { exchanges.push(code); return { error: error || null } } } }) },
    }).GET }
}
test('confirmation failure sends the user to the resend screen instead of silently entering the portal', async () => {
    const { GET } = callback({ code: 'flow_state_expired' })
    const result = await GET(new Request('https://crm.gravtah.com.br/auth/callback?code=expired&next=/portal/dashboard'))
    assert.equal(result.redirect, 'https://crm.gravtah.com.br/auth/confirm-email?error=invalid_link')
})
test('confirmation and password recovery preserve their destinations on success', async () => {
    for (const destination of ['/portal/dashboard', '/reset-password']) {
        const { GET, exchanges } = callback()
        const result = await GET(new Request(`https://crm.gravtah.com.br/auth/callback?code=valid&next=${destination}`))
        assert.equal(result.redirect, `https://crm.gravtah.com.br${destination}`)
        assert.deepEqual(exchanges, ['valid'])
    }
})
test('missing codes and provider errors are surfaced without exposing the provider description', async () => {
    const { GET, exchanges } = callback()
    for (const query of ['', '?error=access_denied&error_description=internal-detail']) {
        assert.equal((await GET(new Request(`https://crm.gravtah.com.br/auth/callback${query}`))).redirect, 'https://crm.gravtah.com.br/auth/confirm-email?error=invalid_link')
    }
    assert.deepEqual(exchanges, [])
})
test('callback accepts only approved destinations', async () => {
    const { GET } = callback()
    for (const next of ['//evil.example', '/unknown', '/reset-password?redirect=evil']) {
        assert.equal((await GET(new Request(`https://crm.gravtah.com.br/auth/callback?code=valid&next=${encodeURIComponent(next)}`))).redirect, 'https://crm.gravtah.com.br/portal/dashboard')
    }
})
