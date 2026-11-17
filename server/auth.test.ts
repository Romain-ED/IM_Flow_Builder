import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { sanitizeReturnTo } from './auth.js'
import { createContactNames } from './contactNames.js'
import { createMemoryShareStore } from './shareStore.js'

const SECRET = 'test-session-secret-0123456789'
const baseEnv = {
  AUTH_ENABLED: 'true',
  OIDC_ISSUER_URL: 'https://idp.example.test',
  OIDC_CLIENT_ID: 'client-id',
  OIDC_CLIENT_SECRET: 'client-secret',
  OIDC_WEB_REDIRECT_URI: 'https://app.example.test/api/auth/callback/okta',
  SESSION_SECRET: SECRET,
}
const servers: Array<{ close(callback: () => void): void }> = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(resolve))))
})

const provider = {
  authorizationUrl: async ({ state, nonce }: { state: string; nonce: string }) => new URL(`https://idp.example.test/authorize?state=${state}&nonce=${nonce}`),
  exchange: async () => ({ claims: { sub: 'user-1', email: 'a@vonage.com', name: 'A', groups: ['im-team'] }, idToken: 'raw.id.token' }),
  endSessionEndpoint: async () => 'https://idp.example.test/logout',
}

async function start(env: Record<string, string> = baseEnv, oidcProvider = provider) {
  const app = createApp({ env, oidcProvider, contactNames: createContactNames(createMemoryShareStore()) })
  await new Promise<void>((resolve) => app.listen(0, '127.0.0.1', resolve))
  servers.push(app)
  const address = app.address() as { port: number }
  return `http://127.0.0.1:${address.port}`
}

function cookieValue(response: Response, name: string): string {
  const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${name}=`)) ?? ''
  return header.split(';')[0]?.slice(name.length + 1) ?? ''
}

function forgeSession(payload: Record<string, unknown>, secret = SECRET): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `oidc_session=${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`
}

const html = { Accept: 'text/html' }
const now = () => Math.floor(Date.now() / 1000)

describe('SSO gate', () => {
  it('is disabled unless AUTH_ENABLED=true', async () => {
    const base = await start({})
    const response = await fetch(`${base}/api/share/missing`, { redirect: 'manual' })
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(302)
  })

  it('redirects unauthenticated browser navigation to sign-in with returnTo', async () => {
    const base = await start()
    const response = await fetch(`${base}/flows?x=1`, { headers: html, redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/auth/signin?returnTo=%2Fflows%3Fx%3D1')
  })

  it('serves service worker scripts without a session so stale workers can update', async () => {
    const base = await start()
    for (const path of ['/sw.js', '/registerSW.js', '/workbox-9c191d2f.js', '/manifest.webmanifest']) {
      const response = await fetch(`${base}${path}`, { redirect: 'manual' })
      expect(response.status, path).not.toBe(401)
      expect(response.status, path).not.toBe(302)
    }
  })
  it('returns 401 JSON for unauthenticated API calls', async () => {
    const base = await start()
    const response = await fetch(`${base}/api/live/sessions`, { headers: html, redirect: 'manual' })
    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe('SSO_REQUIRED')
  })

  it('gates /api/share unless AUTH_PUBLIC_SHARE=true', async () => {
    expect((await fetch(`${await start()}/api/share/abc`, { redirect: 'manual' })).status).toBe(401)
    const open = await fetch(`${await start({ ...baseEnv, AUTH_PUBLIC_SHARE: 'true' })}/api/share/abc`, { redirect: 'manual' })
    expect(open.status).not.toBe(401)
  })

  it('leaves health and Vonage webhooks to their own checks', async () => {
    const base = await start()
    const health = await fetch(`${base}/_/health`, { redirect: 'manual' })
    expect(health.status).toBe(200)
    const webhook = await fetch(`${base}/webhooks/vonage/inbound`, { method: 'POST', body: '{}', redirect: 'manual' })
    expect(webhook.status).not.toBe(302)
    expect(webhook.headers.get('content-type')).toContain('application/json')
    expect((await webhook.json()).error?.code).not.toBe('SSO_REQUIRED')
  })

  it('accepts a valid signed session and rejects tampered, wrongly signed and expired ones', async () => {
    const base = await start()
    const session = { sub: 'user-1', exp: now() + 600 }
    const ok = await fetch(`${base}/_/health`, { headers: { Cookie: forgeSession(session) } })
    expect(ok.status).toBe(200)
    const gated = (cookie: string) => fetch(`${base}/api/live/diagnostics`, { headers: { Cookie: cookie }, redirect: 'manual' })
    expect((await gated(forgeSession(session))).status).not.toBe(401)
    const valid = forgeSession(session)
    const tampered = valid.replace(/^oidc_session=./, (match) => `${match.slice(0, -1)}${match.endsWith('A') ? 'B' : 'A'}`)
    expect((await gated(tampered)).status).toBe(401)
    expect((await gated(forgeSession(session, 'another-secret-another-secret'))).status).toBe(401)
    expect((await gated(forgeSession({ sub: 'user-1', exp: now() - 5 }))).status).toBe(401)
  })

  it('fails closed with 503 when enabled but misconfigured, keeping health open', async () => {
    const base = await start({ AUTH_ENABLED: 'true' })
    expect((await fetch(`${base}/`, { headers: html, redirect: 'manual' })).status).toBe(503)
    expect((await fetch(`${base}/_/health`)).status).toBe(200)
  })

  it('completes sign-in, sets a session cookie, and honours returnTo', async () => {
    const base = await start()
    const signin = await fetch(`${base}/auth/signin?returnTo=/flows`, { redirect: 'manual' })
    expect(signin.status).toBe(302)
    const location = new URL(signin.headers.get('location') as string)
    const loginCookie = cookieValue(signin, 'oidc_login')
    expect(signin.headers.getSetCookie()[0]).toMatch(/HttpOnly; SameSite=Lax; Secure/)
    const callback = await fetch(`${base}/api/auth/callback/okta?code=abc&state=${location.searchParams.get('state')}`, { headers: { Cookie: `oidc_login=${loginCookie}` }, redirect: 'manual' })
    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('/flows')
    const session = cookieValue(callback, 'oidc_session')
    expect((await fetch(`${base}/api/live/diagnostics`, { headers: { Cookie: `oidc_session=${session}` } })).status).not.toBe(401)
  })

  it('rejects a callback whose state does not match the login cookie', async () => {
    const base = await start()
    const signin = await fetch(`${base}/auth/signin`, { redirect: 'manual' })
    const callback = await fetch(`${base}/api/auth/callback/okta?code=abc&state=wrong`, { headers: { Cookie: `oidc_login=${cookieValue(signin, 'oidc_login')}` }, redirect: 'manual' })
    expect(callback.status).toBe(400)
    expect(callback.headers.getSetCookie().some((cookie) => cookie.startsWith('oidc_session=') && !cookie.startsWith('oidc_session=;'))).toBe(false)
    expect(await callback.text()).toContain('Try again')
  })

  it('shows an error page when the provider reports an error', async () => {
    const base = await start()
    const callback = await fetch(`${base}/api/auth/callback/okta?error=access_denied`, { redirect: 'manual' })
    expect(callback.status).toBe(400)
    expect(await callback.text()).toContain('Try again')
  })

  it('enforces OIDC_ALLOWED_GROUPS', async () => {
    const run = async (groups: string) => {
      const base = await start({ ...baseEnv, OIDC_ALLOWED_GROUPS: groups })
      const signin = await fetch(`${base}/auth/signin`, { redirect: 'manual' })
      expect(new URL(signin.headers.get('location') as string).searchParams.get('state')).toBeTruthy()
      const state = new URL(signin.headers.get('location') as string).searchParams.get('state')
      return fetch(`${base}/api/auth/callback/okta?code=abc&state=${state}`, { headers: { Cookie: `oidc_login=${cookieValue(signin, 'oidc_login')}` }, redirect: 'manual' })
    }
    expect((await run('im-team')).status).toBe(302)
    expect((await run('other-group')).status).toBe(403)
  })

  it('signs out by clearing the session and redirecting to the end-session endpoint', async () => {
    const base = await start()
    const signout = await fetch(`${base}/auth/signout`, { headers: { Cookie: forgeSession({ sub: 'u', exp: now() + 600, idt: 'raw.id.token' }) }, redirect: 'manual' })
    expect(signout.status).toBe(302)
    const target = new URL(signout.headers.get('location') as string)
    expect(target.origin + target.pathname).toBe('https://idp.example.test/logout')
    expect(target.searchParams.get('id_token_hint')).toBe('raw.id.token')
    expect(target.searchParams.get('post_logout_redirect_uri')).toBe('https://app.example.test/')
    expect(cookieValue(signout, 'oidc_session')).toBe('')
  })
})

describe('sanitizeReturnTo', () => {
  it.each([
    ['/flows?x=1#a', '/flows?x=1#a'],
    ['https://evil.test/', '/'],
    ['//evil.test', '/'],
    ['/\\evil.test', '/'],
    ['/\\/evil.test', '/'],
    ['javascript:alert(1)', '/'],
    ['/path\nnext', '/'],
    ['/auth/signin', '/'],
    ['/api/auth/callback/okta', '/'],
    ['', '/'],
    [undefined, '/'],
  ])('%s -> %s', (input, expected) => {
    expect(sanitizeReturnTo(input)).toBe(expected)
  })
})
