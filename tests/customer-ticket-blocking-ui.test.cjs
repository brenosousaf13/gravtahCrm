const { test } = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { loadSource } = require('./helpers/load-source.cjs')

function stubs(blocked, { profileError = false, role = 'cliente' } = {}) {
    const client = {
        auth: { getUser: async () => ({ data: { user: { id: 'customer' } } }) },
        from() {
            const query = {
                select() { return query }, eq() { return query }, neq() { return query },
                order: async () => ({ data: [], error: null }),
                single: async () => ({ data: profileError ? null : { role, is_ticket_creation_blocked: blocked }, error: profileError ? { message: 'unavailable' } : null }),
            }
            return query
        },
    }
    return {
        '@/lib/supabase/server': { createClient: async () => client },
        '@/lib/supabase/client': { createClient: () => client },
        'next/navigation': { useRouter: () => ({ refresh() {}, push() {}, back() {} }), redirect: () => { throw new Error('redirect') } },
    }
}

async function renderPage(path, mocks) {
    const Page = loadSource(path, mocks).default
    const node = Page.constructor.name === 'AsyncFunction' ? await Page() : React.createElement(Page)
    return renderToStaticMarkup(node)
}

test('blocked customer cannot load the new-ticket form from a direct URL', async () => {
    const html = await renderPage('src/app/portal/tickets/new/page.tsx', stubs(true))
    assert.match(html, /abertura.*bloqueada/i)
    assert.doesNotMatch(html, /<form/)
    assert.ok(html.includes('/portal/dashboard'))
})
test('unblocked customer and administrator can load the form', async () => {
    for (const options of [{ blocked: false }, { blocked: true, role: 'admin' }]) {
        const html = await renderPage('src/app/portal/tickets/new/page.tsx', stubs(options.blocked, options))
        assert.match(html, /<form/)
    }
})
test('profile lookup failure keeps the form closed with a recovery message', async () => {
    const html = await renderPage('src/app/portal/tickets/new/page.tsx', stubs(false, { profileError: true }))
    assert.doesNotMatch(html, /<form/)
    assert.match(html, /verificar|atualize/i)
})
test('dashboard removes new-ticket shortcuts for a blocked customer', async () => {
    const html = await renderPage('src/app/portal/dashboard/page.tsx', stubs(true))
    assert.doesNotMatch(html, /href="\/portal\/tickets\/new"/)
    assert.match(html, /bloqueada/i)
})
test('dashboard keeps new-ticket shortcuts for an unblocked customer', async () => {
    const html = await renderPage('src/app/portal/dashboard/page.tsx', stubs(false))
    assert.match(html, /href="\/portal\/tickets\/new"/)
})

test('customer list exposes block or unblock by customer, independent of ticket controls', () => {
    const { CustomersDataTable } = loadSource('src/components/admin/customers-data-table.tsx', {
        ...stubs(false),
        '@/app/actions/ticket-actions': { setCustomerTicketCreationBlocked: async () => ({ success: true }) },
    })
    const profiles = [false, true].map((blocked, index) => ({
        id: `customer-${index}`, full_name: `Customer ${index}`, email: 'customer@example.com',
        phone: null, document: null, avatar_url: null, created_at: '2026-10-26T12:00:00Z',
        role: 'cliente', is_ticket_creation_blocked: blocked,
    }))
    const html = renderToStaticMarkup(React.createElement(CustomersDataTable, { profiles, ticketCounts: {} }))
    assert.match(html, /Bloquear cliente/)
    assert.match(html, /Desbloquear cliente/)
    assert.match(html, /Novos tickets bloqueados/)
})

test('portal navigation does not expose a new-ticket link while permission is unknown or blocked', () => {
    const { default: PortalLayout } = loadSource('src/app/portal/layout.tsx', {
        ...stubs(true),
        'next/navigation': { usePathname: () => '/portal/dashboard' },
    })
    const html = renderToStaticMarkup(React.createElement(PortalLayout, { children: React.createElement('div') }))
    assert.doesNotMatch(html, /Novo Ticket/)
})
