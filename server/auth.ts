/**
 * Vonage Okta SSO gate (OIDC authorization code + PKCE, confidential client).
 * Stateless: login state and the session live in HMAC-signed cookies, so any VCR instance can serve any request.
 * Disabled unless AUTH_ENABLED=true. The ID token is validated once at the callback; the signed session cookie is trusted until it expires.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import * as oidc from 'openid-client'
import type { Env } from './types.js'

export const SIGNIN_PATH = '/auth/signin'
export const SIGNOUT_PATH = '/auth/signout'
export const CALLBACK_PATH = '/api/auth/callback/okta'
const LOGIN_COOKIE = 'oidc_login'
const SESSION_COOKIE = 'oidc_session'
const LOGIN_TTL_SECONDS = 600
const DEFAULT_SESSION_TTL_SECONDS = 8 * 60 * 60
/** Browsers drop cookies above ~4096 bytes; keep the raw id_token (logout hint) only below this size. */
const MAX_SESSION_COOKIE_BYTES = 3800

export interface SessionClaims {
  sub: string
  email?: string
  name?: string
  groups?: string[]
  exp: number
  /** Raw ID token, kept only for the logout id_token_hint when it fits in the cookie. */
  idt?: string
}

export interface OidcProvider {
  authorizationUrl(params: { redirectUri: string; scope: string; state: string; nonce: string; codeChallenge: string }): Promise<URL>
  exchange(currentUrl: URL, checks: { state: string; nonce: string; codeVerifier: string }): Promise<{ claims: Record<string, unknown>; idToken: string }>
  endSessionEndpoint(): Promise<string | undefined>
}

export interface Auth {
  enabled: boolean
  /** Returns true when the response was fully handled (login routes, redirect, 401, 403, 503). */
  handle(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean>
}

interface AuthSettings {
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
  sessionSecret: string
  sessionTtlSeconds: number
  allowedGroups: string[]
  groupsClaim: string
  postLogoutRedirectUri: string
  publicShare: boolean
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

function sign(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function packCookie(secret: string, payload: unknown): string {
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(secret, body)}`
}

function unpackCookie<T>(secret: string, raw: string | undefined): T | null {
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot < 1) return null
  const body = raw.slice(0, dot)
  const expected = Buffer.from(sign(secret, body))
  const actual = Buffer.from(raw.slice(dot + 1))
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

function parseCookies(request: IncomingMessage): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const index = part.indexOf('=')
    if (index > 0) result[part.slice(0, index).trim()] = part.slice(index + 1).trim()
  }
  return result
}

/** Same-origin relative paths only. Rejects schemes, hosts, `//`, backslashes, control characters and auth routes. */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  // oxlint-disable-next-line no-control-regex
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return '/'
  try {
    const parsed = new URL(value, 'http://returnto.invalid')
    if (parsed.origin !== 'http://returnto.invalid') return '/'
    if (parsed.pathname.startsWith('/auth/') || parsed.pathname.startsWith('/api/auth/')) return '/'
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}

function readSettings(env: Env): { settings?: AuthSettings; error?: string } {
  const required = ['OIDC_ISSUER_URL', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'OIDC_WEB_REDIRECT_URI', 'SESSION_SECRET'] as const
  const missing = required.filter((name) => !env[name]?.trim())
  if (missing.length) return { error: `Missing ${missing.join(', ')}` }
  if ((env.SESSION_SECRET as string).length < 16) return { error: 'SESSION_SECRET must be at least 16 characters' }
  const ttl = Number(env.SESSION_TTL_SECONDS)
  return {
    settings: {
      issuer: (env.OIDC_ISSUER_URL as string).trim(),
      clientId: (env.OIDC_CLIENT_ID as string).trim(),
      clientSecret: env.OIDC_CLIENT_SECRET as string,
      redirectUri: (env.OIDC_WEB_REDIRECT_URI as string).trim(),
      sessionSecret: env.SESSION_SECRET as string,
      sessionTtlSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_SESSION_TTL_SECONDS,
      allowedGroups: (env.OIDC_ALLOWED_GROUPS ?? '').split(',').map((group) => group.trim()).filter(Boolean),
      groupsClaim: env.OIDC_GROUPS_CLAIM?.trim() || 'groups',
      postLogoutRedirectUri: env.OIDC_POST_LOGOUT_REDIRECT_URI?.trim() || new URL('/', env.OIDC_WEB_REDIRECT_URI as string).toString(),
      publicShare: env.AUTH_PUBLIC_SHARE === 'true',
    },
  }
}

/** Real provider backed by openid-client; discovery is fetched lazily and cached. */
export function createOpenIdProvider(settings: Pick<AuthSettings, 'issuer' | 'clientId' | 'clientSecret'>): OidcProvider {
  let configuration: Promise<oidc.Configuration> | undefined
  const getConfiguration = () => {
    configuration ??= oidc.discovery(new URL(settings.issuer), settings.clientId, settings.clientSecret).catch((error) => {
      configuration = undefined
      throw error
    })
    return configuration
  }
  return {
    async authorizationUrl({ redirectUri, scope, state, nonce, codeChallenge }) {
      return oidc.buildAuthorizationUrl(await getConfiguration(), { redirect_uri: redirectUri, scope, state, nonce, code_challenge: codeChallenge, code_challenge_method: 'S256' })
    },
    async exchange(currentUrl, { state, nonce, codeVerifier }) {
      const tokens = await oidc.authorizationCodeGrant(await getConfiguration(), currentUrl, { pkceCodeVerifier: codeVerifier, expectedState: state, expectedNonce: nonce, idTokenExpected: true })
      return { claims: { ...tokens.claims() }, idToken: tokens.id_token as string }
    },
    async endSessionEndpoint() {
      return (await getConfiguration()).serverMetadata().end_session_endpoint
    },
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string)
}

function sendHtml(response: ServerResponse, status: number, title: string, message: string, retryHref?: string) {
  const retry = retryHref ? `<p><a href="${escapeHtml(retryHref)}">Try again</a></p>` : ''
  response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)}</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${retry}</body>`)
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}

function redirect(response: ServerResponse, location: string, cookies: string[] = []) {
  response.writeHead(302, { Location: location, 'Cache-Control': 'no-store', ...(cookies.length ? { 'Set-Cookie': cookies } : {}) })
  response.end()
}

const EXEMPT_PATHS = new Set(['/_/health', '/manifest.webmanifest', '/sw.js', '/registerSW.js'])
/** Service worker code is public static JS. If it is gated, browsers cannot fetch a SW update and a stale SW keeps serving the cached app shell for /auth and /api navigations (blank page at the callback URL). */
const WORKBOX_PATH = /^\/workbox-[\w-]+\.js$/
/** Raster promo images that Live RCS sends to Vonage as card media. Vonage fetches them without signing in, so only image files directly in this folder are public. SVG is left out because it can carry script. */
const PUBLIC_RCS_MEDIA_PATH = /^\/assets\/dominos-singapore-rcs-demo\/[^/]+\.(?:jpe?g|png|gif|webp)$/i

function isExempt(pathname: string, publicShare: boolean): boolean {
  return EXEMPT_PATHS.has(pathname) || WORKBOX_PATH.test(pathname) || PUBLIC_RCS_MEDIA_PATH.test(pathname) || pathname.startsWith('/webhooks/vonage/') || (publicShare && (pathname === '/api/share' || pathname.startsWith('/api/share/')))
}

export function createAuth(env: Env, provider?: OidcProvider): Auth {
  if (env.AUTH_ENABLED !== 'true') return { enabled: false, handle: async () => false }
  const parsed = readSettings(env)
  if (!parsed.settings) {
    console.error(`[auth] AUTH_ENABLED=true but SSO is misconfigured: ${parsed.error}. Failing closed.`)
    return {
      enabled: true,
      async handle(_request, response, url) {
        if (isExempt(url.pathname, false)) return false
        sendHtml(response, 503, 'Sign-in unavailable', 'Single sign-on is enabled but not configured correctly on the server.')
        return true
      },
    }
  }
  const settings: AuthSettings = parsed.settings
  const oidcProvider = provider ?? createOpenIdProvider(settings)
  const scope = ['openid', 'profile', 'email', ...(settings.allowedGroups.length ? ['groups'] : [])].join(' ')

  const cookieFlags = (request: IncomingMessage) => {
    const forwarded = typeof request.headers['x-forwarded-proto'] === 'string' ? request.headers['x-forwarded-proto'].split(',')[0]?.trim() : ''
    const secure = forwarded === 'https' || (!forwarded && settings.redirectUri.startsWith('https:'))
    return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
  }
  const setCookie = (request: IncomingMessage, name: string, value: string, maxAge: number) => `${name}=${value}; Max-Age=${maxAge}; ${cookieFlags(request)}`
  const clearCookie = (request: IncomingMessage, name: string) => setCookie(request, name, '', 0)

  const readSession = (request: IncomingMessage): SessionClaims | null => {
    const session = unpackCookie<SessionClaims>(settings.sessionSecret, parseCookies(request)[SESSION_COOKIE])
    return session && typeof session.sub === 'string' && typeof session.exp === 'number' && session.exp > Math.floor(Date.now() / 1000) ? session : null
  }

  async function signIn(request: IncomingMessage, response: ServerResponse, url: URL) {
    const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'))
    const state = b64url(randomBytes(24))
    const nonce = b64url(randomBytes(24))
    const codeVerifier = b64url(randomBytes(32))
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    try {
      const target = await oidcProvider.authorizationUrl({ redirectUri: settings.redirectUri, scope, state, nonce, codeChallenge })
      const login = packCookie(settings.sessionSecret, { state, nonce, codeVerifier, returnTo, exp: Math.floor(Date.now() / 1000) + LOGIN_TTL_SECONDS })
      redirect(response, target.toString(), [setCookie(request, LOGIN_COOKIE, login, LOGIN_TTL_SECONDS)])
    } catch (caught) {
      console.error('[auth] sign-in start failed:', caught instanceof Error ? caught.message : caught)
      sendHtml(response, 502, 'Sign-in unavailable', 'Could not reach the identity provider.', SIGNIN_PATH)
    }
  }

  async function callback(request: IncomingMessage, response: ServerResponse, url: URL) {
    const login = unpackCookie<{ state: string; nonce: string; codeVerifier: string; returnTo: string; exp: number }>(settings.sessionSecret, parseCookies(request)[LOGIN_COOKIE])
    const clearLogin = clearCookie(request, LOGIN_COOKIE)
    const fail = (status: number, message: string) => {
      console.error(`[auth] callback rejected (${status}): ${message}`)
      response.setHeader('Set-Cookie', [clearLogin])
      sendHtml(response, status, 'Sign-in failed', message, SIGNIN_PATH)
    }
    if (url.searchParams.has('error')) return fail(400, 'The identity provider reported an error. Please try again.')
    if (!login || login.exp <= Math.floor(Date.now() / 1000)) return fail(400, 'Your sign-in attempt expired or was not found.')
    const returnedState = url.searchParams.get('state') ?? ''
    const expected = Buffer.from(login.state)
    const actual = Buffer.from(returnedState)
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return fail(400, 'Sign-in state did not match. Please try again.')
    let claims: Record<string, unknown>
    let idToken: string
    try {
      // Rebuild the callback URL from the configured redirect URI so a spoofed Host header cannot influence validation.
      const currentUrl = new URL(settings.redirectUri)
      currentUrl.search = url.search
      ;({ claims, idToken } = await oidcProvider.exchange(currentUrl, { state: login.state, nonce: login.nonce, codeVerifier: login.codeVerifier }))
    } catch (caught) {
      console.error('[auth] token exchange failed:', caught instanceof Error ? caught.message : caught)
      return fail(400, 'Could not complete sign-in with the identity provider.')
    }
    const rawGroups = claims[settings.groupsClaim]
    const groups = Array.isArray(rawGroups) ? rawGroups.filter((group): group is string => typeof group === 'string') : typeof rawGroups === 'string' ? [rawGroups] : []
    if (settings.allowedGroups.length && !groups.some((group) => settings.allowedGroups.includes(group))) {
      response.setHeader('Set-Cookie', [clearLogin])
      sendHtml(response, 403, 'Access denied', 'Your account is not in a group allowed to use this application.')
      return
    }
    const session: SessionClaims = {
      sub: String(claims.sub),
      ...(typeof claims.email === 'string' ? { email: claims.email } : {}),
      ...(typeof claims.name === 'string' ? { name: claims.name } : {}),
      ...(groups.length ? { groups } : {}),
      exp: Math.floor(Date.now() / 1000) + settings.sessionTtlSeconds,
    }
    let cookie = packCookie(settings.sessionSecret, { ...session, idt: idToken })
    if (cookie.length > MAX_SESSION_COOKIE_BYTES) cookie = packCookie(settings.sessionSecret, session)
    redirect(response, sanitizeReturnTo(login.returnTo), [setCookie(request, SESSION_COOKIE, cookie, settings.sessionTtlSeconds), clearLogin])
  }

  async function signOut(request: IncomingMessage, response: ServerResponse) {
    const session = readSession(request)
    const cookies = [clearCookie(request, SESSION_COOKIE), clearCookie(request, LOGIN_COOKIE)]
    let target = settings.postLogoutRedirectUri
    try {
      const endpoint = session?.idt ? await oidcProvider.endSessionEndpoint() : undefined
      if (endpoint && session?.idt) {
        const logoutUrl = new URL(endpoint)
        logoutUrl.searchParams.set('id_token_hint', session.idt)
        logoutUrl.searchParams.set('post_logout_redirect_uri', settings.postLogoutRedirectUri)
        target = logoutUrl.toString()
      }
    } catch (caught) {
      console.error('[auth] end-session lookup failed:', caught instanceof Error ? caught.message : caught)
    }
    redirect(response, target, cookies)
  }

  return {
    enabled: true,
    async handle(request, response, url) {
      const method = request.method ?? 'GET'
      const isRead = method === 'GET' || method === 'HEAD'
      if (isRead && url.pathname === SIGNIN_PATH) return await signIn(request, response, url), true
      if (isRead && url.pathname === CALLBACK_PATH) return await callback(request, response, url), true
      if (isRead && url.pathname === SIGNOUT_PATH) return await signOut(request, response), true
      if (isExempt(url.pathname, settings.publicShare)) return false
      if (readSession(request)) return false
      const accept = request.headers.accept ?? ''
      if (isRead && !url.pathname.startsWith('/api/') && accept.includes('text/html')) {
        redirect(response, `${SIGNIN_PATH}?returnTo=${encodeURIComponent(sanitizeReturnTo(`${url.pathname}${url.search}`))}`)
        return true
      }
      sendJson(response, 401, { error: { code: 'SSO_REQUIRED', message: 'Sign in required.', signIn: SIGNIN_PATH } })
      return true
    },
  }
}
