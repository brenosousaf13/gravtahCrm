const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadSource } = require('./helpers/load-source.cjs')

test('email cooldown prevents immediate retries, survives reloads, expires, and stores no user data', t => {
    let now = 1000000
    t.mock.method(Date, 'now', () => now)
    const saved = new Map()
    const previous = global.window
    global.window = Object.assign(new EventTarget(), {
        localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) },
    })
    t.after(() => { global.window = previous })
    const cooldown = loadSource('src/lib/auth/email-cooldown.ts')
    assert.equal(cooldown.getEmailCooldownSeconds(), 0)
    cooldown.startEmailCooldown()
    assert.equal(cooldown.getEmailCooldownSeconds(), 60)
    now += 1100
    assert.equal(cooldown.getEmailCooldownSeconds(), 59)
    const reloaded = loadSource('src/lib/auth/email-cooldown.ts')
    assert.equal(reloaded.getEmailCooldownSeconds(), 59)
    assert.deepEqual([...saved.entries()], [['gravtah:auth-email-next-at', '1060000']])
    now += 60000
    assert.equal(reloaded.getEmailCooldownSeconds(), 0)
})
test('cooldown remains effective when local storage is denied', t => {
    const previous = global.window
    global.window = Object.assign(new EventTarget(), { localStorage: {
        getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('SecurityError') },
    } })
    t.after(() => { global.window = previous })
    const cooldown = loadSource('src/lib/auth/email-cooldown.ts')
    cooldown.startEmailCooldown()
    assert.equal(cooldown.getEmailCooldownSeconds(), 60)
})
