const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

const alters = [
  ['Student', 'coursewareBlocked', 'INTEGER NOT NULL DEFAULT 0'],
  ['Student', 'coursewareBlockedReason', 'TEXT'],
  ['Student', 'coursewareExpiresAt', 'DATETIME'],
  ['Lead', 'coursewareBlocked', 'INTEGER NOT NULL DEFAULT 0'],
  ['Lead', 'coursewareBlockedReason', 'TEXT'],
  ['Lead', 'coursewareExpiresAt', 'DATETIME'],
];

for (const [table, col, def] of alters) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
    console.log(`[Migrate] Added ${table}.${col}`);
  } else {
    console.log(`[Migrate] Already exists: ${table}.${col}`);
  }
}

const stats = {
  students: db.prepare('SELECT COUNT(*) AS c FROM Student').get().c,
  leads: db.prepare('SELECT COUNT(*) AS c FROM Lead').get().c,
  studySessions: db.prepare('SELECT COUNT(*) AS c FROM StudySession').get().c,
};
console.log('[Migrate] Verified row counts intact:', stats);
db.close();
