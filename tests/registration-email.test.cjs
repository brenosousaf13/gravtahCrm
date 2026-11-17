const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadSource } = require('./helpers/load-source.cjs')

const { registrationSchema, registerCustomer, resendSignupConfirmation } = loadSource('src/lib/auth/registration.ts')
const { getAuthErrorMessage } = loadSource('src/lib/auth/errors.ts')
const values = { full_name: 'Cliente Teste', document: '000.000.000-00', phone: '(11) 99999-9999', email: 'Cliente@Example.com ', confirmEmail: 'cliente@example.com', password: 'senha-teste-123', confirmPassword: 'senha-teste-123' }

test('registration normalizes both email fields and rejects a typo before calling Auth', async () => {
    assert.equal(registrationSchema.parse(values).email, 'cliente@example.com')
    const requests = []
    await assert.rejects(registerCustomer({ signUp: async input => { requests.push(input) } }, { ...values, confirmEmail: 'outro@example.com' }, 'https://crm.gravtah.com.br'))
    assert.deepEqual(requests, [])
})
test('registration sends the email once, targets the callback, and never writes profiles without a session', async () => {
    const requests = []
    const auth = { signUp: async input => { requests.push(input); return { data: { user: { id: 'new-user' }, session: null }, error: null } } }
    const result = await registerCustomer(auth, values, 'https://crm.gravtah.com.br')
    assert.deepEqual(result, { email: 'cliente@example.com', requiresConfirmation: true })
    assert.equal(requests.length, 1)
    assert.equal(requests[0].email, 'cliente@example.com')
    assert.equal(requests[0].options.emailRedirectTo, 'https://crm.gravtah.com.br/auth/callback?next=/portal/dashboard')
    assert.deepEqual(requests[0].options.data, { full_name: 'Cliente Teste', document: '000.000.000-00', phone: '(11) 99999-9999' })
    assert.equal(Object.hasOwn(requests[0].options.data, 'role'), false)
    assert.equal(Object.hasOwn(requests[0], 'confirmEmail'), false)
})
test('a signup with a session can enter the portal', async () => {
    const result = await registerCustomer({ signUp: async () => ({ data: { user: { id: 'user' }, session: { access_token: 'test' } }, error: null }) }, values, 'https://crm.gravtah.com.br')
    assert.equal(result.requiresConfirmation, false)
})
test('signup rate limit is a failure and never reports account creation or retries automatically', async () => {
    let attempts = 0
    const error = { code: 'over_email_send_rate_limit', status: 429, message: 'email rate limit exceeded' }
    await assert.rejects(registerCustomer({ signUp: async () => { attempts++; return { data: { user: null, session: null }, error } } }, values, 'https://crm.gravtah.com.br'), candidate => candidate === error)
    assert.equal(attempts, 1)
    const message = getAuthErrorMessage(error)
    assert.match(message, /limite.*e-mail/i)
    assert.doesNotMatch(message, /senha incorreta|conta criada|email rate limit exceeded/i)
})
test('resend uses the signup confirmation endpoint with the corrected normalized address', async () => {
    const requests = []
    await resendSignupConfirmation({ resend: async input => { requests.push(input); return { error: null } } }, ' Cliente@Example.com ', 'https://crm.gravtah.com.br')
    assert.deepEqual(requests, [{ type: 'signup', email: 'cliente@example.com', options: { emailRedirectTo: 'https://crm.gravtah.com.br/auth/callback?next=/portal/dashboard' } }])
})
test('resend rejects invalid email before making a request and preserves provider failure', async () => {
    const requests = []
    const auth = { resend: async input => { requests.push(input); return { error: { code: 'over_email_send_rate_limit' } } } }
    await assert.rejects(resendSignupConfirmation(auth, 'invalid', 'https://crm.gravtah.com.br'))
    assert.deepEqual(requests, [])
    await assert.rejects(resendSignupConfirmation(auth, 'valid@example.com', 'https://crm.gravtah.com.br'), error => error.code === 'over_email_send_rate_limit')
})
test('known auth failures have actionable Portuguese messages without exposing raw errors', () => {
    for (const [code, expected] of [
        ['email_not_confirmed', /confirmar.*e-mail/i],
        ['email_address_not_authorized', /envio.*e-mail.*indisponível/i],
        ['user_already_exists', /login|senha/i],
        ['invalid_credentials', /e-mail ou senha/i],
        ['unexpected_failure', /tente novamente/i],
    ]) {
        assert.match(getAuthErrorMessage({ code, message: 'internal private detail' }), expected)
        assert.doesNotMatch(getAuthErrorMessage({ code, message: 'internal private detail' }), /internal private detail/)
    }
    assert.match(getAuthErrorMessage(new Error('email rate limit exceeded')), /limite.*e-mail/i)
})
