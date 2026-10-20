// End-to-end check of the sign-in gate: a fake accounts service, the real
// Kanbate server in a child process, and requests shaped like home-network
// and Cloudflare-tunnel traffic.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPrivateAddress } from '../auth.js';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = 'test-service-token';
const USERS = {
  moe: { password: 'pw-admin', user: { id: 1, username: 'moe', displayName: 'Moe', isAdmin: true } },
  guest: { password: 'pw-guest', user: { id: 2, username: 'guest', displayName: 'Guest', isAdmin: false } },
};

let accounts, kanbate, base, dataDir;
const sessions = new Map();

function readBody(req) {
  return new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => resolve(s ? JSON.parse(s) : {}));
  });
}

before(async () => {
  accounts = http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.headers['x-service-token'] !== TOKEN) return send(401, { error: 'bad service token' });
    const body = await readBody(req);
    if (req.url === '/v1/login') {
      const u = USERS[body.username];
      if (!u || u.password !== body.password) return send(401, { error: 'wrong' });
      const token = `sess-${body.username}-${Math.random().toString(36).slice(2)}`;
      sessions.set(token, u.user);
      return send(200, { token, user: u.user });
    }
    if (req.url === '/v1/verify') {
      const user = sessions.get(body.token);
      return user ? send(200, { user }) : send(401, { error: 'invalid' });
    }
    if (req.url === '/v1/logout') {
      sessions.delete(body.token);
      return send(200, { ok: true });
    }
    send(404, {});
  });
  await new Promise((r) => accounts.listen(0, '127.0.0.1', r));

  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanbate-test-'));
  const port = 30000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  kanbate = spawn(process.execPath, ['index.js'], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      KANBATE_DATA_DIR: dataDir,
      ACCOUNTS_URL: `http://127.0.0.1:${accounts.address().port}`,
      ACCOUNTS_SERVICE_TOKEN: TOKEN,
      COOKIE_SECURE: 'false',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('kanbate did not start');
});

after(() => {
  kanbate?.kill();
  accounts?.close();
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    /* the database may still be closing on Windows */
  }
});

// Cloudflare sets this on every request through the tunnel.
const TUNNEL = { 'cf-connecting-ip': '203.0.113.7', 'cf-ray': 'abc123-MAD' };

async function signIn(username, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...TUNNEL },
    body: JSON.stringify({ username, password }),
  });
  const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
  return { res, cookie };
}

test('private addresses are recognised', () => {
  for (const a of ['127.0.0.1', '::1', '::ffff:192.168.1.40', '10.0.0.2', '172.18.0.5']) assert.equal(isPrivateAddress(a), true, a);
  for (const a of ['203.0.113.7', '172.32.0.1', '8.8.8.8', '', undefined]) assert.equal(isPrivateAddress(a), false, String(a));
});

test('home network: no sign-in needed (the Lens pill and Botele keep working)', async () => {
  const res = await fetch(`${base}/api/dashboard`);
  assert.equal(res.status, 200);
  const me = await (await fetch(`${base}/api/auth/me`)).json();
  assert.deepEqual(me, { user: null, local: true });
});

test('through the tunnel without a session: refused, reads and writes alike', async () => {
  assert.equal((await fetch(`${base}/api/dashboard`, { headers: TUNNEL })).status, 401);
  const del = await fetch(`${base}/api/projects/1`, { method: 'DELETE', headers: TUNNEL });
  assert.equal(del.status, 401);
  const post = await fetch(`${base}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...TUNNEL },
    body: JSON.stringify({ name: 'x' }),
  });
  assert.equal(post.status, 401);
});

test('health stays open (container healthcheck)', async () => {
  assert.equal((await fetch(`${base}/api/health`, { headers: TUNNEL })).status, 200);
});

test('wrong password is refused', async () => {
  const { res } = await signIn('moe', 'nope');
  assert.equal(res.status, 401);
});

test('a non-admin account cannot get in, and gets no session', async () => {
  const { res, cookie } = await signIn('guest', 'pw-guest');
  assert.equal(res.status, 403);
  assert.equal(cookie, '');
  assert.equal([...sessions.values()].some((u) => u.username === 'guest'), false);
});

test('admin signs in through the tunnel, uses the API, signs out', async () => {
  const { res, cookie } = await signIn('moe', 'pw-admin');
  assert.equal(res.status, 200);
  assert.match(cookie, /^kanbate_session=/);
  const headers = { ...TUNNEL, cookie };
  assert.equal((await fetch(`${base}/api/dashboard`, { headers })).status, 200);
  const me = await (await fetch(`${base}/api/auth/me`, { headers })).json();
  assert.equal(me.user.username, 'moe');
  assert.equal(me.local, false);

  const out = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers });
  assert.equal(out.status, 204);
  assert.equal((await fetch(`${base}/api/dashboard`, { headers })).status, 401);
});

test('a forged cookie is refused', async () => {
  const res = await fetch(`${base}/api/dashboard`, { headers: { ...TUNNEL, cookie: 'kanbate_session=made-up' } });
  assert.equal(res.status, 401);
});
