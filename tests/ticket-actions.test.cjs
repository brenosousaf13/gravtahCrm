const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadSource } = require('./helpers/load-source.cjs')

function fixture({ role = 'cliente', blocked = false, owner = 'customer', authenticated = true, ticketError = null, profileError = null, updateError = null, updateMissing = false, insertError = null } = {}) {
    const writes = []
    const invalidated = []
    const client = {
        auth: { getUser: async () => ({ data: { user: authenticated ? { id: role === 'admin' ? 'admin' : 'customer' } : null }, error: null }) },
        from(table) {
            let operation = 'select'
            let payload
            const result = () => {
                if (operation === 'insert' || operation === 'update') writes.push({ table, operation, payload })
                if (operation === 'insert') return { data: null, error: insertError }
                if (operation === 'update') return { data: updateMissing ? null : { id: 'ticket' }, error: updateError }
                if (table === 'profiles') return { data: profileError ? null : { role }, error: profileError }
                return { data: ticketError ? null : { id: 'ticket', user_id: owner, status: 'novo', is_blocked: blocked }, error: ticketError }
            }
            const query = {
                select() { return query },
                eq() { return query },
                insert(value) { operation = 'insert'; payload = value; return query },
                update(value) { operation = 'update'; payload = value; return query },
                single: async () => result(),
                then: (done, fail) => Promise.resolve(result()).then(done, fail),
            }
            return query
        },
    }
    const actions = loadSource('src/app/actions/ticket-actions.ts', {
        '@/lib/supabase/server': { createClient: async () => client },
        'next/cache': { revalidatePath: path => invalidated.push(path) },
    })
    return { actions, writes, invalidated }
}

test('blocked customer cannot send and no message or ticket is mutated', async () => {
    const { actions, writes } = fixture({ blocked: true })
    await assert.rejects(actions.sendMessage('ticket', 'Hello'), /bloqueado/i)
    assert.deepEqual(writes, [])
})
test('a customer cannot send to somebody else’s ticket', async () => {
    const { actions, writes } = fixture({ owner: 'other-customer' })
    await assert.rejects(actions.sendMessage('ticket', 'Hello'), /permissão|acesso/i)
    assert.deepEqual(writes, [])
})
test('anonymous and unknown-role users cannot send', async () => {
    for (const options of [{ authenticated: false }, { profileError: { message: 'unavailable' } }, { role: 'unknown' }]) {
        const { actions, writes } = fixture(options)
        await assert.rejects(actions.sendMessage('ticket', 'Hello'))
        assert.deepEqual(writes, [])
    }
})
test('missing ticket and blank content do not insert anything', async () => {
    for (const [options, message] of [[{ ticketError: { message: 'not found' } }, 'Hello'], [{}, '   ']]) {
        const { actions, writes } = fixture(options)
        await assert.rejects(actions.sendMessage('ticket', message))
        assert.deepEqual(writes, [])
    }
})
test('unblocked customer can send and mark the ticket unread', async () => {
    const { actions, writes } = fixture()
    assert.deepEqual(await actions.sendMessage('ticket', '  Hello  '), { success: true })
    assert.equal(writes[0].payload.content, 'Hello')
    assert.equal(writes[0].payload.sender_id, 'customer')
    assert.equal(writes[1].payload.has_admin_unread, true)
    assert.equal(writes[1].payload.status, 'novo')
})
test('admin can send on a blocked ticket and retain existing auto-status behavior', async () => {
    const { actions, writes } = fixture({ blocked: true, role: 'admin' })
    assert.deepEqual(await actions.sendMessage('ticket', 'Admin response'), { success: true })
    assert.equal(writes[1].payload.status, 'aguardando_resposta')
    assert.equal(writes[1].payload.has_admin_unread, false)
})
test('database rejects a stale-tab message without a success result', async () => {
    const { actions, writes } = fixture({ insertError: { code: '42501', message: 'Este ticket está bloqueado para novas interações.' } })
    await assert.rejects(actions.sendMessage('ticket', 'Too late'), /bloqueado/i)
    assert.equal(writes.length, 1)
})
test('customer cannot change the block flag through the server action', async () => {
    const { actions, writes } = fixture()
    assert.equal(typeof actions.setTicketBlocked, 'function')
    await assert.rejects(actions.setTicketBlocked('ticket', true), /permissão|administrador/i)
    assert.deepEqual(writes, [])
})
test('admin can block/unblock without replacing the status or solution', async () => {
    for (const blocked of [true, false]) {
        const { actions, writes, invalidated } = fixture({ role: 'admin' })
        assert.equal(typeof actions.setTicketBlocked, 'function')
        assert.deepEqual(await actions.setTicketBlocked('ticket', blocked), { success: true })
        assert.equal(writes[0].payload.is_blocked, blocked)
        assert.equal(Object.hasOwn(writes[0].payload, 'status'), false)
        assert.equal(Object.hasOwn(writes[0].payload, 'solution'), false)
        assert.ok(invalidated.includes('/portal/tickets/ticket'))
        assert.ok(invalidated.includes('/admin/tickets'))
    }
})
test('admin receives an error for an absent ticket or a failed update', async () => {
    for (const options of [{ updateMissing: true }, { updateError: { message: 'unavailable' } }]) {
        const { actions } = fixture({ ...options, role: 'admin' })
        assert.equal(typeof actions.setTicketBlocked, 'function')
        await assert.rejects(actions.setTicketBlocked('ticket', true))
    }
})
