// simple in-memory rate limiter, σαν το cache/index.js αλλα για login attempts
// max 5 προσπαθειες ανα ip σε 15 λεπτα

const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 λεπτα
const MAX_ATTEMPTS = 5;

/**
 * Middleware για rate limit στο /api/auth/login
 * Μετραει requests ανα IP μεσα σε ενα παραθυρο 15 λεπτων
 */
function loginLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();

  let entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
  }

  entry.count++;
  attempts.set(ip, entry);

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({ error: 'Πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά.' });
  }

  next();
}

module.exports = { loginLimiter };
