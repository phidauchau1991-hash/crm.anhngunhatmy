const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
console.log('Connecting to database:', dbPath);
const db = new Database(dbPath);

const classCode = 'CN1_S4_MsMy_7CN_01';

// Count current enrollments
const beforeRows = db.prepare("SELECT studentId, status FROM Enrollment WHERE classCode = ?").all(classCode);
console.log(`Current enrollments in ${classCode}: ${beforeRows.length}`);
console.log(beforeRows);

// Revert 'Đã chuyển' back to 'Đang học' for S4
const info = db.prepare("UPDATE Enrollment SET status = 'Đang học' WHERE classCode = ? AND status = 'Đã chuyển'").run(classCode);
console.log(`Updated ${info.changes} enrollments to 'Đang học'.`);

const afterRows = db.prepare("SELECT studentId, status FROM Enrollment WHERE classCode = ? AND status = 'Đang học'").all(classCode);
console.log(`Active students now in ${classCode}: ${afterRows.length}`);

db.close();
