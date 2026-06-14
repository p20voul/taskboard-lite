const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// ξεχωριστο db για τα tests, ωστε να μη μπλεξουμε με το dev db
const DB_FILE = path.join(__dirname, 'test-api.db');
if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);

process.env.DB_PATH = DB_FILE;
process.env.JWT_SECRET = 'test-secret-only-for-tests';
process.env.CORS_ORIGIN = '*';

const request = require('supertest');
const { app, setup } = require('../app');

let agent;
let token;
let boardId;
let taskId;

const username = `tester_${Date.now()}`;
const password = 'superSecret123';

test.before(async () => {
  await setup();
  agent = request(app);
});

test.after(() => {
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
});

test('POST /api/auth/register → 201 και token', async () => {
  const res = await agent.post('/api/auth/register').send({ username, password });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.token);
  token = res.body.token;
});

test('POST /api/auth/register με υπαρχον username → 409', async () => {
  const res = await agent.post('/api/auth/register').send({ username, password });
  assert.strictEqual(res.status, 409);
});

test('POST /api/auth/login με λαθος password → 401', async () => {
  const res = await agent.post('/api/auth/login').send({ username, password: 'wrongpass' });
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/login με σωστα στοιχεια → 200 και token', async () => {
  const res = await agent.post('/api/auth/login').send({ username, password });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.token);
});

test('GET /api/boards χωρις token → 401', async () => {
  const res = await agent.get('/api/boards');
  assert.strictEqual(res.status, 401);
});

test('GET /api/boards με token → περιεχει το default board', async () => {
  const res = await agent.get('/api/boards').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.strictEqual(res.body.data.length, 1);
  assert.strictEqual(res.body.data[0].title, 'Το Board μου');
  boardId = res.body.data[0].id;
});

test('POST /api/tasks με μη εγκυρο status → 400', async () => {
  const res = await agent.post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ board_id: boardId, title: 'Task test', status: 'not-a-status' });
  assert.strictEqual(res.status, 400);
});

test('POST /api/tasks → 201 δημιουργει task', async () => {
  const res = await agent.post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ board_id: boardId, title: 'Γράψε tests', priority: 'high', tag: 'chore' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.status, 'todo');
  taskId = res.body.id;
});

test('PATCH /api/tasks/:id → ενημερωνει status σε done', async () => {
  const res = await agent.patch(`/api/tasks/${taskId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'done' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'done');
});

test('GET /api/tasks/stats?board_id= → σωστα στατιστικα', async () => {
  const res = await agent.get(`/api/tasks/stats?board_id=${boardId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.total, 1);
  assert.strictEqual(res.body.done, 1);
  assert.strictEqual(res.body.completion_pct, 100);
});

test('DELETE /api/boards/:id → 204', async () => {
  const res = await agent.delete(`/api/boards/${boardId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 204);
});
