import { Router } from 'express';
import {
  AccountsUnavailable,
  clearSessionCookie,
  clientInfo,
  forgetToken,
  isLocal,
  login,
  logout,
  readToken,
  requireUser,
  setSessionCookie,
} from '../auth.js';

const router = Router();

// Same shape as wrap() in middleware.js, plus a 503 when accounts is down.
const wrap = (fn) => (req, res, next) =>
  Promise.resolve()
    .then(() => fn(req, res))
    .catch((err) => {
      if (err instanceof AccountsUnavailable) return res.status(503).json({ error: 'accounts service unavailable' });
      next(err);
    });

router.post(
  '/login',
  wrap(async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (username.length > 64 || password.length > 256) {
      return res.status(401).json({ error: 'wrong username or password' });
    }
    const { status, data } = await login(username, password, clientInfo(req));
    if (status !== 200) {
      return res
        .status(status === 429 ? 429 : 401)
        .json({ error: status === 429 ? 'too many attempts' : 'wrong username or password' });
    }
    if (!data.user?.isAdmin) {
      // Signed in fine, but this app is only for the admin: drop the new session.
      await logout(data.token).catch(() => {});
      return res.status(403).json({ error: 'this account cannot use Kanbate' });
    }
    setSessionCookie(res, data.token);
    res.json({ user: data.user });
  })
);

router.post(
  '/logout',
  wrap(async (req, res) => {
    const token = readToken(req);
    if (token) {
      forgetToken(token);
      await logout(token);
    }
    clearSessionCookie(res);
    res.status(204).send();
  })
);

// Who am I: { user } when signed in, { user: null, local: true } on the home network.
router.get('/me', requireUser(), (req, res) => {
  res.json({ user: req.user, local: isLocal(req) });
});

export default router;
