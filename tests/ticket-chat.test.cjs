const { test } = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { loadSource } = require('./helpers/load-source.cjs')

const { TicketChat } = loadSource('src/components/ticket/ticket-chat.tsx', {
    '@/app/actions/ticket-actions': { sendMessage: async () => ({ success: true }) },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
})
const props = {
    ticketId: 'ticket', currentUserId: 'customer', currentUserRole: 'cliente',
    initialMessages: [{ id: 'message', content: 'Previous conversation', created_at: '2026-10-26T12:00:00Z', sender_id: 'customer', profiles: { full_name: 'Customer', role: 'cliente' } }],
}

test('blocked customer sees the history and a notice, without a message composer', () => {
    const html = renderToStaticMarkup(React.createElement(TicketChat, { ...props, isBlocked: true }))
    assert.match(html, /Previous conversation/)
    assert.match(html, /ticket.*bloqueado/i)
    assert.doesNotMatch(html, /<textarea/)
})
test('unblocked customer sees the message composer', () => {
    const html = renderToStaticMarkup(React.createElement(TicketChat, { ...props, isBlocked: false }))
    assert.match(html, /<textarea/)
})
test('admin can use the composer even on a blocked ticket', () => {
    const html = renderToStaticMarkup(React.createElement(TicketChat, { ...props, currentUserRole: 'admin', isBlocked: true }))
    assert.match(html, /<textarea/)
})

const { TicketDetailView } = loadSource('src/components/ticket/ticket-detail-view.tsx', {
    '@/app/actions/ticket-actions': { sendMessage: async () => ({ success: true }) },
    'next/navigation': { useRouter: () => ({ refresh() {}, back() {} }) },
})
const ticket = {
    id: 'ticket', ticket_number: 42, status: 'em_analise', created_at: '2026-10-26T12:00:00Z',
    product_name: 'Helmet', brand: 'MET', model: 'Rivale', batch_number: null,
    manufacturing_date: null, issue_description: 'Customer report', solution: null,
    ticket_attachments: [{ id: 'attachment', file_url: 'customer/ticket/invoice.pdf', file_type: 'application/pdf' }],
}
test('blocked ticket keeps file links and removes upload and removal controls', () => {
    const html = renderToStaticMarkup(React.createElement(TicketDetailView, { ticket: { ...ticket, is_blocked: true }, messages: props.initialMessages, currentUserId: 'customer' }))
    assert.match(html, /invoice.pdf/)
    assert.match(html, /Previous conversation/)
    assert.doesNotMatch(html, /type="file"/)
    assert.doesNotMatch(html, /title="Remover anexo"/)
})
test('unblocked ticket restores attachment upload and removal controls', () => {
    const html = renderToStaticMarkup(React.createElement(TicketDetailView, { ticket: { ...ticket, is_blocked: false }, messages: props.initialMessages, currentUserId: 'customer' }))
    assert.match(html, /type="file"/)
    assert.match(html, /title="Remover anexo"/)
})
