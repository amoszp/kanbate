/**
 * Sign-in through the shared accounts service (reached over a private Docker
 * network), for requests that come in from the internet.
 *
 * Who needs to sign in:
 *  - Requests through the Cloudflare tunnel always carry CF-Connecting-IP
 *    (Cloudflare sets it on every proxied request), so they must sign in.
 *  - Requests straight from the home network (a private address and no
 *    Cloudflare header) are trusted, as before: tools on the LAN keep working
 *    without a session.
 * Kanbate holds one person's boards, so only admin accounts may use it.
 */

const ACCOUNTS_URL = process.env.ACCOUNTS_URL || 'http://accounts:4600';
const SERVICE_TOKEN = process.env.ACCOUNTS_SERVICE_TOKEN || '';
const APP_NAME = 'kanbate';

export const SESSION_COOKIE = 'kanbate_session';
const SESSION_MAX_AGE_SECONDS = 180 * 86_400;
const COOKIE_SECURE = (process.env.COOKIE_SECURE ?? 'true') !== 'false';
// Set to "false" only for local development without the accounts service.
const AUTH_REQUIRED = (process.env.AUTH_REQUIRED ?? 'true') !== 'false';

export class AccountsUnavailable extends Error {}

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(`${ACCOUNTS_URL}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-service-token': SERVICE_TOKEN },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    throw new AccountsUnavailable(String(err));
  }
  if (res.status >= 500) throw new AccountsUnavailable(`accounts service answered ${res.status}`);
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

export function clientInfo(req) {
  const forwarded = req.get('cf-connecting-ip')?.trim();
  const ip = (forwarded || req.socket.remoteAddress || '').slice(0, 64) || undefined;
  const device = (req.get('user-agent') ?? '').slice(0, 300) || undefined;
  return { ip, device };
}

export const login = (username, password, client) =>
  call('POST', '/v1/login', { username, password, app: APP_NAME, ...client });

export const logout = (token) => call('POST', '/v1/logout', { token });

// Verified tokens are cached briefly so a burst of API calls costs one lookup.
const verifyCache = new Map();
const VERIFY_CACHE_MS = 30_000;

export async function verify(token) {
  const cached = verifyCache.get(token);
  if (cached && cached.until > Date.now()) return cached.user;
  const { status, data } = await call('POST', '/v1/verify', { token });
  if (status !== 200) {
    verifyCache.delete(token);
    return null;
  }
  verifyCache.set(token, { user: data.user, until: Date.now() + VERIFY_CACHE_MS });
  return data.user;
}

export function forgetToken(token) {
  verifyCache.delete(token);
}

// ---------- who is asking ----------

const PRIVATE_V4 = [/^10\./, /^127\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./];

export function isPrivateAddress(addr) {
  if (!addr) return false;
  const a = addr.startsWith('::ffff:') ? addr.slice(7) : addr;
  if (a === '::1') return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(a) || /^fe80:/i.test(a)) return true;
  return PRIVATE_V4.some((re) => re.test(a));
}

/** A request from the home network that did not come through Cloudflare. */
export function isLocal(req) {
  if (req.get('cf-connecting-ip') || req.get('cf-ray')) return false;
  return isPrivateAddress(req.socket.remoteAddress);
}

// ---------- cookies ----------

export function readToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;
  for (const part of (req.get('cookie') ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('=')) || null;
  }
  return null;
}

export function setSessionCookie(res, token) {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (COOKIE_SECURE) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? '; Secure' : ''}`);
}

// ---------- middleware ----------

/** Lets local requests through; everyone else needs an admin session. */
export function requireUser() {
  return async (req, res, next) => {
    if (!AUTH_REQUIRED || isLocal(req)) {
      req.user = null;
      return next();
    }
    const token = readToken(req);
    if (!token) return res.status(401).json({ error: 'login required' });
    try {
      const user = await verify(token);
      if (!user) return res.status(401).json({ error: 'login required' });
      if (!user.isAdmin) return res.status(403).json({ error: 'this account cannot use Kanbate' });
      req.user = user;
      next();
    } catch (err) {
      if (err instanceof AccountsUnavailable) {
        console.error('[auth] accounts service unavailable:', err.message);
        return res.status(503).json({ error: 'accounts service unavailable' });
      }
      next(err);
    }
  };
}
