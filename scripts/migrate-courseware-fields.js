const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
console.log('Connecting to database:', dbPath);
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// 1. Check Student columns
const studentCols = db.prepare('PRAGMA table_info(Student)').all().map(c => c.name);

if (!studentCols.includes('customBookCodes')) {
  console.log('Adding column "customBookCodes" to Student...');
  db.prepare("ALTER TABLE Student ADD COLUMN customBookCodes TEXT").run();
}
if (!studentCols.includes('retainCoursewareAccess')) {
  console.log('Adding column "retainCoursewareAccess" to Student...');
  db.prepare("ALTER TABLE Student ADD COLUMN retainCoursewareAccess INTEGER NOT NULL DEFAULT 0").run();
}

console.log('Migration for courseware fields completed successfully!');
