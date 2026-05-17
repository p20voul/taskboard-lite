// In-memory cache με TTL (Time To Live)
// Χρησιμοποιεί JavaScript Map ως key-value store

const cache = new Map();
const DEFAULT_TTL = 60 * 1000; // 60 δευτερόλεπτα

/**
 * Αποθηκεύει τιμή στο cache
 * @param {string} key
 * @param {*} value
 * @param {number} ttl - milliseconds
 */
function set(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Ανακτά τιμή από το cache
 * Επιστρέφει null αν δεν υπάρχει ή έχει λήξει
 * @param {string} key
 */
function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Διαγράφει όλα τα entries που το key περιέχει το prefix
 * Χρησιμοποιείται για cache invalidation μετά από write operations
 * @param {string} prefix
 */
function invalidate(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Καθαρίζει ολόκληρο το cache
 */
function flush() {
  cache.clear();
}

/**
 * Επιστρέφει στατιστικά cache (για debugging)
 */
function stats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;
  for (const entry of cache.values()) {
    if (now > entry.expiresAt) expired++;
    else active++;
  }
  return { total: cache.size, active, expired };
}

module.exports = { set, get, invalidate, flush, stats };
