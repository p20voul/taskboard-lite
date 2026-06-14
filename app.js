require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, closeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// cors origin απο .env, comma separated. * αν δεν εχει οριστει
const corsOrigin = process.env.CORS_ORIGIN || '*';
const allowedOrigins = corsOrigin === '*'
  ? '*'
  : corsOrigin.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({ origin: allowedOrigins }));

// body size limit, default 100kb (το express default)
const bodyLimit = process.env.BODY_LIMIT || '100kb';
app.use(express.json({ limit: bodyLimit }));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// setup ξεχωριστα απο το listen, ωστε τα tests να μπορουν να καλεσουν
// setup() και να παρουν ενα ετοιμο app χωρις να ανοιγει port
let setupPromise = null;
function setup() {
  if (!setupPromise) {
    setupPromise = initDb().then(() => {
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
        // payload too large απο express.json limit
        if (err.type === 'entity.too.large') {
          return res.status(413).json({ error: 'Το αίτημα είναι πολύ μεγάλο' });
        }
        res.status(500).json({ error: 'Εσωτερικό σφάλμα διακομιστή' });
      });

      return app;
    });
  }
  return setupPromise;
}

// ξεκινα τον πραγματικο server μονο οταν τρεχει `node app.js`,
// οχι οταν το app γινεται require απο τα tests
if (require.main === module) {
  setup().then((app) => {
    const server = app.listen(PORT, () => {
      console.log(`TaskBoard Lite → http://localhost:${PORT}`);
    });

    // graceful shutdown - κλεινουμε τον server και σωζουμε τη db πριν το exit
    function shutdown(signal) {
      console.log(`\n${signal} ληφθηκε, κλεισιμο...`);
      server.close(() => {
        closeDb();
        console.log('server closed, db saved');
        process.exit(0);
      });

      // αν κατι κρεμασει (π.χ. open connections), force exit μετα απο 5s
      setTimeout(() => {
        console.error('shutdown timeout, force exit');
        process.exit(1);
      }, 5000);
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }).catch(err => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  });
}

module.exports = { app, setup };
