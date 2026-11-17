const { test } = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { loadSource } = require('./helpers/load-source.cjs')

const stubs = {
    '@/lib/supabase/client': { createClient: () => ({ auth: {} }) },
    'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
}
test('registration requires an email confirmation field and exposes recovery without a successful signup', () => {
    const Register = loadSource('src/app/register/page.tsx', stubs).default
    const html = renderToStaticMarkup(React.createElement(Register))
    assert.match(html, /name="confirmEmail"/)
    assert.ok(html.includes('href="/auth/confirm-email"'))
    assert.ok(html.includes('Confirme') || html.includes('Confirmar e-mail'))
})
test('a pending signup displays the destination, correction and resend controls', () => {
    const { EmailConfirmation } = loadSource('src/components/auth/email-confirmation.tsx', stubs)
    const html = renderToStaticMarkup(React.createElement(EmailConfirmation, { email: 'cliente@example.com', onCorrectEmail() {} }))
    assert.match(html, /cliente@example.com/)
    assert.match(html, /Reenviar confirmação/)
    assert.match(html, /Corrigir e-mail/)
    assert.doesNotMatch(html, /type="password"/)
})
test('expired confirmation links show recovery guidance instead of a silent login loop', async () => {
    const Page = loadSource('src/app/auth/confirm-email/page.tsx', stubs).default
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ error: 'invalid_link' }) }))
    assert.match(html, /role="alert"/)
    assert.match(html, /expirado/)
    assert.match(html, /Reenviar confirmação/)
    assert.match(html, /type="email"/)
})
