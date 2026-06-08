const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const auth = require('../middleware/auth');
const cache = require('../cache');
const { validateTask, validateTaskPatch } = require('../middleware/validate');

router.use(auth);

function getBoardForUser(db, boardId, userId) {
  return db.prepare('SELECT id FROM boards WHERE id = ? AND user_id = ?').get(boardId, userId);
}

// GET /api/tasks?board_id=X
router.get('/', (req, res) => {
  const db = getDb();
  const { board_id } = req.query;
  if (!board_id) return res.status(400).json({ error: 'Απαιτείται παράμετρος board_id' });
  if (!getBoardForUser(db, board_id, req.user.id)) return res.status(403).json({ error: 'Δεν έχετε πρόσβαση' });

  const cacheKey = `tasks:board:${board_id}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ source: 'cache', data: cached });

  const tasks = db.prepare(
    `SELECT * FROM tasks WHERE board_id = ? ORDER BY
     CASE priority WHEN 'high' THEN 1 WHEN 'med' THEN 2 ELSE 3 END,
     created_at DESC`
  ).all(board_id);

  cache.set(cacheKey, tasks);
  res.json({ source: 'db', data: tasks });
});

// GET /api/tasks/stats?board_id=X
router.get('/stats', (req, res) => {
  const db = getDb();
  const { board_id } = req.query;
  if (!board_id) return res.status(400).json({ error: 'Απαιτείται παράμετρος board_id' });
  if (!getBoardForUser(db, board_id, req.user.id)) return res.status(403).json({ error: 'Δεν έχετε πρόσβαση' });

  const rows = db.prepare('SELECT status, COUNT(*) as count FROM tasks WHERE board_id = ? GROUP BY status').all(board_id);
  const stats = { todo: 0, progress: 0, done: 0, total: 0 };
  rows.forEach(r => { stats[r.status] = r.count; stats.total += r.count; });
  stats.completion_pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  res.json(stats);
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task δεν βρέθηκε' });
  if (!getBoardForUser(db, task.board_id, req.user.id)) return res.status(403).json({ error: 'Δεν έχετε πρόσβαση' });
  res.json(task);
});

// POST /api/tasks
router.post('/', (req, res) => {
  const db = getDb();
  const { board_id, title, description, status, tag, priority } = req.body;
  if (!board_id || !title || !title.trim()) return res.status(400).json({ error: 'board_id και title είναι υποχρεωτικά' });

  // ελεγχος μηκους + enum πριν πεσει στη db
  const vErr = validateTask(req.body);
  if (vErr) return res.status(400).json({ error: vErr });

  if (!getBoardForUser(db, board_id, req.user.id)) return res.status(403).json({ error: 'Δεν έχετε πρόσβαση' });

  const result = db.prepare(
    `INSERT INTO tasks (board_id, title, description, status, tag, priority) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(board_id, title.trim(), description || null, status || 'todo', tag || 'feat', priority || 'med');

  cache.invalidate(`tasks:board:${board_id}`);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task δεν βρέθηκε' });
  if (!getBoardForUser(db, task.board_id, req.user.id)) return res.status(403).json({ error: 'Δεν έχετε πρόσβαση' });

  const { title, description, status, tag, priority } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Ο τίτλος είναι υποχρεωτικός' });

  const vErr = validateTask(req.body);
  if (vErr) return res.status(400).json({ error: vErr });

  db.prepare(
    `UPDATE tasks SET title=?, description=?, status=?, tag=?, priority=?, updated_at=datetime('now') WHERE id=?`
  ).run(title.trim(), description || null, status || task.status, tag || task.tag, priority || task.priority, req.params.id);

  cache.invalidate(`tasks:board:${task.board_id}`);
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

// PATCH /api/tasks/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task δεν βρέθηκε' });
  if (!getBoardForUser(db, task.board_id, req.user.id)) return res.status(403).json({ error: 'Δεν έχετε πρόσβαση' });

  // patch → μονο τα fields που εστειλε
  const vErr = validateTaskPatch(req.body);
  if (vErr) return res.status(400).json({ error: vErr });

  const fields = ['title', 'description', 'status', 'tag', 'priority'];
  const updates = [];
  const values = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } });
  if (!updates.length) return res.status(400).json({ error: 'Δεν δόθηκαν πεδία' });

  updates.push(`updated_at = datetime('now')`);
  values.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  cache.invalidate(`tasks:board:${task.board_id}`);
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task δεν βρέθηκε' });
  if (!getBoardForUser(db, task.board_id, req.user.id)) return res.status(403).json({ error: 'Δεν έχετε πρόσβαση' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  cache.invalidate(`tasks:board:${task.board_id}`);
  res.status(204).send();
});

module.exports = router;
