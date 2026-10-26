const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')
const { PGlite } = require('@electric-sql/pglite')

const admin = '11111111-1111-4111-8111-111111111111'
const customer = '22222222-2222-4222-8222-222222222222'
const otherCustomer = '33333333-3333-4333-8333-333333333333'
const ticket = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherTicket = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const path = `${customer}/${ticket}/evidence.png`
const migrationPath = join(__dirname, '../supabase/migrations/202610260001_ticket_blocking.sql')

test('ticket blocking enforces authorization and keeps other tickets usable', async (t) => {
    const db = new PGlite()
    t.after(() => db.close())
    await db.exec(`
        CREATE ROLE authenticated;
        CREATE ROLE anon;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
            $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text NOT NULL, full_name text);
        CREATE TABLE public.tickets (id uuid PRIMARY KEY, user_id uuid, status text DEFAULT 'novo', updated_at timestamptz DEFAULT now());
        CREATE TABLE public.ticket_messages (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ticket_id uuid REFERENCES public.tickets, sender_id uuid, content text);
        CREATE TABLE public.ticket_attachments (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ticket_id uuid REFERENCES public.tickets, file_url text, file_type text);
        CREATE SCHEMA storage;
        CREATE TABLE storage.objects (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, bucket_id text, name text);
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        CREATE POLICY baseline_access ON storage.objects FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
        GRANT USAGE ON SCHEMA public, auth, storage TO authenticated, anon;
        GRANT ALL ON ALL TABLES IN SCHEMA public, storage TO authenticated, anon;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, storage TO authenticated, anon;
        INSERT INTO public.profiles (id, role) VALUES ('${admin}', 'admin'), ('${customer}', 'cliente'), ('${otherCustomer}', 'cliente');
        INSERT INTO public.tickets (id, user_id) VALUES ('${ticket}', '${customer}'), ('${otherTicket}', '${customer}');
        INSERT INTO public.ticket_messages (ticket_id, sender_id, content) VALUES ('${ticket}', '${customer}', 'history');
        INSERT INTO public.ticket_attachments (ticket_id, file_url) VALUES ('${ticket}', '${path}');
        INSERT INTO storage.objects (bucket_id, name) VALUES ('warranty-files', '${path}');
    `)
    // An empty migration gives a real RED against the existing schema.
    if (existsSync(migrationPath)) await db.exec(readFileSync(migrationPath, 'utf8'))

    const as = async (id) => {
        await db.exec('RESET ROLE')
        await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id])
        await db.exec('SET ROLE authenticated')
    }
    const block = async (value) => {
        await as(admin)
        await db.query('UPDATE public.tickets SET is_blocked = $1 WHERE id = $2', [value, ticket])
        await as(customer)
    }
    const denied = async (sql, params = []) => {
        await assert.rejects(db.query(sql, params), (error) => error.code === '42501')
    }

    await t.test('existing tickets default to unblocked', async () => {
        const { rows } = await db.query('SELECT is_blocked FROM public.tickets')
        assert.deepEqual(rows.map(row => row.is_blocked), [false, false])
    })
    // Stop dependent checks cleanly when the initial feature is absent.
    const { rows: columns } = await db.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'is_blocked'")
    if (!columns.length) return

    await t.test('customer cannot set the block flag or create a blocked ticket', async () => {
        await as(customer)
        await denied('UPDATE public.tickets SET is_blocked = true WHERE id = $1', [ticket])
        await denied("INSERT INTO public.tickets (id, user_id, is_blocked) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', $1, true)", [customer])
    })
    await t.test('customer cannot promote their profile to bypass the block', async () => {
        await as(customer)
        await denied("UPDATE public.profiles SET role = 'admin' WHERE id = $1", [customer])
        await denied("INSERT INTO public.profiles (id, role) VALUES ('44444444-4444-4444-8444-444444444444', 'admin')")
        await db.query("UPDATE public.profiles SET full_name = 'Updated customer' WHERE id = $1", [customer])
    })
    await t.test('admin can block without changing workflow status', async () => {
        await block(true)
        const { rows } = await db.query('SELECT status, is_blocked FROM public.tickets WHERE id = $1', [ticket])
        assert.deepEqual(rows, [{ status: 'novo', is_blocked: true }])
    })
    await t.test('customer cannot unblock their ticket directly', async () => {
        await as(customer)
        await denied('UPDATE public.tickets SET is_blocked = false WHERE id = $1', [ticket])
    })
    await t.test('direct message insert, update and delete are rejected', async () => {
        await as(customer)
        await denied('INSERT INTO public.ticket_messages (ticket_id, sender_id, content) VALUES ($1, $2, $3)', [ticket, customer, 'bypass'])
        await denied("UPDATE public.ticket_messages SET content = 'changed' WHERE id = 1")
        await denied('DELETE FROM public.ticket_messages WHERE id = 1')
    })
    await t.test('direct attachment insert, update and delete are rejected', async () => {
        await denied('INSERT INTO public.ticket_attachments (ticket_id, file_url) VALUES ($1, $2)', [ticket, path])
        await denied("UPDATE public.ticket_attachments SET file_url = 'changed' WHERE id = 1")
        await denied('DELETE FROM public.ticket_attachments WHERE id = 1')
    })
    await t.test('storage rejects upload and silently filters forbidden delete/update', async () => {
        await denied('INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)', ['warranty-files', `${customer}/${ticket}/new.png`])
        assert.equal((await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING id', [path])).rows.length, 0)
        assert.equal((await db.query("UPDATE storage.objects SET name = 'changed' WHERE name = $1 RETURNING id", [path])).rows.length, 0)
    })
    await t.test('storage cannot bypass the block with a foreign or malformed path', async () => {
        await denied('INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)', ['warranty-files', `${otherCustomer}/${ticket}/new.png`])
        await denied('INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)', ['warranty-files', 'flat.png'])
    })
    await t.test('history, attachment metadata and files remain readable', async () => {
        assert.equal((await db.query('SELECT content FROM public.ticket_messages WHERE id = 1')).rows[0].content, 'history')
        assert.equal((await db.query('SELECT file_url FROM public.ticket_attachments WHERE id = 1')).rows[0].file_url, path)
        assert.equal((await db.query('SELECT name FROM storage.objects WHERE name = $1', [path])).rows.length, 1)
    })
    await t.test('signing out cannot bypass Storage protections with a permissive legacy policy', async () => {
        await db.exec('RESET ROLE')
        await db.query("SELECT set_config('request.jwt.claim.sub', '', false)")
        await db.exec('SET ROLE anon')
        await denied('INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)', ['warranty-files', `${customer}/${ticket}/anonymous.png`])
        assert.equal((await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING id', [path])).rows.length, 0)
        assert.equal((await db.query("UPDATE storage.objects SET name = 'changed' WHERE name = $1 RETURNING id", [path])).rows.length, 0)
        assert.equal((await db.query('SELECT name FROM storage.objects WHERE name = $1', [path])).rows.length, 1)
        await as(customer)
    })
    await t.test('another ticket and new tickets remain available', async () => {
        await db.query('INSERT INTO public.ticket_messages (ticket_id, sender_id, content) VALUES ($1, $2, $3)', [otherTicket, customer, 'allowed'])
        await db.query('INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)', ['warranty-files', `${customer}/${otherTicket}/allowed.png`])
        await db.query("INSERT INTO public.tickets (id, user_id) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', $1)", [customer])
        await denied('UPDATE public.ticket_messages SET ticket_id = $1 WHERE content = $2', [ticket, 'allowed'])
    })
    await t.test('administrator can still send messages and manage files', async () => {
        await as(admin)
        await db.query('INSERT INTO public.ticket_messages (ticket_id, sender_id, content) VALUES ($1, $2, $3)', [ticket, admin, 'admin reply'])
        await db.query('INSERT INTO public.ticket_attachments (ticket_id, file_url) VALUES ($1, $2)', [ticket, `admin-uploads/${ticket}/admin.png`])
        await db.query('INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)', ['warranty-files', `admin-uploads/${ticket}/admin.png`])
    })
    await t.test('unblocking restores messages and attachments', async () => {
        await block(false)
        await db.query('INSERT INTO public.ticket_messages (ticket_id, sender_id, content) VALUES ($1, $2, $3)', [ticket, customer, 'restored'])
        await db.query('INSERT INTO public.ticket_attachments (ticket_id, file_url) VALUES ($1, $2)', [ticket, `${customer}/${ticket}/restored.png`])
        assert.equal((await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING id', [path])).rows.length, 1)
    })
    await t.test('migration can be applied again', async () => {
        await db.exec('RESET ROLE')
        await db.exec(readFileSync(migrationPath, 'utf8'))
    })
})
