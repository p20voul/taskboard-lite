const test = require('node:test');
const assert = require('node:assert');
const { validateTask, validateTaskPatch, validateBoard, LIMITS } = require('../middleware/validate');

test('validateTask: ολα οκ → null', () => {
  const err = validateTask({ title: 'Καθάρισμα κώδικα', status: 'todo', priority: 'high', tag: 'bug' });
  assert.strictEqual(err, null);
});

test('validateTask: κενο body → null (τιποτα να ελεγξει)', () => {
  assert.strictEqual(validateTask({}), null);
});

test('validateTask: title υπερβολικα μεγαλο → error', () => {
  const err = validateTask({ title: 'x'.repeat(LIMITS.title + 1) });
  assert.match(err, /title/);
});

test('validateTask: μη εγκυρο status → error', () => {
  const err = validateTask({ title: 'ok', status: 'wat' });
  assert.match(err, /status/);
});

test('validateTask: μη εγκυρο priority και tag μαζι → error με και τα δυο', () => {
  const err = validateTask({ title: 'ok', priority: 'urgent', tag: 'random' });
  assert.match(err, /priority/);
  assert.match(err, /tag/);
});

test('validateTaskPatch: ιδιο behaviour με validateTask', () => {
  assert.strictEqual(validateTaskPatch({ status: 'done' }), null);
  assert.match(validateTaskPatch({ status: 'wat' }), /status/);
});

test('validateBoard: ok τιτλος → null', () => {
  assert.strictEqual(validateBoard({ title: 'Το Board μου' }), null);
});

test('validateBoard: τιτλος υπερβολικα μεγαλος → error', () => {
  const err = validateBoard({ title: 'x'.repeat(LIMITS.boardTitle + 1) });
  assert.match(err, /title/);
});
