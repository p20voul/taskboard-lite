const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const auth = require('../middleware/auth');
const cache = require('../cache');
const { validateBoard } = require('../middleware/validate');

router.use(auth);

router.get('/', (req, res) => {
  const db = getDb();
  const cacheKey = `boards:user:${req.user.id}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ source: 'cache', data: cached });

  const boards = db.prepare('SELECT id, title, created_at FROM boards WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  cache.set(cacheKey, boards);
  res.json({ source: 'db', data: boards });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Ο τίτλος είναι υποχρεωτικός' });

  // max length για να μη μπει 5kb title στη db
  const vErr = validateBoard(req.body);
  if (vErr) return res.status(400).json({ error: vErr });

  const result = db.prepare('INSERT INTO boards (user_id, title) VALUES (?, ?)').run(req.user.id, title.trim());
  cache.invalidate(`boards:user:${req.user.id}`);

  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(board);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const board = db.prepare('SELECT * FROM boards WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!board) return res.status(404).json({ error: 'Board δεν βρέθηκε' });

  db.prepare('DELETE FROM tasks WHERE board_id = ?').run(req.params.id);
  db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id);
  cache.invalidate(`boards:user:${req.user.id}`);
  cache.invalidate(`tasks:board:${req.params.id}`);
  res.status(204).send();
});

module.exports = router;
