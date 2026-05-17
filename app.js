const express = require('express');
const cors = require('cors');
const path = require('path');

// Αρχικοποίηση βάσης δεδομένων (δημιουργεί tables αν δεν υπάρχουν)
require('./db');

const authRoutes = require('./routes/auth');
const boardsRoutes = require('./routes/boards');
const tasksRoutes = require('./routes/tasks');
const cache = require('./cache');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/tasks', tasksRoutes);

// Cache stats endpoint (για debugging/demo)
app.get('/api/cache/stats', (req, res) => {
  res.json(cache.stats());
});

// ── Serve Frontend ──────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Εσωτερικό σφάλμα διακομιστή' });
});

// ── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`TaskBoard Lite server running on http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = app;
