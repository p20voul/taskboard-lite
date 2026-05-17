const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'taskboard_secret_key_2026';
const JWT_EXPIRES = '24h';

// POST /api/auth/register
// Εγγραφή νέου χρήστη
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username και password είναι υποχρεωτικά' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Το password πρέπει να έχει τουλάχιστον 6 χαρακτήρες' });
  }

  // Έλεγχος αν υπάρχει ήδη
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Το username χρησιμοποιείται ήδη' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).run(username, password_hash);

  // Δημιουργία default board για τον νέο χρήστη
  db.prepare('INSERT INTO boards (user_id, title) VALUES (?, ?)').run(
    result.lastInsertRowid,
    'Το Board μου'
  );

  const token = jwt.sign(
    { id: result.lastInsertRowid, username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.status(201).json({
    message: 'Επιτυχής εγγραφή',
    token,
    user: { id: result.lastInsertRowid, username },
  });
});

// POST /api/auth/login
// Σύνδεση χρήστη
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username και password είναι υποχρεωτικά' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Λανθασμένα στοιχεία σύνδεσης' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Λανθασμένα στοιχεία σύνδεσης' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({
    message: 'Επιτυχής σύνδεση',
    token,
    user: { id: user.id, username: user.username },
  });
});

// POST /api/auth/logout
// Αποσύνδεση (client-side token deletion)
router.post('/logout', (req, res) => {
  // Το JWT είναι stateless — η αποσύνδεση γίνεται στον client
  // διαγράφοντας το token από το localStorage/memory
  res.json({ message: 'Επιτυχής αποσύνδεση' });
});

module.exports = router;
