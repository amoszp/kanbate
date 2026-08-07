/**
 * Wraps an Express route handler so that any thrown (sync) error — or a
 * rejected promise (async) — is forwarded to the central error middleware
 * instead of silently crashing the server or returning a bare 500.
 */
export function wrap(fn) {
  return (req, res, next) => {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.then === 'function') {
        result.then(undefined, next);
      }
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Central JSON error handler. Registered last, so every route benefits from
 * consistent JSON error responses that include the exact error message.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Malformed JSON body produced by express.json()
  if (
    err.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && err.status === 400 && 'body' in err)
  ) {
    return res.status(400).json({ error: `Invalid JSON body: ${err.message}` });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Only log genuine 5xx surprises; 4xx client errors are expected.
  if (status >= 500) console.error('[kanbate] unhandled error:', err);

  res.status(status).json({ error: message });
}

/** Small helper to create an error carrying an HTTP status code. */
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
