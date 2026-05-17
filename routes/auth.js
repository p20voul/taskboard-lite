const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'taskboard_secret_key_2026';
const JWT_EXPIRES = '24h';

// POST /api/auth/register
router.post('/register', (req, res) => {
  const db = getDb();
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username και password είναι υποχρεωτικά' });
  if (username.length < 3)
    return res.status(400).json({ error: 'Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Το password πρέπει να έχει τουλάχιστον 6 χαρακτήρες' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Το username χρησιμοποιείται ήδη' });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, password_hash);

  // Default board για τον νέο χρήστη
  db.prepare('INSERT INTO boards (user_id, title) VALUES (?, ?)').run(result.lastInsertRowid, 'Το Board μου');

  const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.status(201).json({ message: 'Επιτυχής εγγραφή', token, user: { id: result.lastInsertRowid, username } });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const db = getDb();
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username και password είναι υποχρεωτικά' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Λανθασμένα στοιχεία σύνδεσης' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Λανθασμένα στοιχεία σύνδεσης' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ message: 'Επιτυχής σύνδεση', token, user: { id: user.id, username: user.username } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Επιτυχής αποσύνδεση' });
});

module.exports = router;
