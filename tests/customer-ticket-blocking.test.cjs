const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')
const { PGlite } = require('@electric-sql/pglite')
const { loadSource } = require('./helpers/load-source.cjs')

const admin = '11111111-1111-4111-8111-111111111111'
const customer = '22222222-2222-4222-8222-222222222222'
const other = '33333333-3333-4333-8333-333333333333'
const existingTicket = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const migration = join(__dirname, '../supabase/migrations/202610260002_client_ticket_blocking.sql')

test('manual customer blocking prevents new tickets independently of ticket status', async (t) => {
    const db = new PGlite()
    t.after(() => db.close())
    await db.exec(`
        CREATE ROLE authenticated; CREATE ROLE anon;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
          $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text NOT NULL, full_name text);
        CREATE TABLE public.tickets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status text DEFAULT 'novo', updated_at timestamptz DEFAULT now());
        CREATE TABLE public.ticket_messages (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ticket_id uuid REFERENCES public.tickets, sender_id uuid, content text);
        CREATE TABLE public.ticket_attachments (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ticket_id uuid REFERENCES public.tickets, file_url text, file_type text);
        CREATE SCHEMA storage;
        CREATE TABLE storage.objects (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, bucket_id text, name text);
        GRANT USAGE ON SCHEMA public, auth, storage TO authenticated, anon;
        GRANT ALL ON ALL TABLES IN SCHEMA public, storage TO authenticated, anon;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, storage TO authenticated, anon;
        INSERT INTO profiles (id,role) VALUES ('${admin}','admin'), ('${customer}','cliente'), ('${other}','cliente');
        INSERT INTO tickets (id,user_id) VALUES ('${existingTicket}','${customer}');
    `)
    await db.exec(readFileSync(join(__dirname, '../supabase/migrations/202610260001_ticket_blocking.sql'), 'utf8'))
    if (existsSync(migration)) await db.exec(readFileSync(migration, 'utf8'))
    const as = async (id, role = 'authenticated') => {
        await db.exec('RESET ROLE')
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id])
        await db.exec(`SET ROLE ${role}`)
    }
    const setBlocked = async (blocked) => {
        await as(admin)
        await db.query('UPDATE profiles SET is_ticket_creation_blocked=$1 WHERE id=$2', [blocked, customer])
        await as(customer)
    }
    const denied = (sql, params = []) => assert.rejects(db.query(sql, params), error => error.code === '42501')

    await t.test('existing profiles default to allowing new tickets', async () => {
        const { rows } = await db.query('SELECT is_ticket_creation_blocked FROM profiles')
        assert.deepEqual(rows.map(row => row.is_ticket_creation_blocked), [false, false, false])
    })
    if (!(await db.query("SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_ticket_creation_blocked'")).rows.length) return

    await t.test('unblocked customer can create a ticket', async () => {
        await as(customer)
        assert.equal((await db.query('INSERT INTO tickets (user_id) VALUES ($1) RETURNING id', [customer])).rows.length, 1)
    })
    await t.test('admin can block and direct customer insertion is rejected', async () => {
        await setBlocked(true)
        await denied('INSERT INTO tickets (user_id) VALUES ($1)', [customer])
    })
    await t.test('customer cannot change block flag, delete profile or change profile identity', async () => {
        await denied('UPDATE profiles SET is_ticket_creation_blocked=false WHERE id=$1', [customer])
        await denied('DELETE FROM profiles WHERE id=$1', [customer])
        await denied("UPDATE profiles SET id='44444444-4444-4444-8444-444444444444' WHERE id=$1", [customer])
        await db.query("UPDATE profiles SET full_name='Updated' WHERE id=$1", [customer])
    })
    await t.test('customer cannot create another profile with a block flag', async () => {
        await denied("INSERT INTO profiles (id,role,is_ticket_creation_blocked) VALUES ('55555555-5555-4555-8555-555555555555','cliente',true)")
    })
    await t.test('customer cannot bypass using another owner and anonymous requests fail', async () => {
        await denied('INSERT INTO tickets (user_id) VALUES ($1)', [other])
        await as('', 'anon')
        await denied('INSERT INTO tickets (user_id) VALUES ($1)', [customer])
        await as(customer)
    })
    await t.test('existing ticket messages and attachments still work', async () => {
        await db.query('INSERT INTO ticket_messages (ticket_id,sender_id,content) VALUES ($1,$2,$3)', [existingTicket, customer, 'Still discussing the current ticket'])
        await db.query('INSERT INTO ticket_attachments (ticket_id,file_url) VALUES ($1,$2)', [existingTicket, `${customer}/${existingTicket}/evidence.png`])
    })
    await t.test('finalizing a ticket never automatically unblocks its customer', async () => {
        await as(admin)
        await db.query("UPDATE tickets SET status='finalizado' WHERE id=$1", [existingTicket])
        await as(customer)
        await denied('INSERT INTO tickets (user_id) VALUES ($1)', [customer])
    })
    await t.test('other customers and administrators remain able to create', async () => {
        await as(other)
        await db.query('INSERT INTO tickets (user_id) VALUES ($1)', [other])
        await as(admin)
        await db.query('INSERT INTO tickets (user_id) VALUES ($1)', [customer])
    })
    await t.test('manual unblock restores new ticket creation', async () => {
        await setBlocked(false)
        await db.query('INSERT INTO tickets (user_id) VALUES ($1)', [customer])
    })
    await t.test('a customer with no tickets can also be blocked', async () => {
        await as(admin)
        await db.query("INSERT INTO profiles (id,role,is_ticket_creation_blocked) VALUES ('66666666-6666-4666-8666-666666666666','cliente',true)")
        await as('66666666-6666-4666-8666-666666666666')
        await denied("INSERT INTO tickets (user_id) VALUES ('66666666-6666-4666-8666-666666666666')")
    })
    await t.test('migration is repeatable', async () => {
        await db.exec('RESET ROLE')
        await db.exec(readFileSync(migration, 'utf8'))
    })
})

function actionFixture({ role = 'admin', loggedIn = true, missing = false, failed = false } = {}) {
    const updates = []
    const paths = []
    const client = {
        auth: { getUser: async () => ({ data: { user: loggedIn ? { id: 'actor' } : null } }) },
        from() {
            let update
            const query = {
                select() { return query }, eq() { return query },
                update(value) { update = value; return query },
                single: async () => {
                    if (update) { updates.push(update); return { data: missing ? null : { id: 'customer' }, error: failed ? { message: 'failed' } : null } }
                    return { data: { role }, error: null }
                },
            }
            return query
        },
    }
    return { actions: loadSource('src/app/actions/ticket-actions.ts', {
        '@/lib/supabase/server': { createClient: async () => client },
        'next/cache': { revalidatePath: path => paths.push(path) },
    }), updates, paths }
}
test('only admin may toggle customer creation block', async () => {
    for (const options of [{ role: 'cliente' }, { loggedIn: false }]) {
        const { actions, updates } = actionFixture(options)
        assert.equal(typeof actions.setCustomerTicketCreationBlocked, 'function')
        await assert.rejects(actions.setCustomerTicketCreationBlocked('customer', true))
        assert.deepEqual(updates, [])
    }
})
test('admin toggles only the creation flag and revalidates client/admin views', async () => {
    for (const blocked of [true, false]) {
        const { actions, updates, paths } = actionFixture()
        assert.equal(typeof actions.setCustomerTicketCreationBlocked, 'function')
        assert.deepEqual(await actions.setCustomerTicketCreationBlocked('customer', blocked), { success: true })
        assert.deepEqual(updates, [{ is_ticket_creation_blocked: blocked }])
        assert.ok(paths.includes('/admin/customers'))
        assert.ok(paths.includes('/portal/tickets/new'))
    }
})
test('invalid input, missing customers and failed writes never return success', async () => {
    for (const options of [{ missing: true }, { failed: true }]) {
        const { actions } = actionFixture(options)
        assert.equal(typeof actions.setCustomerTicketCreationBlocked, 'function')
        await assert.rejects(actions.setCustomerTicketCreationBlocked('customer', true))
    }
    const { actions, updates } = actionFixture()
    assert.equal(typeof actions.setCustomerTicketCreationBlocked, 'function')
    await assert.rejects(actions.setCustomerTicketCreationBlocked('', true))
    await assert.rejects(actions.setCustomerTicketCreationBlocked('customer', 'false'))
    assert.deepEqual(updates, [])
})
