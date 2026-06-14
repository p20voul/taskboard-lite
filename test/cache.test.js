const test = require('node:test');
const assert = require('node:assert');
const cache = require('../cache');

// καθαριζουμε το cache πριν απο καθε test, ειναι module-level Map
function reset() {
  cache.flush();
}

test('set/get: επιστρεφει την τιμη που αποθηκευτηκε', () => {
  reset();
  cache.set('foo', { a: 1 });
  assert.deepStrictEqual(cache.get('foo'), { a: 1 });
});

test('get: null για key που δεν υπαρχει', () => {
  reset();
  assert.strictEqual(cache.get('missing'), null);
});

test('set με μικρο ttl: ληγει και γυρναει null', async () => {
  reset();
  cache.set('temp', 'value', 10); // 10ms ttl
  assert.strictEqual(cache.get('temp'), 'value');
  await new Promise(r => setTimeout(r, 20));
  assert.strictEqual(cache.get('temp'), null);
});

test('invalidate: σβηνει μονο τα keys με το prefix', () => {
  reset();
  cache.set('boards:user:1', ['a']);
  cache.set('boards:user:2', ['b']);
  cache.set('tasks:board:1', ['c']);

  cache.invalidate('boards:user:1');

  assert.strictEqual(cache.get('boards:user:1'), null);
  assert.deepStrictEqual(cache.get('boards:user:2'), ['b']);
  assert.deepStrictEqual(cache.get('tasks:board:1'), ['c']);
});

test('flush: αδειαζει ολο το cache', () => {
  reset();
  cache.set('a', 1);
  cache.set('b', 2);
  cache.flush();
  assert.strictEqual(cache.get('a'), null);
  assert.strictEqual(cache.get('b'), null);
});

test('stats: μετραει total/active/expired', async () => {
  reset();
  cache.set('active1', 1, 60 * 1000);
  cache.set('expired1', 1, 5);

  await new Promise(r => setTimeout(r, 15));

  const s = cache.stats();
  assert.strictEqual(s.total, 2);
  assert.strictEqual(s.active, 1);
  assert.strictEqual(s.expired, 1);
});
