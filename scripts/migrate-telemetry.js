const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

console.log('Connecting to database:', dbPath);

// 1. Tạo bảng StudySession
db.prepare(`
  CREATE TABLE IF NOT EXISTS StudySession (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT NOT NULL,
    bookCode TEXT,
    lessonTitle TEXT,
    durationSeconds INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();
console.log('StudySession table verified.');

// 2. Thêm các cột theo dõi vào bảng Student nếu chưa có
const studentCols = db.prepare('PRAGMA table_info(Student)').all().map(c => c.name);

if (!studentCols.includes('coursewareLastActiveAt')) {
  db.prepare('ALTER TABLE Student ADD COLUMN coursewareLastActiveAt DATETIME').run();
  console.log('Added coursewareLastActiveAt to Student');
}
if (!studentCols.includes('coursewareCurrentProgress')) {
  db.prepare('ALTER TABLE Student ADD COLUMN coursewareCurrentProgress TEXT').run();
  console.log('Added coursewareCurrentProgress to Student');
}
if (!studentCols.includes('coursewareStudyMinutes')) {
  db.prepare('ALTER TABLE Student ADD COLUMN coursewareStudyMinutes INTEGER NOT NULL DEFAULT 0').run();
  console.log('Added coursewareStudyMinutes to Student');
}
if (!studentCols.includes('coursewareActivatedAt')) {
  db.prepare('ALTER TABLE Student ADD COLUMN coursewareActivatedAt DATETIME').run();
  console.log('Added coursewareActivatedAt to Student');
}

console.log('Telemetry migration completed successfully!');
