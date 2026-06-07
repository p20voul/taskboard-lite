require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Εκκίνηση με async initDb πρώτα, μετά routes
initDb().then(() => {
  const authRoutes   = require('./routes/auth');
  const boardsRoutes = require('./routes/boards');
  const tasksRoutes  = require('./routes/tasks');
  const cache        = require('./cache');

  app.use('/api/auth',   authRoutes);
  app.use('/api/boards', boardsRoutes);
  app.use('/api/tasks',  tasksRoutes);

  app.get('/api/cache/stats', (req, res) => res.json(cache.stats()));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Εσωτερικό σφάλμα διακομιστή' });
  });

  app.listen(PORT, () => {
    console.log(`TaskBoard Lite → http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});

module.exports = app;
