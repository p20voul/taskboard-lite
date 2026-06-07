const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'taskboard.db');
let db = null;

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      tag TEXT DEFAULT 'feat',
      priority TEXT DEFAULT 'med',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)`);

  persist();
  console.log('Database initialized:', DB_PATH);
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialized — call initDb() first');
  return {
    prepare(sql) {
      return {
        get(...params) {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const results = [];
          const stmt = db.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        },
        run(...params) {
          db.run(sql, params);
          // ΣΗΜΑΝΤΙΚΟ: το SELECT last_insert_rowid() ΠΡΕΠΕΙ να γίνει πριν το persist().
          // Η db.export() της sql.js μηδενίζει το last_insert_rowid(), οπότε αν
          // περσιστάρουμε πρώτα, παίρνουμε πάντα 0 και τα FK relations σπάνε
          // (π.χ. boards.user_id = 0 για όλους τους χρήστες).
          const idRes = db.exec('SELECT last_insert_rowid() as id');
          const lastId = idRes[0] ? idRes[0].values[0][0] : null;
          const changes = db.getRowsModified();
          persist();
          return { lastInsertRowid: lastId, changes };
        },
      };
    },
  };
}

module.exports = { initDb, getDb };
